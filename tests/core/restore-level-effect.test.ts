import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { RestoreLevelEffect } from '@/core/systems/effects/RestoreLevelEffect';
import { Player } from '@/core/entities/Player';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import { createMockLevel } from './testHelpers';

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
  });
}

describe('RestoreLevelEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted effect)', () => {
      const effect = new RestoreLevelEffect({ type: 'restoreLevel' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute - experience restoration', () => {
    it('restores drained experience to max', () => {
      const effect = new RestoreLevelEffect({ type: 'restoreLevel' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);

      // Simulate having gained and then lost experience
      // First gain some exp to set maxExperience
      player.gainExperience(5000);
      const maxExp = player.maxExperience;
      expect(maxExp).toBe(5000);

      // Now drain experience (simulate level drain)
      player.drainExperience(2000);
      expect(player.experience).toBe(3000);
      expect(player.maxExperience).toBe(5000); // Max stays the same

      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };
      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(player.experience).toBe(5000); // Restored to max
      expect(result.messages[0]).toContain('life energies');
    });

    it('returns false when no experience to restore', () => {
      const effect = new RestoreLevelEffect({ type: 'restoreLevel' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);

      // Player has not been drained (exp == maxExp)
      player.gainExperience(5000);
      expect(player.experience).toBe(player.maxExperience);

      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };
      const result = effect.execute(context);

      expect(result.success).toBe(false);
      expect(result.messages[0]).toContain('Nothing happens');
    });

    it('restores level if experience was drained below level threshold', () => {
      const effect = new RestoreLevelEffect({ type: 'restoreLevel' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);

      // Gain enough exp to level up multiple times
      player.gainExperience(50000);
      const levelBeforeDrain = player.level;
      expect(levelBeforeDrain).toBeGreaterThan(1);

      // Drain a lot of experience (which should lower level)
      player.drainExperience(40000);
      const levelAfterDrain = player.level;
      expect(levelAfterDrain).toBeLessThan(levelBeforeDrain);

      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };
      effect.execute(context);

      // Level should be restored along with experience
      expect(player.experience).toBe(50000);
      expect(player.level).toBe(levelBeforeDrain);
    });
  });

  describe('execute - turn consumption', () => {
    it('consumes a turn', () => {
      const effect = new RestoreLevelEffect({ type: 'restoreLevel' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.turnConsumed).toBe(true);
    });
  });
});
