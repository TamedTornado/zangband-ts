import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { BoltEffect } from '@/core/systems/effects/BoltEffect';
import { Actor } from '@/core/entities/Actor';
import { Monster } from '@/core/entities/Monster';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext, MonsterInfo } from '@/core/systems/effects/GPEffect';
import { createTestMonsterDef, createMockLevel, createTestActor } from './testHelpers';

// Helper to create actor at position
function createActor(x: number, y: number): Actor {
  return createTestActor({
    id: `actor-${x}-${y}`,
    position: { x, y },
    symbol: '@',
    color: '#fff',
    maxHp: 100,
    speed: 110,
  });
}

// Helper to create monster at position
function createMonster(x: number, y: number, hp = 50, flags: string[] = []): Monster {
  const def = createTestMonsterDef({ key: 'test_monster', name: 'test monster', flags });
  return new Monster({
    id: `monster-${x}-${y}`,
    position: { x, y },
    symbol: 'r',
    color: '#fff',
    def,
    maxHp: hp,
    speed: 110,
  });
}

// Helper to get monster info
function getMonsterInfo(_monster: Monster): MonsterInfo {
  return {
    name: 'test monster',
    flags: [],
  };
}

describe('BoltEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('construction', () => {
    it('creates bolt with specified dice and element', () => {
      const bolt = new BoltEffect({
        type: 'bolt',
        dice: '6d8',
        element: 'fire',
        target: 'position',
      });

      expect(bolt.dice).toBe('6d8');
      expect(bolt.element).toBe('fire');
    });

    it('defaults to magic element', () => {
      const bolt = new BoltEffect({
        type: 'bolt',
        dice: '2d6',
        target: 'position',
      });

      expect(bolt.element).toBe('magic');
    });

    it('defaults to 1d1 dice', () => {
      const bolt = new BoltEffect({
        type: 'bolt',
        target: 'position',
      });

      expect(bolt.dice).toBe('1d1');
    });
  });

  describe('canExecute', () => {
    it('returns false without target position', () => {
      const bolt = new BoltEffect({ type: 'bolt', dice: '2d6', target: 'position' });
      const actor = createActor(0, 0);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      expect(bolt.canExecute(context)).toBe(false);
    });

    it('returns true with target position', () => {
      const bolt = new BoltEffect({ type: 'bolt', dice: '2d6', target: 'position' });
      const actor = createActor(0, 0);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
      };

      expect(bolt.canExecute(context)).toBe(true);
    });
  });

  describe('execute - hit nothing', () => {
    it('returns miss message when no monster in path', () => {
      const bolt = new BoltEffect({
        type: 'bolt',
        dice: '2d6',
        element: 'fire',
        target: 'position',
      });
      const actor = createActor(0, 0);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 0 },
      };

      const result = bolt.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(result.messages[0]).toContain('fire bolt hits nothing');
    });

    it('stops at wall', () => {
      const bolt = new BoltEffect({
        type: 'bolt',
        dice: '2d6',
        element: 'cold',
        target: 'position',
      });
      const actor = createActor(0, 0);
      // Monster is at x=15, but wall at x=10 should block
      const monster = createMonster(15, 0);
      const level = createMockLevel([monster], null, { walls: [{ x: 10, y: 0 }] });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 15, y: 0 },
        getMonsterInfo,
      };

      const result = bolt.execute(context);

      // Should not hit the monster behind the wall
      expect(result.messages[0]).toContain('bolt hits nothing');
      expect(monster.hp).toBe(50); // Unchanged
    });
  });

  describe('execute - hit monster', () => {
    it('hits first monster in path and deals damage', () => {
      const bolt = new BoltEffect({
        type: 'bolt',
        dice: '2d6',
        element: 'magic',
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(3, 0);
      const level = createMockLevel([monster]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 0 },
        getMonsterInfo,
      };

      const initialHp = monster.hp;
      const result = bolt.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(monster.hp).toBeLessThan(initialHp);
      expect(result.damageDealt).toBeGreaterThan(0);
      expect(result.messages[0]).toContain('test monster');
    });

    it('hits first monster even if target is behind', () => {
      const bolt = new BoltEffect({
        type: 'bolt',
        dice: '2d6',
        element: 'magic',
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster1 = createMonster(2, 0);
      const monster2 = createMonster(4, 0);
      const level = createMockLevel([monster1, monster2]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 4, y: 0 }, // Targeting monster2
        getMonsterInfo,
      };

      bolt.execute(context);

      // Should hit monster1 (first in path)
      expect(monster1.hp).toBeLessThan(50);
      expect(monster2.hp).toBe(50); // Unchanged
    });

    it('skips the caster position', () => {
      const bolt = new BoltEffect({
        type: 'bolt',
        dice: '2d6',
        element: 'magic',
        target: 'position',
      });
      const actor = createActor(0, 0);
      // Can't put a monster on the caster, but we can verify it traces from actor
      const monster = createMonster(1, 0);
      const level = createMockLevel([monster]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 3, y: 0 },
        getMonsterInfo,
      };

      bolt.execute(context);

      expect(monster.hp).toBeLessThan(50);
    });

    it('kills monster if damage exceeds HP', () => {
      const bolt = new BoltEffect({
        type: 'bolt',
        dice: '100d1', // 100 damage guaranteed
        element: 'magic',
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(2, 0, 10); // Only 10 HP
      const level = createMockLevel([monster]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 0 },
        getMonsterInfo,
      };

      const result = bolt.execute(context);

      expect(monster.isDead).toBe(true);
      expect(result.messages.some(m => m.includes('destroyed'))).toBe(true);
    });
  });

  describe('execute - diagonal path', () => {
    it('traces diagonal path correctly', () => {
      const bolt = new BoltEffect({
        type: 'bolt',
        dice: '2d6',
        element: 'magic',
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(3, 3);
      const level = createMockLevel([monster]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
        getMonsterInfo,
      };

      bolt.execute(context);

      expect(monster.hp).toBeLessThan(50);
    });
  });

  describe('execute - resistance integration', () => {
    it('reports resistance status from damage system', () => {
      const bolt = new BoltEffect({
        type: 'bolt',
        dice: '10d6',
        element: 'fire',
        target: 'position',
      });
      const actor = createActor(0, 0);
      // Create monster with fire immunity flag in its definition
      const monster = createMonster(2, 0, 50, ['IM_FIRE']);
      const level = createMockLevel([monster]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 0 },
      };

      const result = bolt.execute(context);

      // Damage should be severely reduced (1/9)
      expect(result.damageDealt).toBeLessThan(10); // 10d6 avg ~35, /9 = ~4
      expect(result.messages[0]).toContain('resists a lot');
    });

    it('reports vulnerability from damage system', () => {
      const bolt = new BoltEffect({
        type: 'bolt',
        dice: '5d1', // 5 damage
        element: 'fire',
        target: 'position',
      });
      const actor = createActor(0, 0);
      // Create monster with fire vulnerability flag in its definition
      const monster = createMonster(2, 0, 100, ['HURT_FIRE']);
      const level = createMockLevel([monster]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 0 },
      };

      const result = bolt.execute(context);

      // Damage should be doubled
      expect(result.damageDealt).toBe(10); // 5 * 2
      expect(result.messages[0]).toContain('hit hard');
    });
  });
});
