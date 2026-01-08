/**
 * EatState - Handles eating food
 *
 * Pushes ItemSelectionState to pick food, then executes its effects.
 */

import { RNG } from 'rot-js';
import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import { ItemSelectionState, type ItemSelectionResult } from './ItemSelectionState';
import { getEffectManager, type GPEffectContext } from '../../systems/effects';

export class EatState implements State {
  readonly name = 'eat';

  onEnter(fsm: GameFSM): void {
    fsm.push(new ItemSelectionState({
      prompt: 'Eat what?',
      filter: (item) => item.isFood,
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

    const { player, level } = fsm.data;
    const item = selection.item;

    fsm.addMessage(`You eat ${fsm.getItemDisplayName(item)}.`, 'info');

    const effects = item.generated?.baseItem.effects;
    if (effects && effects.length > 0) {
      const context: GPEffectContext = {
        actor: player,
        level,
        rng: RNG,
      };
      const effectResult = getEffectManager().executeEffects(effects, context);
      for (const msg of effectResult.messages) {
        fsm.addMessage(msg, 'info');
      }
    } else {
      fsm.addMessage('That was tasty.', 'info');
    }

    // Mark food type as known
    fsm.makeAware(item);

    player.removeItem(item.id);
    fsm.transition(new PlayingState());
  }
}
