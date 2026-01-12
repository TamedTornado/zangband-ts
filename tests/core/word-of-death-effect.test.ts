import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { WordOfDeathEffect } from '@/core/systems/effects/WordOfDeathEffect';
import { Player } from '@/core/entities/Player';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import { createTestMonster, createMockLevel } from './testHelpers';

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

describe('WordOfDeathEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new WordOfDeathEffect({ type: 'wordOfDeath' });
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

  describe('execute - damages living monsters', () => {
    it('damages living monsters in radius', () => {
      const effect = new WordOfDeathEffect({ type: 'wordOfDeath' });
      const player = createTestPlayer(25, 25, 30); // Level 30: damage = 30 * 3 = 90

      // Living monster (no DEMON/UNDEAD/NONLIVING flags)
      const livingMonster = createTestMonster({
        id: 'm1',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: [],
      });
      const initialHp = livingMonster.hp;

      const level = createMockLevel([livingMonster], player);

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
      expect(livingMonster.hp).toBeLessThan(initialHp);
      expect(initialHp - livingMonster.hp).toBe(90); // level * 3
    });

    it('kills weak living monsters', () => {
      const effect = new WordOfDeathEffect({ type: 'wordOfDeath' });
      const player = createTestPlayer(25, 25, 50); // Level 50: damage = 150

      const weakMonster = createTestMonster({
        id: 'm1',
        position: { x: 27, y: 25 },
        maxHp: 50,
        flags: [],
      });

      const level = createMockLevel([weakMonster], player);

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

      expect(weakMonster.isDead).toBe(true);
      expect(result.messages.some(m => m.includes('destroyed') || m.includes('dissolves'))).toBe(true);
    });

    it('damages multiple living monsters', () => {
      const effect = new WordOfDeathEffect({ type: 'wordOfDeath' });
      const player = createTestPlayer(25, 25, 20); // Level 20: damage = 60

      const monster1 = createTestMonster({
        id: 'm1',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: [],
      });
      const monster2 = createTestMonster({
        id: 'm2',
        position: { x: 23, y: 25 },
        maxHp: 100,
        flags: [],
      });

      const level = createMockLevel([monster1, monster2], player);

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

      // Both should take 60 damage
      expect(monster1.hp).toBe(40);
      expect(monster2.hp).toBe(40);
    });
  });

  describe('execute - skips non-living monsters', () => {
    it('skips undead monsters', () => {
      const effect = new WordOfDeathEffect({ type: 'wordOfDeath' });
      const player = createTestPlayer(25, 25, 30);

      const undeadMonster = createTestMonster({
        id: 'undead',
        position: { x: 27, y: 25 },
        maxHp: 50,
        flags: ['UNDEAD'],
      });
      const initialHp = undeadMonster.hp;

      const level = createMockLevel([undeadMonster], player);

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

      expect(undeadMonster.hp).toBe(initialHp); // No damage
    });

    it('skips demon monsters', () => {
      const effect = new WordOfDeathEffect({ type: 'wordOfDeath' });
      const player = createTestPlayer(25, 25, 30);

      const demonMonster = createTestMonster({
        id: 'demon',
        position: { x: 27, y: 25 },
        maxHp: 50,
        flags: ['DEMON'],
      });
      const initialHp = demonMonster.hp;

      const level = createMockLevel([demonMonster], player);

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

      expect(demonMonster.hp).toBe(initialHp); // No damage
    });

    it('skips nonliving monsters', () => {
      const effect = new WordOfDeathEffect({ type: 'wordOfDeath' });
      const player = createTestPlayer(25, 25, 30);

      const nonlivingMonster = createTestMonster({
        id: 'golem',
        position: { x: 27, y: 25 },
        maxHp: 50,
        flags: ['NONLIVING'],
      });
      const initialHp = nonlivingMonster.hp;

      const level = createMockLevel([nonlivingMonster], player);

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

      expect(nonlivingMonster.hp).toBe(initialHp); // No damage
    });

    it('only damages living monsters when mixed', () => {
      const effect = new WordOfDeathEffect({ type: 'wordOfDeath' });
      const player = createTestPlayer(25, 25, 20); // damage = 60

      const livingMonster = createTestMonster({
        id: 'living',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: [],
      });
      const undeadMonster = createTestMonster({
        id: 'undead',
        position: { x: 23, y: 25 },
        maxHp: 100,
        flags: ['UNDEAD'],
      });
      const demonMonster = createTestMonster({
        id: 'demon',
        position: { x: 25, y: 27 },
        maxHp: 100,
        flags: ['DEMON'],
      });

      const level = createMockLevel([livingMonster, undeadMonster, demonMonster], player);

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

      expect(livingMonster.hp).toBe(40); // Takes 60 damage
      expect(undeadMonster.hp).toBe(100); // No damage (undead)
      expect(demonMonster.hp).toBe(100); // No damage (demon)
    });
  });

  describe('execute - radius', () => {
    it('skips monsters beyond sight range', () => {
      const effect = new WordOfDeathEffect({ type: 'wordOfDeath' });
      const player = createTestPlayer(25, 25, 30);

      // Near monster
      const nearMonster = createTestMonster({
        id: 'near',
        position: { x: 30, y: 25 }, // Distance 5
        maxHp: 100,
        flags: [],
      });

      // Far monster (beyond MAX_SIGHT = 20)
      const farMonster = createTestMonster({
        id: 'far',
        position: { x: 48, y: 25 }, // Distance 23
        maxHp: 100,
        flags: [],
      });

      const level = createMockLevel([nearMonster, farMonster], player);

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

      expect(nearMonster.hp).toBe(10); // Takes 90 damage
      expect(farMonster.hp).toBe(100); // Too far
    });
  });

  describe('execute - messages', () => {
    it('shows shudder message for surviving monsters', () => {
      const effect = new WordOfDeathEffect({ type: 'wordOfDeath' });
      const player = createTestPlayer(25, 25, 10); // Level 10: damage = 30

      const monster = createTestMonster({
        id: 'm1',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: [],
      });

      const level = createMockLevel([monster], player);

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

      expect(result.messages.some(m => m.includes('shudders'))).toBe(true);
    });

    it('shows nothing happens when no living monsters', () => {
      const effect = new WordOfDeathEffect({ type: 'wordOfDeath' });
      const player = createTestPlayer(25, 25, 30);

      // Only non-living monsters
      const undeadMonster = createTestMonster({
        id: 'undead',
        position: { x: 27, y: 25 },
        maxHp: 50,
        flags: ['UNDEAD'],
      });

      const level = createMockLevel([undeadMonster], player);

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

      expect(result.messages.some(m => m.includes('Nothing') || m.includes('nothing'))).toBe(true);
    });
  });
});
