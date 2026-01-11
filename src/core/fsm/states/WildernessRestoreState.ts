/**
 * WildernessRestoreState - Restores wilderness when returning from dungeon
 *
 * This state handles restoring the wilderness map at the player's previous
 * position when ascending from dungeon depth 1. It immediately transitions
 * to PlayingState.
 */

import type { State } from '../State';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import { restoreWildernessLevel } from '../../systems/wilderness';
import { isWildernessLevel } from '../../world/WildernessLevel';
import { getGameStore } from '@/core/store/gameStore';
import { VIEW_RADIUS } from '../../constants';

export class WildernessRestoreState implements State {
  readonly name = 'wilderness_restore';
  private wildernessX: number;
  private wildernessY: number;

  constructor(wildernessX: number, wildernessY: number) {
    this.wildernessX = wildernessX;
    this.wildernessY = wildernessY;
  }

  onEnter(fsm: GameFSM): void {
    const store = getGameStore();
    const player = store.player!;
    const wildernessMap = store.wildernessMap;

    if (!wildernessMap) {
      fsm.addMessage('No wilderness map available!', 'danger');
      fsm.transition(new PlayingState());
      return;
    }

    const data = restoreWildernessLevel(
      player,
      wildernessMap,
      this.wildernessX,
      this.wildernessY,
      fsm.monsterDataManager
    );

    // Compute initial FOV using world coordinates (level methods expect world coords)
    if (isWildernessLevel(data.level)) {
      fsm.fovSystem.computeAndMark(data.level, player.position, VIEW_RADIUS);
    }

    // Register store positions with StoreManager
    if (data.storeEntrances && data.storeEntrances.length > 0) {
      fsm.storeManager.registerStorePositions(data.storeEntrances);
    }

    store.setLevelData({
      level: data.level,
      scheduler: data.scheduler,
      depth: 0,
      upStairs: data.upStairs,
      downStairs: data.downStairs,
      storeEntrances: data.storeEntrances ?? [],
      isTown: false,
      isWilderness: true,
    });

    // Update stored wilderness map
    store.setWildernessMap(data.wildernessMap);

    fsm.addMessage('You leave the dungeon and return to the wilderness.', 'info');

    // Immediately transition to playing
    fsm.transition(new PlayingState());
  }

  onExit(_fsm: GameFSM): void {}

  handleAction(_fsm: GameFSM, _action: unknown): boolean {
    return false;
  }
}
