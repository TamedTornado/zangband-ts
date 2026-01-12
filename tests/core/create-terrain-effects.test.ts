import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { CreateDoorEffect } from '@/core/systems/effects/CreateDoorEffect';
import { CreateStairsEffect } from '@/core/systems/effects/CreateStairsEffect';
import { CreateWallsEffect } from '@/core/systems/effects/CreateWallsEffect';
import { Player } from '@/core/entities/Player';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import { createMockLevel } from './testHelpers';

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
}

describe('CreateDoorEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new CreateDoorEffect({ type: 'createDoor' });
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
    it('returns success with door creation message', () => {
      const effect = new CreateDoorEffect({ type: 'createDoor' });
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
      expect(result.messages.some(m => m.toLowerCase().includes('door'))).toBe(true);
    });

    it('returns door positions in result data (8 adjacent)', () => {
      const effect = new CreateDoorEffect({ type: 'createDoor' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.data?.['positions']).toBeDefined();
      expect(result.data?.['positions'].length).toBe(8);
    });
  });
});

describe('CreateStairsEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new CreateStairsEffect({ type: 'createStairs' });
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
    it('returns success with stairs creation message', () => {
      const effect = new CreateStairsEffect({ type: 'createStairs' });
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
      expect(result.messages.some(m => m.toLowerCase().includes('stair'))).toBe(true);
    });

    it('returns stair position in result data (player position)', () => {
      const effect = new CreateStairsEffect({ type: 'createStairs' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.data?.['position']).toBeDefined();
      expect(result.data?.['position'].x).toBe(25);
      expect(result.data?.['position'].y).toBe(25);
    });
  });
});

describe('CreateWallsEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new CreateWallsEffect({ type: 'createWalls' });
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
    it('returns success with wall creation message', () => {
      const effect = new CreateWallsEffect({ type: 'createWalls' });
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
      expect(result.messages.some(m => m.toLowerCase().includes('wall') || m.toLowerCase().includes('stone'))).toBe(true);
    });

    it('returns wall positions in result data (8 adjacent)', () => {
      const effect = new CreateWallsEffect({ type: 'createWalls' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.data?.['positions']).toBeDefined();
      expect(result.data?.['positions'].length).toBe(8);
    });
  });
});
