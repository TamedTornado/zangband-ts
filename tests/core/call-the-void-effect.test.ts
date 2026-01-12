import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { CallTheVoidEffect } from '@/core/systems/effects/CallTheVoidEffect';
import { Player } from '@/core/entities/Player';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import { createMockLevel } from './testHelpers';

function createTestPlayer(x: number, y: number, level: number = 10): Player {
  const player = new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 500,
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
  // Set player level
  (player as any)._level = level;
  return player;
}

describe('CallTheVoidEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns true (self-targeted)', () => {
      const effect = new CallTheVoidEffect({ type: 'callTheVoid' });
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
    it('returns success with void message', () => {
      const effect = new CallTheVoidEffect({ type: 'callTheVoid' });
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

    describe('when standing in open space', () => {
      it('fires three waves of balls in all directions', () => {
        const effect = new CallTheVoidEffect({ type: 'callTheVoid' });
        const player = createTestPlayer(25, 25);
        // Mock level with all floor tiles around player
        const level = createMockLevel([], player);

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
        };

        const result = effect.execute(context);

        // Should succeed without backfire
        expect(result.data?.['backfired']).toBeFalsy();
        // Should have 3 waves
        expect(result.data?.['waves']).toBe(3);
      });

      it('fires balls in 8 directions per wave', () => {
        const effect = new CallTheVoidEffect({ type: 'callTheVoid' });
        const player = createTestPlayer(25, 25);
        const level = createMockLevel([], player);

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
        };

        const result = effect.execute(context);

        // Should have 24 balls total (8 * 3 waves)
        expect(result.data?.['ballCount']).toBe(24);
      });
    });

    describe('when near a wall', () => {
      it('backfires and damages player', () => {
        const effect = new CallTheVoidEffect({ type: 'callTheVoid' });
        const player = createTestPlayer(25, 25);
        // Create level with wall adjacent to player
        const level = createMockLevel([], player);
        // Mock a wall at one adjacent position
        const originalGetTile = level.getTile.bind(level);
        (level as any).getTile = (pos: { x: number; y: number }) => {
          if (pos.x === 24 && pos.y === 25) {
            return { terrain: { flags: ['WALL'] } };
          }
          return originalGetTile(pos);
        };

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
        };

        const result = effect.execute(context);

        // Should backfire
        expect(result.data?.['backfired']).toBe(true);
        // Player should take significant damage
        expect(result.data?.['selfDamage']).toBeGreaterThanOrEqual(100);
        expect(result.data?.['selfDamage']).toBeLessThanOrEqual(250);
      });

      it('displays warning message', () => {
        const effect = new CallTheVoidEffect({ type: 'callTheVoid' });
        const player = createTestPlayer(25, 25);
        const level = createMockLevel([], player);
        const originalGetTile = level.getTile.bind(level);
        (level as any).getTile = (pos: { x: number; y: number }) => {
          if (pos.x === 24 && pos.y === 25) {
            return { terrain: { flags: ['WALL'] } };
          }
          return originalGetTile(pos);
        };

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
        };

        const result = effect.execute(context);

        expect(result.messages.some(m => m.includes('wall') || m.includes('explosion'))).toBe(true);
      });

      it('destroys area around player', () => {
        const effect = new CallTheVoidEffect({ type: 'callTheVoid' });
        const player = createTestPlayer(25, 25, 10);
        const level = createMockLevel([], player);
        const originalGetTile = level.getTile.bind(level);
        (level as any).getTile = (pos: { x: number; y: number }) => {
          if (pos.x === 24 && pos.y === 25) {
            return { terrain: { flags: ['WALL'] } };
          }
          return originalGetTile(pos);
        };

        // Track if destroyArea effect was created
        let destroyAreaCreated = false;
        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
          createEffect: (def: any) => {
            if (def.type === 'destroyArea') {
              destroyAreaCreated = true;
              // Expected radius: 20 + playerLevel (10) = 30
              expect(def.radius).toBe(30);
            }
            return {
              canExecute: () => true,
              execute: () => ({ success: true, messages: ['Area destroyed'], turnConsumed: true }),
            } as any;
          },
        };

        const result = effect.execute(context);

        // Should have created and executed destroyArea effect
        expect(destroyAreaCreated).toBe(true);
        expect(result.data?.['destroyRadius']).toBe(30);
      });
    });
  });
});
