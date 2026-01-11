/**
 * Store Manager - manages all store instances in the town
 *
 * Creates stores with randomly selected owners and provides
 * access to stores by key or position.
 */

import type { RNG as ROTRng } from 'rot-js';
import { Store } from './Store';
import { StoreInventory } from './StoreInventory';
import type { StoreDef, StoreOwner } from '../data/stores';
import type { Position } from '../types';
import type { ItemGeneration } from './ItemGeneration';
import storesData from '@/data/stores/stores.json';
import ownersData from '@/data/stores/owners.json';

const stores = storesData as Record<string, StoreDef>;
// Filter out _comment field from owners data
const rawOwners = ownersData as Record<string, StoreOwner[] | string>;
const owners: Record<string, StoreOwner[]> = {};
for (const [key, value] of Object.entries(rawOwners)) {
  if (Array.isArray(value)) {
    owners[key] = value;
  }
}

export class StoreManager {
  private storeInstances: Map<string, Store> = new Map();
  private storePositions: Map<string, string> = new Map(); // "x,y" -> storeKey
  private storeInventory: StoreInventory | null = null;
  private rng: typeof ROTRng;

  constructor(rng: typeof ROTRng) {
    this.rng = rng;
    this.initializeStores(rng);
  }

  /**
   * Set the item generation system (must be called before generateAllStoreInventories)
   */
  setItemGeneration(itemGen: ItemGeneration): void {
    this.storeInventory = new StoreInventory(itemGen, this.rng);
  }

  /**
   * Generate inventory for all stores
   * Call this after setItemGeneration to populate stores
   */
  generateAllStoreInventories(): void {
    if (!this.storeInventory) {
      console.warn('StoreManager: Cannot generate inventories without ItemGeneration');
      return;
    }

    for (const [key, store] of this.storeInstances) {
      const storeDef = stores[key];
      if (!storeDef) continue;

      // Generate initial stock
      const items = this.storeInventory.generateInitialStock(storeDef);

      // Add items to store
      for (const item of items) {
        store.addToStock(item);
      }
    }
  }

  private initializeStores(rng: typeof ROTRng): void {
    // Create a store instance for each store definition
    for (const [key, storeDef] of Object.entries(stores)) {
      // Get owner list for this store type
      const ownerList = owners[key];
      if (!ownerList || ownerList.length === 0) {
        // Use a default owner if none defined
        const defaultOwner: StoreOwner = {
          name: 'Unknown Shopkeeper',
          race: 'human',
          purse: 5000,
          greed: 100,
        };
        this.storeInstances.set(key, new Store(storeDef, defaultOwner));
        continue;
      }

      // Randomly select an owner
      const ownerIndex = rng.getUniformInt(0, ownerList.length - 1);
      const owner = ownerList[ownerIndex];
      this.storeInstances.set(key, new Store(storeDef, owner));
    }
  }

  /**
   * Register store entrance positions (called by TownGenerator)
   */
  registerStorePositions(entrances: { storeKey: string; position: Position }[]): void {
    this.storePositions.clear();
    for (const entrance of entrances) {
      const posKey = `${entrance.position.x},${entrance.position.y}`;
      this.storePositions.set(posKey, entrance.storeKey);
    }
  }

  /**
   * Get a store by its key
   */
  getStore(key: string): Store | undefined {
    return this.storeInstances.get(key);
  }

  /**
   * Get the store at a given position (if any)
   */
  getStoreAt(pos: Position): Store | undefined {
    const posKey = `${pos.x},${pos.y}`;
    const storeKey = this.storePositions.get(posKey);
    if (storeKey) {
      return this.storeInstances.get(storeKey);
    }
    return undefined;
  }

  /**
   * Get the store key at a position
   */
  getStoreKeyAt(pos: Position): string | undefined {
    const posKey = `${pos.x},${pos.y}`;
    return this.storePositions.get(posKey);
  }

  /**
   * Get all store instances
   */
  getAllStores(): Store[] {
    return Array.from(this.storeInstances.values());
  }

  /**
   * Get all store keys
   */
  getStoreKeys(): string[] {
    return Array.from(this.storeInstances.keys());
  }

  /**
   * Get all store positions as "x,y" keys
   */
  getStorePositionKeys(): string[] {
    return Array.from(this.storePositions.keys());
  }

  /**
   * Find stores visible in the given set of visible tile keys.
   * Returns array of { storeKey, posKey } for each visible store entrance.
   */
  getVisibleStores(visibleTiles: Set<string>): { storeKey: string; posKey: string }[] {
    const result: { storeKey: string; posKey: string }[] = [];
    for (const [posKey, storeKey] of this.storePositions) {
      if (visibleTiles.has(posKey)) {
        result.push({ storeKey, posKey });
      }
    }
    return result;
  }
}
