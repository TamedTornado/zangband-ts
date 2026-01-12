import { describe, it, expect, vi } from 'vitest';
import { RunSystem, type RunContext } from '@/core/systems/RunSystem';
import { Direction, type Position } from '@/core/types';
import { Level } from '@/core/world/Level';
import type { ILevel } from '@/core/world/Level';
import type { FOVSystem } from '@/core/systems/FOV';
import type { StoreManager } from '@/core/systems/StoreManager';
import type { Actor } from '@/core/entities/Actor';
import type { Monster } from '@/core/entities/Monster';

/**
 * Tests for RunSystem - running algorithm with POI detection
 *
 * The running algorithm has two modes:
 * 1. Open area: Run straight, stop if walls appear/disappear on sides
 * 2. Corridor: Follow the corridor, stop at intersections
 */

// Helper to create Level with walls
function createTestLevel(width: number, height: number, walls: { x: number; y: number }[]): Level {
  const level = new Level(width, height);
  for (const wall of walls) {
    level.setTerrain(wall, 'granite_wall');
  }
  return level;
}

// Mock terrain data for mock level
const floorTerrain = { key: 'floor', flags: [] };
const doorTerrain = { key: 'door', flags: ['DOOR'] };

// Helper to create mock level for integration tests
function createMockLevel(options: {
  width?: number;
  height?: number;
  blockedPositions?: Set<string>;
  doorPositions?: Set<string>;
  monsters?: Map<string, Monster>;
  levelType?: 'dungeon' | 'wilderness';
}): ILevel {
  const {
    width = 20,
    height = 20,
    blockedPositions = new Set(),
    doorPositions = new Set(),
    monsters = new Map(),
    levelType = 'dungeon',
  } = options;

  return {
    levelType,
    width,
    height,
    isWalkable: (pos: Position) => {
      const key = `${pos.x},${pos.y}`;
      if (blockedPositions.has(key)) return false;
      if (pos.x < 0 || pos.y < 0 || pos.x >= width || pos.y >= height) return false;
      return true;
    },
    getTile: (pos: Position) => {
      const key = `${pos.x},${pos.y}`;
      if (doorPositions.has(key)) return { terrain: doorTerrain } as any;
      return { terrain: floorTerrain } as any;
    },
    getMonsterAt: (pos: Position) => {
      return monsters.get(`${pos.x},${pos.y}`) || null;
    },
    getItemsAt: () => [],
    getTrapAt: () => undefined,
    getMonsters: () => [],
    movePlayer: vi.fn(),
    isOccupied: () => false,
    player: null,
  } as unknown as ILevel;
}

function createMockPlayer(pos: Position, hp: number = 100): Actor {
  return {
    position: { ...pos },
    hp,
    maxHp: 100,
    isDead: false,
  } as Actor;
}

function createMockFOVSystem(options: {
  visibleTiles?: Set<string>;
  visibleMonster?: Monster | null;
}): FOVSystem {
  const { visibleTiles = new Set(), visibleMonster = null } = options;
  return {
    compute: () => visibleTiles,
    computeAndMark: () => visibleTiles,
    getVisibleMonster: () => visibleMonster,
  } as unknown as FOVSystem;
}

function createMockStoreManager(stores: {
  posKey: string;
  storeKey: string;
  name: string;
}[]): StoreManager {
  const storeMap = new Map<string, { definition: { name: string } }>();
  const positionMap = new Map<string, string>();

  for (const store of stores) {
    storeMap.set(store.storeKey, { definition: { name: store.name } });
    positionMap.set(store.posKey, store.storeKey);
  }

  return {
    getVisibleStores: (visibleTiles: Set<string>) => {
      const result: { storeKey: string; posKey: string }[] = [];
      for (const [posKey, storeKey] of positionMap) {
        if (visibleTiles.has(posKey)) {
          result.push({ storeKey, posKey });
        }
      }
      return result;
    },
    getStore: (key: string) => storeMap.get(key),
  } as unknown as StoreManager;
}

describe('RunSystem', () => {
  describe('initRun', () => {
    it('should initialize run state with given direction', () => {
      const level = createMockLevel({});
      const state = RunSystem.initRun(level, { x: 5, y: 5 }, Direction.East);

      expect(state.direction).toBe(Direction.East);
      expect(state.oldDirection).toBe(Direction.East);
    });

    it('should detect open area when no walls on sides', () => {
      const level = createMockLevel({});
      const state = RunSystem.initRun(level, { x: 5, y: 5 }, Direction.East);

      expect(state.openArea).toBe(true);
    });

    it('should detect corridor when walls on both sides', () => {
      const level = createMockLevel({
        blockedPositions: new Set(['5,4', '5,6', '6,4', '6,6']),
      });
      const state = RunSystem.initRun(level, { x: 5, y: 5 }, Direction.East);

      expect(state.openArea).toBe(false);
    });
  });

  describe('testRun', () => {
    it('should continue in open area', () => {
      const level = createMockLevel({});
      const state = RunSystem.initRun(level, { x: 5, y: 5 }, Direction.East);

      const result = RunSystem.testRun(level, { x: 6, y: 5 }, state);

      expect(result.canContinue).toBe(true);
      expect(result.newDirection).toBe(Direction.East);
    });

    it('should stop when monster spotted', () => {
      const monster = { isDead: false, isTamed: false } as Monster;
      const level = createMockLevel({
        monsters: new Map([['7,5', monster]]),
      });
      const state = RunSystem.initRun(level, { x: 5, y: 5 }, Direction.East);

      const result = RunSystem.testRun(level, { x: 6, y: 5 }, state);

      expect(result.canContinue).toBe(false);
      expect(result.spottedMonster).toBe(monster);
    });

    it('should ignore tamed monsters', () => {
      const monster = { isDead: false, isTamed: true } as Monster;
      const level = createMockLevel({
        monsters: new Map([['7,5', monster]]),
      });
      const state = RunSystem.initRun(level, { x: 5, y: 5 }, Direction.East);

      const result = RunSystem.testRun(level, { x: 6, y: 5 }, state);

      expect(result.canContinue).toBe(true);
      expect(result.spottedMonster).toBeUndefined();
    });
  });

  describe('open area running', () => {
    it('should continue running across middle of open room', () => {
      const level = createTestLevel(7, 7, []);
      const startPos = { x: 3, y: 3 };

      const state = RunSystem.initRun(level, startPos, Direction.East);

      expect(state.openArea).toBe(true);
      expect(state.breakLeft).toBe(false);
      expect(state.breakRight).toBe(false);

      const result = RunSystem.testRun(level, { x: 4, y: 3 }, state);
      expect(result.canContinue).toBe(true);
      expect(result.newDirection).toBe(Direction.East);
    });

    it('should continue running along room edge with wall on north', () => {
      const walls = [];
      for (let x = 0; x < 7; x++) {
        walls.push({ x, y: 0 });
      }
      const level = createTestLevel(7, 5, walls);
      const startPos = { x: 1, y: 1 };

      const state = RunSystem.initRun(level, startPos, Direction.East);

      expect(state.openArea).toBe(true);
      expect(state.breakRight).toBe(true);

      const result = RunSystem.testRun(level, { x: 2, y: 1 }, state);
      expect(result.canContinue).toBe(true);
    });

    it('should continue running along room edge with wall on south', () => {
      const walls = [];
      for (let x = 0; x < 7; x++) {
        walls.push({ x, y: 4 });
      }
      const level = createTestLevel(7, 5, walls);
      const startPos = { x: 1, y: 3 };

      const state = RunSystem.initRun(level, startPos, Direction.East);

      expect(state.openArea).toBe(true);
      expect(state.breakLeft).toBe(true);

      const result = RunSystem.testRun(level, { x: 2, y: 3 }, state);
      expect(result.canContinue).toBe(true);
    });

    it('should stop when wall on north disappears (doorway)', () => {
      const walls = [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
        { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 },
      ];
      const level = createTestLevel(7, 3, walls);
      const startPos = { x: 1, y: 1 };

      expect(level.isWalkable({ x: 2, y: 0 })).toBe(false);
      expect(level.isWalkable({ x: 3, y: 0 })).toBe(true);

      const state = RunSystem.initRun(level, startPos, Direction.East);
      expect(state.openArea).toBe(true);
      expect(state.breakRight).toBe(true);
      expect(state.breakLeft).toBe(false);

      const result = RunSystem.testRun(level, { x: 2, y: 1 }, state);
      expect(result.canContinue).toBe(false);
    });

    it('should stop when wall on south disappears (doorway)', () => {
      const walls = [
        { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
        { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 },
      ];
      const level = createTestLevel(7, 3, walls);
      const startPos = { x: 1, y: 1 };

      const state = RunSystem.initRun(level, startPos, Direction.East);
      expect(state.openArea).toBe(true);
      expect(state.breakLeft).toBe(true);
      expect(state.breakRight).toBe(false);

      const result = RunSystem.testRun(level, { x: 2, y: 1 }, state);
      expect(result.canContinue).toBe(false);
    });

    it('should continue in open area when wall appears on one side', () => {
      const walls = [
        { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 },
      ];
      const level = createTestLevel(7, 4, walls);
      const startPos = { x: 1, y: 2 };

      const state = RunSystem.initRun(level, startPos, Direction.East);
      expect(state.openArea).toBe(true);
      expect(state.breakLeft).toBe(false);
      expect(state.breakRight).toBe(true);

      let result = RunSystem.testRun(level, { x: 2, y: 2 }, state);
      expect(result.canContinue).toBe(true);

      result = RunSystem.testRun(level, { x: 3, y: 2 }, state);
      expect(result.canContinue).toBe(true);
    });
  });

  describe('corridor running', () => {
    it('should detect corridor when walls on both sides', () => {
      const walls = [];
      for (let x = 0; x < 7; x++) {
        walls.push({ x, y: 0 });
        walls.push({ x, y: 2 });
      }
      const level = createTestLevel(7, 3, walls);
      const startPos = { x: 1, y: 1 };

      const state = RunSystem.initRun(level, startPos, Direction.East);

      expect(state.openArea).toBe(false);
    });

    it('should follow corridor and continue running', () => {
      const walls = [];
      for (let x = 0; x < 7; x++) {
        walls.push({ x, y: 0 });
        walls.push({ x, y: 2 });
      }
      const level = createTestLevel(7, 3, walls);
      const startPos = { x: 1, y: 1 };

      const state = RunSystem.initRun(level, startPos, Direction.East);

      const result = RunSystem.testRun(level, { x: 2, y: 1 }, state);
      expect(result.canContinue).toBe(true);
      expect(result.newDirection).toBe(Direction.East);
    });

    it('should stop at dead end', () => {
      const walls = [];
      for (let x = 0; x < 7; x++) {
        walls.push({ x, y: 0 });
        walls.push({ x, y: 2 });
      }
      walls.push({ x: 4, y: 1 });
      const level = createTestLevel(7, 3, walls);
      const startPos = { x: 1, y: 1 };

      const state = RunSystem.initRun(level, startPos, Direction.East);

      let result = RunSystem.testRun(level, { x: 2, y: 1 }, state);
      expect(result.canContinue).toBe(true);

      result = RunSystem.testRun(level, { x: 3, y: 1 }, state);
      expect(result.canContinue).toBe(false);
    });

    it('should stop at intersection', () => {
      const walls = [];
      for (let x = 0; x < 7; x++) {
        if (x !== 3) walls.push({ x, y: 0 });
        walls.push({ x, y: 2 });
      }
      const level = createTestLevel(7, 3, walls);
      const startPos = { x: 1, y: 1 };

      const state = RunSystem.initRun(level, startPos, Direction.East);

      const result = RunSystem.testRun(level, { x: 2, y: 1 }, state);
      expect(result.canContinue).toBe(false);
    });
  });

  describe('diagonal running', () => {
    it('should run diagonally in open area', () => {
      const level = createTestLevel(7, 7, []);
      const startPos = { x: 3, y: 3 };

      const state = RunSystem.initRun(level, startPos, Direction.NorthEast);

      expect(state.openArea).toBe(true);

      const result = RunSystem.testRun(level, { x: 4, y: 2 }, state);
      expect(result.canContinue).toBe(true);
      expect(result.newDirection).toBe(Direction.NorthEast);
    });

    it('should continue running when entering East corridor diagonally from SW', () => {
      const walls: { x: number; y: number }[] = [];
      for (let x = 0; x < 5; x++) {
        walls.push({ x, y: 0 });
        walls.push({ x, y: 3 });
      }
      walls.push({ x: 0, y: 2 });
      walls.push({ x: 1, y: 2 });
      walls.push({ x: 3, y: 2 });
      walls.push({ x: 4, y: 2 });
      walls.push({ x: 0, y: 1 });
      walls.push({ x: 4, y: 1 });

      const level = createTestLevel(5, 4, walls);
      const startPos = { x: 2, y: 2 };

      expect(level.isWalkable({ x: 3, y: 0 })).toBe(false);
      expect(level.isWalkable({ x: 3, y: 2 })).toBe(false);
      expect(level.isWalkable({ x: 4, y: 1 })).toBe(false);
      expect(level.isWalkable({ x: 2, y: 1 })).toBe(true);

      const state = RunSystem.initRun(level, startPos, Direction.NorthEast);

      expect(state.openArea).toBe(false);
    });

    it('should set correct oldDirection for diagonal entry - wall on right, open on left', () => {
      const walls: { x: number; y: number }[] = [];
      for (let x = 0; x < 6; x++) {
        walls.push({ x, y: 0 });
        walls.push({ x, y: 3 });
      }
      walls.push({ x: 0, y: 1 }); walls.push({ x: 5, y: 1 });
      walls.push({ x: 0, y: 2 }); walls.push({ x: 1, y: 2 });
      walls.push({ x: 3, y: 2 }); walls.push({ x: 4, y: 2 }); walls.push({ x: 5, y: 2 });

      const level = createTestLevel(6, 4, walls);
      const startPos = { x: 2, y: 2 };

      expect(level.isWalkable({ x: 3, y: 0 })).toBe(false);
      expect(level.isWalkable({ x: 3, y: 2 })).toBe(false);
      expect(level.isWalkable({ x: 4, y: 1 })).toBe(true);

      const state = RunSystem.initRun(level, startPos, Direction.NorthEast);

      expect(state.openArea).toBe(false);
      expect(state.oldDirection).toBe(Direction.East);
    });

    it('should set correct oldDirection for diagonal entry - wall on left, open on right', () => {
      const walls: { x: number; y: number }[] = [];
      for (let x = 0; x < 6; x++) {
        if (x !== 2) {
          walls.push({ x, y: 0 });
          walls.push({ x, y: 1 });
        }
      }
      for (let x = 0; x < 6; x++) {
        if (x !== 2 && x !== 3) {
          walls.push({ x, y: 2 });
        }
      }
      for (let x = 0; x < 6; x++) {
        walls.push({ x, y: 3 });
      }

      const level = createTestLevel(6, 4, walls);
      const startPos = { x: 3, y: 2 };

      expect(level.isWalkable({ x: 1, y: 1 })).toBe(false);
      expect(level.isWalkable({ x: 2, y: 0 })).toBe(true);

      const state = RunSystem.initRun(level, startPos, Direction.NorthWest);

      expect(state.oldDirection).toBe(Direction.North);
    });
  });

  describe('monster detection', () => {
    it('should stop when hostile monster is visible', () => {
      const level = createTestLevel(7, 7, []);
      const startPos = { x: 3, y: 3 };

      const monster = {
        position: { x: 5, y: 3 },
        isDead: false,
        isTamed: false,
      };
      level.addMonster(monster as any);

      const state = RunSystem.initRun(level, startPos, Direction.East);

      const result = RunSystem.testRun(level, { x: 4, y: 3 }, state);
      expect(result.canContinue).toBe(false);
      expect(result.spottedMonster).toBe(monster);
    });

    it('should not stop for dead monsters', () => {
      const level = createTestLevel(7, 7, []);
      const startPos = { x: 3, y: 3 };

      const monster = {
        position: { x: 5, y: 3 },
        isDead: true,
        isTamed: false,
      };
      level.addMonster(monster as any);

      const state = RunSystem.initRun(level, startPos, Direction.East);

      const result = RunSystem.testRun(level, { x: 4, y: 3 }, state);
      expect(result.canContinue).toBe(true);
    });

    it('should not stop for tamed monsters', () => {
      const level = createTestLevel(7, 7, []);
      const startPos = { x: 3, y: 3 };

      const monster = {
        position: { x: 5, y: 3 },
        isDead: false,
        isTamed: true,
      };
      level.addMonster(monster as any);

      const state = RunSystem.initRun(level, startPos, Direction.East);

      const result = RunSystem.testRun(level, { x: 4, y: 3 }, state);
      expect(result.canContinue).toBe(true);
    });
  });

  describe('run (dungeon)', () => {
    it('should run until hitting wall', () => {
      const level = createMockLevel({
        blockedPositions: new Set(['8,5']),
      });
      const player = createMockPlayer({ x: 5, y: 5 });
      const fovSystem = createMockFOVSystem({});
      const storeManager = createMockStoreManager([]);

      let stepCount = 0;
      const ctx: RunContext = {
        level,
        player,
        fovSystem,
        storeManager,
        wildernessMap: null,
        visionRadius: 4,
        viewRadius: 4,
        onMoved: () => { stepCount++; },
        onStepComplete: () => {},
        getMonsterName: () => 'monster',
      };

      const result = RunSystem.run(ctx, Direction.East);

      expect(result.stepsRun).toBe(2);
      expect(stepCount).toBe(2);
    });

    it('should stop at door', () => {
      const level = createMockLevel({
        doorPositions: new Set(['7,5']),
      });
      const player = createMockPlayer({ x: 5, y: 5 });
      const fovSystem = createMockFOVSystem({});
      const storeManager = createMockStoreManager([]);

      const ctx: RunContext = {
        level,
        player,
        fovSystem,
        storeManager,
        wildernessMap: null,
        visionRadius: 4,
        viewRadius: 4,
        onMoved: () => {},
        onStepComplete: () => {},
        getMonsterName: () => 'monster',
      };

      const result = RunSystem.run(ctx, Direction.East);

      expect(result.stepsRun).toBe(1);
    });

    it('should stop when seeing monster', () => {
      const monster = { isDead: false, isTamed: false } as Monster;
      const level = createMockLevel({});
      const player = createMockPlayer({ x: 5, y: 5 });
      const fovSystem = createMockFOVSystem({ visibleMonster: monster });
      const storeManager = createMockStoreManager([]);

      const ctx: RunContext = {
        level,
        player,
        fovSystem,
        storeManager,
        wildernessMap: null,
        visionRadius: 4,
        viewRadius: 4,
        onMoved: () => {},
        onStepComplete: () => {},
        getMonsterName: () => 'Orc',
      };

      const result = RunSystem.run(ctx, Direction.East);

      expect(result.stepsRun).toBe(1);
      expect(result.messages).toContainEqual({
        text: 'You see a Orc.',
        type: 'danger',
      });
    });

    it('should stop when taking damage', () => {
      const level = createMockLevel({});
      const player = createMockPlayer({ x: 5, y: 5 }, 100);
      const fovSystem = createMockFOVSystem({});
      const storeManager = createMockStoreManager([]);

      const ctx: RunContext = {
        level,
        player,
        fovSystem,
        storeManager,
        wildernessMap: null,
        visionRadius: 4,
        viewRadius: 4,
        onMoved: () => {},
        onStepComplete: () => {
          player.hp = 90;
        },
        getMonsterName: () => 'monster',
      };

      const result = RunSystem.run(ctx, Direction.East);

      expect(result.stepsRun).toBe(1);
      expect(result.messages).toContainEqual({
        text: 'You are being attacked!',
        type: 'danger',
      });
    });

    it('should report blocked path on first step', () => {
      const level = createMockLevel({
        blockedPositions: new Set(['6,5']),
      });
      const player = createMockPlayer({ x: 5, y: 5 });
      const fovSystem = createMockFOVSystem({});
      const storeManager = createMockStoreManager([]);

      const ctx: RunContext = {
        level,
        player,
        fovSystem,
        storeManager,
        wildernessMap: null,
        visionRadius: 4,
        viewRadius: 4,
        onMoved: () => {},
        onStepComplete: () => {},
        getMonsterName: () => 'monster',
      };

      const result = RunSystem.run(ctx, Direction.East);

      expect(result.stepsRun).toBe(0);
      expect(result.messages).toContainEqual({
        text: 'Something blocks your path.',
        type: 'danger',
      });
    });
  });

  describe('POI detection (wilderness)', () => {
    it('should stop when spotting new store entrance', () => {
      const player = createMockPlayer({ x: 5, y: 5 });
      const level = createMockLevel({ levelType: 'wilderness' });
      (level as any).movePlayer = (x: number, y: number) => {
        player.position = { x, y };
      };

      const fovSystem = {
        compute: () => new Set<string>(),
        computeAndMark: () => new Set(['10,5']),
        getVisibleMonster: () => null,
      } as unknown as FOVSystem;

      const storeManager = createMockStoreManager([
        { posKey: '10,5', storeKey: 'general_store', name: 'General Store' },
      ]);

      const ctx: RunContext = {
        level,
        player,
        fovSystem,
        storeManager,
        wildernessMap: null,
        visionRadius: 4,
        viewRadius: 4,
        onMoved: () => {},
        onStepComplete: () => {},
        getMonsterName: () => 'monster',
      };

      const result = RunSystem.run(ctx, Direction.East);

      expect(result.stepsRun).toBe(1);
      expect(result.messages).toContainEqual({
        text: 'You spot the entrance to General Store.',
        type: 'info',
      });
    });

    it('should not announce already-visible stores', () => {
      const player = createMockPlayer({ x: 5, y: 5 });

      const visibleTiles = new Set(['10,5']);
      const fovSystem = {
        compute: () => visibleTiles,
        computeAndMark: () => visibleTiles,
        getVisibleMonster: () => null,
      } as unknown as FOVSystem;

      const storeManager = createMockStoreManager([
        { posKey: '10,5', storeKey: 'general_store', name: 'General Store' },
      ]);

      const level = createMockLevel({
        levelType: 'wilderness',
        blockedPositions: new Set(['8,5']),
      });
      (level as any).movePlayer = (x: number, y: number) => {
        player.position = { x, y };
      };

      const ctx: RunContext = {
        level,
        player,
        fovSystem,
        storeManager,
        wildernessMap: null,
        visionRadius: 4,
        viewRadius: 4,
        onMoved: () => {},
        onStepComplete: () => {},
        getMonsterName: () => 'monster',
      };

      const result = RunSystem.run(ctx, Direction.East);

      expect(result.stepsRun).toBe(2);
      expect(result.messages.filter(m => m.text.includes('spot'))).toHaveLength(0);
    });

    it('should track seen POIs across steps', () => {
      const player = createMockPlayer({ x: 5, y: 5 });
      const level = createMockLevel({ levelType: 'wilderness' });
      (level as any).movePlayer = (x: number, y: number) => {
        player.position = { x, y };
      };

      const fovSystem = {
        compute: () => new Set<string>(),
        computeAndMark: () => new Set(['10,5']),
        getVisibleMonster: () => null,
      } as unknown as FOVSystem;

      const storeManager = createMockStoreManager([
        { posKey: '10,5', storeKey: 'general_store', name: 'General Store' },
        { posKey: '15,5', storeKey: 'temple', name: 'Temple' },
      ]);

      const ctx: RunContext = {
        level,
        player,
        fovSystem,
        storeManager,
        wildernessMap: null,
        visionRadius: 4,
        viewRadius: 4,
        onMoved: () => {},
        onStepComplete: () => {},
        getMonsterName: () => 'monster',
      };

      const result = RunSystem.run(ctx, Direction.East);

      expect(result.stepsRun).toBe(1);
      expect(result.messages).toContainEqual({
        text: 'You spot the entrance to General Store.',
        type: 'info',
      });
    });
  });

  describe('callback order', () => {
    it('should call onMoved before onStepComplete', () => {
      const level = createMockLevel({
        blockedPositions: new Set(['7,5']),
      });
      const player = createMockPlayer({ x: 5, y: 5 });
      const fovSystem = createMockFOVSystem({});
      const storeManager = createMockStoreManager([]);

      const callOrder: string[] = [];

      const ctx: RunContext = {
        level,
        player,
        fovSystem,
        storeManager,
        wildernessMap: null,
        visionRadius: 4,
        viewRadius: 4,
        onMoved: () => { callOrder.push('onMoved'); },
        onStepComplete: () => { callOrder.push('onStepComplete'); },
        getMonsterName: () => 'monster',
      };

      RunSystem.run(ctx, Direction.East);

      expect(callOrder).toEqual(['onMoved', 'onStepComplete']);
    });
  });
});
