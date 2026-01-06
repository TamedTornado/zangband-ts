import { describe, it, expect } from 'vitest';
import { Level } from '@/core/world/Level';
import { Monster } from '@/core/entities/Monster';
import { Item } from '@/core/entities/Item';
import { Trap } from '@/core/entities/Trap';
import type { TrapDef } from '@/core/data/traps';

// Test fixtures
const createTestMonster = (id: string, x: number, y: number): Monster => {
  return new Monster({
    id,
    position: { x, y },
    symbol: 'm',
    color: 'w',
    definitionKey: 'test_monster',
    speed: 110,
    maxHp: 10,
  });
};

const createTestItem = (id: string, x: number, y: number): Item => {
  return new Item({
    id,
    position: { x, y },
    symbol: '!',
    color: 'r',
    itemType: 'potion',
    generated: {
      baseItem: { name: 'Test', tval: 75, sval: 1 } as any,
      toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], cost: 0,
    },
  });
};

const createTestTrap = (id: string, x: number, y: number): Trap => {
  const trapDef: TrapDef = {
    key: 'test_trap',
    index: 1,
    name: 'Test Trap',
    symbol: '^',
    color: 'w',
    minDepth: 1,
    rarity: 1,
    effect: 'DAMAGE',
    damage: '1d6',
    saveType: 'DEX',
    saveDifficulty: 5,
    flags: ['HIDDEN'],
  };
  return new Trap({
    id,
    position: { x, y },
    definition: trapDef,
  });
};

describe('Level', () => {
  it('should create a level with given dimensions', () => {
    const level = new Level(80, 25);
    expect(level.width).toBe(80);
    expect(level.height).toBe(25);
  });

  it('should report positions inside bounds as valid', () => {
    const level = new Level(80, 25);
    expect(level.isInBounds({ x: 0, y: 0 })).toBe(true);
    expect(level.isInBounds({ x: 79, y: 24 })).toBe(true);
    expect(level.isInBounds({ x: 40, y: 12 })).toBe(true);
  });

  it('should report positions outside bounds as invalid', () => {
    const level = new Level(80, 25);
    expect(level.isInBounds({ x: -1, y: 0 })).toBe(false);
    expect(level.isInBounds({ x: 0, y: -1 })).toBe(false);
    expect(level.isInBounds({ x: 80, y: 0 })).toBe(false);
    expect(level.isInBounds({ x: 0, y: 25 })).toBe(false);
  });

  it('should have all tiles walkable by default (empty map)', () => {
    const level = new Level(10, 10);
    expect(level.isWalkable({ x: 5, y: 5 })).toBe(true);
    expect(level.isWalkable({ x: 0, y: 0 })).toBe(true);
  });

  it('should report out-of-bounds positions as not walkable', () => {
    const level = new Level(10, 10);
    expect(level.isWalkable({ x: -1, y: 0 })).toBe(false);
    expect(level.isWalkable({ x: 10, y: 10 })).toBe(false);
  });

  it('should allow setting a tile as blocked', () => {
    const level = new Level(10, 10);
    level.setWalkable({ x: 5, y: 5 }, false);
    expect(level.isWalkable({ x: 5, y: 5 })).toBe(false);
    expect(level.isWalkable({ x: 5, y: 4 })).toBe(true);
  });

  describe('monster tracking', () => {
    it('adds and retrieves monsters', () => {
      const level = new Level(10, 10);
      const monster = createTestMonster('m1', 5, 5);

      level.addMonster(monster);

      expect(level.getMonsters()).toHaveLength(1);
      expect(level.getMonsterAt({ x: 5, y: 5 })).toBe(monster);
    });

    it('removes monsters', () => {
      const level = new Level(10, 10);
      const monster = createTestMonster('m1', 5, 5);

      level.addMonster(monster);
      level.removeMonster(monster);

      expect(level.getMonsters()).toHaveLength(0);
      expect(level.getMonsterAt({ x: 5, y: 5 })).toBeUndefined();
    });

    it('blocks movement into monster-occupied tiles', () => {
      const level = new Level(10, 10);
      const monster = createTestMonster('m1', 5, 5);

      level.addMonster(monster);

      // Tile with monster should not be walkable for other entities
      expect(level.isOccupied({ x: 5, y: 5 })).toBe(true);
      expect(level.isOccupied({ x: 5, y: 4 })).toBe(false);
    });

    it('returns undefined for empty positions', () => {
      const level = new Level(10, 10);
      expect(level.getMonsterAt({ x: 5, y: 5 })).toBeUndefined();
    });
  });

  describe('item tracking', () => {
    it('adds and retrieves items', () => {
      const level = new Level(10, 10);
      const item = createTestItem('i1', 5, 5);

      level.addItem(item);

      expect(level.getItemsAt({ x: 5, y: 5 })).toHaveLength(1);
      expect(level.getItemsAt({ x: 5, y: 5 })[0]).toBe(item);
    });

    it('allows multiple items at same position', () => {
      const level = new Level(10, 10);
      const item1 = createTestItem('i1', 5, 5);
      const item2 = createTestItem('i2', 5, 5);

      level.addItem(item1);
      level.addItem(item2);

      expect(level.getItemsAt({ x: 5, y: 5 })).toHaveLength(2);
    });

    it('removes items', () => {
      const level = new Level(10, 10);
      const item = createTestItem('i1', 5, 5);

      level.addItem(item);
      level.removeItem(item);

      expect(level.getItemsAt({ x: 5, y: 5 })).toHaveLength(0);
    });

    it('returns empty array for positions with no items', () => {
      const level = new Level(10, 10);
      expect(level.getItemsAt({ x: 5, y: 5 })).toHaveLength(0);
    });
  });

  describe('trap tracking', () => {
    it('adds and retrieves traps', () => {
      const level = new Level(10, 10);
      const trap = createTestTrap('t1', 5, 5);

      level.addTrap(trap);

      expect(level.getTraps()).toHaveLength(1);
      expect(level.getTrapAt({ x: 5, y: 5 })).toBe(trap);
    });

    it('removes traps', () => {
      const level = new Level(10, 10);
      const trap = createTestTrap('t1', 5, 5);

      level.addTrap(trap);
      level.removeTrap(trap);

      expect(level.getTraps()).toHaveLength(0);
      expect(level.getTrapAt({ x: 5, y: 5 })).toBeUndefined();
    });

    it('returns undefined for positions with no traps', () => {
      const level = new Level(10, 10);
      expect(level.getTrapAt({ x: 5, y: 5 })).toBeUndefined();
    });
  });
});
