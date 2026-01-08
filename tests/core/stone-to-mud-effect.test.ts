import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { StoneToMudEffect } from '@/core/systems/effects/StoneToMudEffect';
import { Actor } from '@/core/entities/Actor';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';

// Mock terrain definitions - BLOCK flag indicates impassable terrain
const WALL_TERRAIN = { key: 'granite_wall', name: 'wall', walkable: false, flags: ['BLOCK'] as string[] };
const FLOOR_TERRAIN = { key: 'floor', name: 'floor', walkable: true, flags: [] as string[] };
const DOOR_TERRAIN = { key: 'closed_door', name: 'door', walkable: false, flags: ['BLOCK', 'DOOR'] };
const RUBBLE_TERRAIN = { key: 'rubble', name: 'rubble', walkable: false, flags: ['BLOCK', 'RUBBLE'] };
const PERM_WALL_TERRAIN = { key: 'perm_wall', name: 'permanent wall', walkable: false, flags: ['BLOCK', 'PERMANENT'] };

// Mock level with terrain
function createMockLevel(width = 20, height = 20) {
  const tiles: Record<string, typeof WALL_TERRAIN> = {};

  const level = {
    width,
    height,
    getTile: (pos: Position) => {
      const key = `${pos.x},${pos.y}`;
      return {
        terrain: tiles[key] || FLOOR_TERRAIN,
      };
    },
    setTerrain: (pos: Position, terrain: string) => {
      const key = `${pos.x},${pos.y}`;
      if (terrain === 'floor') {
        tiles[key] = FLOOR_TERRAIN;
      }
    },
    getMonsterAt: () => undefined,
    getMonsters: () => [],
    isWalkable: (pos: Position) => {
      const key = `${pos.x},${pos.y}`;
      const t = tiles[key] || FLOOR_TERRAIN;
      return t.walkable;
    },
    setWall: (pos: Position) => {
      const key = `${pos.x},${pos.y}`;
      tiles[key] = WALL_TERRAIN;
    },
    setDoor: (pos: Position) => {
      const key = `${pos.x},${pos.y}`;
      tiles[key] = DOOR_TERRAIN;
    },
    setRubble: (pos: Position) => {
      const key = `${pos.x},${pos.y}`;
      tiles[key] = RUBBLE_TERRAIN;
    },
    setPermWall: (pos: Position) => {
      const key = `${pos.x},${pos.y}`;
      tiles[key] = PERM_WALL_TERRAIN;
    },
  };

  return level;
}

// Helper to create actor at position
function createActor(x: number, y: number): Actor {
  return new Actor({
    id: `actor-${x}-${y}`,
    position: { x, y },
    symbol: '@',
    color: '#fff',
    maxHp: 100,
    speed: 110,
  });
}

describe('StoneToMudEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns false without target position', () => {
      const effect = new StoneToMudEffect({
        type: 'stoneToMud',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(false);
    });

    it('returns true with target position', () => {
      const effect = new StoneToMudEffect({
        type: 'stoneToMud',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 11, y: 10 },
      };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute - walls', () => {
    it('converts granite wall to floor', () => {
      const effect = new StoneToMudEffect({
        type: 'stoneToMud',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();
      level.setWall({ x: 11, y: 10 });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 11, y: 10 },
      };

      // Verify wall before
      expect(level.isWalkable({ x: 11, y: 10 })).toBe(false);

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(level.isWalkable({ x: 11, y: 10 })).toBe(true);
      expect(result.messages.some(m => m.includes('wall') || m.includes('dissolves'))).toBe(true);
    });

    it('converts rubble to floor', () => {
      const effect = new StoneToMudEffect({
        type: 'stoneToMud',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();
      level.setRubble({ x: 11, y: 10 });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 11, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(level.isWalkable({ x: 11, y: 10 })).toBe(true);
    });
  });

  describe('execute - doors', () => {
    it('destroys closed doors', () => {
      const effect = new StoneToMudEffect({
        type: 'stoneToMud',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();
      level.setDoor({ x: 11, y: 10 });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 11, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(level.isWalkable({ x: 11, y: 10 })).toBe(true);
    });
  });

  describe('execute - permanent walls', () => {
    it('cannot destroy permanent walls', () => {
      const effect = new StoneToMudEffect({
        type: 'stoneToMud',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();
      level.setPermWall({ x: 11, y: 10 });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 11, y: 10 },
      };

      // Verify permanent wall before
      expect(level.isWalkable({ x: 11, y: 10 })).toBe(false);

      const result = effect.execute(context);

      // Permanent wall should remain
      expect(result.success).toBe(true);
      expect(level.isWalkable({ x: 11, y: 10 })).toBe(false);
      expect(result.messages.some(m => m.includes('impervious'))).toBe(true);
    });
  });

  describe('execute - floor', () => {
    it('does nothing on already passable floor', () => {
      const effect = new StoneToMudEffect({
        type: 'stoneToMud',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 11, y: 10 },
      };

      // 11,10 is already floor (default)
      expect(level.isWalkable({ x: 11, y: 10 })).toBe(true);

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.messages.some(m => m.includes('nothing') || m.includes('already'))).toBe(true);
    });
  });
});
