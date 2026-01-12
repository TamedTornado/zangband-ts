import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { GlyphAreaEffect } from '@/core/systems/effects/GlyphAreaEffect';
import { Player } from '@/core/entities/Player';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';
import { createMockLevel } from './testHelpers';

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

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
}

describe('GlyphAreaEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new GlyphAreaEffect({ type: 'glyphArea' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute', () => {
    it('returns success with glyph message', () => {
      const effect = new GlyphAreaEffect({ type: 'glyphArea' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
    });

    it('reports glyphs placed on player and surrounding tiles', () => {
      const effect = new GlyphAreaEffect({ type: 'glyphArea' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // Should mention placing glyphs in area
      expect(result.messages.some(m => m.includes('glyph'))).toBe(true);
      expect(result.messages.some(m => m.includes('surround') || m.includes('area'))).toBe(true);
    });

    it('returns glyph positions in result data', () => {
      const effect = new GlyphAreaEffect({ type: 'glyphArea' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // Should return positions where glyphs would be placed
      expect(result.data?.['glyphPositions']).toBeDefined();
      expect(Array.isArray(result.data?.['glyphPositions'])).toBe(true);
      // Should be 9 positions (center + 8 adjacent)
      expect(result.data?.['glyphPositions'].length).toBe(9);
    });

    it('places glyph_of_warding terrain on all 9 tiles', () => {
      const effect = new GlyphAreaEffect({ type: 'glyphArea' });
      const player = createTestPlayer(10, 10);
      const level = createMockLevelWithTerrain(30, 30, player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      // Player's tile should be glyph
      expect(level.getTerrainKey({ x: 10, y: 10 })).toBe('glyph_of_warding');

      // All 8 adjacent tiles should also be glyphs
      expect(level.getTerrainKey({ x: 9, y: 9 })).toBe('glyph_of_warding');
      expect(level.getTerrainKey({ x: 10, y: 9 })).toBe('glyph_of_warding');
      expect(level.getTerrainKey({ x: 11, y: 9 })).toBe('glyph_of_warding');
      expect(level.getTerrainKey({ x: 9, y: 10 })).toBe('glyph_of_warding');
      expect(level.getTerrainKey({ x: 11, y: 10 })).toBe('glyph_of_warding');
      expect(level.getTerrainKey({ x: 9, y: 11 })).toBe('glyph_of_warding');
      expect(level.getTerrainKey({ x: 10, y: 11 })).toBe('glyph_of_warding');
      expect(level.getTerrainKey({ x: 11, y: 11 })).toBe('glyph_of_warding');
    });
  });
});
