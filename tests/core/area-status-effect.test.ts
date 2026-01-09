import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { AreaStatusEffect } from '@/core/systems/effects/AreaStatusEffect';
import { Actor } from '@/core/entities/Actor';
import { Monster } from '@/core/entities/Monster';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext, MonsterInfo } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';
import { createTestMonsterDef } from './testHelpers';

// Mock level with monsters
function createMockLevel(monsters: Monster[] = []) {
  return {
    getMonsterAt: (pos: Position) => {
      for (const m of monsters) {
        if (m.position.x === pos.x && m.position.y === pos.y) {
          return m;
        }
      }
      return undefined;
    },
    getMonsters: () => monsters.filter(m => !m.isDead),
    getTile: (_pos: Position) => ({ terrain: { flags: [], walkable: true } }),
    width: 100,
    height: 100,
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
function createMonster(x: number, y: number, hp = 50, flags: string[] = []): Monster {
  const def = createTestMonsterDef({ key: 'orc', name: 'orc', flags });
  return new Monster({
    id: `monster-${x}-${y}`,
    position: { x, y },
    symbol: 'o',
    color: '#fff',
    def,
    maxHp: hp,
    speed: 110,
  });
}

describe('AreaStatusEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('construction', () => {
    it('creates effect with specified status and radius', () => {
      const effect = new AreaStatusEffect({
        type: 'areaStatus',
        status: 'slow',
        duration: '20',
        radius: 10,
      });

      expect(effect.statusId).toBe('slow');
      expect(effect.radius).toBe(10);
    });

    it('defaults to radius 20 (MAX_SIGHT)', () => {
      const effect = new AreaStatusEffect({
        type: 'areaStatus',
        status: 'sleeping',
        duration: '50',
      });

      expect(effect.radius).toBe(20);
    });
  });

  describe('execute - affects multiple monsters', () => {
    it('applies status to all monsters in radius', () => {
      const effect = new AreaStatusEffect({
        type: 'areaStatus',
        status: 'slow',
        duration: '20',
        radius: 10,
      });
      const actor = createActor(50, 50);
      const monster1 = createMonster(52, 50); // Distance 2
      const monster2 = createMonster(55, 50); // Distance 5
      const monster3 = createMonster(58, 50); // Distance 8
      const level = createMockLevel([monster1, monster2, monster3]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'orc',
        flags: [],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        getMonsterInfo,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(monster1.statuses.has('slow')).toBe(true);
      expect(monster2.statuses.has('slow')).toBe(true);
      expect(monster3.statuses.has('slow')).toBe(true);
    });

    it('does not affect monsters outside radius', () => {
      const effect = new AreaStatusEffect({
        type: 'areaStatus',
        status: 'slow',
        duration: '20',
        radius: 5,
      });
      const actor = createActor(50, 50);
      const monsterNear = createMonster(52, 50); // Distance 2 - in range
      const monsterFar = createMonster(60, 50); // Distance 10 - out of range
      const level = createMockLevel([monsterNear, monsterFar]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'orc',
        flags: [],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        getMonsterInfo,
      };

      effect.execute(context);

      expect(monsterNear.statuses.has('slow')).toBe(true);
      expect(monsterFar.statuses.has('slow')).toBe(false);
    });

    it('reports count of affected monsters', () => {
      const effect = new AreaStatusEffect({
        type: 'areaStatus',
        status: 'sleeping',
        duration: '50',
        radius: 10,
      });
      const actor = createActor(50, 50);
      const monsters = [
        createMonster(52, 50),
        createMonster(53, 51),
        createMonster(54, 52),
      ];
      const level = createMockLevel(monsters);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'orc',
        flags: [],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        getMonsterInfo,
      };

      const result = effect.execute(context);

      expect(result.messages.some(m => m.includes('3'))).toBe(true);
    });
  });

  describe('execute - resistance', () => {
    it('respects monster resistance flags', () => {
      const effect = new AreaStatusEffect({
        type: 'areaStatus',
        status: 'sleeping',
        duration: '50',
        radius: 10,
      });
      const actor = createActor(50, 50);
      // Normal monster with no flags
      const normalMonster = createMonster(52, 50, 50, []);
      // Resistant monster with NO_SLEEP flag in its def
      const resistantMonster = createMonster(54, 50, 50, ['NO_SLEEP']);
      const level = createMockLevel([normalMonster, resistantMonster]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      expect(normalMonster.statuses.has('sleeping')).toBe(true);
      expect(resistantMonster.statuses.has('sleeping')).toBe(false);
    });
  });

  describe('execute - no targets', () => {
    it('returns success with message when no monsters in range', () => {
      const effect = new AreaStatusEffect({
        type: 'areaStatus',
        status: 'slow',
        duration: '20',
        radius: 10,
      });
      const actor = createActor(50, 50);
      const level = createMockLevel([]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
    });
  });

  describe('execute - sleep monsters', () => {
    it('puts monsters to sleep', () => {
      const effect = new AreaStatusEffect({
        type: 'areaStatus',
        status: 'sleeping',
        duration: '50',
        radius: 20,
      });
      const actor = createActor(50, 50);
      const monster = createMonster(55, 50);
      const level = createMockLevel([monster]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'orc',
        flags: [],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        getMonsterInfo,
      };

      effect.execute(context);

      expect(monster.statuses.has('sleeping')).toBe(true);
    });
  });

  describe('execute - haste monsters (cursed)', () => {
    it('hastes all monsters in range', () => {
      const effect = new AreaStatusEffect({
        type: 'areaStatus',
        status: 'haste',
        duration: '20',
        radius: 20,
      });
      const actor = createActor(50, 50);
      const monster = createMonster(55, 50);
      const level = createMockLevel([monster]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'orc',
        flags: [],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        getMonsterInfo,
      };

      effect.execute(context);

      expect(monster.statuses.has('haste')).toBe(true);
    });
  });
});
