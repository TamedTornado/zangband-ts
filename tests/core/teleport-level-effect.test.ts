import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { TeleportLevelEffect } from '@/core/systems/effects/TeleportLevelEffect';
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

describe('TeleportLevelEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted effect)', () => {
      const effect = new TeleportLevelEffect({ type: 'teleportLevel' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute - default random direction', () => {
    it('returns levelTransition with random direction by default', () => {
      const effect = new TeleportLevelEffect({ type: 'teleportLevel' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.levelTransition).toBeDefined();
      expect(result.levelTransition!.direction).toBe('random');
      expect(result.messages[0]).toContain('sink');
    });
  });

  describe('execute - explicit directions', () => {
    it('returns levelTransition with up direction', () => {
      const effect = new TeleportLevelEffect({ type: 'teleportLevel', direction: 'up' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.levelTransition).toBeDefined();
      expect(result.levelTransition!.direction).toBe('up');
    });

    it('returns levelTransition with down direction', () => {
      const effect = new TeleportLevelEffect({ type: 'teleportLevel', direction: 'down' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.levelTransition).toBeDefined();
      expect(result.levelTransition!.direction).toBe('down');
    });

    it('returns levelTransition with random direction when explicitly set', () => {
      const effect = new TeleportLevelEffect({ type: 'teleportLevel', direction: 'random' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.levelTransition).toBeDefined();
      expect(result.levelTransition!.direction).toBe('random');
    });
  });

  describe('execute - messages', () => {
    it('displays appropriate message', () => {
      const effect = new TeleportLevelEffect({ type: 'teleportLevel' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0]).toContain('sink');
    });
  });

  describe('execute - turn consumption', () => {
    it('consumes a turn', () => {
      const effect = new TeleportLevelEffect({ type: 'teleportLevel' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.turnConsumed).toBe(true);
    });
  });
});
