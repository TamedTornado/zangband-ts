import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { DestroyAreaEffect } from '@/core/systems/effects/DestroyAreaEffect';
import { Player } from '@/core/entities/Player';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import { createMockLevel, createTestMonster } from './testHelpers';

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 500,
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
}

describe('DestroyAreaEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns true (self-targeted)', () => {
      const effect = new DestroyAreaEffect({ type: 'destroyArea' });
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
    it('shows destruction messages', () => {
      const effect = new DestroyAreaEffect({ type: 'destroyArea', radius: 10 });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.messages.some(m => m.includes('searing blast'))).toBe(true);
      expect(result.messages.some(m => m.includes('collapses'))).toBe(true);
    });

    it('kills non-unique monsters in radius', () => {
      const effect = new DestroyAreaEffect({ type: 'destroyArea', radius: 10 });
      const player = createTestPlayer(25, 25);
      const monster = createTestMonster({ position: { x: 27, y: 25 }, maxHp: 50 });
      const level = createMockLevel([monster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(monster.isDead).toBe(true);
      expect(result.data?.['monstersKilled']).toBe(1);
    });

    it('does not kill monsters outside radius', () => {
      const effect = new DestroyAreaEffect({ type: 'destroyArea', radius: 5 });
      const player = createTestPlayer(25, 25);
      const monster = createTestMonster({ position: { x: 35, y: 25 }, maxHp: 50 });
      const level = createMockLevel([monster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      expect(monster.isDead).toBe(false);
    });

    it('does not affect the center tile (player position)', () => {
      const effect = new DestroyAreaEffect({ type: 'destroyArea', radius: 10 });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      // Track if center was modified
      let centerModified = false;
      const originalSetTerrain = level.setTerrain.bind(level);
      (level as any).setTerrain = (pos: { x: number; y: number }, terrain: string) => {
        if (pos.x === 25 && pos.y === 25) {
          centerModified = true;
        }
        return originalSetTerrain(pos, terrain);
      };

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      expect(centerModified).toBe(false);
    });

    it('converts walls to floor', () => {
      const effect = new DestroyAreaEffect({ type: 'destroyArea', radius: 10 });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      // Mock a wall at adjacent position
      const originalGetTile = level.getTile.bind(level);
      (level as any).getTile = (pos: { x: number; y: number }) => {
        if (pos.x === 26 && pos.y === 25) {
          return { terrain: { id: 'wall', flags: ['WALL', 'BLOCK'] } } as unknown as ReturnType<typeof originalGetTile>;
        }
        return originalGetTile(pos);
      };

      let terrainSet: { pos: { x: number; y: number }; terrain: string } | null = null;
      (level as any).setTerrain = (pos: { x: number; y: number }, terrain: string) => {
        if (pos.x === 26 && pos.y === 25) {
          terrainSet = { pos, terrain };
        }
      };

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      expect(terrainSet).not.toBeNull();
      expect(terrainSet!.terrain).toBe('floor');
    });

    it('uses default radius of 15 when not specified', () => {
      const effect = new DestroyAreaEffect({ type: 'destroyArea' });
      expect(effect.radius).toBe(15);
    });

    it('uses custom radius when specified', () => {
      const effect = new DestroyAreaEffect({ type: 'destroyArea', radius: 20 });
      expect(effect.radius).toBe(20);
    });
  });
});
