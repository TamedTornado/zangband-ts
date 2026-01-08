/**
 * WieldState - Handles wielding/wearing equipment
 *
 * Pushes ItemSelectionState to pick an item, then equips it.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import { ItemSelectionState, type ItemSelectionResult } from './ItemSelectionState';

export class WieldState implements State {
  readonly name = 'wield';

  private static readonly WIELDABLE_TYPES = new Set([
    // Weapons
    'sword', 'hafted', 'polearm', 'bow', 'digging',
    // Armor
    'soft_armor', 'hard_armor', 'dragon_armor',
    // Other equipment
    'shield', 'cloak', 'gloves', 'boots', 'helm', 'crown',
    // Accessories
    'ring', 'amulet', 'light',
  ]);

  onEnter(fsm: GameFSM): void {
    fsm.push(new ItemSelectionState({
      prompt: 'Wield/wear which item?',
      filter: (item) => WieldState.WIELDABLE_TYPES.has(item.type),
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

    const equipResult = player.equip(item);
    if (equipResult.equipped) {
      fsm.addMessage(`You wield ${item.name}.`, 'info');
      if (equipResult.unequipped) {
        fsm.addMessage(`You were wielding ${equipResult.unequipped.name}.`, 'info');
      }
    }

    fsm.transition(new PlayingState());
  }
}
