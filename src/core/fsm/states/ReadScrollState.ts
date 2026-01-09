/**
 * ReadScrollState - Handles reading a scroll
 *
 * Pushes ItemSelectionState to pick a scroll, optionally pushes targeting states,
 * then delegates to ItemUseSystem.useScroll().
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import { ItemSelectionState, type ItemSelectionResult } from './ItemSelectionState';
import { ItemTargetingState, type ItemTargetingResult } from './ItemTargetingState';
import { SymbolTargetingState, type SymbolTargetingResult } from './SymbolTargetingState';
import { DirectionTargetingState, type DirectionTargetingResult } from './DirectionTargetingState';
import { getRequiredTargetType, TargetType, type GPEffectDef } from '../../systems/effects';
import { useScroll, type ItemUseContext } from '../../systems/ItemUseSystem';
import type { Item } from '../../entities/Item';
import type { Direction } from '../../types';
import { getGameStore } from '@/core/store/gameStore';

export class ReadScrollState implements State {
  readonly name = 'readScroll';

  // Track selected scroll for multi-step targeting flow
  private selectedScroll: Item | null = null;
  private pendingTargetType: TargetType | null = null;

  onEnter(fsm: GameFSM): void {
    // Push item selection for scrolls
    fsm.push(new ItemSelectionState({
      prompt: 'Read which scroll?',
      filter: (item) => item.isScroll,
    }));
  }

  onExit(_fsm: GameFSM): void {
    this.selectedScroll = null;
    this.pendingTargetType = null;
  }

  handleAction(_fsm: GameFSM, _action: GameAction): boolean {
    // We shouldn't receive actions directly - child states handle input
    return false;
  }

  onResume(fsm: GameFSM, result: unknown): void {
    // Check if returning from targeting
    if (this.selectedScroll && this.pendingTargetType) {
      this.handleTargetingResult(fsm, result);
      return;
    }

    // Returning from item selection
    const selection = result as ItemSelectionResult;

    if (!selection.item) {
      // Cancelled
      fsm.transition(new PlayingState());
      return;
    }

    this.handleScrollSelected(fsm, selection.item);
  }

  private handleScrollSelected(fsm: GameFSM, item: Item): void {
    fsm.addMessage(`You read ${fsm.getItemDisplayName(item)}.`, 'info');

    // Get effects from item definition
    const effects = item.generated?.baseItem.effects as GPEffectDef[] | undefined;

    if (!effects || effects.length === 0) {
      this.executeScroll(fsm, item, {});
      return;
    }

    // Check if targeting is required
    const requiredTarget = getRequiredTargetType(effects);

    if (!requiredTarget) {
      // No targeting needed - execute immediately
      this.executeScroll(fsm, item, {});
      return;
    }

    // Need targeting - save scroll and push targeting state
    this.selectedScroll = item;
    this.pendingTargetType = requiredTarget;

    switch (requiredTarget) {
      case TargetType.Item:
        fsm.push(new ItemTargetingState({
          prompt: this.getPromptForEffects(effects, 'item') ?? 'Select an item:',
        }));
        break;
      case TargetType.Symbol:
        fsm.push(new SymbolTargetingState({
          prompt: this.getPromptForEffects(effects, 'symbol') ?? 'Enter monster symbol:',
        }));
        break;
      case TargetType.Direction:
        fsm.push(new DirectionTargetingState({
          prompt: this.getPromptForEffects(effects, 'direction') ?? 'Choose a direction:',
        }));
        break;
      case TargetType.Position:
        fsm.addMessage('Position targeting not yet implemented.', 'info');
        fsm.transition(new PlayingState());
        break;
      default:
        fsm.addMessage('Unknown targeting type.', 'info');
        fsm.transition(new PlayingState());
    }
  }

  private handleTargetingResult(fsm: GameFSM, result: unknown): void {
    const scroll = this.selectedScroll!;
    const targetType = this.pendingTargetType!;

    // Build target context based on result type
    const targetContext: {
      targetItem?: Item;
      targetSymbol?: string;
      targetDirection?: Direction;
    } = {};

    switch (targetType) {
      case TargetType.Item: {
        const itemResult = result as ItemTargetingResult;
        if (itemResult.cancelled || !itemResult.targetItem) {
          fsm.addMessage('Cancelled.', 'info');
          fsm.transition(new PlayingState());
          return;
        }
        targetContext.targetItem = itemResult.targetItem;
        break;
      }
      case TargetType.Symbol: {
        const symbolResult = result as SymbolTargetingResult;
        if (symbolResult.cancelled || !symbolResult.targetSymbol) {
          fsm.addMessage('Cancelled.', 'info');
          fsm.transition(new PlayingState());
          return;
        }
        targetContext.targetSymbol = symbolResult.targetSymbol;
        break;
      }
      case TargetType.Direction: {
        const dirResult = result as DirectionTargetingResult;
        if (dirResult.cancelled || !dirResult.targetDirection) {
          fsm.addMessage('Cancelled.', 'info');
          fsm.transition(new PlayingState());
          return;
        }
        targetContext.targetDirection = dirResult.targetDirection;
        break;
      }
    }

    this.executeScroll(fsm, scroll, targetContext);
  }

  private executeScroll(
    fsm: GameFSM,
    item: Item,
    targetContext: {
      targetItem?: Item;
      targetSymbol?: string;
      targetDirection?: Direction;
    }
  ): void {
    const store = getGameStore();
    const player = store.player!;
    const level = store.level!;

    // Build full context
    const context: ItemUseContext = {
      player,
      level,
      ...targetContext,
    };

    // Execute scroll effects via ItemUseSystem
    const useResult = useScroll(item, context);

    for (const msg of useResult.messages) {
      fsm.addMessage(msg, 'info');
    }

    // Mark scroll type as known
    fsm.makeAware(item);

    // Save for repeat command
    store.setLastCommand({ actionType: 'read', itemId: item.id });
    store.setIsRepeating(false);

    // Remove consumed scroll
    if (useResult.itemConsumed) {
      player.removeItem(item.id);
    }

    // Complete the turn
    fsm.completeTurn(useResult.energyCost);
    fsm.transition(new PlayingState());
  }

  private getPromptForEffects(effects: GPEffectDef[], targetType: string): string | undefined {
    for (const def of effects) {
      if (def.target === targetType && typeof def['prompt'] === 'string') {
        return def['prompt'];
      }
    }
    return undefined;
  }
}
