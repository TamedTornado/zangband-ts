import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { RechargeEffect } from '@/core/systems/effects/RechargeEffect';
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

function createTestWand(charges: number, maxCharges: number): Item {
  return new Item({
    id: 'test_wand',
    position: { x: 0, y: 0 },
    symbol: '-',
    color: 'w',
    generated: {
      baseItem: {
        key: 'test_wand',
        index: 1,
        name: 'Test Wand',
        symbol: '-',
        color: 'w',
        type: 'wand',
        sval: 1,
        pval: 5, // Standard charges per recharge
        depth: 10,
        rarity: 1,
        weight: 10,
        cost: 100,
        allocation: [],
        baseAc: 0,
        toHit: 0,
        toDam: 0,
        toAc: 0,
        flags: [],
      },
      toHit: 0,
      toDam: 0,
      toAc: 0,
      pval: 5,
      flags: [],
      charges,
      maxCharges,
    },
  });
}

function createTestRod(timeout: number): Item {
  return new Item({
    id: 'test_rod',
    position: { x: 0, y: 0 },
    symbol: '-',
    color: 'y',
    generated: {
      baseItem: {
        key: 'test_rod',
        index: 2,
        name: 'Test Rod',
        symbol: '-',
        color: 'y',
        type: 'rod',
        sval: 1,
        pval: 50, // Recharge rate
        depth: 10,
        rarity: 1,
        weight: 15,
        cost: 200,
        allocation: [],
        baseAc: 0,
        toHit: 0,
        toDam: 0,
        toAc: 0,
        flags: [],
      },
      toHit: 0,
      toDam: 0,
      toAc: 0,
      pval: 50,
      flags: [],
      timeout,
    },
  });
}

describe('RechargeEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('requires a target item', () => {
      const effect = new RechargeEffect({ type: 'recharge', power: 90 });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      expect(effect.canExecute(context)).toBe(false);
    });

    it('returns true when target item is provided', () => {
      const effect = new RechargeEffect({ type: 'recharge', power: 90 });
      const player = createTestPlayer(5, 5);
      const wand = createTestWand(0, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetItem: wand,
      };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute - wand recharging', () => {
    it('adds charges to a wand', () => {
      const effect = new RechargeEffect({ type: 'recharge', power: 90 });
      const player = createTestPlayer(5, 5);
      const wand = createTestWand(2, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetItem: wand,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(wand.charges).toBeGreaterThan(2);
      expect(result.messages.some(m => m.includes('glows'))).toBe(true);
    });
  });

  describe('execute - rod recharging', () => {
    it('reduces timeout on a rod', () => {
      const effect = new RechargeEffect({ type: 'recharge', power: 90 });
      const player = createTestPlayer(5, 5);
      const rod = createTestRod(100);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetItem: rod,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(rod.timeout).toBeLessThan(100);
      expect(result.messages.some(m => m.includes('glows'))).toBe(true);
    });

    it('can fully recharge a rod', () => {
      const effect = new RechargeEffect({ type: 'recharge', power: 200 }); // High power
      const player = createTestPlayer(5, 5);
      const rod = createTestRod(50);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetItem: rod,
      };

      effect.execute(context);

      expect(rod.timeout).toBe(0);
    });
  });

  describe('execute - non-rechargeable items', () => {
    it('fails on non-device items', () => {
      const effect = new RechargeEffect({ type: 'recharge', power: 90 });
      const player = createTestPlayer(5, 5);
      // Create a sword (not a device)
      const sword = new Item({
        id: 'test_sword',
        position: { x: 0, y: 0 },
        symbol: '|',
        color: 'w',
        generated: {
          baseItem: {
            key: 'test_sword',
            index: 1,
            name: 'Test Sword',
            symbol: '|',
            color: 'w',
            type: 'sword',
            sval: 1,
            pval: 0,
            depth: 1,
            rarity: 1,
            weight: 80,
            cost: 100,
            allocation: [],
            baseAc: 0,
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
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetItem: sword,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(false);
      expect(result.messages[0]).toContain('cannot recharge');
    });
  });

  describe('execute - power formula', () => {
    it('supports level-based power formula', () => {
      const effect = new RechargeEffect({ type: 'recharge', power: 'level*4' });
      const player = createTestPlayer(5, 5);
      player.level = 20; // power = 80
      const wand = createTestWand(2, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetItem: wand,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
    });
  });

  describe('execute - turn consumption', () => {
    it('consumes a turn', () => {
      const effect = new RechargeEffect({ type: 'recharge', power: 90 });
      const player = createTestPlayer(5, 5);
      const wand = createTestWand(2, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetItem: wand,
      };

      const result = effect.execute(context);

      expect(result.turnConsumed).toBe(true);
    });
  });
});
