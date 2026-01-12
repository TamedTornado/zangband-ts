import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { CreateWallsEffect } from '@/core/systems/effects/CreateWallsEffect';
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

function createMockLevelWithTerrain(width: number, height: number, player: Player) {
  const terrain: Map<string, string> = new Map();

  return {
    width,
    height,
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

describe('CreateWallsEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('execute', () => {
    it('creates walls on all 8 adjacent tiles', () => {
      const effect = new CreateWallsEffect({ type: 'createWalls' });
      const player = createTestPlayer(10, 10);
      const level = createMockLevelWithTerrain(30, 30, player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);

      // All 8 adjacent tiles should now be walls (granite_wall_48)
      expect(level.getTerrainKey({ x: 9, y: 9 })).toBe('granite_wall_48');
      expect(level.getTerrainKey({ x: 10, y: 9 })).toBe('granite_wall_48');
      expect(level.getTerrainKey({ x: 11, y: 9 })).toBe('granite_wall_48');
      expect(level.getTerrainKey({ x: 9, y: 10 })).toBe('granite_wall_48');
      expect(level.getTerrainKey({ x: 11, y: 10 })).toBe('granite_wall_48');
      expect(level.getTerrainKey({ x: 9, y: 11 })).toBe('granite_wall_48');
      expect(level.getTerrainKey({ x: 10, y: 11 })).toBe('granite_wall_48');
      expect(level.getTerrainKey({ x: 11, y: 11 })).toBe('granite_wall_48');
    });

    it('does not change player tile', () => {
      const effect = new CreateWallsEffect({ type: 'createWalls' });
      const player = createTestPlayer(10, 10);
      const level = createMockLevelWithTerrain(30, 30, player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      // Player's tile should still be floor
      expect(level.getTerrainKey({ x: 10, y: 10 })).toBe('floor');
    });

    it('returns appropriate message', () => {
      const effect = new CreateWallsEffect({ type: 'createWalls' });
      const player = createTestPlayer(10, 10);
      const level = createMockLevelWithTerrain(30, 30, player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.messages.some(m => m.includes('wall') || m.includes('Wall') || m.includes('stone'))).toBe(true);
    });
  });
});
