import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { StoreInventory } from '@/core/systems/StoreInventory';
import { ItemGeneration } from '@/core/systems/ItemGeneration';
import type { StoreDef } from '@/core/data/stores';
import itemsData from '@/data/items/items.json';
import egoItemsData from '@/data/items/ego-items.json';
import artifactsData from '@/data/items/artifacts.json';

describe('StoreInventory', () => {
  let storeInventory: StoreInventory;
  let itemGen: ItemGeneration;

  beforeEach(() => {
    RNG.setSeed(12345);
    itemGen = new ItemGeneration({
      items: itemsData as any,
      egoItems: egoItemsData as any,
      artifacts: artifactsData as any,
    });
    storeInventory = new StoreInventory(itemGen, RNG);
  });

  describe('generateInitialStock', () => {
    it('generates items for a store with theme', () => {
      const storeDef: StoreDef = {
        key: 'alchemy',
        name: 'Alchemy Shop',
        symbol: '5',
        color: '#0000ff',
        maxStock: 24,
        minKeep: 6,
        maxKeep: 18,
        turnover: 9,
        buysTypes: ['potion', 'scroll'],
        sellsTypes: ['potion', 'scroll'],
        theme: { treasure: 0, combat: 0, magic: 100, tools: 0 },
        levelMin: 5,
        levelMax: 30,
      };

      const items = storeInventory.generateInitialStock(storeDef);

      // Should generate at least minKeep items
      expect(items.length).toBeGreaterThanOrEqual(storeDef.minKeep);
      // Should not exceed maxKeep unique stacks
      expect(items.length).toBeLessThanOrEqual(storeDef.maxKeep);

      // All items should be magic types (potion, scroll, wand, staff, rod, books)
      for (const item of items) {
        const type = item.generated?.baseItem.type;
        expect(['potion', 'scroll', 'wand', 'staff', 'rod',
                'life_book', 'sorcery_book', 'nature_book',
                'chaos_book', 'death_book', 'trump_book', 'arcane_book']).toContain(type);
      }
    });

    it('generates no items for home (storage only)', () => {
      const homeDef: StoreDef = {
        key: 'home',
        name: 'Your Home',
        symbol: '8',
        color: '#ffff00',
        maxStock: 24,
        minKeep: 0,
        maxKeep: 24,
        turnover: 0,
        buysTypes: [],
        sellsTypes: [],
        flags: ['HOME', 'NO_PRICING'],
      };

      const items = storeInventory.generateInitialStock(homeDef);
      expect(items.length).toBe(0);
    });

    it('generates weapons/armor for weaponsmith', () => {
      const weaponsmithDef: StoreDef = {
        key: 'weaponsmith',
        name: 'Weaponsmith',
        symbol: '3',
        color: '#ffffff',
        maxStock: 24,
        minKeep: 6,
        maxKeep: 18,
        turnover: 9,
        buysTypes: ['sword', 'hafted', 'polearm', 'digging', 'bow', 'shot', 'arrow', 'bolt'],
        sellsTypes: ['sword', 'hafted', 'polearm', 'digging', 'bow', 'shot', 'arrow', 'bolt'],
        theme: { treasure: 0, combat: 100, magic: 0, tools: 0 },
        levelMin: 5,
        levelMax: 20,
      };

      const items = storeInventory.generateInitialStock(weaponsmithDef);
      expect(items.length).toBeGreaterThanOrEqual(weaponsmithDef.minKeep);

      // All items should be combat types
      for (const item of items) {
        const type = item.generated?.baseItem.type;
        expect(['sword', 'hafted', 'polearm', 'digging', 'bow',
                'shot', 'arrow', 'bolt', 'soft_armor', 'hard_armor',
                'shield', 'boots', 'gloves', 'helm', 'cloak']).toContain(type);
      }
    });

    it('items are identified', () => {
      const storeDef: StoreDef = {
        key: 'alchemy',
        name: 'Alchemy Shop',
        symbol: '5',
        color: '#0000ff',
        maxStock: 24,
        minKeep: 6,
        maxKeep: 18,
        turnover: 9,
        buysTypes: ['potion', 'scroll'],
        sellsTypes: ['potion', 'scroll'],
        theme: { treasure: 0, combat: 0, magic: 100, tools: 0 },
        levelMin: 5,
        levelMax: 30,
      };

      const items = storeInventory.generateInitialStock(storeDef);

      // All store items should be identified
      for (const item of items) {
        expect(item.generated?.identified).toBe(true);
      }
    });

    it('generates stacked items for cheap consumables', () => {
      const storeDef: StoreDef = {
        key: 'general',
        name: 'General Store',
        symbol: '1',
        color: '#c8a040',
        maxStock: 24,
        minKeep: 6,
        maxKeep: 18,
        turnover: 9,
        buysTypes: ['food', 'light', 'flask', 'spike'],
        sellsTypes: ['food', 'light', 'flask', 'spike', 'digging'],
        theme: { treasure: 0, combat: 50, magic: 0, tools: 50 },
        levelMin: 0,
        levelMax: 10,
      };

      const items = storeInventory.generateInitialStock(storeDef);

      // Some items should have quantity > 1 (mass production)
      const hasStacks = items.some(item => item.quantity > 1);
      expect(hasStacks).toBe(true);
    });
  });

  describe('maintainStock', () => {
    it('adds and removes items during maintenance', () => {
      const storeDef: StoreDef = {
        key: 'alchemy',
        name: 'Alchemy Shop',
        symbol: '5',
        color: '#0000ff',
        maxStock: 24,
        minKeep: 6,
        maxKeep: 18,
        turnover: 9,
        buysTypes: ['potion', 'scroll'],
        sellsTypes: ['potion', 'scroll'],
        theme: { treasure: 0, combat: 0, magic: 100, tools: 0 },
        levelMin: 5,
        levelMax: 30,
      };

      // Generate initial stock
      const initialItems = storeInventory.generateInitialStock(storeDef);

      // Run maintenance
      const maintainedItems = storeInventory.maintainStock(storeDef, initialItems);

      // Should still be within bounds
      expect(maintainedItems.length).toBeGreaterThanOrEqual(storeDef.minKeep);
      expect(maintainedItems.length).toBeLessThanOrEqual(storeDef.maxKeep);
    });

    it('does not modify home inventory', () => {
      const homeDef: StoreDef = {
        key: 'home',
        name: 'Your Home',
        symbol: '8',
        color: '#ffff00',
        maxStock: 24,
        minKeep: 0,
        maxKeep: 24,
        turnover: 0,
        buysTypes: [],
        sellsTypes: [],
        flags: ['HOME', 'NO_PRICING'],
      };

      // Create some dummy items
      const homeItems = storeInventory.generateInitialStock({
        ...homeDef,
        flags: [], // Temporarily remove HOME flag to generate items
        theme: { treasure: 0, combat: 0, magic: 100, tools: 0 },
        levelMin: 5,
        levelMax: 30,
      });

      // Maintenance should return the same items for home
      const maintained = storeInventory.maintainStock(homeDef, homeItems);
      expect(maintained).toEqual(homeItems);
    });
  });
});
