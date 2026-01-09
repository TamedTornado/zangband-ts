import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { SummonEffect } from '@/core/systems/effects/SummonEffect';
import { Actor } from '@/core/entities/Actor';
import { Monster } from '@/core/entities/Monster';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';
import { createTestMonsterDef } from './testHelpers';

// Track added monsters
const addedMonsters: Monster[] = [];

// Mock level
function createMockLevel(existingMonsters: Monster[] = [], width = 50, height = 50) {
  const monsters = [...existingMonsters];
  addedMonsters.length = 0; // Clear tracking

  return {
    width,
    height,
    depth: 10,
    getMonsterAt: (pos: Position) => {
      return monsters.find(m => m.position.x === pos.x && m.position.y === pos.y);
    },
    getMonsters: () => [...monsters],
    addMonster: (monster: Monster) => {
      monsters.push(monster);
      addedMonsters.push(monster);
    },
    isWalkable: (pos: Position) => {
      if (pos.x < 0 || pos.x >= width || pos.y < 0 || pos.y >= height) return false;
      return true;
    },
    isOccupied: (pos: Position) => {
      return monsters.some(m => m.position.x === pos.x && m.position.y === pos.y);
    },
  };
}

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

describe('SummonEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
    addedMonsters.length = 0;
  });

  describe('construction', () => {
    it('creates effect with default count range 1-4', () => {
      const effect = new SummonEffect({
        type: 'summon',
      });

      expect(effect.minCount).toBe(1);
      expect(effect.maxCount).toBe(4);
    });

    it('creates effect with custom count', () => {
      const effect = new SummonEffect({
        type: 'summon',
        minCount: 2,
        maxCount: 6,
      });

      expect(effect.minCount).toBe(2);
      expect(effect.maxCount).toBe(6);
    });
  });

  describe('canExecute', () => {
    it('returns true (self-targeted effect)', () => {
      const effect = new SummonEffect({ type: 'summon' });
      const actor = createActor(25, 25);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute', () => {
    it('spawns monsters near the actor', () => {
      const effect = new SummonEffect({
        type: 'summon',
        minCount: 1,
        maxCount: 1,
      });
      effect.resources = {
        monsterDataManager: {
          getMonstersForDepth: (_depth: number) => [{
            key: 'orc',
            name: 'Orc',
            symbol: 'o',
            color: '#0f0',
            speed: 110,
            hp: '10d10',
            depth: 5,
            flags: [],
          }],
          createMonsterFromDef: (monsterDef: any, pos: Position) => {
            const fullDef = createTestMonsterDef({
              key: monsterDef.key,
              name: monsterDef.name,
              symbol: monsterDef.symbol,
              color: monsterDef.color,
              speed: monsterDef.speed,
            });
            return new Monster({
              id: `summoned-${pos.x}-${pos.y}`,
              position: pos,
              symbol: monsterDef.symbol,
              color: monsterDef.color,
              def: fullDef,
              maxHp: 50,
              speed: monsterDef.speed,
            });
          },
        } as any,
      };

      const actor = createActor(25, 25);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(addedMonsters.length).toBe(1);

      // Monster should be within 2 tiles of actor
      const monster = addedMonsters[0];
      const dx = Math.abs(monster.position.x - actor.position.x);
      const dy = Math.abs(monster.position.y - actor.position.y);
      expect(Math.max(dx, dy)).toBeLessThanOrEqual(2);
    });

    it('spawns multiple monsters', () => {
      const effect = new SummonEffect({
        type: 'summon',
        minCount: 3,
        maxCount: 3,
      });
      effect.resources = {
        monsterDataManager: {
          getMonstersForDepth: (_depth: number) => [{
            key: 'orc',
            name: 'Orc',
            symbol: 'o',
            color: '#0f0',
            speed: 110,
            hp: '10d10',
            depth: 5,
            flags: [],
          }],
          createMonsterFromDef: (monsterDef: any, pos: Position) => {
            const fullDef = createTestMonsterDef({
              key: monsterDef.key,
              name: monsterDef.name,
              symbol: monsterDef.symbol,
              color: monsterDef.color,
              speed: monsterDef.speed,
            });
            return new Monster({
              id: `summoned-${pos.x}-${pos.y}-${Math.random()}`,
              position: pos,
              symbol: monsterDef.symbol,
              color: monsterDef.color,
              def: fullDef,
              maxHp: 50,
              speed: monsterDef.speed,
            });
          },
        } as any,
      };

      const actor = createActor(25, 25);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      expect(addedMonsters.length).toBe(3);
    });

    it('spawns awakened hostile monsters', () => {
      const effect = new SummonEffect({
        type: 'summon',
        minCount: 1,
        maxCount: 1,
      });
      effect.resources = {
        monsterDataManager: {
          getMonstersForDepth: (_depth: number) => [{
            key: 'orc',
            name: 'Orc',
            symbol: 'o',
            color: '#0f0',
            speed: 110,
            hp: '10d10',
            depth: 5,
            flags: [],
          }],
          createMonsterFromDef: (monsterDef: any, pos: Position) => {
            const fullDef = createTestMonsterDef({
              key: monsterDef.key,
              name: monsterDef.name,
              symbol: monsterDef.symbol,
              color: monsterDef.color,
              speed: monsterDef.speed,
            });
            return new Monster({
              id: `summoned-${pos.x}-${pos.y}`,
              position: pos,
              symbol: monsterDef.symbol,
              color: monsterDef.color,
              def: fullDef,
              maxHp: 50,
              speed: monsterDef.speed,
            });
          },
        } as any,
      };

      const actor = createActor(25, 25);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      const monster = addedMonsters[0];
      expect(monster.isAwake).toBe(true);
      expect(monster.isTamed).toBe(false);
    });

    it('does not spawn on occupied tiles', () => {
      const effect = new SummonEffect({
        type: 'summon',
        minCount: 1,
        maxCount: 1,
      });
      effect.resources = {
        monsterDataManager: {
          getMonstersForDepth: (_depth: number) => [{
            key: 'orc',
            name: 'Orc',
            symbol: 'o',
            color: '#0f0',
            speed: 110,
            hp: '10d10',
            depth: 5,
            flags: [],
          }],
          createMonsterFromDef: (monsterDef: any, pos: Position) => {
            const fullDef = createTestMonsterDef({
              key: monsterDef.key,
              name: monsterDef.name,
              symbol: monsterDef.symbol,
              color: monsterDef.color,
              speed: monsterDef.speed,
            });
            return new Monster({
              id: `summoned-${pos.x}-${pos.y}`,
              position: pos,
              symbol: monsterDef.symbol,
              color: monsterDef.color,
              def: fullDef,
              maxHp: 50,
              speed: monsterDef.speed,
            });
          },
        } as any,
      };

      const actor = createActor(25, 25);
      // Surround player with existing monsters
      const existingMonsters: Monster[] = [];
      const blockerDef = createTestMonsterDef({ key: 'blocker', name: 'blocker' });
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          if (dx === 0 && dy === 0) continue; // Skip player position
          existingMonsters.push(new Monster({
            id: `blocker-${dx}-${dy}`,
            position: { x: 25 + dx, y: 25 + dy },
            symbol: 'X',
            color: '#f00',
            def: blockerDef,
            maxHp: 100,
            speed: 110,
          }));
        }
      }
      const level = createMockLevel(existingMonsters);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // Should still succeed but spawn 0 monsters (no room)
      expect(result.success).toBe(true);
      expect(addedMonsters.length).toBe(0);
    });

    it('returns appropriate message', () => {
      const effect = new SummonEffect({
        type: 'summon',
        minCount: 1,
        maxCount: 1,
      });
      effect.resources = {
        monsterDataManager: {
          getMonstersForDepth: (_depth: number) => [{
            key: 'orc',
            name: 'Orc',
            symbol: 'o',
            color: '#0f0',
            speed: 110,
            hp: '10d10',
            depth: 5,
            flags: [],
          }],
          createMonsterFromDef: (monsterDef: any, pos: Position) => {
            const fullDef = createTestMonsterDef({
              key: monsterDef.key,
              name: monsterDef.name,
              symbol: monsterDef.symbol,
              color: monsterDef.color,
              speed: monsterDef.speed,
            });
            return new Monster({
              id: `summoned-${pos.x}-${pos.y}`,
              position: pos,
              symbol: monsterDef.symbol,
              color: monsterDef.color,
              def: fullDef,
              maxHp: 50,
              speed: monsterDef.speed,
            });
          },
        } as any,
      };

      const actor = createActor(25, 25);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.messages.some(m => m.toLowerCase().includes('appear') || m.toLowerCase().includes('summon'))).toBe(true);
    });
  });
});
