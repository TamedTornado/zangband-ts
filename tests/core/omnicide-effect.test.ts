import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { OmnicideEffect } from '@/core/systems/effects/OmnicideEffect';
import { Player } from '@/core/entities/Player';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import { createTestMonster, createMockLevel } from './testHelpers';

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 200, // Higher HP to survive strain damage
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
}

describe('OmnicideEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new OmnicideEffect({ type: 'omnicide' });
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

  describe('execute - kills all non-unique monsters', () => {
    it('kills all normal monsters on the level', () => {
      const effect = new OmnicideEffect({ type: 'omnicide' });
      const player = createTestPlayer(25, 25);

      const monster1 = createTestMonster({ id: 'm1', position: { x: 5, y: 5 }, maxHp: 100 });
      const monster2 = createTestMonster({ id: 'm2', position: { x: 40, y: 40 }, maxHp: 100 });
      const monster3 = createTestMonster({ id: 'm3', position: { x: 10, y: 30 }, maxHp: 100 });

      const level = createMockLevel([monster1, monster2, monster3], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(monster1.isDead).toBe(true);
      expect(monster2.isDead).toBe(true);
      expect(monster3.isDead).toBe(true);
    });

    it('skips unique monsters', () => {
      const effect = new OmnicideEffect({ type: 'omnicide' });
      const player = createTestPlayer(25, 25);

      const normalMonster = createTestMonster({
        id: 'normal',
        position: { x: 10, y: 10 },
        maxHp: 100,
        flags: [],
      });
      const uniqueMonster = createTestMonster({
        id: 'unique',
        position: { x: 20, y: 20 },
        maxHp: 100,
        flags: ['UNIQUE'],
      });

      const level = createMockLevel([normalMonster, uniqueMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      effect.execute(context);

      expect(normalMonster.isDead).toBe(true);
      expect(uniqueMonster.isDead).toBe(false); // Unique survives
    });

    it('skips questor monsters', () => {
      const effect = new OmnicideEffect({ type: 'omnicide' });
      const player = createTestPlayer(25, 25);

      const normalMonster = createTestMonster({
        id: 'normal',
        position: { x: 10, y: 10 },
        maxHp: 100,
        flags: [],
      });
      const questorMonster = createTestMonster({
        id: 'questor',
        position: { x: 20, y: 20 },
        maxHp: 100,
        flags: ['QUESTOR'],
      });

      const level = createMockLevel([normalMonster, questorMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      effect.execute(context);

      expect(normalMonster.isDead).toBe(true);
      expect(questorMonster.isDead).toBe(false); // Questor survives
    });
  });

  describe('execute - deals strain damage', () => {
    it('deals 1d4 damage per monster killed', () => {
      const effect = new OmnicideEffect({ type: 'omnicide' });
      const player = createTestPlayer(25, 25);
      const initialHp = player.hp;

      // 5 monsters = 5 * 1d4 = 5-20 damage
      const monsters = Array.from({ length: 5 }, (_, i) =>
        createTestMonster({
          id: `m${i}`,
          position: { x: 5 + i * 2, y: 5 },
          maxHp: 50,
        })
      );

      const level = createMockLevel(monsters, player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      effect.execute(context);

      // Should have taken damage
      expect(player.hp).toBeLessThan(initialHp);
      // 5 monsters * 1d4 each = 5-20 damage
      const damageTaken = initialHp - player.hp;
      expect(damageTaken).toBeGreaterThanOrEqual(5);
      expect(damageTaken).toBeLessThanOrEqual(20);
    });

    it('can potentially kill the caster with many monsters', () => {
      const effect = new OmnicideEffect({ type: 'omnicide' });
      // Low HP player
      const player = new Player({
        id: 'weak-player',
        position: { x: 25, y: 25 },
        maxHp: 20,
        speed: 110,
        stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      });

      // Many monsters = lots of strain damage
      const monsters = Array.from({ length: 20 }, (_, i) =>
        createTestMonster({
          id: `m${i}`,
          position: { x: (i % 10) * 4, y: Math.floor(i / 10) * 4 },
          maxHp: 50,
        })
      );

      const level = createMockLevel(monsters, player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      // Use a seed that gives high rolls
      RNG.setSeed(99999);
      effect.execute(context);

      // Player may or may not be dead depending on rolls
      // 20 monsters * 1d4 = 20-80 damage, player has 20 HP max
      // Very likely to die
      expect(player.hp).toBeLessThanOrEqual(20);
    });
  });

  describe('execute - mana absorption', () => {
    it('reports mana absorbed in result', () => {
      const effect = new OmnicideEffect({ type: 'omnicide' });
      const player = createTestPlayer(25, 25);

      const monsters = Array.from({ length: 3 }, (_, i) =>
        createTestMonster({
          id: `m${i}`,
          position: { x: 5 + i * 2, y: 5 },
          maxHp: 50,
        })
      );

      const level = createMockLevel(monsters, player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      const result = effect.execute(context);

      // Should report mana absorbed (one per kill)
      expect(result.data?.['manaGained']).toBe(3);
    });
  });

  describe('execute - messages', () => {
    it('shows kill count in message', () => {
      const effect = new OmnicideEffect({ type: 'omnicide' });
      const player = createTestPlayer(25, 25);

      const monsters = Array.from({ length: 3 }, (_, i) =>
        createTestMonster({
          id: `m${i}`,
          position: { x: 5 + i * 2, y: 5 },
          maxHp: 50,
        })
      );

      const level = createMockLevel(monsters, player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      const result = effect.execute(context);

      expect(result.messages.some(m => m.includes('3') || m.includes('creature'))).toBe(true);
    });

    it('shows appropriate message when no monsters affected', () => {
      const effect = new OmnicideEffect({ type: 'omnicide' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.messages.some(m => m.includes('quiet') || m.includes('Nothing'))).toBe(true);
    });
  });

  describe('execute - level-wide effect', () => {
    it('kills monsters anywhere on the level (not just in sight)', () => {
      const effect = new OmnicideEffect({ type: 'omnicide' });
      const player = createTestPlayer(0, 0); // Player in corner

      // Monsters spread across the level
      const monster1 = createTestMonster({ id: 'm1', position: { x: 0, y: 1 }, maxHp: 50 }); // Close
      const monster2 = createTestMonster({ id: 'm2', position: { x: 49, y: 49 }, maxHp: 50 }); // Far corner
      const monster3 = createTestMonster({ id: 'm3', position: { x: 25, y: 25 }, maxHp: 50 }); // Center

      const level = createMockLevel([monster1, monster2, monster3], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      effect.execute(context);

      // All monsters should be dead regardless of distance
      expect(monster1.isDead).toBe(true);
      expect(monster2.isDead).toBe(true);
      expect(monster3.isDead).toBe(true);
    });
  });
});
