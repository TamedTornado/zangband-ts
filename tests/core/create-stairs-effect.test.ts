import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { CreateStairsEffect } from '@/core/systems/effects/CreateStairsEffect';
import { Player } from '@/core/entities/Player';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
}

function createMockLevel(width: number, height: number, player: Player, levelType: 'dungeon' | 'wilderness' = 'dungeon') {
  const terrain: Map<string, string> = new Map();

  return {
    width,
    height,
    depth: 1,
    levelType,
    player,
    getTile: (pos: Position) => ({
      terrain: { key: terrain.get(`${pos.x},${pos.y}`) ?? 'floor', flags: [] },
      explored: false,
    }),
    setTerrain: (pos: Position, terrainKey: string) => {
      terrain.set(`${pos.x},${pos.y}`, terrainKey);
    },
    getMonsters: () => [],
    getActorAt: () => undefined,
    isInBounds: (pos: Position) => pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height,
    getTerrainKey: (pos: Position) => terrain.get(`${pos.x},${pos.y}`) ?? 'floor',
  };
}

describe('CreateStairsEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('execute', () => {
    it('creates up stairs in dungeon', () => {
      const effect = new CreateStairsEffect({ type: 'createStairs' });
      const player = createTestPlayer(10, 10);
      const level = createMockLevel(30, 30, player, 'dungeon');

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(level.getTerrainKey({ x: 10, y: 10 })).toBe('up_staircase');
    });

    it('fails in wilderness', () => {
      const effect = new CreateStairsEffect({ type: 'createStairs' });
      const player = createTestPlayer(10, 10);
      const level = createMockLevel(30, 30, player, 'wilderness');

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(false);
      expect(result.turnConsumed).toBe(false);
      // Terrain should not change
      expect(level.getTerrainKey({ x: 10, y: 10 })).toBe('floor');
    });

    it('returns appropriate message in dungeon', () => {
      const effect = new CreateStairsEffect({ type: 'createStairs' });
      const player = createTestPlayer(10, 10);
      const level = createMockLevel(30, 30, player, 'dungeon');

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.messages.some(m => m.includes('stair') || m.includes('Stair'))).toBe(true);
    });
  });
});
