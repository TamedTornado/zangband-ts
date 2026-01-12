import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { DetectEffect } from '@/core/systems/effects/DetectEffect';
import { Player } from '@/core/entities/Player';
import { Item } from '@/core/entities/Item';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import { createMockLevel, createTestMonster, createTestItemDef } from './testHelpers';

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
}

function createGoldItem(x: number, y: number): Item {
  return new Item({
    id: `gold-${x}-${y}`,
    position: { x, y },
    symbol: '$',
    color: 'y',
    generated: {
      baseItem: createTestItemDef({ key: 'gold', name: 'Gold', type: 'gold', cost: 100 }),
      toHit: 0,
      toDam: 0,
      toAc: 0,
      pval: 0,
      flags: [],
    } as any,
  });
}

describe('DetectEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('treasure detection', () => {
    it('detects gold items in range', () => {
      const effect = new DetectEffect({ type: 'detect', detectType: 'treasure' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      // Add gold item near player
      const gold = createGoldItem(26, 25);
      level.addItem(gold);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.messages.some(m => m.includes('treasure'))).toBe(true);
      expect(result.data?.['treasureCount']).toBeGreaterThan(0);
    });

    it('marks tiles with gold as explored', () => {
      const effect = new DetectEffect({ type: 'detect', detectType: 'treasure' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      // Add gold item
      const gold = createGoldItem(26, 25);
      level.addItem(gold);

      // Verify tile is unexplored initially
      const tile = level.getTile({ x: 26, y: 25 });
      expect(tile!.explored).toBe(false);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      // Tile should now be explored
      expect(tile!.explored).toBe(true);
    });
  });

  describe('evil detection', () => {
    it('detects monsters with EVIL flag', () => {
      const effect = new DetectEffect({ type: 'detect', detectType: 'evil' });
      const player = createTestPlayer(25, 25);

      // Create evil monster nearby
      const evilMonster = createTestMonster({
        id: 'orc',
        position: { x: 27, y: 25 },
        flags: ['EVIL'],
      });

      const level = createMockLevel([evilMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.messages.some(m => m.includes('evil'))).toBe(true);
      expect(result.data?.['evilCount']).toBeGreaterThan(0);
    });

    it('does not detect non-evil monsters', () => {
      const effect = new DetectEffect({ type: 'detect', detectType: 'evil' });
      const player = createTestPlayer(25, 25);

      // Create non-evil monster nearby
      const goodMonster = createTestMonster({
        id: 'deer',
        position: { x: 27, y: 25 },
        flags: ['ANIMAL'], // Not evil
      });

      const level = createMockLevel([goodMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.['evilCount']).toBe(0);
    });
  });

  describe('invisible detection', () => {
    it('detects monsters with INVISIBLE flag', () => {
      const effect = new DetectEffect({ type: 'detect', detectType: 'invisible' });
      const player = createTestPlayer(25, 25);

      // Create invisible monster nearby
      const invisMonster = createTestMonster({
        id: 'ghost',
        position: { x: 27, y: 25 },
        flags: ['INVISIBLE'],
      });

      const level = createMockLevel([invisMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.messages.some(m => m.includes('invisible'))).toBe(true);
      expect(result.data?.['invisibleCount']).toBeGreaterThan(0);
    });
  });

  describe('undead detection', () => {
    it('detects monsters with UNDEAD flag', () => {
      const effect = new DetectEffect({ type: 'detect', detectType: 'undead' });
      const player = createTestPlayer(25, 25);

      // Create undead monster nearby
      const undeadMonster = createTestMonster({
        id: 'skeleton',
        position: { x: 27, y: 25 },
        flags: ['UNDEAD'],
      });

      const level = createMockLevel([undeadMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.messages.some(m => m.includes('undead'))).toBe(true);
      expect(result.data?.['undeadCount']).toBeGreaterThan(0);
    });

    it('does not detect non-undead monsters', () => {
      const effect = new DetectEffect({ type: 'detect', detectType: 'undead' });
      const player = createTestPlayer(25, 25);

      // Create living monster nearby
      const livingMonster = createTestMonster({
        id: 'orc',
        position: { x: 27, y: 25 },
        flags: ['EVIL'], // Evil but not undead
      });

      const level = createMockLevel([livingMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.['undeadCount']).toBe(0);
    });
  });

  describe('marks tiles as explored', () => {
    it('evil detection marks monster tiles as explored', () => {
      const effect = new DetectEffect({ type: 'detect', detectType: 'evil' });
      const player = createTestPlayer(25, 25);

      const evilMonster = createTestMonster({
        id: 'orc',
        position: { x: 27, y: 25 },
        flags: ['EVIL'],
      });

      const level = createMockLevel([evilMonster], player);

      // Verify tile is unexplored initially
      const tile = level.getTile({ x: 27, y: 25 });
      expect(tile!.explored).toBe(false);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      effect.execute(context);

      // Tile should now be explored
      expect(tile!.explored).toBe(true);
    });
  });
});
