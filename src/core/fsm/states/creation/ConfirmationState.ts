import type { State } from '../../State';
import type { GameAction } from '../../Actions';
import type { GameFSM } from '../../GameFSM';
import { getGameStore } from '@/core/store/gameStore';
import { Player } from '@/core/entities/Player';
import { PlayingState } from '../PlayingState';
import { NameEntryState } from './NameEntryState';

export class ConfirmationState implements State {
  readonly name = 'confirmation';

  onEnter(_fsm: GameFSM): void {}

  onExit(_fsm: GameFSM): void {}

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    if (action.type === 'confirmCharacter') {
      const store = getGameStore();
      const creation = store.characterCreation;
      if (!creation) return false;

      // Create player from character creation data
      const player = Player.fromCreation(creation, fsm.itemGen);
      store.setPlayer(player);

      // Clear character creation data
      store.setCharacterCreation(null);

      // Generate first level
      fsm.goToLevel(1);

      fsm.addMessage('Welcome to Zangband!', 'info');
      fsm.addMessage(`You enter dungeon level ${store.depth}.`, 'info');

      fsm.transition(new PlayingState());
      return true;
    }

    if (action.type === 'creationBack') {
      fsm.transition(new NameEntryState());
      return true;
    }

    return false;
  }
}
