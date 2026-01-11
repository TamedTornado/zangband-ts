import type { State } from '../../State';
import type { GameAction } from '../../Actions';
import type { GameFSM } from '../../GameFSM';
import { getGameStore } from '@/core/store/gameStore';
import { createInitialCreationData } from '@/core/data/characterCreation';
import { RaceSelectionState } from './RaceSelectionState';
import { WildernessInitState } from '../WildernessInitState';
import { Player } from '@/core/entities/Player';

export class SexSelectionState implements State {
  readonly name = 'sexSelection';

  onEnter(_fsm: GameFSM): void {
    const store = getGameStore();
    store.setCharacterCreation(createInitialCreationData());
  }

  onExit(_fsm: GameFSM): void {}

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    if (action.type === 'selectSex') {
      const store = getGameStore();
      store.updateCharacterCreation({ sex: action.sex });
      return true;
    }

    if (action.type === 'creationNext') {
      const store = getGameStore();
      if (store.characterCreation?.sex) {
        fsm.transition(new RaceSelectionState());
        return true;
      }
    }

    if (action.type === 'quickStart') {
      const store = getGameStore();
      const prev = store.previousCharacter;
      if (!prev) return false;

      // Create player directly from previous character data
      const player = Player.fromCreation(prev, fsm.itemGen);
      store.setPlayer(player);

      // Give starting gold
      player.addGold(200);

      // Clear character creation data
      store.setCharacterCreation(null);

      // Transition to wilderness with custom messages
      fsm.transition(new WildernessInitState([
        'Welcome back to Zangband!',
        `${prev.name} the ${prev.raceKey} ${prev.classKey} enters the wilderness.`,
      ]));
      return true;
    }

    return false;
  }
}
