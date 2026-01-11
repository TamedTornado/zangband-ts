/**
 * DeadState - Player has died
 *
 * Blocks gameplay actions, allows restart.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { WildernessInitState } from './WildernessInitState';
import { getGameStore } from '@/core/store/gameStore';

export class DeadState implements State {
  readonly name = 'dead';

  onEnter(fsm: GameFSM): void {
    const store = getGameStore();
    const cause = store.killedBy ?? 'unknown causes';
    fsm.addMessage(`You have been killed by ${cause}.`, 'danger');
    fsm.addMessage(`You died on dungeon level ${store.depth}, turn ${store.turn}.`, 'info');
    fsm.addMessage('Press R to restart.', 'info');
  }

  onExit(_fsm: GameFSM): void {
    // Nothing special on exit
  }

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    if (action.type === 'restart') {
      fsm.initGameData();
      fsm.transition(new WildernessInitState());
      return true;
    }
    // Block all other actions
    return false;
  }
}
