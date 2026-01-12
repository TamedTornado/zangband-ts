import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { BeamEffect } from '@/core/systems/effects/BeamEffect';
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

describe('BeamEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('construction', () => {
    it('creates beam with specified damage and element', () => {
      const beam = new BeamEffect({
        type: 'beam',
        damage: '6d8',
        element: 'gravity',
        target: 'position',
      });

      expect(beam.damage).toBe('6d8');
      expect(beam.element).toBe('gravity');
    });

    it('defaults to magic element', () => {
      const beam = new BeamEffect({
        type: 'beam',
        damage: '2d6',
        target: 'position',
      });

      expect(beam.element).toBe('magic');
    });

    it('defaults to 1d1 damage', () => {
      const beam = new BeamEffect({
        type: 'beam',
        target: 'position',
      });

      expect(beam.damage).toBe('1d1');
    });
  });

  describe('canExecute', () => {
    it('returns false without target position', () => {
      const beam = new BeamEffect({ type: 'beam', damage: '2d6', target: 'position' });
      const actor = createActor(0, 0);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      expect(beam.canExecute(context)).toBe(false);
    });

    it('returns true with target position', () => {
      const beam = new BeamEffect({ type: 'beam', damage: '2d6', target: 'position' });
      const actor = createActor(0, 0);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
      };

      expect(beam.canExecute(context)).toBe(true);
    });
  });

  describe('execute - hit nothing', () => {
    it('returns miss message when no monster in path', () => {
      const beam = new BeamEffect({
        type: 'beam',
        damage: '2d6',
        element: 'light',
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

      const result = beam.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(result.messages[0]).toContain('hits nothing');
    });

    it('stops at wall', () => {
      const beam = new BeamEffect({
        type: 'beam',
        damage: '2d6',
        element: 'gravity',
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

      const result = beam.execute(context);

      // Should not hit the monster behind the wall
      expect(result.messages[0]).toContain('hits nothing');
      expect(monster.hp).toBe(50); // Unchanged
    });
  });

  describe('execute - hit single monster', () => {
    it('hits monster in path and deals damage', () => {
      const beam = new BeamEffect({
        type: 'beam',
        damage: '2d6',
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
      const result = beam.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(monster.hp).toBeLessThan(initialHp);
      expect(result.damageDealt).toBeGreaterThan(0);
      expect(result.messages[0]).toContain('test monster');
    });
  });

  describe('execute - hit multiple monsters (beam pierces)', () => {
    it('hits ALL monsters in path, not just the first', () => {
      const beam = new BeamEffect({
        type: 'beam',
        damage: '10d1', // 10 damage guaranteed per hit
        element: 'magic',
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster1 = createMonster(2, 0, 50);
      const monster2 = createMonster(4, 0, 50);
      const monster3 = createMonster(6, 0, 50);
      const level = createMockLevel([monster1, monster2, monster3]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 8, y: 0 },
        getMonsterInfo,
      };

      const result = beam.execute(context);

      // ALL monsters should be hit
      expect(monster1.hp).toBe(40); // 50 - 10
      expect(monster2.hp).toBe(40);
      expect(monster3.hp).toBe(40);
      // Total damage dealt = 30
      expect(result.damageDealt).toBe(30);
      // Should have messages for each monster hit
      expect(result.messages.length).toBeGreaterThanOrEqual(3);
    });

    it('kills multiple monsters if damage exceeds their HP', () => {
      const beam = new BeamEffect({
        type: 'beam',
        damage: '100d1', // 100 damage guaranteed
        element: 'magic',
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster1 = createMonster(2, 0, 10);
      const monster2 = createMonster(4, 0, 10);
      const level = createMockLevel([monster1, monster2]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 6, y: 0 },
        getMonsterInfo,
      };

      const result = beam.execute(context);

      expect(monster1.isDead).toBe(true);
      expect(monster2.isDead).toBe(true);
      expect(result.messages.some(m => m.includes('destroyed'))).toBe(true);
    });
  });

  describe('execute - diagonal path', () => {
    it('traces diagonal path and hits all monsters', () => {
      const beam = new BeamEffect({
        type: 'beam',
        damage: '5d1',
        element: 'magic',
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster1 = createMonster(2, 2, 50);
      const monster2 = createMonster(4, 4, 50);
      const level = createMockLevel([monster1, monster2]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 6, y: 6 },
        getMonsterInfo,
      };

      beam.execute(context);

      expect(monster1.hp).toBe(45); // Hit
      expect(monster2.hp).toBe(45); // Also hit
    });
  });

  describe('execute - resistance integration', () => {
    it('applies resistance to each monster individually', () => {
      const beam = new BeamEffect({
        type: 'beam',
        damage: '18d1', // 18 damage
        element: 'fire',
        target: 'position',
      });
      const actor = createActor(0, 0);
      // First monster has fire immunity (takes 1/9 damage = 2)
      const monster1 = createMonster(2, 0, 50, ['IM_FIRE']);
      // Second monster has no resistance (takes full 18)
      const monster2 = createMonster(4, 0, 50, []);
      const level = createMockLevel([monster1, monster2]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 6, y: 0 },
      };

      beam.execute(context);

      // Monster with immunity takes much less damage
      expect(monster1.hp).toBe(48); // 50 - 2 (18/9)
      // Monster without resistance takes full damage
      expect(monster2.hp).toBe(32); // 50 - 18
    });
  });

  describe('execute - level-based damage formula', () => {
    it('supports level+bonus in damage formula', () => {
      const beam = new BeamEffect({
        type: 'beam',
        damage: '9d8+level', // level is added as bonus
        element: 'gravity',
        target: 'position',
      });
      const actor = createActor(0, 0);
      (actor as any).level = 20; // Set actor level
      const monster = createMonster(3, 0, 200);
      const level = createMockLevel([monster]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 0 },
        getMonsterInfo,
      };

      const result = beam.execute(context);

      // Damage should include the level bonus
      expect(result.success).toBe(true);
      expect(result.damageDealt).toBeGreaterThan(0);
    });
  });
});
