import { describe, it, expect, beforeEach } from 'vitest';
import { ItemSpawner } from '@/core/systems/ItemSpawner';
import { ItemGeneration } from '@/core/systems/ItemGeneration';
import { Level } from '@/core/world/Level';
import type { ItemDef } from '@/core/data/items';
import type { EgoItemDef } from '@/core/data/ego-items';
import type { ArtifactDef } from '@/core/data/artifacts';

// Test data fixtures
const createTestItem = (overrides: Partial<ItemDef> = {}): ItemDef => ({
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
  weight: 100,
  cost: 100,
  allocation: [{ depth: 1, rarity: 1 }],
  baseAc: 0,
  damage: '2d5',
  toHit: 0,
  toDam: 0,
  toAc: 0,
  flags: [],
  ...overrides,
});

describe('ItemSpawner', () => {
  let spawner: ItemSpawner;
  let itemGen: ItemGeneration;
  let level: Level;
  let testItems: Record<string, ItemDef>;
  let testEgoItems: Record<string, EgoItemDef>;
  let testArtifacts: Record<string, ArtifactDef>;

  beforeEach(() => {
    testItems = {
      short_sword: createTestItem({
        key: 'short_sword',
        index: 1,
        name: 'Short Sword',
        symbol: '|',
        depth: 1,
        rarity: 1,
      }),
      long_sword: createTestItem({
        key: 'long_sword',
        index: 2,
        name: 'Long Sword',
        symbol: '|',
        depth: 5,
        rarity: 2,
      }),
      potion_healing: createTestItem({
        key: 'potion_healing',
        index: 3,
        name: 'Potion of Healing',
        symbol: '!',
        color: 'r',
        type: 'potion',
        depth: 1,
        rarity: 2,
      }),
    };

    testEgoItems = {};
    testArtifacts = {};

    itemGen = new ItemGeneration({
      items: testItems,
      egoItems: testEgoItems,
      artifacts: testArtifacts,
    });

    level = new Level(20, 20, { depth: 1 });
    spawner = new ItemSpawner(itemGen);
  });

  describe('spawnItem', () => {
    it('spawns an item on a valid floor tile', () => {
      const item = spawner.spawnItem(level, { x: 5, y: 5 }, 'short_sword');

      expect(item).toBeDefined();
      expect(item?.name).toBe('Short Sword');
      expect(item?.position).toEqual({ x: 5, y: 5 });
    });

    it('adds spawned item to level', () => {
      spawner.spawnItem(level, { x: 5, y: 5 }, 'short_sword');

      const items = level.getItemsAt({ x: 5, y: 5 });
      expect(items).toHaveLength(1);
    });

    it('allows multiple items at same position', () => {
      spawner.spawnItem(level, { x: 5, y: 5 }, 'short_sword');
      spawner.spawnItem(level, { x: 5, y: 5 }, 'potion_healing');

      const items = level.getItemsAt({ x: 5, y: 5 });
      expect(items).toHaveLength(2);
    });

    it('returns null for wall position', () => {
      level.setWalkable({ x: 5, y: 5 }, false);
      const item = spawner.spawnItem(level, { x: 5, y: 5 }, 'short_sword');

      expect(item).toBeNull();
    });

    it('returns null for unknown item key', () => {
      const item = spawner.spawnItem(level, { x: 5, y: 5 }, 'nonexistent');

      expect(item).toBeNull();
    });
  });

  describe('spawnRandomItem', () => {
    it('spawns a depth-appropriate item', () => {
      const item = spawner.spawnRandomItem(level, { x: 5, y: 5 }, 1);

      expect(item).toBeDefined();
    });
  });

  describe('spawnItemsForLevel', () => {
    it('spawns requested number of items', () => {
      const count = spawner.spawnItemsForLevel(level, 1, 5);

      expect(count).toBe(5);
      expect(level.getAllItems()).toHaveLength(5);
    });
  });
});
