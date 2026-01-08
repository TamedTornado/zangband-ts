import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { BallEffect } from '@/core/systems/effects/BallEffect';
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
    getMonstersInRadius: (center: Position, radius: number) => {
      const result: Monster[] = [];
      for (const m of monsters) {
        const dx = m.position.x - center.x;
        const dy = m.position.y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius && !m.isDead) {
          result.push(m);
        }
      }
      return result;
    },
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

describe('BallEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('construction', () => {
    it('creates ball with specified damage, element, and radius', () => {
      const ball = new BallEffect({
        type: 'ball',
        damage: 150,
        element: 'fire',
        radius: 2,
        target: 'position',
      });

      expect(ball.damage).toBe(150);
      expect(ball.element).toBe('fire');
      expect(ball.radius).toBe(2);
    });

    it('defaults to magic element', () => {
      const ball = new BallEffect({
        type: 'ball',
        damage: 100,
        radius: 2,
        target: 'position',
      });

      expect(ball.element).toBe('magic');
    });

    it('defaults to radius 2', () => {
      const ball = new BallEffect({
        type: 'ball',
        damage: 100,
        target: 'position',
      });

      expect(ball.radius).toBe(2);
    });

    it('defaults to 0 damage', () => {
      const ball = new BallEffect({
        type: 'ball',
        target: 'position',
      });

      expect(ball.damage).toBe(0);
    });
  });

  describe('canExecute', () => {
    it('returns false without target position', () => {
      const ball = new BallEffect({ type: 'ball', damage: 100, radius: 2, target: 'position' });
      const actor = createActor(0, 0);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      expect(ball.canExecute(context)).toBe(false);
    });

    it('returns true with target position', () => {
      const ball = new BallEffect({ type: 'ball', damage: 100, radius: 2, target: 'position' });
      const actor = createActor(0, 0);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
      };

      expect(ball.canExecute(context)).toBe(true);
    });
  });

  describe('execute - hit nothing', () => {
    it('returns miss message when no monsters in radius', () => {
      const ball = new BallEffect({
        type: 'ball',
        damage: 100,
        element: 'fire',
        radius: 2,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 10, y: 10 },
      };

      const result = ball.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(result.messages[0]).toContain('fire');
      expect(result.messages[0]).toContain('explodes');
    });
  });

  describe('execute - hit single monster', () => {
    it('hits monster at ground zero with full damage', () => {
      const ball = new BallEffect({
        type: 'ball',
        damage: 100,
        element: 'fire',
        radius: 2,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(5, 5, 200);
      const level = createMockLevel([monster]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 }, // Direct hit
        getMonsterInfo,
      };

      const initialHp = monster.hp;
      const result = ball.execute(context);

      expect(result.success).toBe(true);
      expect(monster.hp).toBe(initialHp - 100);
      expect(result.damageDealt).toBe(100);
    });

    it('hits monster at edge of radius with reduced damage', () => {
      const ball = new BallEffect({
        type: 'ball',
        damage: 100,
        element: 'fire',
        radius: 2,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(7, 5, 200); // 2 tiles away from target
      const level = createMockLevel([monster]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
        getMonsterInfo,
      };

      const initialHp = monster.hp;
      ball.execute(context);

      // Damage should be reduced based on distance
      expect(monster.hp).toBeGreaterThan(initialHp - 100);
      expect(monster.hp).toBeLessThan(initialHp);
    });
  });

  describe('execute - hit multiple monsters', () => {
    it('damages all monsters in radius', () => {
      const ball = new BallEffect({
        type: 'ball',
        damage: 50,
        element: 'fire',
        radius: 3,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster1 = createMonster(5, 5, 100); // At center
      const monster2 = createMonster(6, 5, 100); // 1 tile away
      const monster3 = createMonster(7, 5, 100); // 2 tiles away
      const level = createMockLevel([monster1, monster2, monster3]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
        getMonsterInfo,
      };

      const result = ball.execute(context);

      // All monsters should take damage
      expect(monster1.hp).toBeLessThan(100);
      expect(monster2.hp).toBeLessThan(100);
      expect(monster3.hp).toBeLessThan(100);

      // Monster at center takes most damage
      expect(monster1.hp).toBeLessThanOrEqual(monster2.hp);
      expect(monster2.hp).toBeLessThanOrEqual(monster3.hp);

      // Total damage dealt should be sum of all
      expect(result.damageDealt).toBeGreaterThan(50);
    });

    it('does not damage monsters outside radius', () => {
      const ball = new BallEffect({
        type: 'ball',
        damage: 100,
        element: 'fire',
        radius: 2,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monsterInside = createMonster(5, 5, 100);
      const monsterOutside = createMonster(10, 10, 100); // Way outside radius
      const level = createMockLevel([monsterInside, monsterOutside]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
        getMonsterInfo,
      };

      ball.execute(context);

      expect(monsterInside.hp).toBeLessThan(100);
      expect(monsterOutside.hp).toBe(100); // Unchanged
    });
  });

  describe('execute - kills monsters', () => {
    it('kills monster when damage exceeds HP', () => {
      const ball = new BallEffect({
        type: 'ball',
        damage: 100,
        element: 'fire',
        radius: 2,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(5, 5, 10); // Low HP
      const level = createMockLevel([monster]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
        getMonsterInfo,
      };

      const result = ball.execute(context);

      expect(monster.isDead).toBe(true);
      expect(result.messages.some(m => m.includes('destroyed'))).toBe(true);
    });

    it('kills multiple weak monsters', () => {
      const ball = new BallEffect({
        type: 'ball',
        damage: 100,
        element: 'fire',
        radius: 2,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster1 = createMonster(5, 5, 10);
      const monster2 = createMonster(6, 5, 10);
      const level = createMockLevel([monster1, monster2]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
        getMonsterInfo,
      };

      ball.execute(context);

      expect(monster1.isDead).toBe(true);
      expect(monster2.isDead).toBe(true);
    });
  });

  describe('execute - resistance integration', () => {
    it('respects monster resistances', () => {
      const ball = new BallEffect({
        type: 'ball',
        damage: 90, // Will be reduced to 10 by immunity
        element: 'fire',
        radius: 2,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(5, 5, 100);
      const level = createMockLevel([monster]);

      const getFireImmuneInfo = (_m: Monster): MonsterInfo => ({
        name: 'fire elemental',
        flags: ['IM_FIRE'],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
        getMonsterInfo: getFireImmuneInfo,
      };

      const result = ball.execute(context);

      // 90 / 9 = 10 damage
      expect(result.damageDealt).toBe(10);
      expect(result.messages[0]).toContain('resists a lot');
    });

    it('respects monster vulnerabilities', () => {
      const ball = new BallEffect({
        type: 'ball',
        damage: 50,
        element: 'fire',
        radius: 2,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(5, 5, 200);
      const level = createMockLevel([monster]);

      const getVulnerableInfo = (_m: Monster): MonsterInfo => ({
        name: 'ice troll',
        flags: ['HURT_FIRE'],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
        getMonsterInfo: getVulnerableInfo,
      };

      const result = ball.execute(context);

      // 50 * 2 = 100 damage
      expect(result.damageDealt).toBe(100);
      expect(result.messages[0]).toContain('hit hard');
    });
  });

  describe('damage falloff', () => {
    it('reduces damage with distance from center', () => {
      // Test with a larger ball to better see falloff
      const ball = new BallEffect({
        type: 'ball',
        damage: 100,
        element: 'magic',
        radius: 3,
        target: 'position',
      });
      const actor = createActor(0, 0);

      // Create monsters at different distances
      const monsterCenter = createMonster(5, 5, 200);
      const monsterDist1 = createMonster(6, 5, 200);
      const monsterDist2 = createMonster(7, 5, 200);
      const monsterDist3 = createMonster(8, 5, 200);
      const level = createMockLevel([monsterCenter, monsterDist1, monsterDist2, monsterDist3]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
        getMonsterInfo,
      };

      ball.execute(context);

      // Damage should decrease with distance
      const damageCenter = 200 - monsterCenter.hp;
      const damageDist1 = 200 - monsterDist1.hp;
      const damageDist2 = 200 - monsterDist2.hp;
      const damageDist3 = 200 - monsterDist3.hp;

      expect(damageCenter).toBeGreaterThanOrEqual(damageDist1);
      expect(damageDist1).toBeGreaterThanOrEqual(damageDist2);
      expect(damageDist2).toBeGreaterThanOrEqual(damageDist3);
    });
  });
});
