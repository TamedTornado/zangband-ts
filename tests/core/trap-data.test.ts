import { describe, it, expect, beforeEach } from 'vitest';
import { TrapDataManager, type TrapDef } from '@/core/data/traps';

// Test data fixtures
const createTestTrap = (overrides: Partial<TrapDef> = {}): TrapDef => ({
  key: 'test_trap',
  index: 1,
  name: 'Test Trap',
  symbol: '^',
  color: 'w',
  minDepth: 1,
  rarity: 1,
  effect: 'DAMAGE',
  damage: '1d6',
  saveType: 'DEX',
  saveDifficulty: 5,
  flags: ['FLOOR', 'HIDDEN'],
  ...overrides,
});

describe('TrapDataManager', () => {
  let manager: TrapDataManager;
  let testTraps: Record<string, TrapDef>;

  beforeEach(() => {
    testTraps = {
      pit: createTestTrap({
        key: 'pit',
        index: 1,
        name: 'pit',
        minDepth: 1,
        rarity: 2,
      }),
      spiked_pit: createTestTrap({
        key: 'spiked_pit',
        index: 2,
        name: 'spiked pit',
        minDepth: 5,
        rarity: 3,
      }),
      poison_trap: createTestTrap({
        key: 'poison_trap',
        index: 3,
        name: 'poison trap',
        minDepth: 10,
        rarity: 4,
        effect: 'POISON',
      }),
      deep_trap: createTestTrap({
        key: 'deep_trap',
        index: 4,
        name: 'deep horror trap',
        minDepth: 50,
        rarity: 5,
      }),
    };

    manager = new TrapDataManager(testTraps);
  });

  describe('allocation table', () => {
    it('builds allocation table sorted by depth', () => {
      const table = manager.getAllocationTable();

      expect(table.length).toBe(4);
      for (let i = 1; i < table.length; i++) {
        expect(table[i].depth).toBeGreaterThanOrEqual(table[i - 1].depth);
      }
    });

    it('calculates probability as floor(100/rarity)', () => {
      const table = manager.getAllocationTable();

      const pit = table.find(e => e.trapKey === 'pit');
      expect(pit?.probability).toBe(50); // 100/2

      const poison = table.find(e => e.trapKey === 'poison_trap');
      expect(poison?.probability).toBe(25); // 100/4
    });

    it('excludes traps with rarity 0', () => {
      const trapsWithZeroRarity = {
        ...testTraps,
        placeholder: createTestTrap({
          key: 'placeholder',
          index: 99,
          rarity: 0,
        }),
      };

      const mgr = new TrapDataManager(trapsWithZeroRarity);
      const table = mgr.getAllocationTable();

      expect(table.find(e => e.trapKey === 'placeholder')).toBeUndefined();
    });
  });

  describe('getTrapDef', () => {
    it('returns trap by key', () => {
      const trap = manager.getTrapDef('spiked_pit');

      expect(trap).toBeDefined();
      expect(trap?.name).toBe('spiked pit');
      expect(trap?.minDepth).toBe(5);
    });

    it('returns undefined for unknown key', () => {
      const trap = manager.getTrapDef('nonexistent');
      expect(trap).toBeUndefined();
    });
  });

  describe('selectTrap', () => {
    it('selects traps appropriate for depth', () => {
      // At depth 3, only pit should be eligible (minDepth 1)
      const trap = manager.selectTrap(3);

      expect(trap).toBeDefined();
      expect(trap?.key).toBe('pit');
    });

    it('includes deeper traps at higher depths', () => {
      // At depth 10, pit, spiked_pit, and poison_trap are eligible
      const selectedKeys = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const trap = manager.selectTrap(10);
        if (trap) {
          selectedKeys.add(trap.key);
        }
      }

      expect(selectedKeys.has('pit')).toBe(true);
      expect(selectedKeys.has('spiked_pit')).toBe(true);
      expect(selectedKeys.has('poison_trap')).toBe(true);
      expect(selectedKeys.has('deep_trap')).toBe(false); // depth 50
    });

    it('returns null when no traps available', () => {
      const emptyManager = new TrapDataManager({});
      const trap = emptyManager.selectTrap(10);

      expect(trap).toBeNull();
    });
  });

  describe('getTrapsForDepth', () => {
    it('returns all traps eligible for given depth', () => {
      const traps = manager.getTrapsForDepth(10);

      expect(traps.length).toBe(3);
      expect(traps.map(t => t.key)).toContain('pit');
      expect(traps.map(t => t.key)).toContain('spiked_pit');
      expect(traps.map(t => t.key)).toContain('poison_trap');
    });

    it('excludes traps below minimum depth', () => {
      const traps = manager.getTrapsForDepth(3);

      expect(traps.length).toBe(1);
      expect(traps[0].key).toBe('pit');
    });
  });
});
