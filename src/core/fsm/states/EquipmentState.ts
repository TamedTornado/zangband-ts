/**
 * EquipmentState - View player's equipped items
 *
 * FSM state for viewing equipment and taking off items.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';

export class EquipmentState implements State {
  readonly name = 'equipment';

  onEnter(_fsm: GameFSM): void {
    // Nothing special - UI will render based on stateName
  }

  onExit(_fsm: GameFSM): void {
    // Nothing to clean up
  }

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    switch (action.type) {
      case 'toggleEquipment':
      case 'cancelTarget':
        // Close equipment view
        fsm.transition(new PlayingState());
        return true;
      case 'takeOff':
        // Handle taking off equipment
        this.handleTakeOff(fsm, action.slot);
        return true;
      default:
        return false;
    }
  }

  private handleTakeOff(fsm: GameFSM, slot: string): void {
    const { player } = fsm.data;
    const item = player.unequip(slot as any);
    if (item) {
      fsm.addMessage(`You take off ${item.name}.`, 'info');
    }
  }
}
