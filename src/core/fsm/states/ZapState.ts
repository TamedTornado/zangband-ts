/**
 * ZapState - Handles using magical devices (wands, rods, staves)
 *
 * Pushes ItemSelectionState to pick a device, then executes its effects.
 * Handles charges (wands/staves) and timeout (rods) appropriately.
 */

import { RNG } from 'rot-js';
import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import { ItemSelectionState, type ItemSelectionResult } from './ItemSelectionState';
import { TargetingState } from './TargetingState';
import type { Item } from '@/core/entities/Item';
import { getEffectManager, getRequiredTargetType, TargetType, type GPEffectContext } from '../../systems/effects';
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
      const targetResult = result as { position?: { x: number; y: number }; cancelled?: boolean };
      if (targetResult.cancelled || !targetResult.position) {
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

    const item = selection.item;

    // Check if the device can be used
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
      if (targetType === TargetType.Position) {
        const store = getGameStore();
        // In repeat mode with saved target, use it directly
        if (store.isRepeating && store.lastCommand?.targetPosition) {
          this.executeDevice(fsm, item, store.lastCommand.targetPosition);
          return;
        }
        // Need to target a position
        this.selectedItem = item;
        fsm.addMessage('Aim at which target?', 'info');
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

    const effects = item.generated?.baseItem.effects;
    if (effects && effects.length > 0) {
      const context: GPEffectContext = {
        actor: player,
        level,
        rng: RNG,
        monsterDataManager: fsm.monsterDataManager,
        getMonsterInfo: (monster) => {
          const def = fsm.monsterDataManager.getMonsterDef(monster.definitionKey);
          return {
            name: def?.name ?? 'creature',
            flags: def?.flags ?? [],
          };
        },
      };

      // Add target position if provided
      if (targetPosition) {
        context.targetPosition = targetPosition;
      }

      const effectResult = getEffectManager().executeEffects(effects, context);
      for (const msg of effectResult.messages) {
        fsm.addMessage(msg, 'info');
      }
    } else {
      fsm.addMessage('Nothing happens.', 'info');
    }

    // Use a charge / start timeout
    item.useCharge();

    // Mark device type as known
    fsm.makeAware(item);

    // Save for repeat command (include target position if used)
    const lastCommand: { actionType: string; itemId: string; targetPosition?: { x: number; y: number } } = {
      actionType: 'zap',
      itemId: item.id,
    };
    if (targetPosition) {
      lastCommand.targetPosition = targetPosition;
    }
    store.setLastCommand(lastCommand);
    store.setIsRepeating(false);

    // Devices are not consumed (unlike potions/scrolls)
    fsm.transition(new PlayingState());
  }
}
