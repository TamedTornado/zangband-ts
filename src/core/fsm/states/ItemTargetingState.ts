/**
 * ItemTargetingState - Select an inventory item for an effect
 *
 * A utility state that gathers target info and pops back to the calling state.
 * Does NOT execute effects - that's the caller's responsibility.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import type { Item } from '@/core/entities/Item';
import { getGameStore } from '@/core/store/gameStore';

export interface ItemTargetingConfig {
  prompt: string;
  filter?: (item: Item) => boolean;
}

export interface ItemTargetingResult {
  cancelled: boolean;
  targetItem?: Item;
}

export class ItemTargetingState implements State {
  readonly name = 'itemTargeting';

  private config: ItemTargetingConfig;

  constructor(config: ItemTargetingConfig) {
    this.config = config;
  }

  onEnter(fsm: GameFSM): void {
    fsm.addMessage(this.config.prompt, 'info');

    const validItems = this.getValidItems();
    getGameStore().setItemTargeting({
      prompt: this.config.prompt,
      validItemIndices: validItems.map((_, i) => i),
    });
  }

  onExit(_fsm: GameFSM): void {
    getGameStore().setItemTargeting(null);
  }

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    switch (action.type) {
      case 'selectTargetItem':
        return this.handleSelectItem(fsm, action.itemIndex);
      case 'letterSelect': {
        // Convert letter to item index (a=0, b=1, etc.)
        const index = action.letter.charCodeAt(0) - 'a'.charCodeAt(0);
        if (index >= 0 && index < 26) {
          return this.handleSelectItem(fsm, index);
        }
        return false;
      }
      case 'cancelTarget':
        this.handleCancel(fsm);
        return true;
      default:
        return false;
    }
  }

  private handleSelectItem(fsm: GameFSM, itemIndex: number): boolean {
    const validItems = this.getValidItems();
    const item = validItems[itemIndex];

    if (!item) {
      fsm.addMessage('Invalid item selection.', 'info');
      return true;
    }

    // Pop back with the selected item
    const result: ItemTargetingResult = {
      cancelled: false,
      targetItem: item,
    };
    fsm.pop(result);
    return true;
  }

  private handleCancel(fsm: GameFSM): void {
    fsm.addMessage('Cancelled.', 'info');
    const result: ItemTargetingResult = { cancelled: true };
    fsm.pop(result);
  }

  private getValidItems(): Item[] {
    const player = getGameStore().player!;
    if (this.config.filter) {
      return player.inventory.filter(this.config.filter);
    }
    return player.inventory;
  }
}
