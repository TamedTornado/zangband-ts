import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { LivingTrumpEffect } from '@/core/systems/effects/LivingTrumpEffect';
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

describe('LivingTrumpEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new LivingTrumpEffect({ type: 'livingTrump' });
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

  describe('execute - grants living trump mutation', () => {
    it('returns success with mutation granted message', () => {
      const effect = new LivingTrumpEffect({ type: 'livingTrump' });
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
      expect(result.messages.some(m => m.includes('Living Trump'))).toBe(true);
    });

    it('returns mutation data', () => {
      const effect = new LivingTrumpEffect({ type: 'livingTrump' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.data?.type).toBe('livingTrump');
      expect(result.data?.mutation).toBeDefined();
    });

    it('can grant teleport control (1/8 chance)', () => {
      const effect = new LivingTrumpEffect({ type: 'livingTrump' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      // Run multiple times to find teleport control result
      let foundControl = false;
      for (let i = 0; i < 100; i++) {
        RNG.setSeed(i * 1000);

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
        };

        const result = effect.execute(context);
        if (result.data?.mutation === 'teleportControl') {
          foundControl = true;
          break;
        }
      }

      expect(foundControl).toBe(true);
    });

    it('can grant random teleportation (7/8 chance)', () => {
      const effect = new LivingTrumpEffect({ type: 'livingTrump' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      // Run multiple times to find random teleport result
      let foundRandom = false;
      for (let i = 0; i < 100; i++) {
        RNG.setSeed(i * 1000);

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
        };

        const result = effect.execute(context);
        if (result.data?.mutation === 'randomTeleport') {
          foundRandom = true;
          break;
        }
      }

      expect(foundRandom).toBe(true);
    });
  });
});
