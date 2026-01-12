import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { MassGenocideEffect } from '@/core/systems/effects/MassGenocideEffect';
import { Player } from '@/core/entities/Player';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import { createTestMonster, createMockLevel } from './testHelpers';

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
}

describe('MassGenocideEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new MassGenocideEffect({ type: 'massGenocide' });
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

  describe('execute - kills nearby monsters', () => {
    it('kills all non-unique monsters within sight range', () => {
      const effect = new MassGenocideEffect({ type: 'massGenocide' });
      const player = createTestPlayer(25, 25);

      const monster1 = createTestMonster({ id: 'm1', position: { x: 27, y: 25 } });
      const monster2 = createTestMonster({ id: 'm2', position: { x: 25, y: 27 } });
      const monster3 = createTestMonster({ id: 'm3', position: { x: 23, y: 25 } });

      const level = createMockLevel([monster1, monster2, monster3], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(monster1.isDead).toBe(true);
      expect(monster2.isDead).toBe(true);
      expect(monster3.isDead).toBe(true);
    });

    it('deals 1d3 damage to player per monster killed', () => {
      const effect = new MassGenocideEffect({ type: 'massGenocide' });
      const player = createTestPlayer(25, 25);
      const initialHp = player.hp;

      const monster1 = createTestMonster({ id: 'm1', position: { x: 27, y: 25 } });
      const monster2 = createTestMonster({ id: 'm2', position: { x: 25, y: 27 } });

      const level = createMockLevel([monster1, monster2], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      // Player should have taken damage (2 monsters * 1d3 each = 2-6 damage)
      expect(player.hp).toBeLessThan(initialHp);
      expect(player.hp).toBeGreaterThanOrEqual(initialHp - 6);
    });

    it('skips unique monsters', () => {
      const effect = new MassGenocideEffect({ type: 'massGenocide' });
      const player = createTestPlayer(25, 25);

      const regularMonster = createTestMonster({ id: 'm1', position: { x: 27, y: 25 } });
      const uniqueMonster = createTestMonster({
        id: 'unique',
        position: { x: 23, y: 25 },
        flags: ['UNIQUE'],
      });

      const level = createMockLevel([regularMonster, uniqueMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (monster) => ({
          name: monster.def.name,
          flags: monster.def.flags ?? [],
        }),
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(regularMonster.isDead).toBe(true);
      expect(uniqueMonster.isDead).toBe(false); // Unique survived
    });

    it('skips monsters beyond sight range', () => {
      const effect = new MassGenocideEffect({ type: 'massGenocide' });
      const player = createTestPlayer(25, 25);

      // Close monster (within MAX_SIGHT = 20)
      const nearMonster = createTestMonster({ id: 'm1', position: { x: 30, y: 25 } }); // Distance 5

      // Far monster (beyond MAX_SIGHT)
      const farMonster = createTestMonster({ id: 'm2', position: { x: 48, y: 25 } }); // Distance 23

      const level = createMockLevel([nearMonster, farMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      expect(nearMonster.isDead).toBe(true);
      expect(farMonster.isDead).toBe(false); // Too far
    });

    it('returns appropriate message when no monsters affected', () => {
      const effect = new MassGenocideEffect({ type: 'massGenocide' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player); // No monsters

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.messages.some(m => m.includes('Nothing happens') || m.includes('quiet'))).toBe(true);
    });

    it('shows kill count in message', () => {
      const effect = new MassGenocideEffect({ type: 'massGenocide' });
      const player = createTestPlayer(25, 25);

      const monsters = [
        createTestMonster({ id: 'm1', position: { x: 27, y: 25 } }),
        createTestMonster({ id: 'm2', position: { x: 25, y: 27 } }),
        createTestMonster({ id: 'm3', position: { x: 23, y: 25 } }),
      ];

      const level = createMockLevel(monsters, player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // Should mention number killed
      expect(result.messages.some(m => m.includes('3') || m.includes('destroyed'))).toBe(true);
    });
  });
});
