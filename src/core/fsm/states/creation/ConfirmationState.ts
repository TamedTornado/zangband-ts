import type { State } from '../../State';
import type { GameAction } from '../../Actions';
import type { GameFSM } from '../../GameFSM';
import { getGameStore } from '@/core/store/gameStore';
import { Player } from '@/core/entities/Player';
import { WildernessInitState } from '../WildernessInitState';
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

      // Save for quick start before clearing
      store.setPreviousCharacter({ ...creation });

      // Create player from character creation data
      const player = Player.fromCreation(creation, fsm.itemGen);
      store.setPlayer(player);

      // Give starting gold
      player.addGold(200);

      // Clear character creation data
      store.setCharacterCreation(null);

      // Transition to wilderness initialization
      fsm.transition(new WildernessInitState());
      return true;
    }

    if (action.type === 'creationBack') {
      fsm.transition(new NameEntryState());
      return true;
    }

    return false;
  }
}
