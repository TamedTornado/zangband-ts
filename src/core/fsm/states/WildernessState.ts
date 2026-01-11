/**
 * WildernessState - State for wilderness/overworld navigation
 *
 * Thin state that delegates logic to WildernessSystem.
 * Handles FSM transitions and message routing only.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import { getGameStore } from '@/core/store/gameStore';
import { WildernessSystem } from '@/core/systems/wilderness/WildernessSystem';

export class WildernessState implements State {
  readonly name = 'wilderness';
  private system = new WildernessSystem();

  onEnter(fsm: GameFSM): void {
    const store = getGameStore();
    store.setIsInWilderness(true);
    fsm.addMessage('You are in the wilderness.', 'info');
  }

  onExit(_fsm: GameFSM): void {
    // Wilderness state cleanup if needed
  }

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    switch (action.type) {
      case 'move':
        return this.handleMove(fsm, action.dir);

      case 'enterPlace':
        return this.handleEnterPlace(fsm, action.placeKey);

      case 'goDownStairs':
        return this.handleEnterDungeon(fsm);

      case 'exitWilderness':
        fsm.transition(new PlayingState());
        return true;

      case 'look':
        this.showWildernessInfo(fsm);
        return true;

      default:
        return false;
    }
  }

  private handleMove(fsm: GameFSM, dir: import('../../types').Direction): boolean {
    const result = this.system.move(dir);

    // Add all messages from the result
    for (const msg of result.messages) {
      fsm.addMessage(msg.text, msg.type);
    }

    // Auto-enter towns
    if (result.enteredPlace && result.enteredPlace.type === 'town') {
      fsm.addMessage(`You enter ${result.enteredPlace.name}.`, 'info');
      return this.enterPlace(fsm, result.enteredPlace.key);
    }

    return result.success;
  }

  private handleEnterPlace(fsm: GameFSM, placeKey: string): boolean {
    return this.enterPlace(fsm, placeKey);
  }

  private handleEnterDungeon(fsm: GameFSM): boolean {
    const place = this.system.getPlaceAtCurrentPosition();

    if (!place) {
      fsm.addMessage('There is no dungeon here.', 'info');
      return false;
    }

    if (place.type !== 'dungeon') {
      fsm.addMessage('You cannot enter here with ">".', 'info');
      return false;
    }

    return this.enterPlace(fsm, place.key);
  }

  private enterPlace(fsm: GameFSM, placeKey: string): boolean {
    const store = getGameStore();
    const wildernessMap = store.wildernessMap;

    if (!wildernessMap) {
      return false;
    }

    const place = wildernessMap.getPlace(placeKey);
    if (!place) {
      fsm.addMessage('That place does not exist.', 'danger');
      return false;
    }

    // Set current place and exit wilderness
    store.setCurrentPlace(place);
    store.setIsInWilderness(false);

    // Generate level and transition
    if (place.type === 'town') {
      fsm.goToLevel(0);
      fsm.addMessage(`Welcome to ${place.name}!`, 'info');
    } else if (place.type === 'dungeon') {
      fsm.goToLevel(1);
      fsm.addMessage(`You enter ${place.name}.`, 'info');
    }

    fsm.transition(new PlayingState());
    return true;
  }

  private showWildernessInfo(fsm: GameFSM): void {
    const messages = this.system.getLocationInfo();
    for (const msg of messages) {
      fsm.addMessage(msg.text, msg.type);
    }
  }
}
