/**
 * QuaffState - Handles quaffing a potion
 *
 * Pushes ItemSelectionState to pick a potion, then delegates to ItemUseSystem.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import { ItemSelectionState, type ItemSelectionResult } from './ItemSelectionState';
import { usePotion } from '../../systems/ItemUseSystem';
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

    // Execute potion effects via ItemUseSystem
    const useResult = usePotion(item, { player, level });
    for (const msg of useResult.messages) {
      fsm.addMessage(msg, 'info');
    }

    // Mark potion type as known
    fsm.makeAware(item);

    // Save for repeat command
    store.setLastCommand({ actionType: 'quaff', itemId: item.id });
    store.setIsRepeating(false);

    // Remove consumed potion
    if (useResult.itemConsumed) {
      player.removeItem(item.id);
    }

    // Spend energy
    fsm.completeTurn(useResult.energyCost);
    fsm.transition(new PlayingState());
  }
}
