import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { SatisfyHungerEffect } from '@/core/systems/effects/SatisfyHungerEffect';
import { Player, FoodLevel, HungerStatus } from '@/core/entities/Player';
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

describe('SatisfyHungerEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new SatisfyHungerEffect({ type: 'satisfyHunger' });
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

  describe('execute - from hungry state', () => {
    it('fills player to almost full when hungry', () => {
      const effect = new SatisfyHungerEffect({ type: 'satisfyHunger' });
      const player = createTestPlayer(5, 5);

      // Make player hungry
      player.setFood(FoodLevel.WEAK + 100); // Hungry but not weak
      expect(player.hungerStatus).toBe(HungerStatus.Hungry);

      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      // Should be set to just under MAX (full, not gorged)
      expect(player.food).toBe(FoodLevel.MAX - 1);
      expect(player.hungerStatus).toBe(HungerStatus.Full);
    });

    it('returns full message when satisfying hunger', () => {
      const effect = new SatisfyHungerEffect({ type: 'satisfyHunger' });
      const player = createTestPlayer(5, 5);

      // Make player hungry
      player.setFood(FoodLevel.ALERT - 100);

      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.messages.some(m => m.includes('full'))).toBe(true);
    });
  });

  describe('execute - from starving state', () => {
    it('restores food from starving to full', () => {
      const effect = new SatisfyHungerEffect({ type: 'satisfyHunger' });
      const player = createTestPlayer(5, 5);

      // Make player starving
      player.setFood(FoodLevel.STARVE);
      expect(player.hungerStatus).toBe(HungerStatus.Faint);

      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(player.food).toBe(FoodLevel.MAX - 1);
      expect(player.hungerStatus).toBe(HungerStatus.Full);
    });
  });

  describe('execute - already full', () => {
    it('still works when already full (becomes fuller)', () => {
      const effect = new SatisfyHungerEffect({ type: 'satisfyHunger' });
      const player = createTestPlayer(5, 5);

      // Player starts at FULL - 1 by default, which is "normal"
      // Set to actually full first
      player.setFood(FoodLevel.FULL + 100);
      expect(player.hungerStatus).toBe(HungerStatus.Full);

      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      // Should top up to MAX - 1
      expect(player.food).toBe(FoodLevel.MAX - 1);
    });

    it('reports already full when at max', () => {
      const effect = new SatisfyHungerEffect({ type: 'satisfyHunger' });
      const player = createTestPlayer(5, 5);

      // Set to exactly max - 1 (the satisfy hunger target)
      player.setFood(FoodLevel.MAX - 1);

      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      // Message should indicate no change needed
      expect(result.messages.some(m =>
        m.includes('already') || m.includes('full')
      )).toBe(true);
    });
  });
});
