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

  onEnter(fsm: GameFSM): void {
    fsm.push(new ItemSelectionState({
      prompt: 'Wield/wear which item?',
      filter: (item) => {
        // Can wield weapons, armor, and accessories
        const tval = item.tval;
        // Weapons: TV_SWORD, TV_HAFTED, TV_POLEARM, TV_BOW
        // Armor: TV_SOFT_ARMOR, TV_HARD_ARMOR, TV_DRAG_ARMOR
        // Other: TV_SHIELD, TV_CLOAK, TV_GLOVES, TV_BOOTS, TV_HELM, TV_CROWN
        // Accessories: TV_RING, TV_AMULET, TV_LITE
        const wieldableTvals = [
          23, 21, 22, 19, // weapons (sword, hafted, polearm, bow)
          36, 37, 38, // armor (soft, hard, dragon)
          34, 35, 33, 30, 32, 31, // shield, cloak, gloves, boots, helm, crown
          45, 40, 39, // ring, amulet, lite
        ];
        return wieldableTvals.includes(tval);
      },
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
