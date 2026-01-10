import type { State } from '../../State';
import type { GameAction } from '../../Actions';
import type { GameFSM } from '../../GameFSM';
import { getGameStore } from '@/core/store/gameStore';
import { StatRollingState } from './StatRollingState';
import { ConfirmationState } from './ConfirmationState';

export class NameEntryState implements State {
  readonly name = 'nameEntry';

  onEnter(_fsm: GameFSM): void {}

  onExit(_fsm: GameFSM): void {}

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    if (action.type === 'setName') {
      const store = getGameStore();
      const trimmedName = action.name.trim();

      store.updateCharacterCreation({ name: trimmedName });

      if (trimmedName.length > 0) {
        fsm.transition(new ConfirmationState());
      }
      return true;
    }

    if (action.type === 'creationBack') {
      fsm.transition(new StatRollingState());
      return true;
    }

    return false;
  }
}
