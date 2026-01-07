/**
 * InventoryState - View player's inventory
 *
 * FSM state for browsing inventory. UI renders based on stateName.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';

export class InventoryState implements State {
  readonly name = 'inventory';

  onEnter(_fsm: GameFSM): void {
    // Nothing special - UI will render based on stateName
  }

  onExit(_fsm: GameFSM): void {
    // Nothing to clean up
  }

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    switch (action.type) {
      case 'toggleInventory':
      case 'cancelTarget':
        // Close inventory
        fsm.transition(new PlayingState());
        return true;
      default:
        return false;
    }
  }
}
