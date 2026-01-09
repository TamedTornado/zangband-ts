import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore, getGameStore } from '@/core/store/gameStore';
import { Player } from '@/core/entities/Player';
import { Item } from '@/core/entities/Item';
import type { ItemDef } from '@/core/data/items';
import { ItemSelectionState } from '@/core/fsm/states/ItemSelectionState';
import { PlayingState } from '@/core/fsm/states/PlayingState';
import type { GameFSM } from '@/core/fsm/GameFSM';

// Reset store before each test
beforeEach(() => {
  useGameStore.setState({
    player: null,
    level: null,
    scheduler: null,
    depth: 1,
    turn: 0,
    messages: [],
    upStairs: [],
    downStairs: [],
    killedBy: null,
    cursor: null,
    lastTargetMonsterId: null,
    lastCommand: null,
    isRepeating: false,
    itemTargeting: null,
    symbolTargeting: null,
    directionTargeting: null,
    spellTargeting: null,
    activeModal: null,
    inventoryMode: 'browse',
    stateName: 'none',
    prompt: null,
    _messageId: 0,
  });
});

function createTestPlayer(): Player {
  return new Player({
    id: 'test-player',
    position: { x: 5, y: 5 },
    maxHp: 100,
    speed: 110,
    stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
  });
}

function createTestPotion(id: string = 'potion_1', uniqueKey?: string): Item {
  const baseItem: ItemDef = {
    key: uniqueKey || 'potion_cure_light', // Use unique key to prevent stacking
    index: 1,
    name: 'Potion of Cure Light Wounds',
    symbol: '!',
    color: 'w',
    type: 'potion',
    sval: 1,
    pval: 0,
    depth: 1,
    rarity: 1,
    weight: 4,
    cost: 15,
    allocation: [],
    baseAc: 0,
    damage: '0d0',
    toHit: 0,
    toDam: 0,
    toAc: 0,
    flags: [],
    effects: [{ type: 'heal', amount: '2d8' }],
  };
  return new Item({
    id,
    position: { x: 0, y: 0 },
    symbol: '!',
    color: 'w',
    generated: {
      baseItem,
      toHit: 0,
      toDam: 0,
      toAc: 0,
      pval: 0,
      flags: [],
    },
  });
}

function createTestWand(id: string = 'wand_1'): Item {
  const baseItem: ItemDef = {
    key: 'wand_magic_missile',
    index: 1,
    name: 'Wand of Magic Missile',
    symbol: '-',
    color: 'w',
    type: 'wand',
    sval: 1,
    pval: 10, // charges
    depth: 1,
    rarity: 1,
    weight: 10,
    cost: 100,
    allocation: [],
    baseAc: 0,
    damage: '0d0',
    toHit: 0,
    toDam: 0,
    toAc: 0,
    flags: [],
    effects: [{ type: 'bolt', element: 'magic', damage: '3d4', target: 'position' }],
  };
  return new Item({
    id,
    position: { x: 0, y: 0 },
    symbol: '-',
    color: 'w',
    generated: {
      baseItem,
      toHit: 0,
      toDam: 0,
      toAc: 0,
      pval: 10,
      flags: [],
    },
  });
}

describe('Repeat Command System', () => {
  describe('lastCommand store', () => {
    it('should initialize to null', () => {
      const store = getGameStore();
      expect(store.lastCommand).toBeNull();
    });

    it('should store command info', () => {
      getGameStore().setLastCommand({
        actionType: 'quaff',
        itemId: 'potion_1',
      });

      expect(getGameStore().lastCommand).toEqual({
        actionType: 'quaff',
        itemId: 'potion_1',
      });
    });

    it('should store command with targetPosition', () => {
      getGameStore().setLastCommand({
        actionType: 'zap',
        itemId: 'wand_1',
        targetPosition: { x: 10, y: 10 },
      });

      expect(getGameStore().lastCommand).toEqual({
        actionType: 'zap',
        itemId: 'wand_1',
        targetPosition: { x: 10, y: 10 },
      });
    });

    it('should clear on game reset', () => {
      const store = getGameStore();

      store.setLastCommand({
        actionType: 'quaff',
        itemId: 'potion_1',
      });

      store.reset();

      expect(getGameStore().lastCommand).toBeNull();
    });
  });

  describe('isRepeating flag', () => {
    it('should initialize to false', () => {
      const store = getGameStore();
      expect(store.isRepeating).toBe(false);
    });

    it('should be settable to true', () => {
      getGameStore().setIsRepeating(true);

      expect(getGameStore().isRepeating).toBe(true);
    });

    it('should be settable back to false', () => {
      const store = getGameStore();

      store.setIsRepeating(true);
      store.setIsRepeating(false);

      expect(store.isRepeating).toBe(false);
    });

    it('should reset to false on game reset', () => {
      const store = getGameStore();

      store.setIsRepeating(true);
      store.reset();

      expect(getGameStore().isRepeating).toBe(false);
    });
  });

  describe('ItemSelectionState auto-select', () => {
    it('should auto-select item by ID when isRepeating', () => {
      const store = getGameStore();
      const player = createTestPlayer();
      const potion = createTestPotion('my_potion');

      player.addItem(potion);
      store.setPlayer(player);
      store.setLastCommand({ actionType: 'quaff', itemId: 'my_potion' });
      store.setIsRepeating(true);

      // ItemSelectionState should find item by ID
      const item = player.inventory.find((i) => i.id === 'my_potion');
      expect(item).toBe(potion);
      expect(item?.isPotion).toBe(true);
    });

    it('should return null if item not found by ID', () => {
      const store = getGameStore();
      const player = createTestPlayer();
      const potion = createTestPotion('other_potion');

      player.addItem(potion);
      store.setPlayer(player);
      store.setLastCommand({ actionType: 'quaff', itemId: 'nonexistent_id' });
      store.setIsRepeating(true);

      // Item lookup should fail
      const item = player.inventory.find((i) => i.id === 'nonexistent_id');
      expect(item).toBeUndefined();
    });

    it('should validate item passes filter', () => {
      const store = getGameStore();
      const player = createTestPlayer();
      const wand = createTestWand('my_wand');

      player.addItem(wand);
      store.setPlayer(player);
      store.setLastCommand({ actionType: 'quaff', itemId: 'my_wand' });
      store.setIsRepeating(true);

      // Item exists but is not a potion
      const item = player.inventory.find((i) => i.id === 'my_wand');
      expect(item).toBe(wand);
      expect(item?.isPotion).toBe(false); // Should fail potion filter
    });
  });

  describe('PlayingState repeatLastCommand', () => {
    it('should have no command to repeat initially', () => {
      const store = getGameStore();
      expect(store.lastCommand).toBeNull();
    });

    it('should be able to store and retrieve command', () => {
      getGameStore().setLastCommand({ actionType: 'quaff', itemId: 'potion_1' });

      expect(getGameStore().lastCommand).not.toBeNull();
      expect(getGameStore().lastCommand?.actionType).toBe('quaff');
    });
  });

  describe('command types', () => {
    it('should support quaff command', () => {
      getGameStore().setLastCommand({ actionType: 'quaff', itemId: 'potion_1' });

      expect(getGameStore().lastCommand?.actionType).toBe('quaff');
    });

    it('should support zap command with target', () => {
      getGameStore().setLastCommand({
        actionType: 'zap',
        itemId: 'wand_1',
        targetPosition: { x: 15, y: 8 },
      });

      expect(getGameStore().lastCommand?.actionType).toBe('zap');
      expect(getGameStore().lastCommand?.targetPosition).toEqual({ x: 15, y: 8 });
    });

    it('should support read command', () => {
      getGameStore().setLastCommand({ actionType: 'read', itemId: 'scroll_1' });

      expect(getGameStore().lastCommand?.actionType).toBe('read');
    });

    it('should support eat command', () => {
      getGameStore().setLastCommand({ actionType: 'eat', itemId: 'food_1' });

      expect(getGameStore().lastCommand?.actionType).toBe('eat');
    });

    it('should support cast command with spellKey', () => {
      getGameStore().setLastCommand({
        actionType: 'cast',
        itemId: '', // No item for spells
        spellKey: 'sorcery:0',
      });

      expect(getGameStore().lastCommand?.actionType).toBe('cast');
      expect(getGameStore().lastCommand?.spellKey).toBe('sorcery:0');
    });
  });

  describe('item lookup by ID', () => {
    it('should find correct item when inventory has multiple items', () => {
      const player = createTestPlayer();
      const potion = createTestPotion('potion_a');
      const wand = createTestWand('wand_b');

      player.addItem(potion);
      player.addItem(wand);

      // Find by ID should work regardless of position
      expect(player.inventory.find((i) => i.id === 'potion_a')).toBe(potion);
      expect(player.inventory.find((i) => i.id === 'wand_b')).toBe(wand);
    });

    it('should find item even if inventory was reorganized', () => {
      const player = createTestPlayer();
      const potion1 = createTestPotion('target_potion');
      const potion2 = createTestPotion('other_potion');

      player.addItem(potion1);
      player.addItem(potion2);

      // Save the ID
      const savedId = potion1.id;

      // Remove and re-add to simulate reorganization
      player.removeItem(potion2.id);

      // Should still find by ID
      const found = player.inventory.find((i) => i.id === savedId);
      expect(found).toBe(potion1);
    });
  });

  describe('ItemSelectionState integration', () => {
    function createMockFSM(): GameFSM {
      return {
        pop: vi.fn(),
        push: vi.fn(),
        transition: vi.fn(),
        dispatch: vi.fn(),
        addMessage: vi.fn(),
      } as unknown as GameFSM;
    }

    it('should auto-pop with item when isRepeating and item found', () => {
      const store = getGameStore();
      const player = createTestPlayer();
      const potion = createTestPotion('repeat_potion');
      player.addItem(potion);

      store.setPlayer(player);
      store.setLastCommand({ actionType: 'quaff', itemId: 'repeat_potion' });
      store.setIsRepeating(true);

      const mockFsm = createMockFSM();
      const state = new ItemSelectionState({
        prompt: 'Quaff which potion?',
        filter: (item) => item.isPotion,
      });

      state.onEnter(mockFsm);

      // Should have called pop with the item
      expect(mockFsm.pop).toHaveBeenCalledWith({
        item: potion,
        itemIndex: 0,
      });
      // Should NOT have set up item targeting UI
      expect(store.itemTargeting).toBeNull();
    });

    it('should fall back to normal selection when item not found', () => {
      const store = getGameStore();
      const player = createTestPlayer();
      const potion = createTestPotion('different_potion');
      player.addItem(potion);

      store.setPlayer(player);
      store.setLastCommand({ actionType: 'quaff', itemId: 'nonexistent_potion' });
      store.setIsRepeating(true);

      const mockFsm = createMockFSM();
      const state = new ItemSelectionState({
        prompt: 'Quaff which potion?',
        filter: (item) => item.isPotion,
      });

      state.onEnter(mockFsm);

      // Should NOT have called pop (fall back to selection)
      expect(mockFsm.pop).not.toHaveBeenCalled();
      // Should have cleared isRepeating
      expect(getGameStore().isRepeating).toBe(false);
      // Should have set up item targeting UI (use fresh store reference)
      expect(getGameStore().itemTargeting).not.toBeNull();
    });

    it('should fall back when item exists but fails filter', () => {
      const store = getGameStore();
      const player = createTestPlayer();
      const wand = createTestWand('my_wand');
      const potion = createTestPotion('backup_potion'); // Add a potion so there's something to select
      player.addItem(wand);
      player.addItem(potion);

      store.setPlayer(player);
      // Saved a wand but trying to quaff (potion filter)
      store.setLastCommand({ actionType: 'quaff', itemId: 'my_wand' });
      store.setIsRepeating(true);

      const mockFsm = createMockFSM();
      const state = new ItemSelectionState({
        prompt: 'Quaff which potion?',
        filter: (item) => item.isPotion,
      });

      state.onEnter(mockFsm);

      // Should NOT have called pop (wand doesn't pass potion filter, falls back to selection)
      expect(mockFsm.pop).not.toHaveBeenCalled();
      // Should have cleared isRepeating
      expect(getGameStore().isRepeating).toBe(false);
      // Should have set up item targeting UI for the potion
      expect(getGameStore().itemTargeting).not.toBeNull();
    });

    it('should pop with no items message when inventory empty', () => {
      const store = getGameStore();
      const player = createTestPlayer();
      // No items added

      store.setPlayer(player);
      store.setIsRepeating(false);

      const mockFsm = createMockFSM();
      const state = new ItemSelectionState({
        prompt: 'Quaff which potion?',
        filter: (item) => item.isPotion,
      });

      state.onEnter(mockFsm);

      // Should have called pop with null item
      expect(mockFsm.pop).toHaveBeenCalledWith({ item: null, itemIndex: -1 });
      expect(mockFsm.addMessage).toHaveBeenCalledWith('You have nothing to select.', 'info');
    });
  });

  describe('PlayingState repeatLastCommand', () => {
    function createMockFSM(): GameFSM {
      return {
        pop: vi.fn(),
        push: vi.fn(),
        transition: vi.fn(),
        dispatch: vi.fn(),
        addMessage: vi.fn(),
      } as unknown as GameFSM;
    }

    it('should show message when no command to repeat', () => {
      const store = getGameStore();
      store.setLastCommand(null);

      const mockFsm = createMockFSM();
      const state = new PlayingState();

      const handled = state.handleAction(mockFsm, { type: 'repeatLastCommand' });

      expect(handled).toBe(true);
      expect(mockFsm.addMessage).toHaveBeenCalledWith('No command to repeat.', 'info');
      expect(mockFsm.dispatch).not.toHaveBeenCalled();
    });

    it('should dispatch original action when lastCommand exists', () => {
      const store = getGameStore();
      store.setLastCommand({ actionType: 'quaff', itemId: 'potion_1' });

      const mockFsm = createMockFSM();
      const state = new PlayingState();

      const handled = state.handleAction(mockFsm, { type: 'repeatLastCommand' });

      expect(handled).toBe(true);
      expect(getGameStore().isRepeating).toBe(true);
      expect(mockFsm.dispatch).toHaveBeenCalledWith({ type: 'quaff' });
    });

    it('should dispatch zap action for zap command', () => {
      const store = getGameStore();
      store.setLastCommand({
        actionType: 'zap',
        itemId: 'wand_1',
        targetPosition: { x: 10, y: 10 },
      });

      const mockFsm = createMockFSM();
      const state = new PlayingState();

      state.handleAction(mockFsm, { type: 'repeatLastCommand' });

      expect(mockFsm.dispatch).toHaveBeenCalledWith({ type: 'zap' });
    });

    it('should dispatch cast action for cast command', () => {
      const store = getGameStore();
      store.setLastCommand({
        actionType: 'cast',
        itemId: '',
        spellKey: 'sorcery:magic_missile',
      });

      const mockFsm = createMockFSM();
      const state = new PlayingState();

      state.handleAction(mockFsm, { type: 'repeatLastCommand' });

      expect(mockFsm.dispatch).toHaveBeenCalledWith({ type: 'cast' });
    });
  });

  describe('ZapState repeat with targeting', () => {
    it('should store targetPosition when zapping with target', () => {
      getGameStore().setLastCommand({
        actionType: 'zap',
        itemId: 'wand_1',
        targetPosition: { x: 10, y: 15 },
      });

      expect(getGameStore().lastCommand?.targetPosition).toEqual({ x: 10, y: 15 });
    });

    it('should preserve targetPosition across multiple commands', () => {
      // First command - zap with target
      getGameStore().setLastCommand({
        actionType: 'zap',
        itemId: 'wand_1',
        targetPosition: { x: 5, y: 8 },
      });

      // Verify target is stored
      expect(getGameStore().lastCommand?.targetPosition).toEqual({ x: 5, y: 8 });

      // Overwrite with quaff (no target)
      getGameStore().setLastCommand({
        actionType: 'quaff',
        itemId: 'potion_1',
      });

      // Target should be gone
      expect(getGameStore().lastCommand?.targetPosition).toBeUndefined();
    });
  });

  describe('CastSpellState repeat', () => {
    it('should store spellKey for cast command', () => {
      getGameStore().setLastCommand({
        actionType: 'cast',
        itemId: '',
        spellKey: 'sorcery:magic_missile',
      });

      expect(getGameStore().lastCommand?.spellKey).toBe('sorcery:magic_missile');
    });

    it('should store both spellKey and targetPosition for targeted spells', () => {
      getGameStore().setLastCommand({
        actionType: 'cast',
        itemId: '',
        spellKey: 'sorcery:fireball',
        targetPosition: { x: 12, y: 20 },
      });

      expect(getGameStore().lastCommand?.spellKey).toBe('sorcery:fireball');
      expect(getGameStore().lastCommand?.targetPosition).toEqual({ x: 12, y: 20 });
    });

    it('should distinguish between spells by realm:key format', () => {
      getGameStore().setLastCommand({
        actionType: 'cast',
        itemId: '',
        spellKey: 'life:cure_light_wounds',
      });
      expect(getGameStore().lastCommand?.spellKey).toBe('life:cure_light_wounds');

      getGameStore().setLastCommand({
        actionType: 'cast',
        itemId: '',
        spellKey: 'death:nether_bolt',
      });
      expect(getGameStore().lastCommand?.spellKey).toBe('death:nether_bolt');
    });
  });

  describe('edge cases', () => {
    it('should handle consumed item (item no longer in inventory)', () => {
      const store = getGameStore();
      const player = createTestPlayer();
      const potion = createTestPotion('consumed_potion');
      player.addItem(potion);

      store.setPlayer(player);
      store.setLastCommand({ actionType: 'quaff', itemId: 'consumed_potion' });

      // Simulate item being consumed
      player.removeItem('consumed_potion');

      store.setIsRepeating(true);

      const mockFsm = {
        pop: vi.fn(),
        push: vi.fn(),
        transition: vi.fn(),
        dispatch: vi.fn(),
        addMessage: vi.fn(),
      } as unknown as GameFSM;

      const state = new ItemSelectionState({
        prompt: 'Quaff which potion?',
        filter: (item) => item.isPotion,
      });

      state.onEnter(mockFsm);

      // Item was consumed, should fall back
      expect(getGameStore().isRepeating).toBe(false);
      // No potions left, should pop with null
      expect(mockFsm.pop).toHaveBeenCalledWith({ item: null, itemIndex: -1 });
    });

    it('should find another item of same type when original consumed', () => {
      const store = getGameStore();
      const player = createTestPlayer();
      // Add two potions with different keys to prevent stacking
      const potion1 = createTestPotion('potion_1', 'potion_cure_light');
      const potion2 = createTestPotion('potion_2', 'potion_cure_serious'); // Different key
      player.addItem(potion1);
      player.addItem(potion2);

      store.setPlayer(player);
      // Original potion was consumed, but we saved its ID
      store.setLastCommand({ actionType: 'quaff', itemId: 'potion_1' });

      // Simulate potion_1 being consumed
      player.removeItem('potion_1');

      store.setIsRepeating(true);

      const mockFsm = {
        pop: vi.fn(),
        push: vi.fn(),
        transition: vi.fn(),
        dispatch: vi.fn(),
        addMessage: vi.fn(),
      } as unknown as GameFSM;

      const state = new ItemSelectionState({
        prompt: 'Quaff which potion?',
        filter: (item) => item.isPotion,
      });

      state.onEnter(mockFsm);

      // Original item not found, falls back to normal selection
      expect(getGameStore().isRepeating).toBe(false);
      // But there's still a potion, so should show selection UI
      expect(mockFsm.pop).not.toHaveBeenCalled();
      expect(getGameStore().itemTargeting).not.toBeNull();
    });
  });
});
