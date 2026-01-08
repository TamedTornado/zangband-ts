import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { HavocEffect } from '@/core/systems/effects/HavocEffect';
import { Actor } from '@/core/entities/Actor';
import { Monster } from '@/core/entities/Monster';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext, MonsterInfo } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';

// Mock level
function createMockLevel(monsters: Monster[] = [], width = 100, height = 100) {
  return {
    width,
    height,
    getMonsterAt: (pos: Position) => {
      return monsters.find(m => m.position.x === pos.x && m.position.y === pos.y);
    },
    getMonsters: () => [...monsters],
    getMonstersInRadius: (center: Position, radius: number) => {
      return monsters.filter(m => {
        const dx = m.position.x - center.x;
        const dy = m.position.y - center.y;
        return Math.sqrt(dx * dx + dy * dy) <= radius && !m.isDead;
      });
    },
    isWalkable: (pos: Position) => {
      if (pos.x < 0 || pos.x >= width || pos.y < 0 || pos.y >= height) return false;
      return true;
    },
    isOccupied: (pos: Position) => {
      return monsters.some(m => m.position.x === pos.x && m.position.y === pos.y);
    },
    getTile: (_pos: Position) => ({
      terrain: { flags: [], walkable: true },
    }),
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

function createMonster(x: number, y: number, hp = 100): Monster {
  return new Monster({
    id: `monster-${x}-${y}`,
    position: { x, y },
    symbol: 'o',
    color: '#0f0',
    definitionKey: 'orc',
    maxHp: hp,
    speed: 110,
  });
}

function getMonsterInfo(_monster: Monster): MonsterInfo {
  return {
    name: 'test monster',
    flags: [],
  };
}

describe('HavocEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('construction', () => {
    it('creates effect', () => {
      const effect = new HavocEffect({
        type: 'havoc',
      });

      expect(effect).toBeDefined();
    });
  });

  describe('canExecute', () => {
    it('returns true (self-targeted chaos effect)', () => {
      const effect = new HavocEffect({ type: 'havoc' });
      const actor = createActor(50, 50);
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
    it('executes successfully', () => {
      const effect = new HavocEffect({ type: 'havoc' });
      const actor = createActor(50, 50);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('can damage monsters in various patterns', () => {
      // Test with multiple seeds to hit different chaos patterns
      let totalDamage = 0;

      for (let seed = 1; seed <= 50; seed++) {
        RNG.setSeed(seed);
        const effect = new HavocEffect({ type: 'havoc' });
        const actor = createActor(50, 50);

        // Create monsters around the actor
        const monsters = [
          createMonster(52, 50, 500),  // East
          createMonster(48, 50, 500),  // West
          createMonster(50, 52, 500),  // South
          createMonster(50, 48, 500),  // North
          createMonster(55, 55, 500),  // SE far
        ];
        const level = createMockLevel(monsters);

        const context: GPEffectContext = {
          actor,
          level: level as any,
          rng: RNG,
          getMonsterInfo,
        };

        effect.execute(context);

        // Sum up all damage dealt
        for (const m of monsters) {
          totalDamage += (500 - m.hp);
        }
      }

      // Should have dealt some damage across all executions
      expect(totalDamage).toBeGreaterThan(0);
    });

    it('produces chaos-themed messages', () => {
      const effect = new HavocEffect({ type: 'havoc' });
      const actor = createActor(50, 50);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // Should have a message about chaos
      expect(result.messages.some(m =>
        m.toLowerCase().includes('chaos') ||
        m.toLowerCase().includes('havoc') ||
        m.toLowerCase().includes('unleash')
      )).toBe(true);
    });

    it('produces different effects with different seeds', () => {
      const results: string[] = [];

      for (let seed = 1; seed <= 20; seed++) {
        RNG.setSeed(seed);
        const effect = new HavocEffect({ type: 'havoc' });
        const actor = createActor(50, 50);
        const level = createMockLevel();

        const context: GPEffectContext = {
          actor,
          level: level as any,
          rng: RNG,
        };

        const result = effect.execute(context);
        results.push(result.messages.join('|'));
      }

      // Should have some variety in results
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBeGreaterThan(1);
    });
  });
});
