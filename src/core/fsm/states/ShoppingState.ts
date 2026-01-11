/**
 * ShoppingState - Store interaction state
 *
 * Implements Zangband-style store flow:
 * 1. Browse mode (default): See store inventory, press commands
 *    - p) Purchase an item
 *    - s) Sell an item
 *    - x) Examine an item
 *    - ESC) Exit store
 * 2. After pressing a command, letters select items
 * 3. ESC in a submode returns to browse
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import type { Store } from '@/core/systems/Store';
import type { Item } from '@/core/entities/Item';
import { getGameStore } from '@/core/store/gameStore';

export type ShoppingMode = 'browse' | 'buying' | 'selling' | 'examining';

export class ShoppingState implements State {
  readonly name = 'shopping';
  readonly storeKey: string;
  private _mode: ShoppingMode = 'browse';
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
        // ESC behavior depends on mode
        if (this._mode === 'browse') {
          this.handleExit(fsm);
        } else {
          // Return to browse mode
          this._mode = 'browse';
          fsm.addMessage('Cancelled.', 'info');
          this.updateStoreState(fsm);
        }
        return true;

      case 'storePurchase':
        return this.handleStoreCommand(fsm, 'purchase');

      case 'storeSell':
        return this.handleStoreCommand(fsm, 'sell');

      case 'storeExamine':
        return this.handleStoreCommand(fsm, 'examine');

      case 'buyItem':
        this.handleBuy(fsm, action.itemIndex, action.quantity);
        return true;

      case 'sellItem':
        this.handleSell(fsm, action.inventoryIndex, action.quantity);
        return true;

      case 'letterSelect':
        this.handleLetterSelect(fsm, action.letter);
        return true;

      // Legacy action - still support toggleStorePage for compatibility
      case 'toggleStorePage':
        if (this._mode === 'browse') {
          this._mode = 'selling';
          this.updateStoreState(fsm);
        } else if (this._mode === 'selling') {
          this._mode = 'browse';
          this.updateStoreState(fsm);
        }
        return true;

      default:
        return false;
    }
  }

  private handleStoreCommand(fsm: GameFSM, command: string): boolean {
    // Commands only work in browse mode
    if (this._mode !== 'browse') {
      return false;
    }

    switch (command) {
      case 'purchase':
        if (!this._store?.stock.length) {
          fsm.addMessage('There is nothing for sale.', 'info');
          return true;
        }
        this._mode = 'buying';
        fsm.addMessage('Which item are you interested in?', 'info');
        this.updateStoreState(fsm);
        return true;

      case 'sell':
        const store = getGameStore();
        const player = store.player;
        if (!player?.inventory.length) {
          fsm.addMessage('You have nothing to sell.', 'info');
          return true;
        }
        this._mode = 'selling';
        fsm.addMessage('Which item do you want to sell?', 'info');
        this.updateStoreState(fsm);
        return true;

      case 'examine':
        if (!this._store?.stock.length) {
          fsm.addMessage('There is nothing to examine.', 'info');
          return true;
        }
        this._mode = 'examining';
        fsm.addMessage('Which item do you want to examine?', 'info');
        this.updateStoreState(fsm);
        return true;

      default:
        return false;
    }
  }

  private handleExit(fsm: GameFSM): void {
    fsm.addMessage('You leave the store.', 'info');
    fsm.transition(new PlayingState());
  }

  // Equipment types that are always bought one at a time
  private static readonly EQUIPMENT_TYPES = new Set([
    'sword', 'hafted', 'polearm', 'bow', 'crossbow',
    'soft_armor', 'hard_armor', 'drag_armor', 'shield',
    'boots', 'gloves', 'helm', 'cloak', 'crown',
    'ring', 'amulet', 'light',
  ]);

  private isEquipment(item: Item): boolean {
    return ShoppingState.EQUIPMENT_TYPES.has(item.type);
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

    // If stackable non-equipment and no quantity specified, prompt for it
    if (quantity === undefined && stockItem.quantity > 1 && !this.isEquipment(stockItem)) {
      this.promptQuantity(fsm, 'buy', itemIndex, stockItem.quantity);
      return;
    }

    const buyQuantity = quantity ?? 1;
    const price = this._store.getSellPrice(stockItem, player.stats.chr) * buyQuantity;

    // Check if player can afford it
    if (!player.spendGold(price)) {
      fsm.addMessage(`You can't afford that! (${price} gold)`, 'info');
      this._mode = 'browse';
      this.updateStoreState(fsm);
      return;
    }

    // Remove from store and add to player
    const boughtItem = this._store.removeFromStock(itemIndex, buyQuantity);
    if (boughtItem) {
      player.addItem(boughtItem);
      const itemName = fsm.getItemDisplayName(boughtItem);
      fsm.addMessage(`You bought ${itemName} for ${price} gold.`, 'info');
    }

    // Return to browse mode after purchase
    this._mode = 'browse';
    this.updateStoreState(fsm);
  }

  private promptQuantity(
    fsm: GameFSM,
    action: 'buy' | 'sell',
    itemIndex: number,
    maxQuantity: number,
  ): void {
    const store = getGameStore();
    store.setPrompt({
      text: `How many? (1-${maxQuantity}): `,
      value: '',
      callback: (value: string) => {
        const qty = parseInt(value.trim(), 10);
        if (isNaN(qty) || qty <= 0) {
          fsm.addMessage('Cancelled.', 'info');
          this._mode = 'browse';
          this.updateStoreState(fsm);
          return;
        }
        const finalQty = Math.min(qty, maxQuantity);
        if (action === 'buy') {
          this.handleBuy(fsm, itemIndex, finalQty);
        } else {
          this.handleSell(fsm, itemIndex, finalQty);
        }
      },
    });
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
      this._mode = 'browse';
      this.updateStoreState(fsm);
      return;
    }

    // Check if store will buy this item
    if (!this._store.willBuy(item)) {
      fsm.addMessage(`${this._store.definition.name} won't buy that.`, 'info');
      this._mode = 'browse';
      this.updateStoreState(fsm);
      return;
    }

    // If stackable non-equipment and no quantity specified, prompt for it
    if (quantity === undefined && item.quantity > 1 && !this.isEquipment(item)) {
      this.promptQuantity(fsm, 'sell', inventoryIndex, item.quantity);
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
        this._mode = 'browse';
        this.updateStoreState(fsm);
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

    // Return to browse mode after sale
    this._mode = 'browse';
    this.updateStoreState(fsm);
  }

  private handleExamine(fsm: GameFSM, itemIndex: number): void {
    if (!this._store) return;

    const stockItem = this._store.getStockItem(itemIndex);
    if (!stockItem) {
      fsm.addMessage('That item is not available.', 'info');
      return;
    }

    // Show item description
    const itemName = fsm.getItemDisplayName(stockItem);
    fsm.addMessage(`Examining: ${itemName}`, 'info');

    // TODO: Show full item details (flags, stats, etc.)
    if (stockItem.generated?.baseItem.damage) {
      fsm.addMessage(`Damage: ${stockItem.generated.baseItem.damage}`, 'info');
    }
    if (stockItem.baseAc > 0) {
      fsm.addMessage(`Base AC: ${stockItem.baseAc}`, 'info');
    }

    // Return to browse mode
    this._mode = 'browse';
    this.updateStoreState(fsm);
  }

  private handleLetterSelect(fsm: GameFSM, letter: string): void {
    // In browse mode, letters don't select items - need to use commands first
    if (this._mode === 'browse') {
      fsm.addMessage('Press p) to purchase, s) to sell, or x) to examine.', 'info');
      return;
    }

    // Convert letter to index (a=0, b=1, etc.)
    const index = letter.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0);
    if (index < 0 || index > 25) {
      return;
    }

    if (this._mode === 'buying') {
      this.handleBuy(fsm, index);
    } else if (this._mode === 'selling') {
      this.handleSell(fsm, index);
    } else if (this._mode === 'examining') {
      this.handleExamine(fsm, index);
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
