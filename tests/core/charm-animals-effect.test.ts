import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { CharmAnimalsEffect } from '@/core/systems/effects/CharmAnimalsEffect';
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

describe('CharmAnimalsEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new CharmAnimalsEffect({ type: 'charmAnimals', power: 20 });
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

  describe('execute - charm animals only', () => {
    it('charms ANIMAL monsters within sight range', () => {
      const effect = new CharmAnimalsEffect({ type: 'charmAnimals', power: 50 });
      const player = createTestPlayer(25, 25);

      const animal = createTestMonster({
        id: 'animal',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: ['ANIMAL'],
        level: 5,
      });

      const level = createMockLevel([animal], player);

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
      expect(animal.isTamed).toBe(true);
      expect(result.messages.some(m => m.includes('tamed'))).toBe(true);
    });

    it('does not affect non-ANIMAL monsters', () => {
      const effect = new CharmAnimalsEffect({ type: 'charmAnimals', power: 100 });
      const player = createTestPlayer(25, 25);

      const nonAnimal = createTestMonster({
        id: 'nonanimal',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: [], // No ANIMAL flag
        level: 1,
      });

      const level = createMockLevel([nonAnimal], player);

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

      expect(nonAnimal.isTamed).toBe(false);
    });

    it('does not charm UNIQUE animals', () => {
      const effect = new CharmAnimalsEffect({ type: 'charmAnimals', power: 100 });
      const player = createTestPlayer(25, 25);

      const uniqueAnimal = createTestMonster({
        id: 'unique',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: ['ANIMAL', 'UNIQUE'],
        level: 1,
      });

      const level = createMockLevel([uniqueAnimal], player);

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

      expect(uniqueAnimal.isTamed).toBe(false);
    });

    it('does not charm NO_CONF animals', () => {
      const effect = new CharmAnimalsEffect({ type: 'charmAnimals', power: 100 });
      const player = createTestPlayer(25, 25);

      const noConfAnimal = createTestMonster({
        id: 'noconf',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: ['ANIMAL', 'NO_CONF'],
        level: 1,
      });

      const level = createMockLevel([noConfAnimal], player);

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

      expect(noConfAnimal.isTamed).toBe(false);
    });
  });

  describe('execute - mixed groups', () => {
    it('only charms animals from mixed group', () => {
      const effect = new CharmAnimalsEffect({ type: 'charmAnimals', power: 100 });
      const player = createTestPlayer(25, 25);

      const animal = createTestMonster({
        id: 'animal',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: ['ANIMAL'],
        level: 1,
      });

      const demon = createTestMonster({
        id: 'demon',
        position: { x: 23, y: 25 },
        maxHp: 100,
        flags: ['DEMON'],
        level: 1,
      });

      const undead = createTestMonster({
        id: 'undead',
        position: { x: 25, y: 27 },
        maxHp: 100,
        flags: ['UNDEAD'],
        level: 1,
      });

      const level = createMockLevel([animal, demon, undead], player);

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

      expect(animal.isTamed).toBe(true);
      expect(demon.isTamed).toBe(false);
      expect(undead.isTamed).toBe(false);
    });
  });

  describe('execute - level resistance', () => {
    it('high level animals can resist', () => {
      const effect = new CharmAnimalsEffect({ type: 'charmAnimals', power: 10 });
      const player = createTestPlayer(25, 25);

      let resisted = 0;
      const trials = 50;

      for (let i = 0; i < trials; i++) {
        RNG.setSeed(i * 1000);

        const highLevelAnimal = createTestMonster({
          id: `animal-${i}`,
          position: { x: 27, y: 25 },
          maxHp: 100,
          flags: ['ANIMAL'],
          level: 100, // Very high level
        });

        const level = createMockLevel([highLevelAnimal], player);

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

        if (!highLevelAnimal.isTamed) {
          resisted++;
        }
      }

      // Level 100 vs power 10 (max roll 30): should always resist
      expect(resisted).toBe(trials);
    });
  });

  describe('execute - range', () => {
    it('only affects monsters within sight range', () => {
      const effect = new CharmAnimalsEffect({ type: 'charmAnimals', power: 100 });
      const player = createTestPlayer(25, 25);

      const nearAnimal = createTestMonster({
        id: 'near',
        position: { x: 30, y: 25 }, // Distance 5
        maxHp: 100,
        flags: ['ANIMAL'],
        level: 1,
      });

      const farAnimal = createTestMonster({
        id: 'far',
        position: { x: 48, y: 25 }, // Distance 23, beyond MAX_SIGHT
        maxHp: 100,
        flags: ['ANIMAL'],
        level: 1,
      });

      const level = createMockLevel([nearAnimal, farAnimal], player);

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

      expect(nearAnimal.isTamed).toBe(true);
      expect(farAnimal.isTamed).toBe(false);
    });
  });

  describe('execute - messages', () => {
    it('shows "Nothing happens" when no animals to charm', () => {
      const effect = new CharmAnimalsEffect({ type: 'charmAnimals', power: 50 });
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
  });
});
