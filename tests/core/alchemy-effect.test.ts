import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { AlchemyEffect } from '@/core/systems/effects/AlchemyEffect';
import { Player } from '@/core/entities/Player';
import { Item } from '@/core/entities/Item';
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

function createTestItem(): Item {
  return new Item({
    id: 'test-item',
    position: { x: 0, y: 0 },
    symbol: '/',
    color: 'w',
    generated: {
      baseItem: {
        key: 'longsword',
        name: 'Longsword',
        type: 'weapon',
        cost: 300,
      },
      identified: true,
    },
  });
}

describe('AlchemyEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns true when item target is provided', () => {
      const effect = new AlchemyEffect({ type: 'alchemy', target: 'item' });
      const player = createTestPlayer(25, 25);
      const item = createTestItem();
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetItem: item,
      };

      expect(effect.canExecute(context)).toBe(true);
    });

    it('returns false when no item target', () => {
      const effect = new AlchemyEffect({ type: 'alchemy', target: 'item' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(false);
    });
  });

  describe('execute', () => {
    it('returns success with gold message', () => {
      const effect = new AlchemyEffect({ type: 'alchemy', target: 'item' });
      const player = createTestPlayer(25, 25);
      const item = createTestItem();
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetItem: item,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(result.messages.some(m => m.toLowerCase().includes('gold'))).toBe(true);
    });

    it('returns gold amount in result data', () => {
      const effect = new AlchemyEffect({ type: 'alchemy', target: 'item' });
      const player = createTestPlayer(25, 25);
      const item = createTestItem();
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetItem: item,
      };

      const result = effect.execute(context);

      expect(result.data?.goldGained).toBeDefined();
      expect(result.data?.goldGained).toBeGreaterThan(0);
    });

    it('marks item for destruction in result data', () => {
      const effect = new AlchemyEffect({ type: 'alchemy', target: 'item' });
      const player = createTestPlayer(25, 25);
      const item = createTestItem();
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetItem: item,
      };

      const result = effect.execute(context);

      expect(result.data?.destroyItem).toBe(true);
      expect(result.data?.itemId).toBe(item.id);
    });
  });
});
