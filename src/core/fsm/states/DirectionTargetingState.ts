/**
 * DirectionTargetingState - Select a direction for an effect
 *
 * A utility state that gathers target info and pops back to the calling state.
 * Does NOT execute effects - that's the caller's responsibility.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import type { Direction } from '@/core/types';
import { getGameStore } from '@/core/store/gameStore';

export interface DirectionTargetingConfig {
  prompt: string;
}

export interface DirectionTargetingResult {
  cancelled: boolean;
  targetDirection?: Direction;
}

export class DirectionTargetingState implements State {
  readonly name = 'directionTargeting';

  private config: DirectionTargetingConfig;

  constructor(config: DirectionTargetingConfig) {
    this.config = config;
  }

  onEnter(fsm: GameFSM): void {
    fsm.addMessage(this.config.prompt, 'info');
    getGameStore().setDirectionTargeting({ prompt: this.config.prompt });
  }

  onExit(_fsm: GameFSM): void {
    getGameStore().setDirectionTargeting(null);
  }

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    switch (action.type) {
      case 'selectTargetDirection':
        return this.handleSelectDirection(fsm, action.dir);
      case 'cancelTarget':
        this.handleCancel(fsm);
        return true;
      default:
        return false;
    }
  }

  private handleSelectDirection(fsm: GameFSM, direction: Direction): boolean {
    // Pop back with the selected direction
    const result: DirectionTargetingResult = {
      cancelled: false,
      targetDirection: direction,
    };
    fsm.pop(result);
    return true;
  }

  private handleCancel(fsm: GameFSM): void {
    fsm.addMessage('Cancelled.', 'info');
    const result: DirectionTargetingResult = { cancelled: true };
    fsm.pop(result);
  }
}
