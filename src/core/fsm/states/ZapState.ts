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
import { executeEffects } from '../../systems/effects';

export class ZapState implements State {
  readonly name = 'zap';

  onEnter(fsm: GameFSM): void {
    fsm.push(new ItemSelectionState({
      prompt: 'Zap which device?',
      filter: (item) => item.isDevice,
    }));
  }

  onExit(_fsm: GameFSM): void {
    // Nothing to clean up
  }

  handleAction(_fsm: GameFSM, _action: GameAction): boolean {
    return false;
  }

  onResume(fsm: GameFSM, result: unknown): void {
    const selection = result as ItemSelectionResult;

    if (!selection.item) {
      fsm.transition(new PlayingState());
      return;
    }

    const { player } = fsm.data;
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

    const effects = item.generated?.baseItem.effects;
    if (effects && effects.length > 0) {
      const effectResult = executeEffects(effects, player, RNG);
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

    // Devices are not consumed (unlike potions/scrolls)
    fsm.transition(new PlayingState());
  }
}
