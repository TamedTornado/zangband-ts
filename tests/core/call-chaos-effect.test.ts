import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { CallChaosEffect } from '@/core/systems/effects/CallChaosEffect';
import { Player } from '@/core/entities/Player';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import { createMockLevel } from './testHelpers';

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

describe('CallChaosEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns true (self-targeted)', () => {
      const effect = new CallChaosEffect({ type: 'callChaos' });
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
    it('returns success with chaos message', () => {
      const effect = new CallChaosEffect({ type: 'callChaos' });
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
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('uses a random chaos element', () => {
      const effect = new CallChaosEffect({ type: 'callChaos' });
      const level = createMockLevel([], null as any);

      // Run multiple times to get different elements
      const elements = new Set<string>();
      for (let i = 0; i < 30; i++) {
        RNG.setSeed(i * 17 + 1);
        const player = createTestPlayer(25, 25);
        (level as any)._player = player;

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
        };

        const result = effect.execute(context);
        if (result.data?.['element']) {
          elements.add(result.data['element']);
        }
      }

      // Should have gotten multiple different elements
      expect(elements.size).toBeGreaterThan(1);
    });

    it('can fire in all directions', () => {
      const effect = new CallChaosEffect({ type: 'callChaos' });
      const level = createMockLevel([], null as any);

      // Run until we get an all-directions result
      let foundAllDirections = false;
      for (let i = 0; i < 100; i++) {
        RNG.setSeed(i * 17 + 1);
        const player = createTestPlayer(25, 25);
        (level as any)._player = player;

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
        };

        const result = effect.execute(context);
        if (result.data?.['mode'] === 'allDirections') {
          foundAllDirections = true;
          expect(result.data?.['directionCount']).toBe(8);
          break;
        }
      }

      // 1/6 chance, so should find at least one in 100 tries
      expect(foundAllDirections).toBe(true);
    });

    it('can create huge centered ball', () => {
      const effect = new CallChaosEffect({ type: 'callChaos' });
      const level = createMockLevel([], null as any);

      // Run until we get a centered ball result
      let foundCenteredBall = false;
      for (let i = 0; i < 100; i++) {
        RNG.setSeed(i * 17 + 1);
        const player = createTestPlayer(25, 25);
        (level as any)._player = player;

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
        };

        const result = effect.execute(context);
        if (result.data?.['mode'] === 'centeredBall') {
          foundCenteredBall = true;
          expect(result.data?.['radius']).toBe(8);
          break;
        }
      }

      // About 1/4 chance overall, so should find at least one
      expect(foundCenteredBall).toBe(true);
    });

    it('can fire targeted attack', () => {
      const effect = new CallChaosEffect({ type: 'callChaos' });
      const level = createMockLevel([], null as any);

      // Run until we get a targeted result
      let foundTargeted = false;
      for (let i = 0; i < 100; i++) {
        RNG.setSeed(i * 17 + 1);
        const player = createTestPlayer(25, 25);
        (level as any)._player = player;

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
        };

        const result = effect.execute(context);
        if (result.data?.['mode'] === 'targeted') {
          foundTargeted = true;
          break;
        }
      }

      // Most common mode (about 1/2), so should find at least one
      expect(foundTargeted).toBe(true);
    });

    it('can use beams instead of balls', () => {
      const effect = new CallChaosEffect({ type: 'callChaos' });
      const level = createMockLevel([], null as any);

      // Run until we get a beam result
      let foundBeam = false;
      for (let i = 0; i < 100; i++) {
        RNG.setSeed(i * 17 + 1);
        const player = createTestPlayer(25, 25);
        (level as any)._player = player;

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
        };

        const result = effect.execute(context);
        if (result.data?.['useBeams'] === true) {
          foundBeam = true;
          break;
        }
      }

      // 1/4 chance, so should find at least one in 100 tries
      expect(foundBeam).toBe(true);
    });
  });
});
