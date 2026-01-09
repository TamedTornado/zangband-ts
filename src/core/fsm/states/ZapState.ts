/**
 * ZapState - Handles using magical devices (wands, rods, staves)
 *
 * Pushes ItemSelectionState to pick a device, then delegates to ItemUseSystem.
 * Uses TargetingState for targeted effects (supports both direction and position input).
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import { ItemSelectionState, type ItemSelectionResult } from './ItemSelectionState';
import { TargetingState } from './TargetingState';
import type { Item } from '@/core/entities/Item';
import { getRequiredTargetType, TargetType } from '../../systems/effects';
import { useDevice, type ItemUseContext } from '../../systems/ItemUseSystem';
import { getGameStore } from '@/core/store/gameStore';

export class ZapState implements State {
  readonly name = 'zap';

  private selectedItem: Item | null = null;

  onEnter(fsm: GameFSM): void {
    fsm.push(new ItemSelectionState({
      prompt: 'Zap which device?',
      filter: (item) => item.isDevice,
    }));
  }

  onExit(_fsm: GameFSM): void {
    this.selectedItem = null;
  }

  handleAction(_fsm: GameFSM, _action: GameAction): boolean {
    return false;
  }

  onResume(fsm: GameFSM, result: unknown): void {
    // Check if returning from targeting
    if (this.selectedItem) {
      const targetResult = result as {
        position?: { x: number; y: number };
        direction?: string;
        cancelled?: boolean;
      };
      if (targetResult.cancelled) {
        fsm.addMessage('Cancelled.', 'info');
        fsm.transition(new PlayingState());
        return;
      }

      // Execute with target position
      this.executeDevice(fsm, this.selectedItem, targetResult.position);
      return;
    }

    // Returning from item selection
    const selection = result as ItemSelectionResult;

    if (!selection.item) {
      fsm.transition(new PlayingState());
      return;
    }

    this.handleDeviceSelected(fsm, selection.item);
  }

  private handleDeviceSelected(fsm: GameFSM, item: Item): void {
    // Check if the device can be used (early validation for better UX)
    if (item.isWand || item.isStaff) {
      if (item.charges <= 0) {
        fsm.addMessage(`The ${item.isWand ? 'wand' : 'staff'} has no charges left.`, 'danger');
        fsm.transition(new PlayingState());
        return;
      }
    } else if (item.isRod) {
      if (!item.isReady) {
        fsm.addMessage(`The rod is still recharging (${item.timeout} turns left).`, 'danger');
        fsm.transition(new PlayingState());
        return;
      }
    }

    // Determine the action verb based on device type
    const verb = item.isWand ? 'aim' : item.isRod ? 'zap' : 'use';
    fsm.addMessage(`You ${verb} ${fsm.getItemDisplayName(item)}.`, 'info');

    // Check if effects need targeting
    const effects = item.generated?.baseItem.effects;
    if (effects && effects.length > 0) {
      const targetType = getRequiredTargetType(effects);

      if (targetType === TargetType.Position || targetType === TargetType.Direction) {
        const store = getGameStore();
        // In repeat mode with saved target, use it directly
        if (store.isRepeating && store.lastCommand?.targetPosition) {
          this.executeDevice(fsm, item, store.lastCommand.targetPosition);
          return;
        }
        // Need targeting - TargetingState handles both direction and position input
        this.selectedItem = item;
        fsm.push(new TargetingState(true));
        return;
      }
    }

    // No targeting needed, execute immediately
    this.executeDevice(fsm, item);
  }

  private executeDevice(
    fsm: GameFSM,
    item: Item,
    targetPosition?: { x: number; y: number }
  ): void {
    const store = getGameStore();
    const player = store.player!;
    const level = store.level!;

    // Execute device effects via ItemUseSystem
    const context: ItemUseContext = {
      player,
      level,
      monsterDataManager: fsm.monsterDataManager,
    };
    if (targetPosition) {
      context.targetPosition = targetPosition;
    }
    const useResult = useDevice(item, context);

    for (const msg of useResult.messages) {
      fsm.addMessage(msg, 'info');
    }

    // Mark device type as known
    fsm.makeAware(item);

    // Save for repeat command (include target position if used)
    const lastCommand: {
      actionType: string;
      itemId: string;
      targetPosition?: { x: number; y: number };
    } = {
      actionType: 'zap',
      itemId: item.id,
    };
    if (targetPosition) {
      lastCommand.targetPosition = targetPosition;
    }
    store.setLastCommand(lastCommand);
    store.setIsRepeating(false);

    // Complete the turn with the calculated energy cost
    fsm.completeTurn(useResult.energyCost);
    fsm.transition(new PlayingState());
  }
}
