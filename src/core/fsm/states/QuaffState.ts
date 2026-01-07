/**
 * QuaffState - Handles quaffing a potion
 *
 * Pushes ItemSelectionState to pick a potion, then executes its effects.
 */

import { RNG } from 'rot-js';
import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import { ItemSelectionState, type ItemSelectionResult } from './ItemSelectionState';
import { executeEffects } from '../../systems/effects';

export class QuaffState implements State {
  readonly name = 'quaff';

  onEnter(fsm: GameFSM): void {
    fsm.push(new ItemSelectionState({
      prompt: 'Quaff which potion?',
      filter: (item) => item.isPotion,
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

    fsm.addMessage(`You quaff ${fsm.getItemDisplayName(item)}.`, 'info');

    const effects = item.generated?.baseItem.effects;
    if (effects && effects.length > 0) {
      const effectResult = executeEffects(effects, player, RNG);
      for (const msg of effectResult.messages) {
        fsm.addMessage(msg, 'info');
      }
    } else {
      fsm.addMessage('That tasted... interesting.', 'info');
    }

    // Mark potion type as known
    fsm.makeAware(item);

    player.removeItem(item.id);
    fsm.transition(new PlayingState());
  }
}
