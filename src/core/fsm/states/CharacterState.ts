/**
 * CharacterState - View character information
 *
 * FSM state for viewing player stats, skills, etc.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';

export class CharacterState implements State {
  readonly name = 'character';

  onEnter(_fsm: GameFSM): void {
    // Nothing special - UI will render based on stateName
  }

  onExit(_fsm: GameFSM): void {
    // Nothing to clean up
  }

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    switch (action.type) {
      case 'toggleCharacter':
      case 'cancelTarget':
        // Close character view
        fsm.transition(new PlayingState());
        return true;
      default:
        return false;
    }
  }
}
