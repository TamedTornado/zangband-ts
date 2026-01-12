import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { TameMonsterEffect } from '@/core/systems/effects/TameMonsterEffect';
import { Actor } from '@/core/entities/Actor';
import { Monster } from '@/core/entities/Monster';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext, MonsterInfo } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';
import { createTestMonsterDef, createTestActor } from './testHelpers';

// Mock level with monsters
function createMockLevel(monsters: Monster[] = [], width = 50, height = 50) {
  return {
    width,
    height,
    getMonsterAt: (pos: Position) => {
      return monsters.find(m => m.position.x === pos.x && m.position.y === pos.y);
    },
    getMonsters: () => [...monsters],
    isWalkable: (_pos: Position) => true,
    isOccupied: (pos: Position) => {
      return monsters.some(m => m.position.x === pos.x && m.position.y === pos.y);
    },
  };
}

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

function createMonster(x: number, y: number, flags: string[] = []): Monster {
  const def = createTestMonsterDef({ key: 'orc', name: 'Orc', flags });
  return new Monster({
    id: `monster-${x}-${y}`,
    position: { x, y },
    symbol: 'o',
    color: '#0f0',
    def,
    maxHp: 50,
    speed: 110,
  });
}

describe('TameMonsterEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns false without target position', () => {
      const effect = new TameMonsterEffect({
        type: 'tameMonster',
        target: 'position',
      });
      const context: GPEffectContext = {
        actor: createActor(10, 10),
        level: createMockLevel() as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(false);
    });

    it('returns true with target position', () => {
      const effect = new TameMonsterEffect({
        type: 'tameMonster',
        target: 'position',
      });
      const context: GPEffectContext = {
        actor: createActor(10, 10),
        level: createMockLevel() as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute', () => {
    it('reports nothing when position is empty', () => {
      const effect = new TameMonsterEffect({
        type: 'tameMonster',
        target: 'position',
      });
      const context: GPEffectContext = {
        actor: createActor(10, 10),
        level: createMockLevel() as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(result.messages[0].toLowerCase()).toContain('nothing');
    });

    it('tames a normal monster', () => {
      const monster = createMonster(12, 10);
      const level = createMockLevel([monster]);

      const effect = new TameMonsterEffect({
        type: 'tameMonster',
        target: 'position',
      });

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'Orc',
        flags: [],
      });

      const context: GPEffectContext = {
        actor: createActor(10, 10),
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
        getMonsterInfo,
      };

      expect(monster.isTamed).toBe(false);
      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(monster.isTamed).toBe(true);
      expect(result.messages.some(m => m.includes('Orc'))).toBe(true);
    });

    it('does not tame unique monsters', () => {
      // Create a UNIQUE monster - uses def.flags now instead of getMonsterInfo
      const monster = createMonster(12, 10, ['UNIQUE']);
      const level = createMockLevel([monster]);

      const effect = new TameMonsterEffect({
        type: 'tameMonster',
        target: 'position',
      });

      const context: GPEffectContext = {
        actor: createActor(10, 10),
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      expect(monster.isTamed).toBe(false);
      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(monster.isTamed).toBe(false);
      expect(result.messages[0]).toContain('unaffected');
    });

    it('does not tame dead monsters', () => {
      const monster = createMonster(12, 10);
      monster.takeDamage(1000); // Kill it
      const level = createMockLevel([monster]);

      const effect = new TameMonsterEffect({
        type: 'tameMonster',
        target: 'position',
      });

      const context: GPEffectContext = {
        actor: createActor(10, 10),
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
        getMonsterInfo: () => ({ name: 'Orc', flags: [] }),
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.messages[0].toLowerCase()).toContain('nothing');
    });
  });
});

describe('Monster.isTamed', () => {
  it('starts as false', () => {
    const monster = createMonster(5, 5);
    expect(monster.isTamed).toBe(false);
  });

  it('can be set via tame()', () => {
    const monster = createMonster(5, 5);
    monster.tame();
    expect(monster.isTamed).toBe(true);
  });

  describe('canBeTamed', () => {
    it('returns true for normal monsters', () => {
      const monster = createMonster(5, 5, []);
      expect(monster.canBeTamed()).toBe(true);
    });

    it('returns false for UNIQUE monsters', () => {
      const monster = createMonster(5, 5, ['UNIQUE']);
      expect(monster.canBeTamed()).toBe(false);
    });
  });
});
