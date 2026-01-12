import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { ExplosiveRuneEffect } from '@/core/systems/effects/ExplosiveRuneEffect';
import { Player } from '@/core/entities/Player';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';
import { createMockLevel } from './testHelpers';

function createMockLevelWithTerrain(width: number, height: number, player: Player) {
  const terrain: Map<string, string> = new Map();

  return {
    width,
    height,
    player,
    getTile: (pos: Position) => ({
      terrain: { key: terrain.get(`${pos.x},${pos.y}`) ?? 'floor', flags: [] },
      explored: false,
    }),
    setTerrain: (pos: Position, terrainKey: string) => {
      terrain.set(`${pos.x},${pos.y}`, terrainKey);
    },
    getMonsters: () => [],
    getActorAt: () => undefined,
    isInBounds: (pos: Position) => pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height,
    getTerrainKey: (pos: Position) => terrain.get(`${pos.x},${pos.y}`) ?? 'floor',
  };
}

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
}

describe('ExplosiveRuneEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new ExplosiveRuneEffect({ type: 'explosiveRune' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute', () => {
    it('returns success with rune message', () => {
      const effect = new ExplosiveRuneEffect({ type: 'explosiveRune' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
    });

    it('reports explosive rune placed', () => {
      const effect = new ExplosiveRuneEffect({ type: 'explosiveRune' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.messages.some(m => m.includes('explosive') || m.includes('rune'))).toBe(true);
    });

    it('returns rune position in result data', () => {
      const effect = new ExplosiveRuneEffect({ type: 'explosiveRune' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.data?.['runePosition']).toBeDefined();
      expect(result.data?.['runePosition'].x).toBe(25);
      expect(result.data?.['runePosition'].y).toBe(25);
    });

    it('places explosive_rune terrain at player position', () => {
      const effect = new ExplosiveRuneEffect({ type: 'explosiveRune' });
      const player = createTestPlayer(10, 10);
      const level = createMockLevelWithTerrain(30, 30, player);

      expect(level.getTerrainKey({ x: 10, y: 10 })).toBe('floor');

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      expect(level.getTerrainKey({ x: 10, y: 10 })).toBe('explosive_rune');
    });
  });
});
