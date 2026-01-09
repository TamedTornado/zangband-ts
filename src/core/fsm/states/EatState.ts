/**
 * EatState - Handles eating food
 *
 * Pushes ItemSelectionState to pick food, then delegates to ItemUseSystem.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import { ItemSelectionState, type ItemSelectionResult } from './ItemSelectionState';
import { useFood } from '../../systems/ItemUseSystem';
import { getGameStore } from '@/core/store/gameStore';

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

    const store = getGameStore();
    const player = store.player!;
    const level = store.level!;
    const item = selection.item;

    fsm.addMessage(`You eat ${fsm.getItemDisplayName(item)}.`, 'info');

    // Execute food effects via ItemUseSystem
    const useResult = useFood(item, { player, level });
    for (const msg of useResult.messages) {
      fsm.addMessage(msg, 'info');
    }

    // Mark food type as known
    fsm.makeAware(item);

    // Save for repeat command
    store.setLastCommand({ actionType: 'eat', itemId: item.id });
    store.setIsRepeating(false);

    // Remove consumed food
    if (useResult.itemConsumed) {
      player.removeItem(item.id);
    }

    // Complete the turn
    fsm.completeTurn(useResult.energyCost);
    fsm.transition(new PlayingState());
  }
}
