import { describe, it, expect, beforeEach } from 'vitest';
import { TrapSpawner } from '@/core/systems/TrapSpawner';
import { TrapDataManager, type TrapDef } from '@/core/data/traps';
import { Level } from '@/core/world/Level';

// Test data fixtures
const createTestTrap = (overrides: Partial<TrapDef> = {}): TrapDef => ({
  key: 'test_trap',
  index: 1,
  name: 'Test Trap',
  symbol: '^',
  color: 'w',
  minDepth: 1,
  rarity: 3,
  effect: 'DAMAGE',
  damage: '1d4',
  saveType: 'DEX',
  saveDifficulty: 5,
  flags: ['FLOOR', 'HIDDEN'],
  ...overrides,
});

describe('TrapSpawner', () => {
  let spawner: TrapSpawner;
  let dataManager: TrapDataManager;
  let level: Level;
  let testTraps: Record<string, TrapDef>;

  beforeEach(() => {
    testTraps = {
      pit: createTestTrap({
        key: 'pit',
        index: 1,
        name: 'Pit',
        minDepth: 1,
        rarity: 3,
        effect: 'DAMAGE',
        damage: '2d6',
      }),
      fire_trap: createTestTrap({
        key: 'fire_trap',
        index: 2,
        name: 'Fire Trap',
        minDepth: 5,
        rarity: 4,
        effect: 'FIRE',
        damage: '4d6',
      }),
      teleport_trap: createTestTrap({
        key: 'teleport_trap',
        index: 3,
        name: 'Teleport Trap',
        minDepth: 1,
        rarity: 3,
        effect: 'TELEPORT',
        damage: '0d0',
        teleportRange: 100,
        saveType: 'none',
        saveDifficulty: 0,
      }),
    };

    dataManager = new TrapDataManager(testTraps);
    level = new Level(20, 20, { depth: 1 });
    spawner = new TrapSpawner(dataManager);
  });

  describe('spawnTrap', () => {
    it('spawns a trap at a valid floor position', () => {
      const trap = spawner.spawnTrap(level, { x: 5, y: 5 }, 'pit');

      expect(trap).toBeDefined();
      expect(trap?.key).toBe('pit');
      expect(trap?.position).toEqual({ x: 5, y: 5 });
    });

    it('adds spawned trap to level', () => {
      spawner.spawnTrap(level, { x: 5, y: 5 }, 'pit');

      expect(level.getTraps()).toHaveLength(1);
      expect(level.getTrapAt({ x: 5, y: 5 })).toBeDefined();
    });

    it('returns null for wall positions', () => {
      level.setWalkable({ x: 5, y: 5 }, false);
      const trap = spawner.spawnTrap(level, { x: 5, y: 5 }, 'pit');

      expect(trap).toBeNull();
    });

    it('returns null if trap already exists at position', () => {
      spawner.spawnTrap(level, { x: 5, y: 5 }, 'pit');
      const second = spawner.spawnTrap(level, { x: 5, y: 5 }, 'fire_trap');

      expect(second).toBeNull();
      expect(level.getTraps()).toHaveLength(1);
    });

    it('returns null for stair positions', () => {
      level.setTerrain({ x: 5, y: 5 }, 'down_staircase');
      const trap = spawner.spawnTrap(level, { x: 5, y: 5 }, 'pit');

      expect(trap).toBeNull();
    });

    it('returns null for unknown trap key', () => {
      const trap = spawner.spawnTrap(level, { x: 5, y: 5 }, 'nonexistent');

      expect(trap).toBeNull();
    });

    it('spawns trap with correct hidden state from definition', () => {
      const trap = spawner.spawnTrap(level, { x: 5, y: 5 }, 'pit');

      // Traps with HIDDEN flag start hidden
      expect(trap?.isRevealed).toBe(false);
    });
  });

  describe('spawnRandomTrap', () => {
    it('uses TrapDataManager.selectTrap for depth-based selection', () => {
      const trap = spawner.spawnRandomTrap(level, { x: 5, y: 5 }, 1);

      expect(trap).toBeDefined();
      // At depth 1, pit and teleport_trap are available (minDepth 1)
      // fire_trap requires minDepth 5
      expect(['pit', 'teleport_trap']).toContain(trap?.key);
    });

    it('returns null if no traps available for depth', () => {
      // Create empty data manager
      const emptyManager = new TrapDataManager({});
      const emptySpawner = new TrapSpawner(emptyManager);

      const trap = emptySpawner.spawnRandomTrap(level, { x: 5, y: 5 }, 1);

      expect(trap).toBeNull();
    });

    it('can spawn deeper traps at appropriate depth', () => {
      // At depth 10, all traps should be available
      const trapsSpawned = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const trap = spawner.spawnRandomTrap(level, { x: 5 + i % 10, y: 5 + Math.floor(i / 10) }, 10);
        if (trap) {
          trapsSpawned.add(trap.key);
        }
      }

      // fire_trap should now be possible
      expect(trapsSpawned.has('fire_trap')).toBe(true);
    });
  });

  describe('spawnTrapsForLevel', () => {
    it('spawns requested number of traps', () => {
      const count = spawner.spawnTrapsForLevel(level, 1, 5);

      expect(count).toBe(5);
      expect(level.getTraps()).toHaveLength(5);
    });

    it('places traps on walkable floor tiles only', () => {
      spawner.spawnTrapsForLevel(level, 1, 10);

      for (const trap of level.getTraps()) {
        expect(level.isWalkable(trap.position)).toBe(true);
      }
    });

    it('returns count of successfully spawned traps', () => {
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

      const count = spawner.spawnTrapsForLevel(smallLevel, 1, 10);

      expect(count).toBe(1); // Only one valid position
    });

    it('does not place traps on the same position twice', () => {
      spawner.spawnTrapsForLevel(level, 1, 10);

      const positions = level.getTraps().map((t) => `${t.position.x},${t.position.y}`);
      const uniquePositions = new Set(positions);

      expect(positions.length).toBe(uniquePositions.size);
    });
  });

  describe('trap instances', () => {
    it('creates traps with correct definition reference', () => {
      const trap = spawner.spawnTrap(level, { x: 5, y: 5 }, 'pit');

      expect(trap?.definition.effect).toBe('DAMAGE');
      expect(trap?.definition.damage).toBe('2d6');
    });

    it('creates traps that are active by default', () => {
      const trap = spawner.spawnTrap(level, { x: 5, y: 5 }, 'pit');

      expect(trap?.isActive).toBe(true);
      expect(trap?.isDisarmed).toBe(false);
    });

    it('generates unique IDs for each trap', () => {
      const t1 = spawner.spawnTrap(level, { x: 5, y: 5 }, 'pit');
      const t2 = spawner.spawnTrap(level, { x: 6, y: 5 }, 'pit');

      expect(t1?.id).not.toBe(t2?.id);
    });
  });
});
