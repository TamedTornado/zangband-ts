import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { AlterRealityEffect } from '@/core/systems/effects/AlterRealityEffect';
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

describe('AlterRealityEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new AlterRealityEffect({ type: 'alterReality' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player, { depth: 5 });
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute - in dungeon', () => {
    it('signals level regeneration when in dungeon', () => {
      const effect = new AlterRealityEffect({ type: 'alterReality' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player, { depth: 5 });

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(result.messages.some(m => m.includes('world changes'))).toBe(true);
      // Should signal level regeneration
      expect(result.data?.type).toBe('alterReality');
      expect(result.data?.regenerateLevel).toBe(true);
    });
  });

  describe('execute - on surface', () => {
    it('does nothing on surface (depth 0)', () => {
      const effect = new AlterRealityEffect({ type: 'alterReality' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player, { depth: 0 });

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.messages.some(m => m.includes('moment'))).toBe(true);
      // Should NOT signal level regeneration
      expect(result.data?.regenerateLevel).toBeFalsy();
    });
  });
});
