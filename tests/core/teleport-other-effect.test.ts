import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { TeleportOtherEffect } from '@/core/systems/effects/TeleportOtherEffect';
import { Actor } from '@/core/entities/Actor';
import { Monster } from '@/core/entities/Monster';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext, MonsterInfo } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';

// Mock level with monsters and walkable tiles
function createMockLevel(monsters: Monster[] = [], width = 100, height = 100) {
  return {
    getMonsterAt: (pos: Position) => {
      for (const m of monsters) {
        if (m.position.x === pos.x && m.position.y === pos.y) {
          return m;
        }
      }
      return undefined;
    },
    getTile: (_pos: Position) => ({ terrain: { flags: [], walkable: true } }),
    width,
    height,
    isWalkable: (pos: Position) => {
      if (pos.x < 0 || pos.x >= width || pos.y < 0 || pos.y >= height) return false;
      for (const m of monsters) {
        if (m.position.x === pos.x && m.position.y === pos.y) {
          return false;
        }
      }
      return true;
    },
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

describe('TeleportOtherEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('construction', () => {
    it('creates effect with specified distance', () => {
      const effect = new TeleportOtherEffect({
        type: 'teleportOther',
        distance: 100,
        target: 'position',
      });

      expect(effect.distance).toBe(100);
    });

    it('defaults to distance 45 (MAX_SIGHT * 2 + 5)', () => {
      const effect = new TeleportOtherEffect({
        type: 'teleportOther',
        target: 'position',
      });

      expect(effect.distance).toBe(45);
    });
  });

  describe('canExecute', () => {
    it('returns false without target position', () => {
      const effect = new TeleportOtherEffect({
        type: 'teleportOther',
        distance: 45,
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
      const effect = new TeleportOtherEffect({
        type: 'teleportOther',
        distance: 45,
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

  describe('execute - teleport monster', () => {
    it('teleports monster to new position', () => {
      const effect = new TeleportOtherEffect({
        type: 'teleportOther',
        distance: 20,
        target: 'position',
      });
      const actor = createActor(50, 50);
      const monster = createMonster(51, 50);
      const level = createMockLevel([monster]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'kobold',
        flags: [],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 51, y: 50 },
        getMonsterInfo,
      };

      const originalPos = { ...monster.position };
      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      // Monster should have moved
      expect(monster.position.x !== originalPos.x || monster.position.y !== originalPos.y).toBe(true);
    });

    it('teleports monster at least min distance away', () => {
      const effect = new TeleportOtherEffect({
        type: 'teleportOther',
        distance: 20,
        target: 'position',
      });
      const actor = createActor(50, 50);
      const monster = createMonster(51, 50);
      const level = createMockLevel([monster]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'kobold',
        flags: [],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 51, y: 50 },
        getMonsterInfo,
      };

      const originalPos = { ...monster.position };
      effect.execute(context);

      // Calculate distance from original position
      const dx = monster.position.x - originalPos.x;
      const dy = monster.position.y - originalPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Min distance is distance / 2 = 10
      expect(distance).toBeGreaterThanOrEqual(10);
    });

    it('displays appropriate message', () => {
      const effect = new TeleportOtherEffect({
        type: 'teleportOther',
        distance: 20,
        target: 'position',
      });
      const actor = createActor(50, 50);
      const monster = createMonster(51, 50);
      const level = createMockLevel([monster]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'orc',
        flags: [],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 51, y: 50 },
        getMonsterInfo,
      };

      const result = effect.execute(context);

      expect(result.messages.some(m => m.includes('orc') && m.includes('disappears'))).toBe(true);
    });
  });

  describe('execute - resistance', () => {
    it('does not teleport monsters with RES_TELE flag', () => {
      const effect = new TeleportOtherEffect({
        type: 'teleportOther',
        distance: 45,
        target: 'position',
      });
      const actor = createActor(50, 50);
      const monster = createMonster(51, 50);
      const level = createMockLevel([monster]);

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'ancient dragon',
        flags: ['RES_TELE'],
      });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 51, y: 50 },
        getMonsterInfo,
      };

      const originalPos = { ...monster.position };
      const result = effect.execute(context);

      expect(result.success).toBe(true); // Effect was cast
      expect(result.turnConsumed).toBe(true);
      expect(monster.position).toEqual(originalPos); // Monster didn't move
      expect(result.messages[0]).toContain('unaffected');
    });
  });

  describe('execute - no target', () => {
    it('returns failure when no monster at position', () => {
      const effect = new TeleportOtherEffect({
        type: 'teleportOther',
        distance: 45,
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

    it('returns failure when monster is dead', () => {
      const effect = new TeleportOtherEffect({
        type: 'teleportOther',
        distance: 45,
        target: 'position',
      });
      const actor = createActor(0, 0);
      const monster = createMonster(5, 5, 10);
      monster.takeDamage(100); // Kill it
      const level = createMockLevel([monster]);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 5, y: 5 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(false);
    });
  });
});
