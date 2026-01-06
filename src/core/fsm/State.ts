/**
 * FSM State Interface
 */

import type { GameFSM } from './GameFSM';
import type { GameAction } from './Actions';

/** Base state interface */
export interface State {
  readonly name: string;

  /** Called when entering this state */
  onEnter(fsm: GameFSM): void;

  /** Called when exiting this state */
  onExit(fsm: GameFSM): void;

  /** Handle an action - returns true if action was handled */
  handleAction(fsm: GameFSM, action: GameAction): boolean;
}
