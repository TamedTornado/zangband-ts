/**
 * Store type definitions
 *
 * Loaded from src/data/stores/stores.json and owners.json
 *
 * Also used for service buildings (Inn, Healer, etc.) which have
 * a services array instead of inventory-based trading.
 */

import type { ServiceDef } from './services';

/**
 * Theme weights for item generation (from Zangband t_info.txt)
 * Values are percentages (0-100) that affect item selection probability
 */
export interface StoreTheme {
  /** Weight for treasure items (chests, figurines, rings, amulets, crowns) */
  treasure: number;
  /** Weight for combat items (weapons, armor, ammo) */
  combat: number;
  /** Weight for magic items (potions, scrolls, wands, staves, rods, books) */
  magic: number;
  /** Weight for tools (food, flasks, lights, spikes, digging) */
  tools: number;
}

/**
 * Store definition - describes a type of store
 */
export interface StoreDef {
  /** Unique key for this store type */
  key: string;
  /** Display name */
  name: string;
  /** Map symbol (1-8) */
  symbol: string;
  /** Display color */
  color: string;
  /** Maximum items in stock */
  maxStock: number;
  /** Minimum items to keep during restock */
  minKeep: number;
  /** Maximum items to keep during restock */
  maxKeep: number;
  /** Number of items to turn over during restock */
  turnover: number;
  /** Item types this store will buy from player */
  buysTypes: string[];
  /** Item types this store sells */
  sellsTypes: string[];
  /** Special flags */
  flags?: string[];
  /** Theme weights for item generation */
  theme?: StoreTheme;
  /** Minimum level for generated items */
  levelMin?: number;
  /** Maximum level for generated items */
  levelMax?: number;
  /** Services offered by this building (for service buildings) */
  services?: ServiceDef[];
}

/**
 * Store owner - individual who runs a store instance
 */
export interface StoreOwner {
  /** Owner's name */
  name: string;
  /** Owner's race (flavor only) */
  race: string;
  /** Maximum gold this owner will pay for a single item */
  purse: number;
  /** Greed factor (100 = neutral, higher = greedier) */
  greed: number;
}

/**
 * Store flags
 */
export const StoreFlag = {
  /** Store buys all item types */
  BUYS_ALL: 'BUYS_ALL',
  /** Store sells all item types */
  SELLS_ALL: 'SELLS_ALL',
  /** Black market store (higher prices) */
  BLACK_MARKET: 'BLACK_MARKET',
  /** Player's home (storage only) */
  HOME: 'HOME',
  /** No pricing (items have no value here) */
  NO_PRICING: 'NO_PRICING',
  /** Only blessed items accepted */
  BLESSED_ONLY: 'BLESSED_ONLY',
  /** Service building (offers services instead of inventory) */
  SERVICE_BUILDING: 'SERVICE_BUILDING',
} as const;

export type StoreFlag = (typeof StoreFlag)[keyof typeof StoreFlag];
