import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { DispelEffect } from '@/core/systems/effects/DispelEffect';
import { Actor } from '@/core/entities/Actor';
import { Monster } from '@/core/entities/Monster';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext, MonsterInfo } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';

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
function createMonster(x: number, y: number, hp = 100): Monster {
  return new Monster({
    id: `monster-${x}-${y}`,
    position: { x, y },
    symbol: 'o',
    color: '#fff',
    definitionKey: 'orc',
    maxHp: hp,
    speed: 110,
  });
}

describe('DispelEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('construction', () => {
    it('creates effect with specified damage and flag', () => {
      const effect = new DispelEffect({
        type: 'dispel',
        damage: '3d6',
        targetFlag: 'EVIL',
        radius: 20,
      });

      expect(effect.damageExpr).toBe('3d6');
      expect(effect.targetFlag).toBe('EVIL');
      expect(effect.radius).toBe(20);
    });

    it('defaults to radius 20 (MAX_SIGHT)', () => {
      const effect = new DispelEffect({
        type: 'dispel',
        damage: '60',
        targetFlag: 'EVIL',
      });

      expect(effect.radius).toBe(20);
    });
  });

  describe('execute - dispel evil', () => {
    it('damages evil monsters in radius', () => {
      const effect = new DispelEffect({
        type: 'dispel',
        damage: '50',
        targetFlag: 'EVIL',
        radius: 10,
      });
      const actor = createActor(50, 50);
      const evilMonster = createMonster(52, 50, 100);
      const level = createMockLevel([evilMonster]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'demon',
        flags: ['EVIL'],
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
      expect(evilMonster.hp).toBe(50); // 100 - 50
    });

    it('does not damage non-evil monsters', () => {
      const effect = new DispelEffect({
        type: 'dispel',
        damage: '50',
        targetFlag: 'EVIL',
        radius: 10,
      });
      const actor = createActor(50, 50);
      const goodMonster = createMonster(52, 50, 100);
      const level = createMockLevel([goodMonster]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'unicorn',
        flags: ['GOOD'],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        getMonsterInfo,
      };

      effect.execute(context);

      expect(goodMonster.hp).toBe(100); // Unchanged
    });

    it('damages multiple evil monsters', () => {
      const effect = new DispelEffect({
        type: 'dispel',
        damage: '30',
        targetFlag: 'EVIL',
        radius: 10,
      });
      const actor = createActor(50, 50);
      const evil1 = createMonster(52, 50, 100);
      const evil2 = createMonster(54, 50, 100);
      const good = createMonster(56, 50, 100);
      const level = createMockLevel([evil1, evil2, good]);

      const getMonsterInfo = (m: Monster): MonsterInfo => {
        if (m === good) {
          return { name: 'angel', flags: ['GOOD'] };
        }
        return { name: 'demon', flags: ['EVIL'] };
      };

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        getMonsterInfo,
      };

      const result = effect.execute(context);

      expect(evil1.hp).toBe(70); // 100 - 30
      expect(evil2.hp).toBe(70); // 100 - 30
      expect(good.hp).toBe(100); // Unchanged
      expect(result.damageDealt).toBe(60); // 30 + 30
    });
  });

  describe('execute - dispel undead', () => {
    it('damages undead monsters', () => {
      const effect = new DispelEffect({
        type: 'dispel',
        damage: '100',
        targetFlag: 'UNDEAD',
        radius: 20,
      });
      const actor = createActor(50, 50);
      const undead = createMonster(55, 50, 150);
      const level = createMockLevel([undead]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'skeleton',
        flags: ['UNDEAD'],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        getMonsterInfo,
      };

      effect.execute(context);

      expect(undead.hp).toBe(50); // 150 - 100
    });
  });

  describe('execute - kills monsters', () => {
    it('kills monster when damage exceeds HP', () => {
      const effect = new DispelEffect({
        type: 'dispel',
        damage: '100',
        targetFlag: 'EVIL',
        radius: 10,
      });
      const actor = createActor(50, 50);
      const weakEvil = createMonster(52, 50, 30);
      const level = createMockLevel([weakEvil]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'imp',
        flags: ['EVIL'],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        getMonsterInfo,
      };

      const result = effect.execute(context);

      expect(weakEvil.isDead).toBe(true);
      expect(result.messages.some(m => m.includes('destroyed'))).toBe(true);
    });
  });

  describe('execute - no targets', () => {
    it('returns success when no monsters in range', () => {
      const effect = new DispelEffect({
        type: 'dispel',
        damage: '50',
        targetFlag: 'EVIL',
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

    it('returns success when no matching monsters in range', () => {
      const effect = new DispelEffect({
        type: 'dispel',
        damage: '50',
        targetFlag: 'EVIL',
        radius: 10,
      });
      const actor = createActor(50, 50);
      const goodMonster = createMonster(52, 50, 100);
      const level = createMockLevel([goodMonster]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'angel',
        flags: ['GOOD'],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        getMonsterInfo,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.damageDealt).toBe(0);
    });
  });

  describe('execute - radius', () => {
    it('does not affect monsters outside radius', () => {
      const effect = new DispelEffect({
        type: 'dispel',
        damage: '50',
        targetFlag: 'EVIL',
        radius: 5,
      });
      const actor = createActor(50, 50);
      const nearEvil = createMonster(52, 50, 100); // Distance 2
      const farEvil = createMonster(60, 50, 100); // Distance 10
      const level = createMockLevel([nearEvil, farEvil]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'demon',
        flags: ['EVIL'],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        getMonsterInfo,
      };

      effect.execute(context);

      expect(nearEvil.hp).toBe(50); // Hit
      expect(farEvil.hp).toBe(100); // Not hit - outside radius
    });
  });

  describe('execute - dispel ALL (Staff of Power)', () => {
    it('damages all monsters regardless of flags when targetFlag is ALL', () => {
      const effect = new DispelEffect({
        type: 'dispel',
        damage: '100',
        targetFlag: 'ALL',
        radius: 20,
      });
      const actor = createActor(50, 50);
      const evilMonster = createMonster(52, 50, 200);
      const goodMonster = createMonster(54, 50, 200);
      const neutralMonster = createMonster(56, 50, 200);
      const level = createMockLevel([evilMonster, goodMonster, neutralMonster]);

      const getMonsterInfo = (m: Monster): MonsterInfo => {
        if (m === evilMonster) return { name: 'demon', flags: ['EVIL'] };
        if (m === goodMonster) return { name: 'unicorn', flags: ['GOOD'] };
        return { name: 'animal', flags: [] };
      };

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        getMonsterInfo,
      };

      const result = effect.execute(context);

      // All monsters should be hit
      expect(evilMonster.hp).toBe(100); // 200 - 100
      expect(goodMonster.hp).toBe(100); // 200 - 100
      expect(neutralMonster.hp).toBe(100); // 200 - 100
      expect(result.damageDealt).toBe(300);
    });

    it('kills weak monsters with high damage dispel all', () => {
      const effect = new DispelEffect({
        type: 'dispel',
        damage: '300',
        targetFlag: 'ALL',
        radius: 20,
      });
      const actor = createActor(50, 50);
      const weakMonster = createMonster(52, 50, 50);
      const strongMonster = createMonster(54, 50, 500);
      const level = createMockLevel([weakMonster, strongMonster]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'creature',
        flags: [],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        getMonsterInfo,
      };

      const result = effect.execute(context);

      expect(weakMonster.isDead).toBe(true);
      expect(strongMonster.hp).toBe(200); // 500 - 300
      expect(result.messages.some(m => m.includes('destroyed'))).toBe(true);
    });
  });
});
