import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { DeathRayEffect } from '@/core/systems/effects/DeathRayEffect';
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

describe('DeathRayEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns false without target position', () => {
      const effect = new DeathRayEffect({ type: 'deathRay', target: 'position' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(false);
    });

    it('returns true with target position', () => {
      const effect = new DeathRayEffect({ type: 'deathRay', target: 'position' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 30, y: 25 },
      };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute - kills normal monsters', () => {
    it('kills normal monster with massive damage', () => {
      const effect = new DeathRayEffect({ type: 'deathRay', target: 'position' });
      const player = createTestPlayer(25, 25, 30); // Level 30: damage = 30 * 50 = 1500

      const monster = createTestMonster({
        id: 'm1',
        position: { x: 27, y: 25 },
        maxHp: 100,
      });

      const level = createMockLevel([monster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 30, y: 25 },
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      // Use a seed that won't trigger resistance
      RNG.setSeed(99999);
      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      // Monster should be dead (damage = 1500, HP = 100)
      expect(monster.isDead).toBe(true);
    });

    it('shows appropriate kill message', () => {
      const effect = new DeathRayEffect({ type: 'deathRay', target: 'position' });
      const player = createTestPlayer(25, 25, 30);

      const monster = createTestMonster({
        id: 'm1',
        position: { x: 27, y: 25 },
        maxHp: 50,
      });

      const level = createMockLevel([monster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 30, y: 25 },
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      RNG.setSeed(99999);
      const result = effect.execute(context);

      expect(result.messages.some(m => m.includes('destroyed') || m.includes('death ray'))).toBe(true);
    });
  });

  describe('execute - immunity cases', () => {
    it('undead monsters are immune', () => {
      const effect = new DeathRayEffect({ type: 'deathRay', target: 'position' });
      const player = createTestPlayer(25, 25, 50);

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
        targetPosition: { x: 30, y: 25 },
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(undeadMonster.hp).toBe(initialHp); // No damage
      expect(result.messages.some(m => m.includes('immune'))).toBe(true);
    });

    it('nonliving monsters are immune', () => {
      const effect = new DeathRayEffect({ type: 'deathRay', target: 'position' });
      const player = createTestPlayer(25, 25, 50);

      const nonlivingMonster = createTestMonster({
        id: 'nonliving',
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
        targetPosition: { x: 30, y: 25 },
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(nonlivingMonster.hp).toBe(initialHp); // No damage
      expect(result.messages.some(m => m.includes('immune'))).toBe(true);
    });
  });

  describe('execute - unique resistance', () => {
    it('unique monsters almost always resist', () => {
      const effect = new DeathRayEffect({ type: 'deathRay', target: 'position' });
      const player = createTestPlayer(25, 25, 50);

      let resisted = 0;
      const trials = 50;

      for (let i = 0; i < trials; i++) {
        RNG.setSeed(i * 1000);

        const uniqueMonster = createTestMonster({
          id: `unique-${i}`,
          position: { x: 27, y: 25 },
          maxHp: 100,
          flags: ['UNIQUE'],
        });
        const initialHp = uniqueMonster.hp;

        const level = createMockLevel([uniqueMonster], player);

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
          targetPosition: { x: 30, y: 25 },
          getMonsterInfo: (m) => ({
            name: m.def.name,
            flags: m.def.flags ?? [],
          }),
        };

        effect.execute(context);

        if (uniqueMonster.hp === initialHp) {
          resisted++;
        }
      }

      // Unique monsters should resist almost always (1/666 chance to hit)
      // With 50 trials, expect ~0 hits
      expect(resisted).toBeGreaterThan(trials * 0.9);
    });
  });

  describe('execute - level-based resistance', () => {
    it('high-level monsters can resist based on level check', () => {
      // Use a low player level so monsters have a chance to resist
      const effect = new DeathRayEffect({ type: 'deathRay', target: 'position' });
      const player = createTestPlayer(25, 25, 5); // Level 5: damage = 250, dam/30 = ~8

      let resisted = 0;
      const trials = 50;

      for (let i = 0; i < trials; i++) {
        RNG.setSeed(i * 1000);

        // Create a high-level monster (level 50 > random(8))
        const monster = createTestMonster({
          id: `monster-${i}`,
          position: { x: 27, y: 25 },
          maxHp: 100,
          // Note: we need to set the monster's level in the def
        });
        // Set monster level via def
        (monster.def as any).level = 50;
        const initialHp = monster.hp;

        const level = createMockLevel([monster], player);

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
          targetPosition: { x: 30, y: 25 },
          getMonsterInfo: (m) => ({
            name: m.def.name,
            flags: m.def.flags ?? [],
            level: (m.def as any).level ?? 10,
          }),
        };

        effect.execute(context);

        if (monster.hp === initialHp) {
          resisted++;
        }
      }

      // High-level monsters (level 50) vs dam/30 = 8 should resist most of the time
      expect(resisted).toBeGreaterThan(trials * 0.8);
    });

    it('low-level monsters rarely resist', () => {
      const effect = new DeathRayEffect({ type: 'deathRay', target: 'position' });
      const player = createTestPlayer(25, 25, 50); // Level 50: damage = 2500, dam/30 = 83

      let killed = 0;
      const trials = 50;

      for (let i = 0; i < trials; i++) {
        RNG.setSeed(i * 1000);

        const monster = createTestMonster({
          id: `monster-${i}`,
          position: { x: 27, y: 25 },
          maxHp: 100,
        });
        // Low-level monster (level 10 << random(83))
        (monster.def as any).level = 10;

        const level = createMockLevel([monster], player);

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
          targetPosition: { x: 30, y: 25 },
          getMonsterInfo: (m) => ({
            name: m.def.name,
            flags: m.def.flags ?? [],
            level: (m.def as any).level ?? 10,
          }),
        };

        effect.execute(context);

        if (monster.isDead) {
          killed++;
        }
      }

      // Low-level monsters should die most of the time
      expect(killed).toBeGreaterThan(trials * 0.8);
    });
  });

  describe('execute - bolt behavior', () => {
    it('hits first monster in path', () => {
      const effect = new DeathRayEffect({ type: 'deathRay', target: 'position' });
      const player = createTestPlayer(25, 25, 30);

      const monster1 = createTestMonster({
        id: 'm1',
        position: { x: 27, y: 25 }, // Closer
        maxHp: 50,
      });
      const monster2 = createTestMonster({
        id: 'm2',
        position: { x: 30, y: 25 }, // Farther
        maxHp: 50,
      });

      const level = createMockLevel([monster1, monster2], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 35, y: 25 },
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      RNG.setSeed(99999);
      effect.execute(context);

      // First monster should be hit, second should not
      expect(monster1.isDead).toBe(true);
      expect(monster2.isDead).toBe(false);
    });

    it('misses if no monster in path', () => {
      const effect = new DeathRayEffect({ type: 'deathRay', target: 'position' });
      const player = createTestPlayer(25, 25, 30);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 30, y: 25 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(result.messages.some(m => m.includes('nothing') || m.includes('miss'))).toBe(true);
    });

    it('stops at walls', () => {
      const effect = new DeathRayEffect({ type: 'deathRay', target: 'position' });
      const player = createTestPlayer(25, 25, 30);

      // Monster behind wall
      const monster = createTestMonster({
        id: 'm1',
        position: { x: 30, y: 25 },
        maxHp: 50,
      });
      const initialHp = monster.hp;

      const level = createMockLevel([monster], player, { walls: [{ x: 28, y: 25 }] });

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 35, y: 25 },
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      effect.execute(context);

      // Monster should not be hit (wall blocks)
      expect(monster.hp).toBe(initialHp);
    });
  });
});
