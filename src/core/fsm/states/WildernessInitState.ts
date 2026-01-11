/**
 * WildernessInitState - Initializes the wilderness and transitions to playing
 *
 * This state handles generating the wilderness map and placing the player
 * at the starting location. It immediately transitions to PlayingState.
 */

import type { State } from '../State';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import { generateWildernessLevel } from '../../systems/wilderness';
import { isWildernessLevel } from '../../world/WildernessLevel';
import { getGameStore } from '@/core/store/gameStore';
import { VIEW_RADIUS } from '../../constants';

export class WildernessInitState implements State {
  readonly name = 'wilderness_init';
  private customMessages: string[] | undefined;

  constructor(customMessages?: string[]) {
    this.customMessages = customMessages;
  }

  onEnter(fsm: GameFSM): void {
    const store = getGameStore();
    const player = store.player!;

    const data = generateWildernessLevel(player);

    // Compute initial FOV using screen coordinates
    if (isWildernessLevel(data.level)) {
      const screenPos = data.level.getPlayerScreenPosition();
      if (screenPos) {
        fsm.fovSystem.computeAndMark(data.level, screenPos, VIEW_RADIUS);
      }
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

    // Store wilderness map for dungeon returns
    store.setWildernessMap(data.wildernessMap);

    // Display messages
    const messages = this.customMessages ?? [
      'Welcome to Zangband!',
      'You are in the wilderness near the starting town.',
    ];
    for (const msg of messages) {
      fsm.addMessage(msg, 'info');
    }

    // Immediately transition to playing
    fsm.transition(new PlayingState());
  }

  onExit(_fsm: GameFSM): void {}

  handleAction(_fsm: GameFSM, _action: unknown): boolean {
    return false;
  }
}
