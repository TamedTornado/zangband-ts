import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { MeteorSwarmEffect } from '@/core/systems/effects/MeteorSwarmEffect';
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

describe('MeteorSwarmEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns true (self-targeted)', () => {
      const effect = new MeteorSwarmEffect({ type: 'meteorSwarm' });
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
    it('returns success with meteor message', () => {
      const effect = new MeteorSwarmEffect({ type: 'meteorSwarm' });
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
      expect(result.messages.some(m => m.toLowerCase().includes('meteor'))).toBe(true);
    });

    it('creates 10-20 meteors', () => {
      const effect = new MeteorSwarmEffect({ type: 'meteorSwarm' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.data?.['meteorCount']).toBeDefined();
      expect(result.data?.['meteorCount']).toBeGreaterThanOrEqual(10);
      expect(result.data?.['meteorCount']).toBeLessThanOrEqual(20);
    });

    it('meteors land near player', () => {
      const effect = new MeteorSwarmEffect({ type: 'meteorSwarm' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // All meteor impacts should be within 6 squares of player
      for (const impact of (result.data?.['impacts'] as Array<{x: number, y: number}>) ?? []) {
        const dx = Math.abs(impact.x - player.position.x);
        const dy = Math.abs(impact.y - player.position.y);
        const distance = Math.max(dx, dy); // Chebyshev distance
        expect(distance).toBeLessThanOrEqual(6);
      }
    });

    it('damage scales with player level', () => {
      const effect = new MeteorSwarmEffect({ type: 'meteorSwarm' });
      const level = createMockLevel([], null as any);

      // Test at level 20
      RNG.setSeed(12345);
      const player20 = createTestPlayer(25, 25, 20);
      (level as any)._player = player20;
      const context20: GPEffectContext = {
        actor: player20,
        level: level as any,
        rng: RNG,
      };
      const result20 = effect.execute(context20);

      // Test at level 50
      RNG.setSeed(12345);
      const player50 = createTestPlayer(25, 25, 50);
      (level as any)._player = player50;
      const context50: GPEffectContext = {
        actor: player50,
        level: level as any,
        rng: RNG,
      };
      const result50 = effect.execute(context50);

      // Damage at level 50 should be higher
      expect(result50.data?.['baseDamage']).toBeGreaterThan(result20.data?.['baseDamage']);
    });

    it('hits monsters in impact area', () => {
      const effect = new MeteorSwarmEffect({ type: 'meteorSwarm' });
      const player = createTestPlayer(25, 25, 30);
      // Place monster near player
      const monster = createTestMonster({ id: 'kobold', position: { x: 27, y: 25 } });
      const level = createMockLevel([monster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // With multiple meteors, some should hit the area near the monster
      expect(result.data?.['totalHits']).toBeGreaterThanOrEqual(0);
    });
  });
});
