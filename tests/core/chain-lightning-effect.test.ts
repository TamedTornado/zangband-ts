import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { ChainLightningEffect } from '@/core/systems/effects/ChainLightningEffect';
import { Player } from '@/core/entities/Player';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import { createMockLevel, createTestMonster } from './testHelpers';

function createTestPlayer(x: number, y: number, level: number = 10): Player {
  const player = new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
  // Set player level
  (player as any)._level = level;
  return player;
}

describe('ChainLightningEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns true (self-targeted, no special requirements)', () => {
      const effect = new ChainLightningEffect({ type: 'chainLightning' });
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
    it('returns success with lightning message', () => {
      const effect = new ChainLightningEffect({ type: 'chainLightning' });
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
      expect(result.messages.some(m => m.toLowerCase().includes('lightning'))).toBe(true);
    });

    it('fires beams in all 8 directions', () => {
      const effect = new ChainLightningEffect({ type: 'chainLightning' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // Should have beam data for 8 directions
      expect(result.data?.['beams']).toBeDefined();
      expect(result.data?.['beams'].length).toBe(8);
    });

    it('uses electric element for all beams', () => {
      const effect = new ChainLightningEffect({ type: 'chainLightning' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // All beams should be electric element
      for (const beam of result.data?.['beams'] ?? []) {
        expect(beam.element).toBe('electricity');
      }
    });

    it('calculates damage based on player level', () => {
      const effect = new ChainLightningEffect({ type: 'chainLightning' });
      const player = createTestPlayer(25, 25, 50);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // At level 50: (5 + 50/10)d8 = 10d8 = 8-80 damage
      // Each beam should have damage in reasonable range
      for (const beam of result.data?.['beams'] ?? []) {
        expect(beam.damage).toBeGreaterThanOrEqual(8);
        expect(beam.damage).toBeLessThanOrEqual(80);
      }
    });

    it('hits monsters in beam paths', () => {
      const effect = new ChainLightningEffect({ type: 'chainLightning' });
      const player = createTestPlayer(25, 25);
      // Place monsters in several directions
      const monster1 = createTestMonster({ position: { x: 26, y: 25 } }); // East
      const monster2 = createTestMonster({ position: { x: 25, y: 26 } }); // South
      const monster3 = createTestMonster({ position: { x: 24, y: 24 } }); // Northwest
      const level = createMockLevel([monster1, monster2, monster3], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // Should have some monster hits recorded
      expect(result.data?.['totalHits']).toBeGreaterThan(0);
    });

    it('beams have correct directions', () => {
      const effect = new ChainLightningEffect({ type: 'chainLightning' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // Should have beams in all 8 directions
      const directions = result.data?.['beams'].map((b: any) => `${b.dx},${b.dy}`);
      expect(directions).toContain('1,0');   // East
      expect(directions).toContain('-1,0');  // West
      expect(directions).toContain('0,1');   // South
      expect(directions).toContain('0,-1');  // North
      expect(directions).toContain('1,1');   // Southeast
      expect(directions).toContain('-1,1');  // Southwest
      expect(directions).toContain('1,-1');  // Northeast
      expect(directions).toContain('-1,-1'); // Northwest
    });
  });
});
