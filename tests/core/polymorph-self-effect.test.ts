import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { PolymorphSelfEffect } from '@/core/systems/effects/PolymorphSelfEffect';
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

describe('PolymorphSelfEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns true (self-targeted)', () => {
      const effect = new PolymorphSelfEffect({ type: 'polymorphSelf' });
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
    it('returns success with transformation message', () => {
      const effect = new PolymorphSelfEffect({ type: 'polymorphSelf' });
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
      expect(result.messages.some(m => m.includes('change'))).toBe(true);
    });

    it('may change player race', () => {
      const effect = new PolymorphSelfEffect({ type: 'polymorphSelf' });
      const level = createMockLevel([], null as any);

      // Run multiple times to find race change
      let raceChanged = false;
      for (let i = 0; i < 100; i++) {
        RNG.setSeed(i * 17 + 1);
        const player = createTestPlayer(25, 25, 30);
        (level as any)._player = player;

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
        };

        const result = effect.execute(context);
        if (result.data?.raceChanged) {
          raceChanged = true;
          expect(result.data?.newRace).toBeDefined();
          break;
        }
      }

      // Higher level players have better chance of race change
      expect(raceChanged).toBe(true);
    });

    it('returns data about changes', () => {
      const effect = new PolymorphSelfEffect({ type: 'polymorphSelf' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // Result should have data about what happened
      expect(result.data).toBeDefined();
    });

    it('higher level increases chance of changes', () => {
      const effect = new PolymorphSelfEffect({ type: 'polymorphSelf' });
      const level = createMockLevel([], null as any);

      // Count changes at low level
      let lowLevelChanges = 0;
      for (let i = 0; i < 50; i++) {
        RNG.setSeed(i * 17 + 1);
        const player = createTestPlayer(25, 25, 5);
        (level as any)._player = player;

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
        };

        const result = effect.execute(context);
        if (result.data?.raceChanged) lowLevelChanges++;
      }

      // Count changes at high level
      let highLevelChanges = 0;
      for (let i = 0; i < 50; i++) {
        RNG.setSeed(i * 17 + 1);
        const player = createTestPlayer(25, 25, 50);
        (level as any)._player = player;

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
        };

        const result = effect.execute(context);
        if (result.data?.raceChanged) highLevelChanges++;
      }

      // High level should generally have more changes
      expect(highLevelChanges).toBeGreaterThanOrEqual(lowLevelChanges);
    });
  });
});
