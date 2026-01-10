/**
 * Store - manages a single store instance with inventory and pricing
 *
 * Stores buy and sell items based on their type configuration.
 * Each store has an owner with greed affecting prices.
 */

import type { RNG as ROT_RNG } from 'rot-js';
import type { Item } from '../entities/Item';
import type { StoreDef, StoreOwner } from '../data/stores';
import { StoreFlag } from '../data/stores';
import { PricingSystem } from './Pricing';
import type { ItemGeneration } from './ItemGeneration';

export class Store {
  private readonly _definition: StoreDef;
  private _owner: StoreOwner;
  private _stock: Item[] = [];
  private _lastVisit: number = 0;

  constructor(definition: StoreDef, owner: StoreOwner) {
    this._definition = definition;
    this._owner = owner;
  }

  // Accessors

  get definition(): StoreDef {
    return this._definition;
  }

  get owner(): StoreOwner {
    return this._owner;
  }

  get stock(): Item[] {
    return [...this._stock];
  }

  get lastVisit(): number {
    return this._lastVisit;
  }

  set lastVisit(turn: number) {
    this._lastVisit = turn;
  }

  // Flag checks

  /** Check if store has a specific flag */
  hasFlag(flag: string): boolean {
    return this._definition.flags?.includes(flag) ?? false;
  }

  /** Is this the black market? */
  get isBlackMarket(): boolean {
    return this.hasFlag(StoreFlag.BLACK_MARKET);
  }

  /** Is this the player's home? */
  get isHome(): boolean {
    return this.hasFlag(StoreFlag.HOME);
  }

  /** Does this store buy all item types? */
  get buysAll(): boolean {
    return this.hasFlag(StoreFlag.BUYS_ALL) || this.isHome;
  }

  /** Does this store sell all item types? */
  get sellsAll(): boolean {
    return this.hasFlag(StoreFlag.SELLS_ALL);
  }

  /** Does this store have pricing disabled? */
  get noPricing(): boolean {
    return this.hasFlag(StoreFlag.NO_PRICING);
  }

  // Item type checks

  /**
   * Check if store will buy this item from player
   */
  willBuy(item: Item): boolean {
    // Home accepts everything
    if (this.isHome) {
      return true;
    }

    // Check if item has value (worthless items rejected)
    const cost = item.generated?.cost ?? 0;
    if (cost <= 0) {
      return false;
    }

    // Black market / buys all
    if (this.buysAll) {
      return true;
    }

    // Check if item type is in buysTypes
    const itemType = item.generated?.baseItem.type;
    if (!itemType) {
      return false;
    }

    return this._definition.buysTypes.includes(itemType);
  }

  /**
   * Check if store sells items of this type
   */
  willSellType(itemType: string): boolean {
    if (this.sellsAll) {
      return true;
    }
    return this._definition.sellsTypes.includes(itemType);
  }

  // Stock management

  /**
   * Add an item to store stock
   * @returns true if added, false if stock is full
   */
  addToStock(item: Item): boolean {
    // Try to stack with existing items
    for (const existing of this._stock) {
      if (existing.canStack(item)) {
        existing.absorb(item);
        return true;
      }
    }

    // Check if we have room for a new item
    if (this._stock.length >= this._definition.maxStock) {
      return false;
    }

    // Add as new item
    this._stock.push(item);
    return true;
  }

  /**
   * Remove an item from stock
   * @param index Stock index to remove from
   * @param quantity Number to remove (default: all)
   * @returns The removed item, or undefined if invalid index
   */
  removeFromStock(index: number, quantity?: number): Item | undefined {
    if (index < 0 || index >= this._stock.length) {
      return undefined;
    }

    const item = this._stock[index];
    const removeCount = quantity ?? item.quantity;

    if (removeCount >= item.quantity) {
      // Remove entire stack
      this._stock.splice(index, 1);
      return item;
    } else {
      // Split stack - create a copy with the removed quantity
      const removed = item.split(removeCount);
      return removed;
    }
  }

  /**
   * Get an item from stock by index
   */
  getStockItem(index: number): Item | undefined {
    return this._stock[index];
  }

  // Pricing

  /**
   * Get sell price (what player pays to buy from store)
   */
  getSellPrice(item: Item, playerCharisma: number): number {
    if (this.noPricing) {
      return 0;
    }

    const baseCost = item.generated?.cost ?? 0;
    return PricingSystem.getSellPrice(
      baseCost,
      this._owner.greed,
      playerCharisma,
      this.isBlackMarket
    );
  }

  /**
   * Get buy price (what store pays player)
   */
  getBuyPrice(item: Item, playerCharisma: number): number {
    if (this.noPricing) {
      return 0;
    }

    const baseCost = item.generated?.cost ?? 0;
    return PricingSystem.getBuyPrice(
      baseCost,
      this._owner.greed,
      playerCharisma,
      this._owner.purse,
      this.isBlackMarket
    );
  }

  // Owner management

  /**
   * Change the store owner (e.g., during owner shuffle)
   */
  setOwner(owner: StoreOwner): void {
    this._owner = owner;
  }

  // Stock generation

  /**
   * Generate initial stock for this store.
   * Items are selected from sellsTypes at appropriate levels.
   */
  generateStock(itemGen: ItemGeneration, rng: typeof ROT_RNG): void {
    // Home doesn't generate stock
    if (this.isHome) {
      return;
    }

    // Determine how many items to generate (between minKeep and maxKeep)
    const targetCount = this._definition.minKeep +
      rng.getUniformInt(0, this._definition.maxKeep - this._definition.minKeep);

    // Get valid item types for this store
    const types = this.sellsAll
      ? this.getBlackMarketTypes()
      : this._definition.sellsTypes;

    if (types.length === 0) {
      return;
    }

    // Get item keys matching our types (low level items for town stores)
    const maxLevel = this.isBlackMarket ? 30 : 10;
    const validKeys = itemGen.getItemKeysByTypes(types, maxLevel);

    if (validKeys.length === 0) {
      return;
    }

    // Generate items until we reach target count or run out of tries
    let attempts = 0;
    const maxAttempts = targetCount * 3;

    while (this._stock.length < targetCount && attempts < maxAttempts) {
      attempts++;

      // Pick a random item key
      const key = validKeys[rng.getUniformInt(0, validKeys.length - 1)];
      const item = itemGen.createItemByKey(key);

      if (item) {
        this.addToStock(item);
      }
    }
  }

  /**
   * Get item types for black market (all common types)
   */
  private getBlackMarketTypes(): string[] {
    return [
      'food', 'light', 'flask', 'spike', 'digging',
      'sword', 'hafted', 'polearm', 'bow', 'shot', 'arrow', 'bolt',
      'soft_armor', 'hard_armor', 'shield', 'cloak', 'helm', 'crown', 'gloves', 'boots',
      'ring', 'amulet',
      'potion', 'scroll',
      'wand', 'staff', 'rod',
    ];
  }
}
