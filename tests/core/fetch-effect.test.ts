import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { FetchEffect } from '@/core/systems/effects/FetchEffect';
import { Player } from '@/core/entities/Player';
import { Item } from '@/core/entities/Item';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import { createMockLevel } from './testHelpers';

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
  });
}

function createTestItem(x: number, y: number, weight: number = 50): Item {
  return new Item({
    id: `test_item_${x}_${y}`,
    position: { x, y },
    symbol: ')',
    color: 'w',
    generated: {
      baseItem: {
        key: 'test_item',
        index: 1,
        name: 'Test Item',
        symbol: ')',
        color: 'w',
        type: 'misc',
        sval: 1,
        pval: 0,
        depth: 1,
        rarity: 1,
        weight,
        cost: 100,
        allocation: [],
        baseAc: 0,
        damage: '1d4',
        toHit: 0,
        toDam: 0,
        toAc: 0,
        flags: [],
      },
      toHit: 0,
      toDam: 0,
      toAc: 0,
      pval: 0,
      flags: [],
    },
  });
}

describe('FetchEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('requires a target position', () => {
      const effect = new FetchEffect({ type: 'fetch', weight: 500 });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      expect(effect.canExecute(context)).toBe(false);
    });

    it('returns true when target position is provided', () => {
      const effect = new FetchEffect({ type: 'fetch', weight: 500 });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 10, y: 10 },
      };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute - success cases', () => {
    it('moves item from target to player position', () => {
      const effect = new FetchEffect({ type: 'fetch', weight: 500 });
      const player = createTestPlayer(5, 5);
      const item = createTestItem(10, 10, 50);
      const level = createMockLevel([], player);
      level.addItem(item);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 10, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(item.position.x).toBe(5);
      expect(item.position.y).toBe(5);
      expect(result.messages.some(m => m.includes('flies') || m.includes('zoom'))).toBe(true);
    });
  });

  describe('execute - failure cases', () => {
    it('fails when no item at target position', () => {
      const effect = new FetchEffect({ type: 'fetch', weight: 500 });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 10, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(false);
      expect(result.messages[0]).toContain('no object');
    });

    it('fails when item is too heavy', () => {
      const effect = new FetchEffect({ type: 'fetch', weight: 100 }); // Max 100 weight
      const player = createTestPlayer(5, 5);
      const item = createTestItem(10, 10, 200); // Item weighs 200
      const level = createMockLevel([], player);
      level.addItem(item);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 10, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(false);
      expect(result.messages[0]).toContain('too heavy');
    });

    it('fails when player already standing on item', () => {
      const effect = new FetchEffect({ type: 'fetch', weight: 500 });
      const player = createTestPlayer(5, 5);
      const itemOnPlayer = createTestItem(5, 5, 10);
      const targetItem = createTestItem(10, 10, 50);
      const level = createMockLevel([], player);
      level.addItem(itemOnPlayer);
      level.addItem(targetItem);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 10, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(false);
      expect(result.messages[0]).toContain('standing on');
    });
  });

  describe('execute - weight formula', () => {
    it('supports level-based weight formula', () => {
      // Formula: level * 15, at level 10 = 150 weight limit
      const effect = new FetchEffect({ type: 'fetch', weight: 'level*15' });
      const player = createTestPlayer(5, 5);
      player.level = 10;

      const item = createTestItem(10, 10, 100); // 100 < 150, should work
      const level = createMockLevel([], player);
      level.addItem(item);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 10, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
    });
  });

  describe('execute - turn consumption', () => {
    it('consumes a turn', () => {
      const effect = new FetchEffect({ type: 'fetch', weight: 500 });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 10, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.turnConsumed).toBe(true);
    });
  });
});
