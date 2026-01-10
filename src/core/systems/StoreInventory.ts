/**
 * Store Inventory Generation System
 *
 * Implements Zangband's store_create() and mass_produce() logic
 * for generating store inventory based on themes and level ranges.
 *
 * Ported from Zangband's store.c
 */

import type { RNG as ROTRng } from 'rot-js';
import { Item } from '@/core/entities/Item';
import type { StoreDef, StoreTheme } from '@/core/data/stores';
import type { ItemGeneration } from './ItemGeneration';

// Store inventory constants from Zangband defines.h
const STORE_TURNOVER = 9;
const STORE_MIN_KEEP = 6;
const STORE_MAX_KEEP = 18;

/**
 * Theme category for item types
 * Maps Zangband's kind_is_theme logic
 */
type ThemeCategory = 'treasure' | 'combat' | 'magic' | 'tools' | 'junk';

/**
 * Maps item types to their theme category
 * Based on Zangband's kind_is_theme() in object2.c
 */
const ITEM_TYPE_TO_THEME: Record<string, ThemeCategory> = {
  // Treasure items
  chest: 'treasure',
  figurine: 'treasure',
  statue: 'treasure',
  ring: 'treasure',
  amulet: 'treasure',
  crown: 'treasure',
  dragon_armor: 'treasure', // Also combat, but treasure wins for stores

  // Combat items
  shot: 'combat',
  arrow: 'combat',
  bolt: 'combat',
  bow: 'combat',
  hafted: 'combat',
  polearm: 'combat',
  sword: 'combat',
  boots: 'combat',
  gloves: 'combat',
  helm: 'combat',
  shield: 'combat',
  cloak: 'combat',
  soft_armor: 'combat',
  hard_armor: 'combat',

  // Magic items
  staff: 'magic',
  wand: 'magic',
  rod: 'magic',
  scroll: 'magic',
  potion: 'magic',
  life_book: 'magic',
  sorcery_book: 'magic',
  nature_book: 'magic',
  chaos_book: 'magic',
  death_book: 'magic',
  trump_book: 'magic',
  arcane_book: 'magic',

  // Tools
  spike: 'tools',
  digging: 'tools',
  light: 'tools',
  flask: 'tools',
  food: 'tools',

  // Junk (low priority)
  skeleton: 'junk',
  bottle: 'junk',
  junk: 'junk',
};

/**
 * Get the theme weight for an item type
 * Returns a probability 0-100 based on how well the item matches the theme
 */
function getThemeWeight(itemType: string, theme: StoreTheme): number {
  const category = ITEM_TYPE_TO_THEME[itemType];

  if (!category) return 0;

  switch (category) {
    case 'treasure':
      return theme.treasure;
    case 'combat':
      return theme.combat;
    case 'magic':
      return theme.magic;
    case 'tools':
      return theme.tools;
    case 'junk':
      // Junk probability is inverse of all other categories
      return 100 - (theme.treasure + theme.combat + theme.magic + theme.tools);
    default:
      return 0;
  }
}

/**
 * Mass produce configuration for stacking
 * Based on Zangband's mass_produce() in store.c
 */
interface MassProduceResult {
  quantity: number;
  discount: number;
}

/**
 * Dice roll helper
 */
function damroll(rng: typeof ROTRng, dice: number, sides: number): number {
  let result = 0;
  for (let i = 0; i < dice; i++) {
    result += rng.getUniformInt(1, sides);
  }
  return result;
}

/**
 * Calculate mass production quantity and discount
 * Based on Zangband's mass_produce() in store.c
 */
function massProduceItem(
  rng: typeof ROTRng,
  itemType: string,
  cost: number,
  hasEgo: boolean
): MassProduceResult {
  let size = 1;
  let discount = 0;

  // Analyze the type - based on Zangband tvals
  switch (itemType) {
    case 'food':
    case 'flask':
    case 'light':
      if (cost <= 5) size += damroll(rng, 3, 5);
      if (cost <= 20) size += damroll(rng, 3, 5);
      break;

    case 'potion':
    case 'scroll':
      if (cost <= 60) size += damroll(rng, 3, 5);
      if (cost <= 240) size += damroll(rng, 1, 5);
      break;

    case 'life_book':
    case 'sorcery_book':
    case 'nature_book':
    case 'chaos_book':
    case 'death_book':
    case 'trump_book':
    case 'arcane_book':
      if (cost <= 50) size += damroll(rng, 2, 3);
      if (cost <= 500) size += damroll(rng, 1, 3);
      break;

    case 'soft_armor':
    case 'hard_armor':
    case 'shield':
    case 'gloves':
    case 'boots':
    case 'cloak':
    case 'helm':
    case 'crown':
    case 'sword':
    case 'polearm':
    case 'hafted':
    case 'digging':
    case 'bow':
      if (hasEgo) break; // No mass production for ego items
      if (cost <= 10) size += damroll(rng, 3, 5);
      if (cost <= 100) size += damroll(rng, 3, 5);
      break;

    case 'spike':
    case 'shot':
    case 'arrow':
    case 'bolt':
      if (cost <= 5) size += damroll(rng, 5, 5);
      if (cost <= 50) size += damroll(rng, 5, 5);
      if (cost <= 500) size += damroll(rng, 5, 5);
      break;

    case 'figurine':
    case 'statue':
      if (cost <= 100) size += damroll(rng, 2, 2);
      if (cost <= 1000) size += damroll(rng, 2, 2);
      break;

    case 'rod':
    case 'wand':
    case 'staff':
      // 1 in 3 chance of producing multiples for devices
      if (rng.getUniformInt(0, 2) === 0) {
        if (cost < 1601) size += damroll(rng, 1, 5);
        else if (cost < 3201) size += damroll(rng, 1, 3);
      }
      break;
  }

  // Pick a discount (items < 5 gold never get discount)
  if (cost >= 5 && !hasEgo) {
    const roll = rng.getUniformInt(1, 500);
    if (roll <= 2) {
      discount = 90;
    } else if (roll <= 4) {
      discount = 75;
    } else if (roll <= 7) {
      discount = 50;
    } else if (roll <= 20) {
      discount = 25;
    }
  }

  // Reduce quantity based on discount
  size = size - Math.floor((size * discount) / 100);

  return { quantity: Math.max(1, size), discount };
}

/**
 * Store Inventory Generator
 * Generates items for a store based on its theme and level range
 */
export class StoreInventory {
  private rng: typeof ROTRng;
  private itemGen: ItemGeneration;

  constructor(itemGen: ItemGeneration, rng: typeof ROTRng) {
    this.itemGen = itemGen;
    this.rng = rng;
  }

  /**
   * Generate initial stock for a store
   * Fills the store to between minKeep and maxKeep items
   */
  generateInitialStock(storeDef: StoreDef): Item[] {
    // Home doesn't get auto-generated stock
    if (storeDef.flags?.includes('HOME')) {
      return [];
    }

    // No theme = no generation
    if (!storeDef.theme) {
      return [];
    }

    const items: Item[] = [];
    const targetCount = this.rng.getUniformInt(
      storeDef.minKeep || STORE_MIN_KEEP,
      storeDef.maxKeep || STORE_MAX_KEEP
    );

    // Try to generate target number of items
    let attempts = 0;
    const maxAttempts = targetCount * 10;

    while (items.length < targetCount && attempts < maxAttempts) {
      attempts++;

      const item = this.createStoreItem(storeDef);
      if (item) {
        // Try to stack with existing items
        let stacked = false;
        for (const existing of items) {
          if (existing.canStack(item)) {
            existing.absorb(item);
            stacked = true;
            break;
          }
        }

        if (!stacked) {
          items.push(item);
        }
      }
    }

    return items;
  }

  /**
   * Create a single item for the store
   * Based on Zangband's store_create() in store.c
   */
  createStoreItem(storeDef: StoreDef): Item | null {
    if (!storeDef.theme) return null;

    const theme = storeDef.theme;
    const levelMin = storeDef.levelMin ?? 0;
    const levelMax = storeDef.levelMax ?? 10;

    // Try up to 50 times to create a valid item
    for (let tries = 0; tries < 50; tries++) {
      // Pick a random level in the store's range
      const level = this.rng.getUniformInt(levelMin, levelMax);

      // Generate an item at this level
      const generated = this.itemGen.generateItem(level, 0);
      if (!generated) continue;

      // Check if this item type matches the store's theme
      const itemType = generated.baseItem.type;
      const themeWeight = getThemeWeight(itemType, theme);

      // Theme weight is a probability (0-100)
      // Roll against it to see if we accept this item
      if (this.rng.getUniformInt(0, 99) >= themeWeight) {
        continue;
      }

      // Check if store will stock this type
      if (!this.storeWillStock(storeDef, itemType)) {
        continue;
      }

      // No chests in stores
      if (itemType === 'chest') continue;

      // Apply mass production
      const hasEgo = !!generated.egoItem;
      const cost = generated.cost ?? generated.baseItem.cost;
      const { quantity, discount } = massProduceItem(this.rng, itemType, cost, hasEgo);

      // Create the item entity
      const item = new Item({
        id: `store_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        position: { x: 0, y: 0 },
        symbol: generated.baseItem.symbol,
        color: generated.baseItem.color,
        generated: {
          ...generated,
          identified: true, // Store items are always identified
          cost: this.calculateDiscountedCost(cost, discount),
        },
        quantity,
      });

      // Mark as store-bought (could add a flag later if needed)
      return item;
    }

    return null;
  }

  /**
   * Check if store will stock an item type
   */
  private storeWillStock(storeDef: StoreDef, itemType: string): boolean {
    // Black market / sells all stores accept anything
    if (storeDef.flags?.includes('SELLS_ALL')) {
      return true;
    }

    // Check if item type is in sellsTypes
    return storeDef.sellsTypes.includes(itemType);
  }

  /**
   * Calculate discounted cost
   */
  private calculateDiscountedCost(baseCost: number, discount: number): number {
    if (discount === 0) return baseCost;
    return Math.max(1, Math.floor(baseCost * (100 - discount) / 100));
  }

  /**
   * Perform store maintenance (remove some items, add new ones)
   * Called periodically (e.g., when player leaves dungeon and returns to town)
   */
  maintainStock(storeDef: StoreDef, currentStock: Item[]): Item[] {
    // Home doesn't get maintained
    if (storeDef.flags?.includes('HOME')) {
      return currentStock;
    }

    const minKeep = storeDef.minKeep ?? STORE_MIN_KEEP;
    const maxKeep = storeDef.maxKeep ?? STORE_MAX_KEEP;
    const turnover = storeDef.turnover ?? STORE_TURNOVER;

    // Make a mutable copy
    const stock = [...currentStock];

    // Remove some items (sell simulation)
    let removeCount = this.rng.getUniformInt(1, turnover);
    let targetCount = Math.max(minKeep, stock.length - removeCount);
    targetCount = Math.min(targetCount, maxKeep);

    while (stock.length > targetCount && stock.length > 0) {
      const removeIndex = this.rng.getUniformInt(0, stock.length - 1);
      stock.splice(removeIndex, 1);
    }

    // Add new items
    let addCount = this.rng.getUniformInt(1, turnover);
    targetCount = Math.min(maxKeep, stock.length + addCount);
    targetCount = Math.max(targetCount, minKeep);

    let attempts = 0;
    while (stock.length < targetCount && attempts < 30) {
      attempts++;
      const item = this.createStoreItem(storeDef);
      if (item) {
        // Try to stack with existing items
        let stacked = false;
        for (const existing of stock) {
          if (existing.canStack(item)) {
            existing.absorb(item);
            stacked = true;
            break;
          }
        }

        if (!stacked && stock.length < (storeDef.maxStock ?? 24)) {
          stock.push(item);
        }
      }
    }

    return stock;
  }
}
