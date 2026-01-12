import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { RestoreStatsEffect } from '@/core/systems/effects/RestoreStatsEffect';
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

describe('RestoreStatsEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new RestoreStatsEffect({ type: 'restoreStats' });
      const player = createTestPlayer(5, 5);
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
    it('returns success message for stat restoration', () => {
      const effect = new RestoreStatsEffect({ type: 'restoreStats' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(result.messages.some(m => m.includes('stats'))).toBe(true);
    });

    it('restores drained stats to normal', () => {
      const effect = new RestoreStatsEffect({ type: 'restoreStats' });
      const player = createTestPlayer(5, 5);

      // Drain some stats
      player.drainStat('str', 3);
      player.drainStat('dex', 2);

      expect(player.currentStats.str).toBe(13); // 16 - 3
      expect(player.currentStats.dex).toBe(13); // 15 - 2

      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      // Stats should be restored
      expect(player.currentStats.str).toBe(16);
      expect(player.currentStats.dex).toBe(15);
    });

    it('reports which stats were restored', () => {
      const effect = new RestoreStatsEffect({ type: 'restoreStats' });
      const player = createTestPlayer(5, 5);

      // Drain some stats
      player.drainStat('str', 3);
      player.drainStat('int', 2);

      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      // Should mention the stats that were actually restored
      expect(result.messages.some(m => m.includes('strength') || m.includes('stats'))).toBe(true);
    });

    it('reports nothing restored if no stats were drained', () => {
      const effect = new RestoreStatsEffect({ type: 'restoreStats' });
      const player = createTestPlayer(5, 5);
      // No stat drain

      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      // Should indicate nothing needed restoration
      expect(result.messages.some(m => m.includes('normal') || m.includes('already'))).toBe(true);
    });
  });
});
