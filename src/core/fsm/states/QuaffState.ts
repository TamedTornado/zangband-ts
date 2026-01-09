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
import { getEffectManager, type GPEffectContext } from '../../systems/effects';
import { getGameStore } from '@/core/store/gameStore';

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

    const store = getGameStore();
    const player = store.player!;
    const level = store.level!;
    const item = selection.item;

    fsm.addMessage(`You quaff ${fsm.getItemDisplayName(item)}.`, 'info');

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
      fsm.addMessage('That tasted... interesting.', 'info');
    }

    // Mark potion type as known
    fsm.makeAware(item);

    // Save for repeat command
    store.setLastCommand({ actionType: 'quaff', itemId: item.id });
    store.setIsRepeating(false);

    player.removeItem(item.id);
    fsm.transition(new PlayingState());
  }
}
