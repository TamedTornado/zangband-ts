import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { GlyphEffect } from '@/core/systems/effects/GlyphEffect';
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

  const level = {
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
    isWalkable: (pos: Position) => terrain.get(`${pos.x},${pos.y}`) !== 'wall',
    // Helper for tests
    getTerrainKey: (pos: Position) => terrain.get(`${pos.x},${pos.y}`) ?? 'floor',
  };

  return level;
}

describe('GlyphEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('execute', () => {
    it('places glyph of warding at player position', () => {
      const effect = new GlyphEffect({ type: 'glyph' });
      const player = createTestPlayer(10, 10);
      const level = createMockLevelWithTerrain(30, 30, player);

      // Verify floor terrain before
      expect(level.getTerrainKey({ x: 10, y: 10 })).toBe('floor');

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);

      // Terrain should now be glyph_of_warding
      expect(level.getTerrainKey({ x: 10, y: 10 })).toBe('glyph_of_warding');
    });

    it('returns appropriate message', () => {
      const effect = new GlyphEffect({ type: 'glyph' });
      const player = createTestPlayer(10, 10);
      const level = createMockLevelWithTerrain(30, 30, player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.messages.some(m => m.includes('glyph') || m.includes('warding') || m.includes('inscribe'))).toBe(true);
    });

    it('does not affect adjacent tiles', () => {
      const effect = new GlyphEffect({ type: 'glyph' });
      const player = createTestPlayer(10, 10);
      const level = createMockLevelWithTerrain(30, 30, player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      // Adjacent tiles should still be floor
      expect(level.getTerrainKey({ x: 11, y: 10 })).toBe('floor');
      expect(level.getTerrainKey({ x: 9, y: 10 })).toBe('floor');
      expect(level.getTerrainKey({ x: 10, y: 11 })).toBe('floor');
      expect(level.getTerrainKey({ x: 10, y: 9 })).toBe('floor');
    });
  });
});
