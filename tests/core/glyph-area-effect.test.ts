import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { GlyphAreaEffect } from '@/core/systems/effects/GlyphAreaEffect';
import { Player } from '@/core/entities/Player';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import { createMockLevel } from './testHelpers';

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
      expect(result.data?.glyphPositions).toBeDefined();
      expect(Array.isArray(result.data?.glyphPositions)).toBe(true);
      // Should be 9 positions (center + 8 adjacent)
      expect(result.data?.glyphPositions.length).toBe(9);
    });
  });
});
