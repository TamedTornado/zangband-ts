import { describe, it, expect, beforeEach } from 'vitest';
import { createTestActor } from './testHelpers';
import { RNG } from 'rot-js';
import { PolymorphEffect } from '@/core/systems/effects/PolymorphEffect';
import { Actor } from '@/core/entities/Actor';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';
import type { Monster } from '@/core/entities/Monster';

// Mock monster with polymorph capability
function createMockMonster(x: number, y: number, key: string, _isUnique = false) {
  const monster = {
    id: `monster-${x}-${y}`,
    position: { x, y },
    definitionKey: key,
    hp: 50,
    maxHp: 50,
    _polymorphedTo: null as string | null,
    get isDead() { return this.hp <= 0; },
    takeDamage(dmg: number) {
      this.hp = Math.max(0, this.hp - dmg);
      return dmg;
    },
  };
  return monster as unknown as Monster & { _polymorphedTo: string | null };
}

// Mock level
function createMockLevel() {
  const monsters: Array<Monster & { _polymorphedTo: string | null }> = [];

  const level = {
    width: 20,
    height: 20,
    getTile: () => ({ terrain: { key: 'floor', flags: [] } }),
    getMonsterAt: (pos: Position) => {
      return monsters.find(m => m.position.x === pos.x && m.position.y === pos.y);
    },
    getMonsters: () => [...monsters],
    removeMonster: (monster: Monster) => {
      const idx = monsters.indexOf(monster as any);
      if (idx !== -1) monsters.splice(idx, 1);
    },
    addMonster: (monster: Monster) => {
      monsters.push(monster as any);
    },
    // Test helper
    _addMonster: (monster: Monster & { _polymorphedTo: string | null }) => {
      monsters.push(monster);
    },
  };

  return level;
}

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

describe('PolymorphEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns false without target position', () => {
      const effect = new PolymorphEffect({
        type: 'polymorph',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(false);
    });

    it('returns true with target position', () => {
      const effect = new PolymorphEffect({
        type: 'polymorph',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute', () => {
    it('reports no monster when position is empty', () => {
      const effect = new PolymorphEffect({
        type: 'polymorph',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(result.messages.some(m => m.includes('nothing') || m.includes('no monster'))).toBe(true);
    });

    it('reports unique is immune', () => {
      const effect = new PolymorphEffect({
        type: 'polymorph',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();
      const monster = createMockMonster(12, 10, 'unique_monster', true);
      level._addMonster(monster);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
        getMonsterInfo: () => ({ name: 'Unique Boss', flags: ['UNIQUE'] }),
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.messages.some(m => m.includes('unaffected') || m.includes('resist'))).toBe(true);
    });

    it('polymorphs normal monster when polymorphMonster helper is provided', () => {
      const effect = new PolymorphEffect({
        type: 'polymorph',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();
      const monster = createMockMonster(12, 10, 'orc');
      level._addMonster(monster);

      // Track if polymorph was called
      let polymorphCalled = false;

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
        getMonsterInfo: () => ({ name: 'Orc', flags: [] }),
        polymorphMonster: (_m: Monster) => {
          polymorphCalled = true;
          return true;
        },
      } as GPEffectContext & { polymorphMonster: (m: Monster) => boolean };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(polymorphCalled).toBe(true);
      expect(result.messages.some(m => m.includes('change') || m.includes('polymorph'))).toBe(true);
    });

    it('handles monster resisting polymorph', () => {
      const effect = new PolymorphEffect({
        type: 'polymorph',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();
      const monster = createMockMonster(12, 10, 'strong_monster');
      level._addMonster(monster);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
        getMonsterInfo: () => ({ name: 'Strong Monster', flags: ['NO_POLY'] }),
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.messages.some(m => m.includes('unaffected') || m.includes('resist'))).toBe(true);
    });
  });
});
