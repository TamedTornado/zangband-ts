import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { DrainLifeEffect } from '@/core/systems/effects/DrainLifeEffect';
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

describe('DrainLifeEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('construction', () => {
    it('creates effect with specified damage', () => {
      const effect = new DrainLifeEffect({
        type: 'drainLife',
        damage: 100,
        target: 'position',
      });

      expect(effect.damage).toBe(100);
    });

    it('defaults to 0 damage', () => {
      const effect = new DrainLifeEffect({
        type: 'drainLife',
        target: 'position',
      });

      expect(effect.damage).toBe(0);
    });
  });

  describe('canExecute', () => {
    it('returns false without target position', () => {
      const effect = new DrainLifeEffect({
        type: 'drainLife',
        damage: 100,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(false);
    });

    it('returns true with target position', () => {
      const effect = new DrainLifeEffect({
        type: 'drainLife',
        damage: 100,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
      };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute - living monster', () => {
    it('damages living monsters', () => {
      const effect = new DrainLifeEffect({
        type: 'drainLife',
        damage: 30,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(5, 5, 100);
      const level = createMockLevel([monster]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'kobold',
        flags: [], // Living monster - no DEMON, UNDEAD, NONLIVING
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
        getMonsterInfo,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.damageDealt).toBe(30);
      expect(monster.hp).toBe(70); // 100 - 30
    });

    it('kills monster if damage exceeds HP', () => {
      const effect = new DrainLifeEffect({
        type: 'drainLife',
        damage: 100,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(5, 5, 30);
      const level = createMockLevel([monster]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'kobold',
        flags: [],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
        getMonsterInfo,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(monster.isDead).toBe(true);
      expect(result.messages.some(m => m.includes('destroyed') || m.includes('killed'))).toBe(true);
    });
  });

  describe('execute - non-living monsters', () => {
    it('does not affect undead monsters', () => {
      const effect = new DrainLifeEffect({
        type: 'drainLife',
        damage: 50,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(5, 5, 100);
      const level = createMockLevel([monster]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'skeleton',
        flags: ['UNDEAD'],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
        getMonsterInfo,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true); // Effect was cast
      expect(result.damageDealt).toBe(0); // No damage
      expect(monster.hp).toBe(100); // Unchanged
      expect(result.messages[0]).toContain('unaffected');
    });

    it('does not affect demon monsters', () => {
      const effect = new DrainLifeEffect({
        type: 'drainLife',
        damage: 50,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(5, 5, 100);
      const level = createMockLevel([monster]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'imp',
        flags: ['DEMON'],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
        getMonsterInfo,
      };

      const result = effect.execute(context);

      expect(result.damageDealt).toBe(0);
      expect(monster.hp).toBe(100);
    });

    it('does not affect nonliving monsters', () => {
      const effect = new DrainLifeEffect({
        type: 'drainLife',
        damage: 50,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(5, 5, 100);
      const level = createMockLevel([monster]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'golem',
        flags: ['NONLIVING'],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
        getMonsterInfo,
      };

      const result = effect.execute(context);

      expect(result.damageDealt).toBe(0);
      expect(monster.hp).toBe(100);
    });
  });

  describe('execute - no target', () => {
    it('returns failure when no monster at position', () => {
      const effect = new DrainLifeEffect({
        type: 'drainLife',
        damage: 50,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const level = createMockLevel([]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(false);
      expect(result.messages[0]).toContain('nothing');
    });
  });
});
