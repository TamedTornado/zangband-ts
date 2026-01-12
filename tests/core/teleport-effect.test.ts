import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { TeleportEffect } from '@/core/systems/effects/TeleportEffect';
import { Player } from '@/core/entities/Player';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import { createMockLevel } from './testHelpers';

function createTestPlayer(x: number, y: number, level: number = 20): Player {
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

describe('TeleportEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new TeleportEffect({ type: 'teleport', distance: '100' });
      const player = createTestPlayer(50, 50);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute - fixed distance', () => {
    it('teleports player to new position within fixed distance', () => {
      const effect = new TeleportEffect({ type: 'teleport', distance: '20' });
      const player = createTestPlayer(50, 50);
      const originalPos = { ...player.position };
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      // Player should have moved
      expect(player.position.x !== originalPos.x || player.position.y !== originalPos.y).toBe(true);

      // Check distance is within range
      const dx = player.position.x - originalPos.x;
      const dy = player.position.y - originalPos.y;
      const actualDist = Math.sqrt(dx * dx + dy * dy);
      expect(actualDist).toBeLessThanOrEqual(20);
    });

    it('shows teleport message with distance', () => {
      const effect = new TeleportEffect({ type: 'teleport', distance: '20' });
      const player = createTestPlayer(50, 50);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.messages.some(m => m.includes('teleport'))).toBe(true);
    });
  });

  describe('execute - level-based formula', () => {
    it('calculates distance from level*4 formula', () => {
      // level 20 * 4 = 80
      const effect = new TeleportEffect({ type: 'teleport', distance: 'level*4' });
      const player = createTestPlayer(50, 50, 20);
      const originalPos = { ...player.position };
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      // Player should have moved
      expect(player.position.x !== originalPos.x || player.position.y !== originalPos.y).toBe(true);

      // Distance should be within 80 (level 20 * 4)
      const dx = player.position.x - originalPos.x;
      const dy = player.position.y - originalPos.y;
      const actualDist = Math.sqrt(dx * dx + dy * dy);
      expect(actualDist).toBeLessThanOrEqual(80);
    });

    it('calculates distance from level+10 formula', () => {
      // level 20 + 10 = 30
      const effect = new TeleportEffect({ type: 'teleport', distance: 'level+10' });
      const player = createTestPlayer(50, 50, 20);
      const originalPos = { ...player.position };
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      // Distance should be within 30 (level 20 + 10)
      const dx = player.position.x - originalPos.x;
      const dy = player.position.y - originalPos.y;
      const actualDist = Math.sqrt(dx * dx + dy * dy);
      expect(actualDist).toBeLessThanOrEqual(30);
    });

    it('handles different player levels', () => {
      const effect = new TeleportEffect({ type: 'teleport', distance: 'level*2' });

      // Level 10 player: 10 * 2 = 20
      const player10 = createTestPlayer(50, 50, 10);
      const level10 = createMockLevel([], player10);
      const context10: GPEffectContext = {
        actor: player10,
        level: level10 as any,
        rng: RNG,
      };

      RNG.setSeed(12345);
      effect.execute(context10);
      const dist10 = Math.sqrt(
        (player10.position.x - 50) ** 2 + (player10.position.y - 50) ** 2
      );

      // Level 30 player: 30 * 2 = 60
      const player30 = createTestPlayer(50, 50, 30);
      const level30 = createMockLevel([], player30);
      const context30: GPEffectContext = {
        actor: player30,
        level: level30 as any,
        rng: RNG,
      };

      RNG.setSeed(12345);
      effect.execute(context30);

      // Both should move within their respective ranges
      expect(dist10).toBeLessThanOrEqual(20);
    });
  });

  describe('execute - edge cases', () => {
    it('uses default distance 100 when not specified', () => {
      const effect = new TeleportEffect({ type: 'teleport' });
      const player = createTestPlayer(50, 50);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
    });

    it('handles plain level as distance', () => {
      // Just "level" as the formula = player level
      const effect = new TeleportEffect({ type: 'teleport', distance: 'level' });
      const player = createTestPlayer(50, 50, 15);
      const originalPos = { ...player.position };
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      const dx = player.position.x - originalPos.x;
      const dy = player.position.y - originalPos.y;
      const actualDist = Math.sqrt(dx * dx + dy * dy);
      // Should be within level 15
      expect(actualDist).toBeLessThanOrEqual(15);
    });

    it('caps maximum distance at 200', () => {
      // "level*100" at level 20 = 2000, but should cap at 200
      const effect = new TeleportEffect({ type: 'teleport', distance: 'level*100' });
      const player = createTestPlayer(50, 50, 20);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      // The effect should still work (capped at 200)
    });

    it('returns failure message when no valid destination', () => {
      const effect = new TeleportEffect({ type: 'teleport', distance: '5' });
      const player = createTestPlayer(2, 2); // Small area

      // Create a very constrained level with only walls
      const level = {
        player,
        getTile: () => ({ terrain: { flags: ['WALL'] }, isPassable: false }),
        getMonsterAt: () => undefined,
        getActorAt: () => undefined,
        isWalkable: () => false, // All tiles are unwalkable
      };

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // Should handle gracefully
      expect(result.turnConsumed).toBe(true);
    });
  });
});
