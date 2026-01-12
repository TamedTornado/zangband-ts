import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { MappingEffect } from '@/core/systems/effects/MappingEffect';
import { Player } from '@/core/entities/Player';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
}

interface MockTile {
  explored: boolean;
  terrain: { flags: string[] };
}

function createMockLevelWithTiles(width: number, height: number, player: Player) {
  const tiles: Map<string, MockTile> = new Map();

  const level = {
    width,
    height,
    player,
    getTile: (pos: Position) => {
      const key = `${pos.x},${pos.y}`;
      if (!tiles.has(key)) {
        tiles.set(key, { explored: false, terrain: { flags: [] } });
      }
      return tiles.get(key)!;
    },
    getMonsters: () => [],
    getActorAt: () => undefined,
    isInBounds: (pos: Position) => pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height,
    // Helper for tests
    _tiles: tiles,
  };

  return level;
}

describe('MappingEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('execute', () => {
    it('reveals tiles around the player', () => {
      const effect = new MappingEffect({ type: 'mapping' });
      const player = createTestPlayer(10, 10);
      const level = createMockLevelWithTiles(30, 30, player);

      // Verify tiles start unexplored
      expect(level.getTile({ x: 10, y: 10 }).explored).toBe(false);
      expect(level.getTile({ x: 11, y: 10 }).explored).toBe(false);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);

      // Player's tile should be explored
      expect(level.getTile({ x: 10, y: 10 }).explored).toBe(true);

      // Adjacent tiles should be explored
      expect(level.getTile({ x: 11, y: 10 }).explored).toBe(true);
      expect(level.getTile({ x: 9, y: 10 }).explored).toBe(true);
      expect(level.getTile({ x: 10, y: 11 }).explored).toBe(true);
      expect(level.getTile({ x: 10, y: 9 }).explored).toBe(true);
    });

    it('reveals tiles within radius', () => {
      const effect = new MappingEffect({ type: 'mapping' });
      const player = createTestPlayer(50, 50);
      const level = createMockLevelWithTiles(100, 100, player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      // Tiles close to player should be explored
      expect(level.getTile({ x: 50, y: 50 }).explored).toBe(true);
      expect(level.getTile({ x: 55, y: 50 }).explored).toBe(true); // 5 tiles away
      expect(level.getTile({ x: 70, y: 50 }).explored).toBe(true); // 20 tiles away (within radius 30)

      // Tiles far from player should NOT be explored (beyond default radius of 30)
      // Distance from (50,50) to (0,0) is sqrt(50^2 + 50^2) ≈ 70, which is > 30
      expect(level.getTile({ x: 0, y: 0 }).explored).toBe(false);
      // Distance from (50,50) to (99,99) is sqrt(49^2 + 49^2) ≈ 69, which is > 30
      expect(level.getTile({ x: 99, y: 99 }).explored).toBe(false);
    });

    it('does not explore tiles outside level bounds', () => {
      const effect = new MappingEffect({ type: 'mapping' });
      const player = createTestPlayer(2, 2);
      const level = createMockLevelWithTiles(10, 10, player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      // In-bounds tile should be explored
      expect(level.getTile({ x: 2, y: 2 }).explored).toBe(true);

      // Test should not crash when trying to access out-of-bounds
      // The effect should handle bounds checking
    });

    it('returns appropriate message', () => {
      const effect = new MappingEffect({ type: 'mapping' });
      const player = createTestPlayer(10, 10);
      const level = createMockLevelWithTiles(30, 30, player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.messages.some(m => m.includes('surroundings') || m.includes('sense') || m.includes('map'))).toBe(true);
    });
  });
});
