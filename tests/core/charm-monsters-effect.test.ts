import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { CharmMonstersEffect } from '@/core/systems/effects/CharmMonstersEffect';
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

describe('CharmMonstersEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new CharmMonstersEffect({ type: 'charmMonsters', power: 20 });
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

  describe('execute - charm mechanics', () => {
    it('charms normal monsters within sight range', () => {
      const effect = new CharmMonstersEffect({ type: 'charmMonsters', power: 50 });
      const player = createTestPlayer(25, 25);

      const monster = createTestMonster({
        id: 'normal',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: [],
        level: 10, // Low level, easy to charm
      });

      const level = createMockLevel([monster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
          level: m.def.depth ?? 10,
        }),
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(monster.isTamed).toBe(true);
      expect(result.messages.some(m => m.includes('friendly'))).toBe(true);
    });

    it('does not charm UNIQUE monsters', () => {
      const effect = new CharmMonstersEffect({ type: 'charmMonsters', power: 100 });
      const player = createTestPlayer(25, 25);

      const uniqueMonster = createTestMonster({
        id: 'unique',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: ['UNIQUE'],
        level: 5,
      });

      const level = createMockLevel([uniqueMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
          level: m.def.depth ?? 10,
        }),
      };

      effect.execute(context);

      expect(uniqueMonster.isTamed).toBe(false);
    });

    it('does not charm QUESTOR monsters', () => {
      const effect = new CharmMonstersEffect({ type: 'charmMonsters', power: 100 });
      const player = createTestPlayer(25, 25);

      const questorMonster = createTestMonster({
        id: 'questor',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: ['QUESTOR'],
        level: 5,
      });

      const level = createMockLevel([questorMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
          level: m.def.depth ?? 10,
        }),
      };

      effect.execute(context);

      expect(questorMonster.isTamed).toBe(false);
    });

    it('does not charm NO_CONF monsters', () => {
      const effect = new CharmMonstersEffect({ type: 'charmMonsters', power: 100 });
      const player = createTestPlayer(25, 25);

      const noConfMonster = createTestMonster({
        id: 'noconf',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: ['NO_CONF'],
        level: 5,
      });

      const level = createMockLevel([noConfMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
          level: m.def.depth ?? 10,
        }),
      };

      effect.execute(context);

      expect(noConfMonster.isTamed).toBe(false);
    });

    it('high level monsters can resist charm', () => {
      const effect = new CharmMonstersEffect({ type: 'charmMonsters', power: 10 });
      const player = createTestPlayer(25, 25);

      // High level monster vs low power - should resist most of the time
      let resisted = 0;
      const trials = 50;

      for (let i = 0; i < trials; i++) {
        RNG.setSeed(i * 1000);

        const highLevelMonster = createTestMonster({
          id: `high-${i}`,
          position: { x: 27, y: 25 },
          maxHp: 100,
          flags: [],
          level: 100, // Very high level vs power 10 (max roll = 30)
        });

        const level = createMockLevel([highLevelMonster], player);

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
          getMonsterInfo: (m) => ({
            name: m.def.name,
            flags: m.def.flags ?? [],
            level: m.def.depth ?? 10,
          }),
        };

        effect.execute(context);

        if (!highLevelMonster.isTamed) {
          resisted++;
        }
      }

      // Level 100 vs power 10 (max roll = 30): should always resist
      expect(resisted).toBe(trials);
    });

    it('low level monsters are easily charmed', () => {
      const effect = new CharmMonstersEffect({ type: 'charmMonsters', power: 50 });
      const player = createTestPlayer(25, 25);

      let charmed = 0;
      const trials = 20;

      for (let i = 0; i < trials; i++) {
        RNG.setSeed(i * 1000);

        const lowLevelMonster = createTestMonster({
          id: `low-${i}`,
          position: { x: 27, y: 25 },
          maxHp: 100,
          flags: [],
          level: 5, // Low level vs power 50 (roll 1-150)
        });

        const level = createMockLevel([lowLevelMonster], player);

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
          getMonsterInfo: (m) => ({
            name: m.def.name,
            flags: m.def.flags ?? [],
            level: m.def.depth ?? 10,
          }),
        };

        effect.execute(context);

        if (lowLevelMonster.isTamed) {
          charmed++;
        }
      }

      // Level 5 vs power 50 (roll 1-150): should charm most of the time
      expect(charmed).toBeGreaterThan(trials * 0.9);
    });
  });

  describe('execute - range', () => {
    it('only affects monsters within sight range (MAX_SIGHT = 20)', () => {
      const effect = new CharmMonstersEffect({ type: 'charmMonsters', power: 100 });
      const player = createTestPlayer(25, 25);

      // Near monster
      const nearMonster = createTestMonster({
        id: 'near',
        position: { x: 30, y: 25 }, // Distance 5
        maxHp: 100,
        flags: [],
        level: 1,
      });

      // Far monster (beyond MAX_SIGHT = 20)
      const farMonster = createTestMonster({
        id: 'far',
        position: { x: 48, y: 25 }, // Distance 23
        maxHp: 100,
        flags: [],
        level: 1,
      });

      const level = createMockLevel([nearMonster, farMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
          level: m.def.depth ?? 10,
        }),
      };

      effect.execute(context);

      expect(nearMonster.isTamed).toBe(true);
      expect(farMonster.isTamed).toBe(false);
    });
  });

  describe('execute - multiple monsters', () => {
    it('can charm multiple monsters at once', () => {
      const effect = new CharmMonstersEffect({ type: 'charmMonsters', power: 100 });
      const player = createTestPlayer(25, 25);

      const monsters = [
        createTestMonster({
          id: 'monster1',
          position: { x: 27, y: 25 },
          maxHp: 100,
          flags: [],
          level: 1,
        }),
        createTestMonster({
          id: 'monster2',
          position: { x: 25, y: 27 },
          maxHp: 100,
          flags: [],
          level: 1,
        }),
        createTestMonster({
          id: 'monster3',
          position: { x: 23, y: 25 },
          maxHp: 100,
          flags: [],
          level: 1,
        }),
      ];

      const level = createMockLevel(monsters, player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
          level: m.def.depth ?? 10,
        }),
      };

      effect.execute(context);

      expect(monsters.every(m => m.isTamed)).toBe(true);
    });

    it('only charms valid targets from mixed group', () => {
      const effect = new CharmMonstersEffect({ type: 'charmMonsters', power: 100 });
      const player = createTestPlayer(25, 25);

      const normalMonster = createTestMonster({
        id: 'normal',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: [],
        level: 1,
      });

      const uniqueMonster = createTestMonster({
        id: 'unique',
        position: { x: 23, y: 25 },
        maxHp: 100,
        flags: ['UNIQUE'],
        level: 1,
      });

      const level = createMockLevel([normalMonster, uniqueMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
          level: m.def.depth ?? 10,
        }),
      };

      effect.execute(context);

      expect(normalMonster.isTamed).toBe(true);
      expect(uniqueMonster.isTamed).toBe(false);
    });
  });

  describe('execute - messages', () => {
    it('shows "Nothing happens" when no monsters to charm', () => {
      const effect = new CharmMonstersEffect({ type: 'charmMonsters', power: 50 });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.messages.some(m => m.includes('Nothing') || m.includes('nothing'))).toBe(true);
    });

    it('shows unaffected message for immune monsters', () => {
      const effect = new CharmMonstersEffect({ type: 'charmMonsters', power: 100 });
      const player = createTestPlayer(25, 25);

      const uniqueMonster = createTestMonster({
        id: 'unique',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: ['UNIQUE'],
        level: 1,
      });

      const level = createMockLevel([uniqueMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
          level: m.def.depth ?? 10,
        }),
      };

      const result = effect.execute(context);

      expect(result.messages.some(m => m.includes('unaffected'))).toBe(true);
    });
  });
});
