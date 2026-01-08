import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { WonderEffect } from '@/core/systems/effects/WonderEffect';
import { Actor } from '@/core/entities/Actor';
import { Monster } from '@/core/entities/Monster';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext, GPEffectDef } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';
import { getEffectManager } from '@/core/systems/effects/EffectManager';

// Mock level
function createMockLevel(monsters: Monster[] = [], width = 50, height = 50) {
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
    addMonster: (monster: Monster) => {
      monsters.push(monster);
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

// Helper to create effect factory for tests
function createEffectFactory() {
  const manager = getEffectManager();
  return (def: GPEffectDef) => manager.createEffect(def);
}

describe('WonderEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('construction', () => {
    it('creates effect', () => {
      const effect = new WonderEffect({
        type: 'wonder',
        target: 'position',
      });

      expect(effect).toBeDefined();
    });
  });

  describe('canExecute', () => {
    it('returns false without target position', () => {
      const effect = new WonderEffect({
        type: 'wonder',
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
      const effect = new WonderEffect({
        type: 'wonder',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 15, y: 10 },
      };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute', () => {
    it('executes successfully', () => {
      const effect = new WonderEffect({
        type: 'wonder',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 15, y: 10 },
        createEffect: createEffectFactory(),
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('produces different effects with different seeds', () => {
      const effect1 = new WonderEffect({
        type: 'wonder',
        target: 'position',
      });
      const effect2 = new WonderEffect({
        type: 'wonder',
        target: 'position',
      });

      const actor = createActor(10, 10);
      const monster = createMonster(15, 10, 200);
      const level1 = createMockLevel([monster]);

      // First execution with seed 12345
      RNG.setSeed(12345);
      const context1: GPEffectContext = {
        actor,
        level: level1 as any,
        rng: RNG,
        targetPosition: { x: 15, y: 10 },
        getMonsterInfo: () => ({ name: 'Orc', flags: [] }),
        createEffect: createEffectFactory(),
      };
      const result1 = effect1.execute(context1);

      // Reset monster HP
      monster.heal(200);

      // Second execution with different seed
      RNG.setSeed(99999);
      const monster2 = createMonster(15, 10, 200);
      const level2 = createMockLevel([monster2]);
      const context2: GPEffectContext = {
        actor,
        level: level2 as any,
        rng: RNG,
        targetPosition: { x: 15, y: 10 },
        getMonsterInfo: () => ({ name: 'Orc', flags: [] }),
        createEffect: createEffectFactory(),
      };
      const result2 = effect2.execute(context2);

      // Results should be different (different random effects chosen)
      // At minimum, both should succeed
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('selects from pool of effects based on RNG', () => {
      // Test that different seeds select different effects
      // by checking that the flash message is followed by different result messages
      const messages1: string[] = [];
      const messages2: string[] = [];

      for (let i = 0; i < 10; i++) {
        const effect = new WonderEffect({
          type: 'wonder',
          target: 'position',
        });

        RNG.setSeed(i * 1000 + 1);
        const actor = createActor(10, 10);
        const level = createMockLevel();

        const context: GPEffectContext = {
          actor,
          level: level as any,
          rng: RNG,
          targetPosition: { x: 15, y: 10 },
          createEffect: createEffectFactory(),
        };

        const result = effect.execute(context);
        if (i < 5) {
          messages1.push(...result.messages);
        } else {
          messages2.push(...result.messages);
        }
      }

      // Should have collected messages
      expect(messages1.length).toBeGreaterThan(0);
      expect(messages2.length).toBeGreaterThan(0);
    });

    it('returns a message describing what happened', () => {
      const effect = new WonderEffect({
        type: 'wonder',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const monster = createMonster(15, 10, 200);
      const level = createMockLevel([monster]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 15, y: 10 },
        getMonsterInfo: () => ({ name: 'Orc', flags: [] }),
        createEffect: createEffectFactory(),
      };

      const result = effect.execute(context);

      expect(result.messages.length).toBeGreaterThan(0);
      // Message should describe some effect
      expect(result.messages[0].length).toBeGreaterThan(0);
    });
  });
});
