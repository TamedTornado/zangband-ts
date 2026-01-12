/**
 * LevelTransitionState - Handles level transitions from effects
 *
 * Triggered by effects that return levelTransition in their result.
 * Handles: teleportLevel (random up/down), recall (town <-> dungeon)
 *
 * Reuses logic from PlayingState's stair handling but without requiring
 * the player to be on stairs.
 */

import { RNG } from 'rot-js';
import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import { WildernessRestoreState } from './WildernessRestoreState';
import { getGameStore } from '@/core/store/gameStore';
import type { LevelTransitionRequest } from '../../systems/effects/GPEffect';

export class LevelTransitionState implements State {
  readonly name = 'levelTransition';
  private request: LevelTransitionRequest;

  constructor(request: LevelTransitionRequest) {
    this.request = request;
  }

  onEnter(fsm: GameFSM): void {
    const store = getGameStore();
    const depth = store.depth;

    // Check for NO_TELE flag on player (from equipment, etc.)
    // TODO: Add this check when equipment flags are implemented
    // if (player.hasFlag('NO_TELE')) {
    //   fsm.addMessage('A mysterious force prevents you from teleporting!', 'warning');
    //   fsm.transition(new PlayingState());
    //   return;
    // }

    let direction: 'up' | 'down';

    switch (this.request.direction) {
      case 'up':
        direction = 'up';
        break;

      case 'down':
        direction = 'down';
        break;

      case 'random':
        // 50% up or down, but always up if at max depth
        // TODO: Check dungeon max depth when implemented
        direction = RNG.getUniformInt(0, 1) === 0 ? 'up' : 'down';
        break;

      case 'recall':
        // TODO: Implement when Word of Recall effect is added
        fsm.addMessage('Nothing happens.', 'info');
        fsm.transition(new PlayingState());
        return;

      default:
        fsm.addMessage('Nothing happens.', 'info');
        fsm.transition(new PlayingState());
        return;
    }

    // Handle up/down
    if (direction === 'up') {
      this.handleUp(fsm, depth);
    } else {
      this.handleDown(fsm, depth);
    }
  }

  private handleUp(fsm: GameFSM, depth: number): void {
    const store = getGameStore();

    // At depth 0 (town/wilderness), can't go up
    if (depth <= 0) {
      fsm.addMessage('You sense no levels above you.', 'info');
      fsm.transition(new PlayingState());
      return;
    }

    // At depth 1, return to wilderness if available
    if (depth === 1 && store.wildernessMap) {
      fsm.addMessage('You rise up through the ceiling.', 'info');
      const wildernessX = store.wildernessX;
      const wildernessY = store.wildernessY;
      fsm.transition(new WildernessRestoreState(wildernessX, wildernessY));
      return;
    }

    // Go up one level
    const newDepth = depth - 1;
    this.goToDepth(fsm, newDepth, 'up');
  }

  private handleDown(fsm: GameFSM, depth: number): void {
    const store = getGameStore();

    // Save wilderness position if leaving from wilderness
    if (depth === 0 && store.isInWilderness) {
      const player = store.player!;
      store.setWildernessPosition(player.position.x, player.position.y);
    }

    // Go down one level
    const newDepth = depth + 1;
    this.goToDepth(fsm, newDepth, 'down');
  }

  private goToDepth(fsm: GameFSM, newDepth: number, direction: 'up' | 'down'): void {
    const store = getGameStore();

    // Update depth and generate new level
    // goToLevel places the player at a random valid position
    store.setDepth(newDepth);
    fsm.goToLevel(newDepth);

    // Message based on direction
    if (direction === 'up') {
      fsm.addMessage('You rise up through the ceiling.', 'info');
    } else {
      fsm.addMessage('You sink through the floor.', 'info');
    }

    if (newDepth > 0) {
      fsm.addMessage(`You are now on dungeon level ${newDepth}.`, 'info');
    }

    fsm.transition(new PlayingState());
  }

  onExit(_fsm: GameFSM): void {
    // No cleanup needed
  }

  handleAction(_fsm: GameFSM, _action: GameAction): boolean {
    // This state transitions immediately, no actions needed
    return false;
  }
}
