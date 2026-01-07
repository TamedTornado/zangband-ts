/**
 * ItemSelectionState - Utility state for selecting an inventory item
 *
 * Used as a child state (pushed) by action states like ReadScrollState, QuaffState, etc.
 * Shows text prompt by default, optional list display on '?' key.
 * Pops with selected Item or null on cancel.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import type { Item } from '@/core/entities/Item';

export interface ItemSelectionOptions {
  prompt: string;
  filter?: (item: Item) => boolean;
}

export interface ItemSelectionResult {
  item: Item | null;
  itemIndex: number;
}

export class ItemSelectionState implements State {
  readonly name = 'itemSelection';

  private options: ItemSelectionOptions;
  private showList: boolean = false;

  constructor(options: ItemSelectionOptions) {
    this.options = options;
  }

  onEnter(fsm: GameFSM): void {
    const validIndices = this.getValidItemIndices(fsm);

    if (validIndices.length === 0) {
      fsm.addMessage('You have nothing to select.', 'info');
      fsm.pop({ item: null, itemIndex: -1 });
      return;
    }

    fsm.addMessage(`${this.options.prompt} [a-z, ? for list]`, 'info');

    fsm.data.itemTargeting = {
      prompt: this.options.prompt,
      validItemIndices: validIndices,
    };
  }

  onExit(fsm: GameFSM): void {
    fsm.data.itemTargeting = null;
  }

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    switch (action.type) {
      case 'letterSelect':
        return this.handleLetterSelect(fsm, action.letter);
      case 'showList':
        this.showList = !this.showList;
        fsm.notify();
        return true;
      case 'cancelTarget':
        fsm.addMessage('Cancelled.', 'info');
        fsm.pop({ item: null, itemIndex: -1 });
        return true;
      default:
        return false;
    }
  }

  private handleLetterSelect(fsm: GameFSM, letter: string): boolean {
    const index = letter.charCodeAt(0) - 'a'.charCodeAt(0);
    if (index < 0 || index >= 26) {
      return false;
    }

    const { player } = fsm.data;
    const item = player.inventory[index];

    if (!item) {
      fsm.addMessage('Invalid selection.', 'info');
      return true;
    }

    if (this.options.filter && !this.options.filter(item)) {
      fsm.addMessage("You can't select that item.", 'info');
      return true;
    }

    fsm.pop({ item, itemIndex: index } as ItemSelectionResult);
    return true;
  }

  private getValidItemIndices(fsm: GameFSM): number[] {
    const { player } = fsm.data;
    const indices: number[] = [];

    for (let i = 0; i < player.inventory.length; i++) {
      const item = player.inventory[i];
      if (!this.options.filter || this.options.filter(item)) {
        indices.push(i);
      }
    }

    return indices;
  }

  isShowingList(): boolean {
    return this.showList;
  }
}
