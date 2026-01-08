import { describe, it, expect, beforeEach } from 'vitest';
import { MonsterDataManager } from '@/core/data/MonsterDataManager';
import type { MonsterDef } from '@/core/data/monsters';

// Test data fixtures
const createTestMonster = (overrides: Partial<MonsterDef> = {}): MonsterDef => ({
  key: 'test_monster',
  index: 1,
  name: 'Test Monster',
  symbol: 'm',
  color: 'w',
  speed: 110,
  hp: '2d8',
  vision: 20,
  ac: 10,
  alertness: 50,
  depth: 5,
  rarity: 1,
  exp: 10,
  attacks: [{ method: 'HIT', effect: 'HURT', damage: '1d4' }],
  flags: [],
  description: 'A test monster',
  ...overrides,
});

describe('MonsterDataManager', () => {
  let manager: MonsterDataManager;
  let testMonsters: Record<string, MonsterDef>;

  beforeEach(() => {
    testMonsters = {
      rat: createTestMonster({
        key: 'rat',
        index: 1,
        name: 'Rat',
        symbol: 'r',
        depth: 1,
        rarity: 1,
      }),
      giant_rat: createTestMonster({
        key: 'giant_rat',
        index: 2,
        name: 'Giant Rat',
        symbol: 'r',
        depth: 3,
        rarity: 2,
      }),
      orc: createTestMonster({
        key: 'orc',
        index: 3,
        name: 'Orc',
        symbol: 'o',
        depth: 10,
        rarity: 1,
        flags: ['MALE', 'DROP_60'],
      }),
      unique_orc: createTestMonster({
        key: 'unique_orc',
        index: 4,
        name: 'Azog the Orc King',
        symbol: 'o',
        depth: 20,
        rarity: 5,
        flags: ['UNIQUE', 'MALE'],
      }),
      deep_monster: createTestMonster({
        key: 'deep_monster',
        index: 5,
        name: 'Deep Horror',
        symbol: 'U',
        depth: 50,
        rarity: 3,
        flags: ['FORCE_DEPTH'],
      }),
    };

    manager = new MonsterDataManager(testMonsters);
  });

  describe('allocation table', () => {
    it('builds allocation table sorted by depth', () => {
      const table = manager.getAllocationTable();

      expect(table.length).toBe(5);
      // Should be sorted by depth
      for (let i = 1; i < table.length; i++) {
        expect(table[i].depth).toBeGreaterThanOrEqual(table[i - 1].depth);
      }
    });

    it('calculates probability as floor(100/rarity)', () => {
      const table = manager.getAllocationTable();

      const rat = table.find(e => e.monsterKey === 'rat');
      expect(rat?.probability).toBe(100); // 100/1

      const giantRat = table.find(e => e.monsterKey === 'giant_rat');
      expect(giantRat?.probability).toBe(50); // 100/2

      const uniqueOrc = table.find(e => e.monsterKey === 'unique_orc');
      expect(uniqueOrc?.probability).toBe(20); // 100/5
    });

    it('excludes monsters with rarity 0', () => {
      const monstersWithZeroRarity = {
        ...testMonsters,
        placeholder: createTestMonster({
          key: 'placeholder',
          index: 99,
          rarity: 0,
        }),
      };

      const mgr = new MonsterDataManager(monstersWithZeroRarity);
      const table = mgr.getAllocationTable();

      expect(table.find(e => e.monsterKey === 'placeholder')).toBeUndefined();
    });
  });

  describe('getMonsterDef', () => {
    it('returns monster by key', () => {
      const monster = manager.getMonsterDef('orc');

      expect(monster).toBeDefined();
      expect(monster?.name).toBe('Orc');
      expect(monster?.depth).toBe(10);
    });

    it('returns undefined for unknown key', () => {
      const monster = manager.getMonsterDef('nonexistent');
      expect(monster).toBeUndefined();
    });
  });

  describe('selectMonster', () => {
    it('selects monsters within acceptable depth range', () => {
      // Level boosting can add up to 10 + 7 + 7 = 24 levels
      const MAX_BOOST = 24;
      const level = 5;
      const monster = manager.selectMonster(level);

      expect(monster).toBeDefined();
      // Monster's native depth should be at most level + max boost
      expect(monster!.depth).toBeLessThanOrEqual(level + MAX_BOOST);
    });

    it('returns null when no monsters available', () => {
      const emptyManager = new MonsterDataManager({});
      const monster = emptyManager.selectMonster(10);

      expect(monster).toBeNull();
    });

    it('respects FORCE_DEPTH flag', () => {
      // FORCE_DEPTH monsters should not appear at shallower depths
      // even with level boosting
      for (let i = 0; i < 20; i++) {
        const monster = manager.selectMonster(30);
        if (monster?.key === 'deep_monster') {
          // If selected, this would be a bug - deep_monster has depth 50
          // with FORCE_DEPTH so it shouldn't appear at depth 30
        }
        expect(monster?.key).not.toBe('deep_monster');
      }
    });
  });

  describe('getMonstersForDepth', () => {
    it('returns all monsters eligible for given depth', () => {
      const monsters = manager.getMonstersForDepth(10);

      // Depth 10 includes: rat (1), giant_rat (3), orc (10)
      expect(monsters.length).toBe(3);
      expect(monsters.map(m => m.key)).toContain('rat');
      expect(monsters.map(m => m.key)).toContain('giant_rat');
      expect(monsters.map(m => m.key)).toContain('orc');
    });

    it('excludes monsters below minimum depth', () => {
      const monsters = manager.getMonstersForDepth(2);

      // Only rat (depth 1) should be eligible
      expect(monsters.length).toBe(1);
      expect(monsters[0].key).toBe('rat');
    });
  });

  describe('unique tracking', () => {
    it('tracks killed uniques', () => {
      expect(manager.isUniqueKilled('unique_orc')).toBe(false);

      manager.markUniqueKilled('unique_orc');

      expect(manager.isUniqueKilled('unique_orc')).toBe(true);
    });

    it('excludes killed uniques from selection', () => {
      // Mark unique as killed
      manager.markUniqueKilled('unique_orc');

      // At depth 50, unique_orc should normally be eligible
      // but since it's killed, it should never be selected
      for (let i = 0; i < 20; i++) {
        const monster = manager.selectMonster(50);
        expect(monster?.key).not.toBe('unique_orc');
      }
    });

    it('can reset killed uniques for new game', () => {
      manager.markUniqueKilled('unique_orc');
      expect(manager.isUniqueKilled('unique_orc')).toBe(true);

      manager.resetUniques();

      expect(manager.isUniqueKilled('unique_orc')).toBe(false);
    });
  });

  describe('level boosting', () => {
    it('occasionally selects out-of-depth monsters', () => {
      // Run many iterations to test probability
      // At depth 5, orc (depth 10) should occasionally appear due to boosting
      let orcCount = 0;
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const monster = manager.selectMonster(5);
        if (monster?.key === 'orc') {
          orcCount++;
        }
      }

      // Should see some orcs due to level boosting, but not many
      // Exact probability depends on implementation
      // Just verify it can happen
      expect(orcCount).toBeGreaterThan(0);
      expect(orcCount).toBeLessThan(iterations / 2); // But not dominant
    });
  });
});
