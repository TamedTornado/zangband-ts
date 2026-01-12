import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { EsoteriaEffect } from '@/core/systems/effects/EsoteriaEffect';
import { Player } from '@/core/entities/Player';
import { Item } from '@/core/entities/Item';
import { createTestItemDef } from './testHelpers';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import { createMockLevel } from './testHelpers';

function createTestPlayer(x: number, y: number, level?: number): Player {
  const player = new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
  if (level) {
    // Set player level via exp (simplified for test)
    (player as any)._level = level;
  }
  return player;
}

function createUnidentifiedItem(): Item {
  return new Item({
    id: 'test-item',
    position: { x: 0, y: 0 },
    symbol: '/',
    color: 'w',
    generated: {
      baseItem: createTestItemDef({
        key: 'longsword',
        name: 'Longsword',
        type: 'weapon',
      }),
      identified: false,
      toHit: 0,
      toDam: 0,
      toAc: 0,
      pval: 0,
      flags: [],
    },
  });
}

describe('EsoteriaEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns true when item target is provided', () => {
      const effect = new EsoteriaEffect({ type: 'esoteria', target: 'item' });
      const player = createTestPlayer(25, 25);
      const item = createUnidentifiedItem();
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetItem: item,
      };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute - identification', () => {
    it('identifies the target item', () => {
      const effect = new EsoteriaEffect({ type: 'esoteria', target: 'item' });
      const player = createTestPlayer(25, 25);
      const item = createUnidentifiedItem();
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetItem: item,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(item.generated?.identified).toBe(true);
    });

    it('reports regular identify at low levels', () => {
      const effect = new EsoteriaEffect({ type: 'esoteria', target: 'item' });
      const player = createTestPlayer(25, 25, 5); // Low level
      const level = createMockLevel([], player);

      // Find a seed where low level gets regular identify
      let foundRegular = false;
      for (let i = 0; i < 100; i++) {
        RNG.setSeed(i * 1000);
        const newItem = createUnidentifiedItem();

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
          targetItem: newItem,
        };

        const result = effect.execute(context);
        if (!result.data?.['fullyIdentified']) {
          foundRegular = true;
          break;
        }
      }

      expect(foundRegular).toBe(true);
    });

    it('can fully identify at high levels', () => {
      const effect = new EsoteriaEffect({ type: 'esoteria', target: 'item' });
      const player = createTestPlayer(25, 25, 50); // High level
      const level = createMockLevel([], player);

      // Find a seed where high level gets full identify
      let foundFull = false;
      for (let i = 0; i < 100; i++) {
        RNG.setSeed(i * 1000);
        const item = createUnidentifiedItem();

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
          targetItem: item,
        };

        const result = effect.execute(context);
        if (result.data?.['fullyIdentified']) {
          foundFull = true;
          break;
        }
      }

      expect(foundFull).toBe(true);
    });
  });

  describe('execute - already identified', () => {
    it('reports item already identified', () => {
      const effect = new EsoteriaEffect({ type: 'esoteria', target: 'item' });
      const player = createTestPlayer(25, 25);
      const item = createUnidentifiedItem();
      item.generated!.identified = true; // Already identified
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetItem: item,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.messages.some(m => m.includes('already'))).toBe(true);
    });
  });
});
