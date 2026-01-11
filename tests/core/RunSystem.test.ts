import { describe, it, expect, vi } from 'vitest';
import { RunSystem, type RunContext } from '@/core/systems/RunSystem';
import { Direction, type Position } from '@/core/types';
import type { ILevel } from '@/core/world/Level';
import type { FOVSystem } from '@/core/systems/FOV';
import type { StoreManager } from '@/core/systems/StoreManager';
import type { Actor } from '@/core/entities/Actor';
import type { Monster } from '@/core/entities/Monster';

/**
 * Tests for RunSystem - running algorithm with POI detection
 */

// Mock terrain data
const floorTerrain = { key: 'floor', flags: [] };
const doorTerrain = { key: 'door', flags: ['DOOR'] };

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
        blockedPositions: new Set(['5,4', '5,6', '6,4', '6,6']), // walls north and south
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

  describe('run (dungeon)', () => {
    it('should run until hitting wall', () => {
      const level = createMockLevel({
        blockedPositions: new Set(['8,5']), // wall at x=8
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

      expect(result.stepsRun).toBe(2); // 5->6, 6->7, then wall at 8
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

      expect(result.stepsRun).toBe(1); // Moves to 6, sees door at 7, stops
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
          // Simulate damage on first step
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
      // Override movePlayer to update player position
      (level as any).movePlayer = (x: number, y: number) => {
        player.position = { x, y };
      };

      // FOV starts empty, then includes store after moving
      const fovSystem = {
        compute: () => new Set<string>(), // Initially no stores visible
        computeAndMark: () => new Set(['10,5']), // After moving, store becomes visible
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

      // Store already visible from start
      const visibleTiles = new Set(['10,5']);
      const fovSystem = {
        compute: () => visibleTiles, // Store visible from start
        computeAndMark: () => visibleTiles,
        getVisibleMonster: () => null,
      } as unknown as FOVSystem;

      const storeManager = createMockStoreManager([
        { posKey: '10,5', storeKey: 'general_store', name: 'General Store' },
      ]);

      // Limit run by putting a wall ahead at x=8
      const level = createMockLevel({
        levelType: 'wilderness',
        blockedPositions: new Set(['8,5']),
      });
      // Override movePlayer to update player position (like real WildernessLevel does)
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

      // Should run until wall, not stop for already-visible store
      expect(result.stepsRun).toBe(2);
      // Should not have any POI spotting messages
      expect(result.messages.filter(m => m.text.includes('spot'))).toHaveLength(0);
    });

    it('should track seen POIs across steps', () => {
      const player = createMockPlayer({ x: 5, y: 5 });
      const level = createMockLevel({ levelType: 'wilderness' });
      // Override movePlayer to update player position
      (level as any).movePlayer = (x: number, y: number) => {
        player.position = { x, y };
      };

      // First step: see store1
      const fovSystem = {
        compute: () => new Set<string>(),
        computeAndMark: () => new Set(['10,5']), // See store on first step
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

      // Should stop on first step when store1 becomes visible
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
