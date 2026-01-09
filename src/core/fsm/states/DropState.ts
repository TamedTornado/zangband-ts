/**
 * DropState - Handles dropping an item
 *
 * Pushes ItemSelectionState to pick an item, then drops it.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import { ItemSelectionState, type ItemSelectionResult } from './ItemSelectionState';
import { getGameStore } from '@/core/store/gameStore';

export class DropState implements State {
  readonly name = 'drop';

  onEnter(fsm: GameFSM): void {
    fsm.push(new ItemSelectionState({
      prompt: 'Drop which item?',
      // No filter - can drop anything
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

    player.removeItem(item.id);
    item.position = { ...player.position };
    level.addItem(item);
    fsm.addMessage(`You drop ${item.name}.`, 'info');

    fsm.transition(new PlayingState());
  }
}
