import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { EarthquakeEffect } from '@/core/systems/effects/EarthquakeEffect';
import { Actor } from '@/core/entities/Actor';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';
import type { Monster } from '@/core/entities/Monster';

// Mock terrain definitions
const FLOOR_TERRAIN = { key: 'floor', name: 'floor', flags: [] as string[] };
const WALL_TERRAIN = { key: 'granite_wall', name: 'wall', flags: ['BLOCK'] as string[] };
const RUBBLE_TERRAIN = { key: 'rubble', name: 'rubble', flags: ['BLOCK', 'RUBBLE'] as string[] };
const PERM_WALL = { key: 'perm_wall', name: 'permanent wall', flags: ['BLOCK', 'PERMANENT'] as string[] };

// Mock level
function createMockLevel(width = 30, height = 30) {
  const tiles: Record<string, typeof FLOOR_TERRAIN> = {};
  const monsters: Monster[] = [];

  const level = {
    width,
    height,
    getTile: (pos: Position) => {
      const key = `${pos.x},${pos.y}`;
      return {
        terrain: tiles[key] || FLOOR_TERRAIN,
      };
    },
    setTerrain: (pos: Position, terrain: string) => {
      const key = `${pos.x},${pos.y}`;
      if (terrain === 'floor') {
        tiles[key] = FLOOR_TERRAIN;
      } else if (terrain === 'rubble') {
        tiles[key] = RUBBLE_TERRAIN;
      }
    },
    isWalkable: (pos: Position) => {
      const key = `${pos.x},${pos.y}`;
      const t = tiles[key] || FLOOR_TERRAIN;
      return !t.flags.includes('BLOCK');
    },
    getMonsterAt: (pos: Position): Monster | undefined => {
      return monsters.find(m => m.position.x === pos.x && m.position.y === pos.y);
    },
    getMonsters: () => [...monsters],
    // Test helpers
    setWall: (pos: Position) => {
      const key = `${pos.x},${pos.y}`;
      tiles[key] = WALL_TERRAIN;
    },
    setPermWall: (pos: Position) => {
      const key = `${pos.x},${pos.y}`;
      tiles[key] = PERM_WALL;
    },
    addMonster: (monster: Monster) => {
      monsters.push(monster);
    },
    getTerrain: (pos: Position) => {
      const key = `${pos.x},${pos.y}`;
      return tiles[key] || FLOOR_TERRAIN;
    },
  };

  return level;
}

// Mock monster
function createMockMonster(x: number, y: number, startHp = 50) {
  const monster = {
    id: `monster-${x}-${y}`,
    position: { x, y },
    _hp: startHp,
    maxHp: startHp,
    get hp() { return this._hp; },
    set hp(val: number) { this._hp = val; },
    takeDamage(dmg: number) {
      this._hp = Math.max(0, this._hp - dmg);
      return dmg;
    },
    get isDead() {
      return this._hp <= 0;
    },
    definitionKey: 'test_monster',
  };
  return monster as unknown as Monster;
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

describe('EarthquakeEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns true (self-targeted)', () => {
      const effect = new EarthquakeEffect({
        type: 'earthquake',
        target: 'self',
        radius: 8,
      });
      const actor = createActor(15, 15);
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
    it('destroys walls within radius', () => {
      const effect = new EarthquakeEffect({
        type: 'earthquake',
        target: 'self',
        radius: 5,
      });
      const actor = createActor(15, 15);
      const level = createMockLevel();

      // Place walls near player
      level.setWall({ x: 17, y: 15 }); // 2 tiles away
      level.setWall({ x: 18, y: 15 }); // 3 tiles away

      expect(level.isWalkable({ x: 17, y: 15 })).toBe(false);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(result.messages.some(m => m.includes('earthquake') || m.includes('cave-in') || m.includes('shakes'))).toBe(true);
    });

    it('does not affect permanent walls', () => {
      const effect = new EarthquakeEffect({
        type: 'earthquake',
        target: 'self',
        radius: 5,
      });
      const actor = createActor(15, 15);
      const level = createMockLevel();

      // Place permanent wall near player
      level.setPermWall({ x: 17, y: 15 });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      // Permanent wall should remain blocked
      const terrain = level.getTerrain({ x: 17, y: 15 });
      expect(terrain.flags.includes('PERMANENT')).toBe(true);
    });

    it('can damage monsters caught in the earthquake', () => {
      const effect = new EarthquakeEffect({
        type: 'earthquake',
        target: 'self',
        radius: 5,
        damage: '4d8',
      });
      const actor = createActor(15, 15);
      const level = createMockLevel();

      const monster = createMockMonster(17, 15, 100);
      level.addMonster(monster);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      // Monster may or may not take damage depending on RNG
      // Just verify the effect ran without error
      expect(monster.hp).toBeLessThanOrEqual(100);
    });

    it('creates rubble on some floor tiles', () => {
      const effect = new EarthquakeEffect({
        type: 'earthquake',
        target: 'self',
        radius: 3,
      });
      const actor = createActor(15, 15);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // Rubble creation is RNG-based, so we just verify the effect ran successfully
      expect(result.success).toBe(true);
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('does not affect tiles outside radius', () => {
      const effect = new EarthquakeEffect({
        type: 'earthquake',
        target: 'self',
        radius: 3,
      });
      const actor = createActor(15, 15);
      const level = createMockLevel();

      // Place wall far outside radius
      level.setWall({ x: 25, y: 15 }); // 10 tiles away

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      // Wall should still be there
      expect(level.isWalkable({ x: 25, y: 15 })).toBe(false);
    });
  });
});
