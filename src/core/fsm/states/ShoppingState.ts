/**
 * ShoppingState - Store interaction state
 *
 * Handles buying and selling items at stores.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import type { Store } from '@/core/systems/Store';
import type { Item } from '@/core/entities/Item';
import { getGameStore } from '@/core/store/gameStore';

export type ShoppingMode = 'buy' | 'sell';

export class ShoppingState implements State {
  readonly name = 'shopping';
  readonly storeKey: string;
  private _mode: ShoppingMode = 'buy';
  private _store: Store | undefined;

  constructor(storeKey: string) {
    this.storeKey = storeKey;
  }

  get mode(): ShoppingMode {
    return this._mode;
  }

  get store(): Store | undefined {
    return this._store;
  }

  onEnter(fsm: GameFSM): void {
    this._store = fsm.storeManager.getStore(this.storeKey);
    if (this._store) {
      fsm.addMessage(`Welcome to ${this._store.definition.name}!`, 'info');
      fsm.addMessage(`"${this._store.owner.name}" greets you.`, 'info');
      this.updateStoreState(fsm);
    }
  }

  onExit(_fsm: GameFSM): void {
    this._store = undefined;
    getGameStore().setShopping(null);
  }

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    switch (action.type) {
      case 'exitStore':
        this.handleExit(fsm);
        return true;

      case 'toggleStorePage':
        this.toggleMode(fsm);
        return true;

      case 'buyItem':
        this.handleBuy(fsm, action.itemIndex, action.quantity);
        return true;

      case 'sellItem':
        this.handleSell(fsm, action.inventoryIndex, action.quantity);
        return true;

      case 'letterSelect':
        this.handleLetterSelect(fsm, action.letter);
        return true;

      default:
        return false;
    }
  }

  private handleExit(fsm: GameFSM): void {
    fsm.addMessage('You leave the store.', 'info');
    fsm.transition(new PlayingState());
  }

  private toggleMode(fsm: GameFSM): void {
    this._mode = this._mode === 'buy' ? 'sell' : 'buy';
    this.updateStoreState(fsm);
  }

  private handleBuy(fsm: GameFSM, itemIndex: number, quantity?: number): void {
    if (!this._store) {
      fsm.addMessage('No store found!', 'info');
      return;
    }

    const store = getGameStore();
    const player = store.player;
    if (!player) return;

    const stockItem = this._store.getStockItem(itemIndex);
    if (!stockItem) {
      fsm.addMessage('That item is not available.', 'info');
      return;
    }

    const buyQuantity = quantity ?? 1;
    const price = this._store.getSellPrice(stockItem, player.stats.chr) * buyQuantity;

    // Check if player can afford it
    if (!player.spendGold(price)) {
      fsm.addMessage(`You can't afford that! (${price} gold)`, 'info');
      return;
    }

    // Remove from store and add to player
    const boughtItem = this._store.removeFromStock(itemIndex, buyQuantity);
    if (boughtItem) {
      player.addItem(boughtItem);
      const itemName = fsm.getItemDisplayName(boughtItem);
      fsm.addMessage(`You bought ${itemName} for ${price} gold.`, 'info');
      this.updateStoreState(fsm);
    }
  }

  private handleSell(fsm: GameFSM, inventoryIndex: number, quantity?: number): void {
    if (!this._store) {
      fsm.addMessage('No store found!', 'info');
      return;
    }

    const store = getGameStore();
    const player = store.player;
    if (!player) return;

    const playerItems = player.inventory;
    const item = playerItems[inventoryIndex];
    if (!item) {
      fsm.addMessage('You don\'t have that item.', 'info');
      return;
    }

    // Check if store will buy this item
    if (!this._store.willBuy(item)) {
      fsm.addMessage(`${this._store.definition.name} won't buy that.`, 'info');
      return;
    }

    const sellQuantity = quantity ?? 1;
    const price = this._store.getBuyPrice(item, player.stats.chr) * sellQuantity;

    // Handle partial stack sale
    let soldItem: Item;
    if (sellQuantity < item.quantity) {
      const splitItem = item.split(sellQuantity);
      if (!splitItem) {
        fsm.addMessage('Failed to split item.', 'info');
        return;
      }
      soldItem = splitItem;
    } else {
      // Remove entire item from player
      player.removeItem(item.id);
      soldItem = item;
    }

    // Add to store stock
    this._store.addToStock(soldItem);

    // Pay the player
    player.addGold(price);

    const itemName = fsm.getItemDisplayName(soldItem);
    fsm.addMessage(`You sold ${itemName} for ${price} gold.`, 'info');
    this.updateStoreState(fsm);
  }

  private handleLetterSelect(fsm: GameFSM, letter: string): void {
    // Convert letter to index (a=0, b=1, etc.)
    const index = letter.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0);
    if (index < 0 || index > 25) {
      return;
    }

    if (this._mode === 'buy') {
      this.handleBuy(fsm, index);
    } else {
      this.handleSell(fsm, index);
    }
  }

  /**
   * Update the game store with current shopping state for UI.
   */
  private updateStoreState(fsm: GameFSM): void {
    if (!this._store) return;

    const store = getGameStore();
    const player = store.player;
    if (!player) return;

    const stock = this._store.stock.map((item, _index) => ({
      name: fsm.getItemDisplayName(item),
      price: this._store!.getSellPrice(item, player.stats.chr),
      quantity: item.quantity,
    }));

    store.setShopping({
      storeKey: this.storeKey,
      mode: this._mode,
      storeName: this._store.definition.name,
      ownerName: this._store.owner.name,
      stock,
    });
  }
}
