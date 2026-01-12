import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { RestoreStatEffect } from '@/core/systems/effects/RestoreStatEffect';
import { Player } from '@/core/entities/Player';
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

describe('RestoreStatEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('restoring a single stat', () => {
    it('restores drained strength', () => {
      const effect = new RestoreStatEffect({ type: 'restoreStat', stat: 'str' });
      const player = createTestPlayer(5, 5);

      // Drain strength
      player.drainStat('str', 5);
      expect(player.currentStats.str).toBe(11); // 16 - 5

      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(player.currentStats.str).toBe(16); // Restored to full
    });

    it('returns false if stat was not drained', () => {
      const effect = new RestoreStatEffect({ type: 'restoreStat', stat: 'str' });
      const player = createTestPlayer(5, 5);
      // No drain

      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // Effect succeeds but indicates nothing was restored
      expect(result.success).toBe(true);
      expect(result.messages.some(m => m.includes('normal') || m.includes('already') || m.includes('no effect'))).toBe(true);
    });

    it('only restores the specified stat', () => {
      const effect = new RestoreStatEffect({ type: 'restoreStat', stat: 'str' });
      const player = createTestPlayer(5, 5);

      // Drain multiple stats
      player.drainStat('str', 5);
      player.drainStat('dex', 3);

      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      // Strength should be restored
      expect(player.currentStats.str).toBe(16);
      // Dexterity should still be drained
      expect(player.currentStats.dex).toBe(12); // 15 - 3
    });
  });

  describe('restoring all stats', () => {
    it('restores all drained stats when stat is "all"', () => {
      const effect = new RestoreStatEffect({ type: 'restoreStat', stat: 'all' });
      const player = createTestPlayer(5, 5);

      // Drain multiple stats
      player.drainStat('str', 5);
      player.drainStat('int', 3);
      player.drainStat('dex', 4);

      expect(player.currentStats.str).toBe(11);
      expect(player.currentStats.int).toBe(11);
      expect(player.currentStats.dex).toBe(11);

      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      // All stats should be restored
      expect(player.currentStats.str).toBe(16);
      expect(player.currentStats.int).toBe(14);
      expect(player.currentStats.dex).toBe(15);
    });
  });

  describe('restoring multiple specific stats', () => {
    it('restores array of specified stats', () => {
      const effect = new RestoreStatEffect({ type: 'restoreStat', stat: ['str', 'dex'] });
      const player = createTestPlayer(5, 5);

      // Drain all stats
      player.drainStat('str', 5);
      player.drainStat('int', 3);
      player.drainStat('dex', 4);

      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      // STR and DEX should be restored
      expect(player.currentStats.str).toBe(16);
      expect(player.currentStats.dex).toBe(15);
      // INT should still be drained
      expect(player.currentStats.int).toBe(11);
    });
  });
});
