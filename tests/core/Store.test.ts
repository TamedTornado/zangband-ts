import { describe, it, expect } from 'vitest';
import { Store } from '@/core/systems/Store';
import type { StoreDef, StoreOwner } from '@/core/data/stores';
import { Item } from '@/core/entities/Item';

// Test fixtures
function createTestItem(overrides: Partial<{
  type: string;
  key: string;
  name: string;
  cost: number;
}>): Item {
  const { type = 'potion', key = 'potion_healing', name = 'Healing', cost = 50 } = overrides;
  return new Item({
    id: `item-${Math.random().toString(36).slice(2)}`,
    position: { x: 0, y: 0 },
    symbol: '!',
    color: '#f00',
    generated: {
      baseItem: { name, type, sval: 1, key, cost } as any,
      toHit: 0,
      toDam: 0,
      toAc: 0,
      pval: 0,
      flags: [],
      cost,
    },
  });
}

const generalStoreDef: StoreDef = {
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
};

const alchemyStoreDef: StoreDef = {
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
};

const blackMarketDef: StoreDef = {
  key: 'black_market',
  name: 'Black Market',
  symbol: '7',
  color: '#404040',
  maxStock: 24,
  minKeep: 6,
  maxKeep: 18,
  turnover: 9,
  buysTypes: [],
  sellsTypes: [],
  flags: ['BUYS_ALL', 'SELLS_ALL', 'BLACK_MARKET'],
};

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

const testOwner: StoreOwner = {
  name: 'Test Owner',
  race: 'human',
  purse: 5000,
  greed: 110,
};

describe('Store', () => {
  describe('willBuy', () => {
    it('accepts items matching buysTypes', () => {
      const store = new Store(alchemyStoreDef, testOwner);
      const potion = createTestItem({ type: 'potion' });
      expect(store.willBuy(potion)).toBe(true);
    });

    it('rejects items not in buysTypes', () => {
      const store = new Store(generalStoreDef, testOwner);
      const potion = createTestItem({ type: 'potion' });
      expect(store.willBuy(potion)).toBe(false);
    });

    it('accepts any item for black market', () => {
      const store = new Store(blackMarketDef, testOwner);
      const sword = createTestItem({ type: 'sword', name: 'Long Sword', key: 'long_sword' });
      expect(store.willBuy(sword)).toBe(true);
    });

    it('rejects worthless items (cost <= 0)', () => {
      const store = new Store(alchemyStoreDef, testOwner);
      const worthless = createTestItem({ type: 'potion', cost: 0 });
      expect(store.willBuy(worthless)).toBe(false);
    });

    it('accepts any item for home', () => {
      const store = new Store(homeDef, testOwner);
      const sword = createTestItem({ type: 'sword' });
      expect(store.willBuy(sword)).toBe(true);
    });
  });

  describe('willSell', () => {
    it('only sells items that match sellsTypes', () => {
      const store = new Store(alchemyStoreDef, testOwner);
      expect(store.willSellType('potion')).toBe(true);
      expect(store.willSellType('scroll')).toBe(true);
      expect(store.willSellType('sword')).toBe(false);
    });

    it('sells any type for black market', () => {
      const store = new Store(blackMarketDef, testOwner);
      expect(store.willSellType('sword')).toBe(true);
      expect(store.willSellType('potion')).toBe(true);
    });
  });

  describe('stock management', () => {
    it('starts with empty stock', () => {
      const store = new Store(alchemyStoreDef, testOwner);
      expect(store.stock).toHaveLength(0);
    });

    it('adds items to stock', () => {
      const store = new Store(alchemyStoreDef, testOwner);
      const potion = createTestItem({ type: 'potion' });
      store.addToStock(potion);
      expect(store.stock).toHaveLength(1);
    });

    it('stacks similar items', () => {
      const store = new Store(alchemyStoreDef, testOwner);
      const potion1 = createTestItem({ type: 'potion', key: 'potion_healing' });
      const potion2 = createTestItem({ type: 'potion', key: 'potion_healing' });

      store.addToStock(potion1);
      store.addToStock(potion2);

      // Should stack, so still 1 item but quantity = 2
      expect(store.stock).toHaveLength(1);
      expect(store.stock[0].quantity).toBe(2);
    });

    it('fails to add when stock is full', () => {
      const smallStoreDef = { ...alchemyStoreDef, maxStock: 2 };
      const store = new Store(smallStoreDef, testOwner);

      const item1 = createTestItem({ type: 'potion', key: 'potion_healing' });
      const item2 = createTestItem({ type: 'scroll', key: 'scroll_teleport' });
      const item3 = createTestItem({ type: 'potion', key: 'potion_speed' });

      expect(store.addToStock(item1)).toBe(true);
      expect(store.addToStock(item2)).toBe(true);
      expect(store.addToStock(item3)).toBe(false); // Full
      expect(store.stock).toHaveLength(2);
    });

    it('removes items from stock', () => {
      const store = new Store(alchemyStoreDef, testOwner);
      const potion = createTestItem({ type: 'potion' });
      store.addToStock(potion);

      const removed = store.removeFromStock(0);
      expect(removed).toBeDefined();
      expect(store.stock).toHaveLength(0);
    });

    it('removes partial quantity from stack', () => {
      const store = new Store(alchemyStoreDef, testOwner);
      const potion = createTestItem({ type: 'potion' });
      potion.quantity = 5;
      store.addToStock(potion);

      const removed = store.removeFromStock(0, 2);
      expect(removed).toBeDefined();
      expect(removed!.quantity).toBe(2);
      expect(store.stock[0].quantity).toBe(3);
    });
  });

  describe('pricing', () => {
    it('calculates sell price using owner greed and charisma', () => {
      const store = new Store(alchemyStoreDef, testOwner);
      const potion = createTestItem({ type: 'potion', cost: 100 });

      // With greed 110 and charisma 10 (factor ~107), price increases
      const price = store.getSellPrice(potion, 10);
      expect(price).toBeGreaterThan(100);
    });

    it('calculates buy price using owner greed and charisma', () => {
      const store = new Store(alchemyStoreDef, testOwner);
      const potion = createTestItem({ type: 'potion', cost: 100 });

      // With greed 110, store pays less
      const price = store.getBuyPrice(potion, 10);
      expect(price).toBeLessThan(100);
    });

    it('caps buy price at owner purse', () => {
      const poorOwner: StoreOwner = { ...testOwner, purse: 50 };
      const store = new Store(alchemyStoreDef, poorOwner);
      const expensive = createTestItem({ type: 'potion', cost: 10000 });

      const price = store.getBuyPrice(expensive, 10);
      expect(price).toBeLessThanOrEqual(50);
    });

    it('returns 0 for items home will not price', () => {
      const store = new Store(homeDef, testOwner);
      const item = createTestItem({ type: 'potion', cost: 100 });

      expect(store.getSellPrice(item, 10)).toBe(0);
      expect(store.getBuyPrice(item, 10)).toBe(0);
    });
  });

  describe('flags', () => {
    it('identifies black market', () => {
      const store = new Store(blackMarketDef, testOwner);
      expect(store.isBlackMarket).toBe(true);

      const normal = new Store(alchemyStoreDef, testOwner);
      expect(normal.isBlackMarket).toBe(false);
    });

    it('identifies home', () => {
      const store = new Store(homeDef, testOwner);
      expect(store.isHome).toBe(true);

      const normal = new Store(alchemyStoreDef, testOwner);
      expect(normal.isHome).toBe(false);
    });

    it('identifies service building', () => {
      const serviceBuilding: StoreDef = {
        key: 'inn',
        name: 'Inn',
        symbol: 'I',
        color: '#c8a040',
        maxStock: 0,
        minKeep: 0,
        maxKeep: 0,
        turnover: 0,
        buysTypes: [],
        sellsTypes: [],
        flags: ['SERVICE_BUILDING'],
        services: [
          {
            key: 'eat',
            type: 'inn_eat',
            name: 'Eat',
            description: 'Fill your stomach',
            baseCost: 10,
            action: 'action:service_eat',
          },
        ],
      };

      const store = new Store(serviceBuilding, testOwner);
      expect(store.isServiceBuilding).toBe(true);
      expect(store.hasServices).toBe(true);
      expect(store.services).toHaveLength(1);
      expect(store.services[0].key).toBe('eat');

      const normal = new Store(alchemyStoreDef, testOwner);
      expect(normal.isServiceBuilding).toBe(false);
      expect(normal.hasServices).toBe(false);
      expect(normal.services).toHaveLength(0);
    });
  });
});
