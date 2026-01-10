import type { State } from '../../State';
import type { GameAction } from '../../Actions';
import type { GameFSM } from '../../GameFSM';
import { getGameStore } from '@/core/store/gameStore';
import { createInitialCreationData } from '@/core/data/characterCreation';
import { RaceSelectionState } from './RaceSelectionState';

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

    return false;
  }
}
