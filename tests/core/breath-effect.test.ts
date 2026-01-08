import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { BreathEffect } from '@/core/systems/effects/BreathEffect';
import { Actor } from '@/core/entities/Actor';
import { Monster } from '@/core/entities/Monster';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext, MonsterInfo } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';

// Mock level with monsters
function createMockLevel(monsters: Monster[] = []) {
  const monsterMap = new Map<string, Monster>();
  for (const m of monsters) {
    monsterMap.set(`${m.position.x},${m.position.y}`, m);
  }

  return {
    getMonsterAt: (pos: Position) => monsterMap.get(`${pos.x},${pos.y}`),
    getMonsters: () => monsters.filter(m => !m.isDead),
    getTile: (_pos: Position) => ({ terrain: { flags: [] } }),
  };
}

// Helper to create actor at position
function createActor(x: number, y: number): Actor {
  return new Actor({
    id: `actor-${x}-${y}`,
    position: { x, y },
    symbol: '@',
    color: '#fff',
    maxHp: 100,
    speed: 110,
  });
}

// Helper to create monster at position
function createMonster(x: number, y: number, hp = 50): Monster {
  return new Monster({
    id: `monster-${x}-${y}`,
    position: { x, y },
    symbol: 'r',
    color: '#fff',
    definitionKey: 'giant_white_mouse',
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

describe('BreathEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('construction', () => {
    it('creates breath with specified damage, element, and radius', () => {
      const breath = new BreathEffect({
        type: 'breath',
        damage: 200,
        element: 'fire',
        radius: 3,
        target: 'position',
      });

      expect(breath.damage).toBe(200);
      expect(breath.element).toBe('fire');
      expect(breath.radius).toBe(3);
    });

    it('defaults to magic element', () => {
      const breath = new BreathEffect({
        type: 'breath',
        damage: 100,
        radius: 2,
        target: 'position',
      });

      expect(breath.element).toBe('magic');
    });

    it('defaults to radius 2', () => {
      const breath = new BreathEffect({
        type: 'breath',
        damage: 100,
        target: 'position',
      });

      expect(breath.radius).toBe(2);
    });
  });

  describe('canExecute', () => {
    it('returns false without target position', () => {
      const breath = new BreathEffect({ type: 'breath', damage: 100, radius: 2, target: 'position' });
      const actor = createActor(0, 0);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      expect(breath.canExecute(context)).toBe(false);
    });

    it('returns true with target position', () => {
      const breath = new BreathEffect({ type: 'breath', damage: 100, radius: 2, target: 'position' });
      const actor = createActor(0, 0);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 0 },
      };

      expect(breath.canExecute(context)).toBe(true);
    });
  });

  describe('execute - cone shape', () => {
    it('hits monster directly in line of breath', () => {
      const breath = new BreathEffect({
        type: 'breath',
        damage: 100,
        element: 'fire',
        radius: 2,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(5, 0, 200); // Directly in line
      const level = createMockLevel([monster]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 10, y: 0 },
        getMonsterInfo,
      };

      const result = breath.execute(context);

      expect(result.success).toBe(true);
      expect(monster.hp).toBeLessThan(200);
    });

    it('hits monsters in expanding cone', () => {
      const breath = new BreathEffect({
        type: 'breath',
        damage: 50,
        element: 'fire',
        radius: 3,
        target: 'position',
      });
      const actor = createActor(0, 0);
      // Monster at distance 6, offset by 1 - should be in cone
      // Cone width at distance 6 with radius 3 targeting distance 10:
      // width = (3 * 6) / 10 = 1.8, so offset of 1 should be hit
      const monsterInCone = createMonster(6, 1, 100);
      // Monster at distance 6, offset by 3 - should be outside cone
      const monsterOutside = createMonster(6, 3, 100);
      const level = createMockLevel([monsterInCone, monsterOutside]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 10, y: 0 },
        getMonsterInfo,
      };

      breath.execute(context);

      expect(monsterInCone.hp).toBeLessThan(100);
      expect(monsterOutside.hp).toBe(100); // Not hit
    });

    it('cone is narrow near caster and wide near target', () => {
      const breath = new BreathEffect({
        type: 'breath',
        damage: 50,
        element: 'fire',
        radius: 3,
        target: 'position',
      });
      const actor = createActor(0, 0);
      // Near caster (distance 2), offset 1 - should NOT be hit (cone too narrow)
      const monsterNear = createMonster(2, 1, 100);
      // Near target (distance 8), offset 2 - should be hit (cone is wider)
      const monsterFar = createMonster(8, 2, 100);
      const level = createMockLevel([monsterNear, monsterFar]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 10, y: 0 },
        getMonsterInfo,
      };

      breath.execute(context);

      // Near caster, cone width = (3 * 2) / 10 = 0.6, so offset 1 is outside
      expect(monsterNear.hp).toBe(100);
      // Near target, cone width = (3 * 8) / 10 = 2.4, so offset 2 is inside
      expect(monsterFar.hp).toBeLessThan(100);
    });
  });

  describe('execute - damage', () => {
    it('applies full damage to monsters in cone', () => {
      const breath = new BreathEffect({
        type: 'breath',
        damage: 100,
        element: 'fire',
        radius: 2,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(5, 0, 200);
      const level = createMockLevel([monster]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 10, y: 0 },
        getMonsterInfo,
      };

      const result = breath.execute(context);

      expect(result.damageDealt).toBe(100);
      expect(monster.hp).toBe(100); // 200 - 100
    });

    it('kills monster when damage exceeds HP', () => {
      const breath = new BreathEffect({
        type: 'breath',
        damage: 100,
        element: 'fire',
        radius: 2,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(5, 0, 10);
      const level = createMockLevel([monster]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 10, y: 0 },
        getMonsterInfo,
      };

      const result = breath.execute(context);

      expect(monster.isDead).toBe(true);
      expect(result.messages.some(m => m.includes('destroyed'))).toBe(true);
    });

    it('hits multiple monsters in cone', () => {
      const breath = new BreathEffect({
        type: 'breath',
        damage: 50,
        element: 'fire',
        radius: 2,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster1 = createMonster(3, 0, 100);
      const monster2 = createMonster(6, 0, 100);
      const monster3 = createMonster(9, 0, 100);
      const level = createMockLevel([monster1, monster2, monster3]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 10, y: 0 },
        getMonsterInfo,
      };

      const result = breath.execute(context);

      expect(monster1.hp).toBeLessThan(100);
      expect(monster2.hp).toBeLessThan(100);
      expect(monster3.hp).toBeLessThan(100);
      expect(result.damageDealt).toBe(150); // 50 * 3
    });
  });

  describe('execute - diagonal breath', () => {
    it('works with diagonal targeting', () => {
      const breath = new BreathEffect({
        type: 'breath',
        damage: 100,
        element: 'cold',
        radius: 2,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(5, 5, 200); // On diagonal
      const level = createMockLevel([monster]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 10, y: 10 },
        getMonsterInfo,
      };

      breath.execute(context);

      expect(monster.hp).toBeLessThan(200);
    });
  });

  describe('execute - resistance integration', () => {
    it('respects monster resistances', () => {
      const breath = new BreathEffect({
        type: 'breath',
        damage: 90,
        element: 'fire',
        radius: 2,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(5, 0, 100);
      const level = createMockLevel([monster]);

      const getFireImmuneInfo = (_m: Monster): MonsterInfo => ({
        name: 'fire elemental',
        flags: ['IM_FIRE'],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 10, y: 0 },
        getMonsterInfo: getFireImmuneInfo,
      };

      const result = breath.execute(context);

      // 90 / 9 = 10 damage
      expect(result.damageDealt).toBe(10);
      expect(result.messages[0]).toContain('resists a lot');
    });
  });

  describe('execute - no targets', () => {
    it('returns success with message when no monsters hit', () => {
      const breath = new BreathEffect({
        type: 'breath',
        damage: 100,
        element: 'fire',
        radius: 2,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const level = createMockLevel([]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 10, y: 0 },
      };

      const result = breath.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(result.messages[0]).toContain('fire');
      expect(result.messages[0]).toContain('breath');
    });
  });
});
