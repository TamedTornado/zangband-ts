/**
 * ReadScrollState - Handles reading a scroll
 *
 * Pushes ItemSelectionState to pick a scroll, then executes its effects.
 */

import { RNG } from 'rot-js';
import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import { ItemSelectionState, type ItemSelectionResult } from './ItemSelectionState';
import { ItemTargetingState } from './ItemTargetingState';
import { SymbolTargetingState } from './SymbolTargetingState';
import { DirectionTargetingState } from './DirectionTargetingState';
import {
  executeGPEffects,
  getRequiredTargetType,
  TargetType,
  type GPEffectDef,
  type GPEffectContext,
} from '../../systems/effects';
import type { Item } from '../../entities/Item';

export class ReadScrollState implements State {
  readonly name = 'readScroll';

  onEnter(fsm: GameFSM): void {
    // Push item selection for scrolls
    fsm.push(new ItemSelectionState({
      prompt: 'Read which scroll?',
      filter: (item) => item.isScroll,
    }));
  }

  onExit(_fsm: GameFSM): void {
    // Nothing to clean up
  }

  handleAction(_fsm: GameFSM, _action: GameAction): boolean {
    // We shouldn't receive actions directly - ItemSelectionState handles input
    return false;
  }

  onResume(fsm: GameFSM, result: unknown): void {
    const selection = result as ItemSelectionResult;

    if (!selection.item) {
      // Cancelled
      fsm.transition(new PlayingState());
      return;
    }

    this.executeScroll(fsm, selection.item);
  }

  private executeScroll(fsm: GameFSM, item: Item): void {
    const { player, level } = fsm.data;

    // Get effects from item definition
    const effects = item.generated?.baseItem.effects as GPEffectDef[] | undefined;

    if (!effects || effects.length === 0) {
      fsm.addMessage(`You read ${item.name}.`, 'info');
      fsm.addMessage('The scroll crumbles to dust.', 'info');
      player.removeItem(item.id);
      fsm.transition(new PlayingState());
      return;
    }

    fsm.addMessage(`You read ${item.name}.`, 'info');

    // Build base context
    const baseContext: GPEffectContext = {
      actor: player,
      level,
      rng: RNG,
    };

    // Check if targeting is required
    const requiredTarget = getRequiredTargetType(effects);

    if (!requiredTarget) {
      // All self-targeted - execute immediately
      const result = executeGPEffects(effects, baseContext);
      for (const msg of result.messages) {
        fsm.addMessage(msg, 'info');
      }
      if (result.success) {
        player.removeItem(item.id);
      }
      fsm.transition(new PlayingState());
      return;
    }

    // Transition to appropriate targeting state
    const onComplete = () => {
      fsm.notify();
    };

    switch (requiredTarget) {
      case TargetType.Item:
        fsm.transition(new ItemTargetingState(effects, baseContext, item, onComplete));
        break;
      case TargetType.Symbol:
        fsm.transition(new SymbolTargetingState(effects, baseContext, item, onComplete));
        break;
      case TargetType.Direction:
        fsm.transition(new DirectionTargetingState(effects, baseContext, item, onComplete));
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
}
