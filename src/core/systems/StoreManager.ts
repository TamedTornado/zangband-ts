/**
 * Store Manager - manages all store instances in the town
 *
 * Creates stores with randomly selected owners and provides
 * access to stores by key or position.
 */

import type { RNG as ROTRng } from 'rot-js';
import { Store } from './Store';
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

  constructor(rng: typeof ROTRng, itemGen: ItemGeneration) {
    this.initializeStores(rng, itemGen);
  }

  private initializeStores(rng: typeof ROTRng, itemGen: ItemGeneration): void {
    // Create a store instance for each store definition
    for (const [key, storeDef] of Object.entries(stores)) {
      // Get owner list for this store type
      const ownerList = owners[key];
      let store: Store;

      if (!ownerList || ownerList.length === 0) {
        // Use a default owner if none defined
        const defaultOwner: StoreOwner = {
          name: 'Unknown Shopkeeper',
          race: 'human',
          purse: 5000,
          greed: 100,
        };
        store = new Store(storeDef, defaultOwner);
      } else {
        // Randomly select an owner
        const ownerIndex = rng.getUniformInt(0, ownerList.length - 1);
        const owner = ownerList[ownerIndex];
        store = new Store(storeDef, owner);
      }

      // Generate initial stock
      store.generateStock(itemGen, rng);
      this.storeInstances.set(key, store);
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
}
