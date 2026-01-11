import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceInteractionState } from '@/core/fsm/states/ServiceInteractionState';
import type { GameFSM } from '@/core/fsm/GameFSM';
import type { Player } from '@/core/entities/Player';
import type { Store } from '@/core/systems/Store';
import type { StoreDef, StoreOwner } from '@/core/data/stores';
import type { ServiceDef } from '@/core/data/services';
import { getGameStore } from '@/core/store/gameStore';

// Mock gameStore
vi.mock('@/core/store/gameStore', () => ({
  getGameStore: vi.fn(() => ({
    player: null,
    setServiceBuilding: vi.fn(),
  })),
}));

// Test fixtures
const testOwner: StoreOwner = {
  name: 'Test Owner',
  race: 'human',
  purse: 5000,
  greed: 100,
};

const innDef: StoreDef = {
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
      description: 'Fill your stomach with food and drink',
      baseCost: 10,
      action: 'action:service_eat',
    },
    {
      key: 'rest',
      type: 'inn_rest',
      name: 'Rest',
      description: 'Rest overnight to restore HP and MP',
      baseCost: 50,
      action: 'action:service_rest',
      nightOnly: true,
    },
  ] as ServiceDef[],
};

const rechargeShopDef: StoreDef = {
  key: 'recharge_shop',
  name: 'Recharge Shop',
  symbol: 'R',
  color: '#8080ff',
  maxStock: 0,
  minKeep: 0,
  maxKeep: 0,
  turnover: 0,
  buysTypes: [],
  sellsTypes: [],
  flags: ['SERVICE_BUILDING'],
  services: [
    {
      key: 'recharge',
      type: 'recharge',
      name: 'Recharge Item',
      description: 'Restore charges to a wand, staff, or rod',
      baseCost: 50,
      action: 'action:service_recharge',
      requiresItem: true,
      itemFilter: ['wand', 'staff', 'rod'],
    },
  ] as ServiceDef[],
};

// Mock player
function createMockPlayer(overrides?: Partial<Player>): Player {
  const player = {
    gold: 1000,
    stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
    inventory: [],
    food: 5000,
    maxFood: 15000,
    ...overrides,
  } as any;
  // Add spendGold method
  player.spendGold = function(amount: number) {
    if (amount <= 0) return false;
    if (this.gold >= amount) {
      this.gold -= amount;
      return true;
    }
    return false;
  };
  return player as unknown as Player;
}

// Mock store
function createMockStore(def: StoreDef): Store {
  return {
    definition: def,
    owner: testOwner,
    isServiceBuilding: true,
    hasServices: true,
    services: def.services ?? [],
  } as unknown as Store;
}

// Mock FSM
function createMockFSM(store: Store, _player: Player): GameFSM {
  const messages: string[] = [];
  return {
    storeManager: {
      getStore: vi.fn(() => store),
    },
    addMessage: vi.fn((msg: string) => messages.push(msg)),
    transition: vi.fn(),
    push: vi.fn(),
    pop: vi.fn(),
  } as unknown as GameFSM;
}

describe('ServiceInteractionState', () => {
  let mockStore: ReturnType<typeof vi.fn>;
  let player: Player;

  beforeEach(() => {
    player = createMockPlayer();
    mockStore = vi.fn();
    (getGameStore as ReturnType<typeof vi.fn>).mockReturnValue({
      player,
      setServiceBuilding: mockStore,
    });
  });

  describe('constructor', () => {
    it('initializes with buildingKey', () => {
      const state = new ServiceInteractionState('inn');
      expect(state.buildingKey).toBe('inn');
      expect(state.name).toBe('serviceInteraction');
    });

    it('initializes in browse mode', () => {
      const state = new ServiceInteractionState('inn');
      expect(state.mode).toBe('browse');
    });
  });

  describe('onEnter', () => {
    it('loads building from store manager', () => {
      const store = createMockStore(innDef);
      const fsm = createMockFSM(store, player);
      const state = new ServiceInteractionState('inn');

      state.onEnter(fsm);

      expect(fsm.storeManager.getStore).toHaveBeenCalledWith('inn');
    });

    it('shows welcome message', () => {
      const store = createMockStore(innDef);
      const fsm = createMockFSM(store, player);
      const state = new ServiceInteractionState('inn');

      state.onEnter(fsm);

      expect(fsm.addMessage).toHaveBeenCalledWith(expect.stringContaining('Inn'), 'info');
    });

    it('updates store state with services', () => {
      const store = createMockStore(innDef);
      const fsm = createMockFSM(store, player);
      const state = new ServiceInteractionState('inn');

      state.onEnter(fsm);

      expect(mockStore).toHaveBeenCalledWith(
        expect.objectContaining({
          buildingKey: 'inn',
          mode: 'browse',
          buildingName: 'Inn',
          services: expect.arrayContaining([
            expect.objectContaining({ key: 'eat', name: 'Eat' }),
            expect.objectContaining({ key: 'rest', name: 'Rest' }),
          ]),
        })
      );
    });
  });

  describe('onExit', () => {
    it('clears service building state', () => {
      const store = createMockStore(innDef);
      const fsm = createMockFSM(store, player);
      const state = new ServiceInteractionState('inn');

      state.onEnter(fsm);
      state.onExit(fsm);

      expect(mockStore).toHaveBeenLastCalledWith(null);
    });
  });

  describe('handleAction - exitBuilding', () => {
    it('returns to PlayingState from browse mode', () => {
      const store = createMockStore(innDef);
      const fsm = createMockFSM(store, player);
      const state = new ServiceInteractionState('inn');

      state.onEnter(fsm);
      const handled = state.handleAction(fsm, { type: 'exitBuilding' });

      expect(handled).toBe(true);
      expect(fsm.transition).toHaveBeenCalled();
    });

    it('returns to browse mode from item_select mode', () => {
      const store = createMockStore(rechargeShopDef);
      // Need to add a valid item so we can enter item_select mode
      (player as any).inventory = [
        { generated: { baseItem: { type: 'wand' } } },
      ];
      const fsm = createMockFSM(store, player);
      const state = new ServiceInteractionState('recharge_shop');

      state.onEnter(fsm);
      // Simulate entering item_select mode
      state.handleAction(fsm, { type: 'letterSelect', letter: 'a' });
      expect(state.mode).toBe('item_select'); // Verify we entered item_select

      // Now ESC should return to browse
      const handled = state.handleAction(fsm, { type: 'exitBuilding' });

      expect(handled).toBe(true);
      expect(state.mode).toBe('browse');
      expect(fsm.transition).not.toHaveBeenCalled(); // Should NOT exit building
    });
  });

  describe('handleAction - letterSelect (service selection)', () => {
    it('executes immediate service (eat)', () => {
      (player as any).gold = 1000;
      const store = createMockStore(innDef);
      const fsm = createMockFSM(store, player);
      const state = new ServiceInteractionState('inn');

      state.onEnter(fsm);
      const handled = state.handleAction(fsm, { type: 'letterSelect', letter: 'a' });

      expect(handled).toBe(true);
      // Service should be executed and message shown
      expect(fsm.addMessage).toHaveBeenCalledWith(expect.any(String), expect.any(String));
    });

    it('rejects service if player lacks gold', () => {
      (player as any).gold = 0;
      const store = createMockStore(innDef);
      const fsm = createMockFSM(store, player);
      const state = new ServiceInteractionState('inn');

      state.onEnter(fsm);
      state.handleAction(fsm, { type: 'letterSelect', letter: 'a' });

      expect(fsm.addMessage).toHaveBeenCalledWith(
        expect.stringContaining("can't afford"),
        expect.any(String)
      );
    });

    it('enters item_select mode for services requiring item', () => {
      const store = createMockStore(rechargeShopDef);
      (player as any).inventory = [
        { generated: { baseItem: { type: 'wand' } } },
      ];
      const fsm = createMockFSM(store, player);
      const state = new ServiceInteractionState('recharge_shop');

      state.onEnter(fsm);
      state.handleAction(fsm, { type: 'letterSelect', letter: 'a' });

      expect(state.mode).toBe('item_select');
    });

    it('rejects item-requiring service if no valid items', () => {
      const store = createMockStore(rechargeShopDef);
      (player as any).inventory = []; // No wands/staffs/rods
      const fsm = createMockFSM(store, player);
      const state = new ServiceInteractionState('recharge_shop');

      state.onEnter(fsm);
      state.handleAction(fsm, { type: 'letterSelect', letter: 'a' });

      expect(state.mode).toBe('browse'); // Should not enter item_select
      expect(fsm.addMessage).toHaveBeenCalledWith(
        expect.stringContaining('no items'),
        expect.any(String)
      );
    });
  });

  describe('handleAction - selectServiceItem', () => {
    it('executes service with selected item', () => {
      const store = createMockStore(rechargeShopDef);
      (player as any).inventory = [
        { generated: { baseItem: { type: 'wand' } } },
      ];
      (player as any).gold = 1000;
      const fsm = createMockFSM(store, player);
      const state = new ServiceInteractionState('recharge_shop');

      state.onEnter(fsm);
      state.handleAction(fsm, { type: 'letterSelect', letter: 'a' });
      const handled = state.handleAction(fsm, { type: 'selectServiceItem', itemIndex: 0 });

      expect(handled).toBe(true);
      expect(state.mode).toBe('browse'); // Should return to browse after service
    });

    it('ignores invalid item index', () => {
      const store = createMockStore(rechargeShopDef);
      (player as any).inventory = [
        { generated: { baseItem: { type: 'wand' } } },
      ];
      const fsm = createMockFSM(store, player);
      const state = new ServiceInteractionState('recharge_shop');

      state.onEnter(fsm);
      state.handleAction(fsm, { type: 'letterSelect', letter: 'a' });
      const handled = state.handleAction(fsm, { type: 'selectServiceItem', itemIndex: 99 });

      expect(handled).toBe(true);
      expect(state.mode).toBe('item_select'); // Should remain in item_select
    });
  });

  describe('handleAction - letterSelect', () => {
    it('selects item by letter in item_select mode', () => {
      const store = createMockStore(rechargeShopDef);
      (player as any).inventory = [
        { generated: { baseItem: { type: 'wand' } } },
      ];
      (player as any).gold = 1000;
      const fsm = createMockFSM(store, player);
      const state = new ServiceInteractionState('recharge_shop');

      state.onEnter(fsm);
      state.handleAction(fsm, { type: 'letterSelect', letter: 'a' });
      const handled = state.handleAction(fsm, { type: 'letterSelect', letter: 'a' });

      expect(handled).toBe(true);
    });

    it('ignores letter in browse mode', () => {
      const store = createMockStore(innDef);
      const fsm = createMockFSM(store, player);
      const state = new ServiceInteractionState('inn');

      state.onEnter(fsm);
      const handled = state.handleAction(fsm, { type: 'letterSelect', letter: 'z' });

      expect(handled).toBe(true); // Handled but no effect
      expect(state.mode).toBe('browse');
    });
  });

  describe('service availability', () => {
    it('marks nightOnly services as unavailable during day', () => {
      const store = createMockStore(innDef);
      const fsm = createMockFSM(store, player);
      const state = new ServiceInteractionState('inn');

      state.onEnter(fsm);

      // Check the state update
      expect(mockStore).toHaveBeenCalledWith(
        expect.objectContaining({
          services: expect.arrayContaining([
            expect.objectContaining({
              key: 'rest',
              available: false,
              reason: expect.stringContaining('night'),
            }),
          ]),
        })
      );
    });

    it('marks expensive services as unavailable if player lacks gold', () => {
      (player as any).gold = 5; // Less than eat cost (10)
      const store = createMockStore(innDef);
      const fsm = createMockFSM(store, player);
      const state = new ServiceInteractionState('inn');

      state.onEnter(fsm);

      expect(mockStore).toHaveBeenCalledWith(
        expect.objectContaining({
          services: expect.arrayContaining([
            expect.objectContaining({
              key: 'eat',
              available: false,
              reason: expect.stringContaining('gold'),
            }),
          ]),
        })
      );
    });
  });
});
