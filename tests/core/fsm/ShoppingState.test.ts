import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShoppingState } from '@/core/fsm/states/ShoppingState';
import { PlayingState } from '@/core/fsm/states/PlayingState';
import { Store } from '@/core/systems/Store';
import { Item } from '@/core/entities/Item';
import type { StoreDef, StoreOwner } from '@/core/data/stores';
import type { GameFSM } from '@/core/fsm/GameFSM';

// Mock getGameStore
vi.mock('@/core/store/gameStore', () => ({
  getGameStore: vi.fn(),
}));
import { getGameStore } from '@/core/store/gameStore';

// Mock store definition
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

const testOwner: StoreOwner = {
  name: 'Mauser the Chemist',
  race: 'half_elf',
  purse: 10000,
  greed: 111,
};

// Helper to create test items
function createTestItem(overrides: Partial<{
  id: string;
  type: string;
  key: string;
  name: string;
  cost: number;
  quantity: number;
}>): Item {
  const {
    id = `item-${Math.random().toString(36).slice(2)}`,
    type = 'potion',
    key = 'potion_healing',
    name = 'Healing',
    cost = 50,
    quantity = 1,
  } = overrides;
  const item = new Item({
    id,
    position: { x: 0, y: 0 },
    symbol: '!',
    color: '#f00',
    quantity,
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
  return item;
}

// Create mock player
function createMockPlayer(overrides: Partial<{
  gold: number;
  items: Item[];
}> = {}) {
  let gold = overrides.gold ?? 500;
  const mockPlayer = {
    get gold() { return gold; },
    get inventory() { return overrides.items ?? []; },
    addGold: vi.fn((amount: number) => {
      gold += amount;
    }),
    spendGold: vi.fn((amount: number) => {
      if (gold >= amount) {
        gold -= amount;
        return true;
      }
      return false;
    }),
    addItem: vi.fn(),
    removeItem: vi.fn(),
    stats: { chr: 10 },
  };
  return mockPlayer;
}

// Mock FSM
function createMockFSM(mockPlayer: ReturnType<typeof createMockPlayer>, store: Store): GameFSM {
  const mockStoreManager = {
    getStore: vi.fn((key: string) => (key === store.definition.key ? store : undefined)),
  };

  // Set up getGameStore mock to return our player
  vi.mocked(getGameStore).mockReturnValue({
    player: mockPlayer,
    setShopping: vi.fn(),
  } as any);

  return {
    storeManager: mockStoreManager,
    transition: vi.fn(),
    addMessage: vi.fn(),
    getItemDisplayName: vi.fn((item: Item) => item.name),
  } as unknown as GameFSM;
}

describe('ShoppingState', () => {
  let store: Store;
  let state: ShoppingState;

  beforeEach(() => {
    store = new Store(alchemyStoreDef, testOwner);
  });

  describe('initialization', () => {
    it('enters with store key set', () => {
      state = new ShoppingState('alchemy');
      expect(state.name).toBe('shopping');
      expect(state.storeKey).toBe('alchemy');
    });

    it('defaults to buy mode', () => {
      state = new ShoppingState('alchemy');
      expect(state.mode).toBe('buy');
    });
  });

  describe('exitStore', () => {
    it('returns to PlayingState when exitStore action received', () => {
      state = new ShoppingState('alchemy');
      const mockPlayer = createMockPlayer();
      const fsm = createMockFSM(mockPlayer, store);
      state.onEnter(fsm);

      const handled = state.handleAction(fsm, { type: 'exitStore' });

      expect(handled).toBe(true);
      expect(fsm.transition).toHaveBeenCalled();
      const transitionedState = (fsm.transition as any).mock.calls[0][0];
      expect(transitionedState).toBeInstanceOf(PlayingState);
    });
  });

  describe('toggleStorePage', () => {
    it('toggles between buy and sell modes', () => {
      state = new ShoppingState('alchemy');
      const mockPlayer = createMockPlayer();
      const fsm = createMockFSM(mockPlayer, store);
      state.onEnter(fsm);

      expect(state.mode).toBe('buy');

      state.handleAction(fsm, { type: 'toggleStorePage' });
      expect(state.mode).toBe('sell');

      state.handleAction(fsm, { type: 'toggleStorePage' });
      expect(state.mode).toBe('buy');
    });
  });

  describe('buyItem', () => {
    it('buys item from store when player has enough gold', () => {
      state = new ShoppingState('alchemy');
      const potion = createTestItem({ type: 'potion', cost: 50 });
      store.addToStock(potion);

      const mockPlayer = createMockPlayer({ gold: 500 });
      const fsm = createMockFSM(mockPlayer, store);
      state.onEnter(fsm);

      const handled = state.handleAction(fsm, { type: 'buyItem', itemIndex: 0 });

      expect(handled).toBe(true);
      expect(mockPlayer.spendGold).toHaveBeenCalled();
      expect(mockPlayer.addItem).toHaveBeenCalled();
    });

    it('fails to buy when player lacks gold', () => {
      state = new ShoppingState('alchemy');
      const expensivePotion = createTestItem({ type: 'potion', cost: 1000 });
      store.addToStock(expensivePotion);

      const mockPlayer = createMockPlayer({ gold: 10 });
      const fsm = createMockFSM(mockPlayer, store);
      state.onEnter(fsm);

      state.handleAction(fsm, { type: 'buyItem', itemIndex: 0 });

      expect(mockPlayer.addItem).not.toHaveBeenCalled();
      expect(fsm.addMessage).toHaveBeenCalledWith(expect.stringContaining("can't afford"), 'info');
    });
  });

  describe('sellItem', () => {
    it('sells item to store when store accepts the type', () => {
      state = new ShoppingState('alchemy');
      const potion = createTestItem({ type: 'potion', cost: 100 });

      const mockPlayer = createMockPlayer({ gold: 100, items: [potion] });
      const fsm = createMockFSM(mockPlayer, store);
      state.onEnter(fsm);
      state.handleAction(fsm, { type: 'toggleStorePage' }); // Switch to sell mode

      const handled = state.handleAction(fsm, { type: 'sellItem', inventoryIndex: 0 });

      expect(handled).toBe(true);
      expect(mockPlayer.addGold).toHaveBeenCalled();
      expect(mockPlayer.removeItem).toHaveBeenCalled();
    });

    it('fails to sell when store does not accept item type', () => {
      state = new ShoppingState('alchemy');
      const sword = createTestItem({ type: 'sword', key: 'long_sword', name: 'Long Sword', cost: 100 });

      const mockPlayer = createMockPlayer({ gold: 100, items: [sword] });
      const fsm = createMockFSM(mockPlayer, store);
      state.onEnter(fsm);
      state.handleAction(fsm, { type: 'toggleStorePage' }); // Switch to sell mode

      state.handleAction(fsm, { type: 'sellItem', inventoryIndex: 0 });

      expect(mockPlayer.addGold).not.toHaveBeenCalled();
      expect(fsm.addMessage).toHaveBeenCalledWith(expect.stringContaining("won't buy"), 'info');
    });
  });

  describe('letterSelect', () => {
    it('converts letter to item index for buying', () => {
      state = new ShoppingState('alchemy');
      const potion = createTestItem({ type: 'potion', cost: 50 });
      store.addToStock(potion);

      const mockPlayer = createMockPlayer({ gold: 500 });
      const fsm = createMockFSM(mockPlayer, store);
      state.onEnter(fsm);

      // 'a' = index 0
      state.handleAction(fsm, { type: 'letterSelect', letter: 'a' });

      expect(mockPlayer.spendGold).toHaveBeenCalled();
    });

    it('converts letter to inventory index for selling', () => {
      state = new ShoppingState('alchemy');
      const potion = createTestItem({ type: 'potion', cost: 100 });

      const mockPlayer = createMockPlayer({ gold: 100, items: [potion] });
      const fsm = createMockFSM(mockPlayer, store);
      state.onEnter(fsm);
      state.handleAction(fsm, { type: 'toggleStorePage' }); // Switch to sell mode

      // 'a' = index 0
      state.handleAction(fsm, { type: 'letterSelect', letter: 'a' });

      expect(mockPlayer.addGold).toHaveBeenCalled();
    });
  });
});
