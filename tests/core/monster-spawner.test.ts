import { describe, it, expect, beforeEach } from 'vitest';
import { MonsterSpawner } from '@/core/systems/MonsterSpawner';
import { MonsterDataManager } from '@/core/data/MonsterDataManager';
import { Level } from '@/core/world/Level';
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
  depth: 1,
  rarity: 1,
  exp: 10,
  attacks: [{ method: 'HIT', effect: 'HURT', damage: '1d4' }],
  flags: [],
  description: 'A test monster',
  ...overrides,
});

describe('MonsterSpawner', () => {
  let spawner: MonsterSpawner;
  let dataManager: MonsterDataManager;
  let level: Level;
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
        hp: '1d4',
      }),
      orc: createTestMonster({
        key: 'orc',
        index: 2,
        name: 'Orc',
        symbol: 'o',
        depth: 5,
        rarity: 2,
        hp: '3d8',
        flags: ['MALE', 'FRIENDS'],
      }),
      unique_boss: createTestMonster({
        key: 'unique_boss',
        index: 3,
        name: 'The Boss',
        symbol: 'B',
        depth: 10,
        rarity: 10,
        hp: '10d10',
        flags: ['UNIQUE'],
      }),
    };

    dataManager = new MonsterDataManager(testMonsters);
    level = new Level(20, 20, { depth: 1 });
    spawner = new MonsterSpawner(dataManager);
  });

  describe('spawnMonster', () => {
    it('spawns a monster on a valid floor tile', () => {
      const monster = spawner.spawnMonster(level, { x: 5, y: 5 }, 'rat');

      expect(monster).toBeDefined();
      expect(monster?.definitionKey).toBe('rat');
      expect(monster?.position).toEqual({ x: 5, y: 5 });
    });

    it('adds spawned monster to level', () => {
      spawner.spawnMonster(level, { x: 5, y: 5 }, 'rat');

      expect(level.getMonsters()).toHaveLength(1);
      expect(level.getMonsterAt({ x: 5, y: 5 })).toBeDefined();
    });

    it('returns null for invalid position (wall)', () => {
      level.setWalkable({ x: 5, y: 5 }, false);
      const monster = spawner.spawnMonster(level, { x: 5, y: 5 }, 'rat');

      expect(monster).toBeNull();
    });

    it('returns null for occupied position', () => {
      spawner.spawnMonster(level, { x: 5, y: 5 }, 'rat');
      const second = spawner.spawnMonster(level, { x: 5, y: 5 }, 'orc');

      expect(second).toBeNull();
    });

    it('returns null for unknown monster key', () => {
      const monster = spawner.spawnMonster(level, { x: 5, y: 5 }, 'nonexistent');

      expect(monster).toBeNull();
    });
  });

  describe('spawnRandomMonster', () => {
    it('spawns a depth-appropriate monster', () => {
      const monster = spawner.spawnRandomMonster(level, { x: 5, y: 5 }, 1);

      expect(monster).toBeDefined();
      // Due to level boosting, any monster from the data could spawn
      // At depth 1, rat is most likely but orc can appear via level boost
      expect(['rat', 'orc']).toContain(monster?.definitionKey);
    });

    it('returns null when no monsters available for depth', () => {
      // Create empty data manager
      const emptyManager = new MonsterDataManager({});
      const emptySpawner = new MonsterSpawner(emptyManager);

      const monster = emptySpawner.spawnRandomMonster(level, { x: 5, y: 5 }, 1);

      expect(monster).toBeNull();
    });
  });

  describe('spawnMonstersForLevel', () => {
    it('spawns requested number of monsters', () => {
      const count = spawner.spawnMonstersForLevel(level, 1, 5);

      expect(count).toBe(5);
      expect(level.getMonsters()).toHaveLength(5);
    });

    it('stops when no valid positions remain', () => {
      // Make level very small with walls around border
      const smallLevel = new Level(3, 3, { depth: 1 });
      for (let x = 0; x < 3; x++) {
        smallLevel.setWalkable({ x, y: 0 }, false);
        smallLevel.setWalkable({ x, y: 2 }, false);
      }
      for (let y = 0; y < 3; y++) {
        smallLevel.setWalkable({ x: 0, y }, false);
        smallLevel.setWalkable({ x: 2, y }, false);
      }
      // Only (1,1) is walkable

      const count = spawner.spawnMonstersForLevel(smallLevel, 1, 10);

      expect(count).toBe(1); // Only one valid position
    });
  });

  describe('monster instances', () => {
    it('creates monsters with correct HP from definition', () => {
      const monster = spawner.spawnMonster(level, { x: 5, y: 5 }, 'rat');

      // rat has hp: '1d4', so max 4, min 1
      expect(monster?.maxHp).toBeGreaterThanOrEqual(1);
      expect(monster?.maxHp).toBeLessThanOrEqual(4);
      expect(monster?.hp).toBe(monster?.maxHp);
    });

    it('creates monsters with correct speed from definition', () => {
      const monster = spawner.spawnMonster(level, { x: 5, y: 5 }, 'rat');

      expect(monster?.speed).toBe(110);
    });

    it('generates unique IDs for each monster', () => {
      const m1 = spawner.spawnMonster(level, { x: 5, y: 5 }, 'rat');
      const m2 = spawner.spawnMonster(level, { x: 6, y: 5 }, 'rat');

      expect(m1?.id).not.toBe(m2?.id);
    });
  });
});
