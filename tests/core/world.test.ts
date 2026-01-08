import { describe, it, expect } from 'vitest';
import { Tile } from '@/core/world/Tile';
import { Level } from '@/core/world/Level';
import { GameWorld } from '@/core/world/GameWorld';
import { Player } from '@/core/entities/Player';
import { Monster } from '@/core/entities/Monster';
import { Item } from '@/core/entities/Item';

describe('Tile', () => {
  it('should have terrain key and properties', () => {
    const tile = new Tile('floor');
    expect(tile.terrainKey).toBe('open_floor'); // 'floor' is alias for 'open_floor'
  });

  it('should report walkability based on terrain', () => {
    const floor = new Tile('floor');
    const wall = new Tile('granite_wall');

    expect(floor.isWalkable).toBe(true);
    expect(wall.isWalkable).toBe(false);
  });

  it('should report transparency based on terrain', () => {
    const floor = new Tile('floor');
    const wall = new Tile('granite_wall');

    expect(floor.isTransparent).toBe(true);
    expect(wall.isTransparent).toBe(false);
  });

  it('should hold an occupant (actor)', () => {
    const tile = new Tile('floor');
    const monster = new Monster({
      id: 'mon-1',
      position: { x: 0, y: 0 },
      symbol: 'k',
      color: '#0f0',
      maxHp: 20,
      speed: 110,
      definitionKey: 'kobold',
    });

    expect(tile.occupant).toBeNull();
    tile.occupant = monster;
    expect(tile.occupant).toBe(monster);
  });

  it('should hold multiple items', () => {
    const tile = new Tile('floor');
    const potion = new Item({
      id: 'item-1',
      position: { x: 0, y: 0 },
      symbol: '!',
      color: '#00f',
      generated: {
        baseItem: { name: 'Test', type: 'potion', sval: 1 } as any,
        toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], cost: 0,
      },
    });

    expect(tile.items).toEqual([]);
    tile.addItem(potion);
    expect(tile.items.length).toBe(1);
    expect(tile.items[0]).toBe(potion);
  });

  it('should track explored state', () => {
    const tile = new Tile('floor');
    expect(tile.explored).toBe(false);
    tile.explored = true;
    expect(tile.explored).toBe(true);
  });
});

describe('Level (enhanced)', () => {
  it('should create a grid of tiles', () => {
    const level = new Level(10, 10);
    expect(level.width).toBe(10);
    expect(level.height).toBe(10);
  });

  it('should get tile at position', () => {
    const level = new Level(10, 10);
    const tile = level.getTile({ x: 5, y: 5 });
    expect(tile).toBeDefined();
    expect(tile?.terrainKey).toBe('open_floor');
  });

  it('should set terrain at position', () => {
    const level = new Level(10, 10);
    level.setTerrain({ x: 5, y: 5 }, 'granite_wall');
    const tile = level.getTile({ x: 5, y: 5 });
    expect(tile?.terrainKey).toBe('granite_wall_48'); // 'granite_wall' is alias
    expect(tile?.isWalkable).toBe(false);
  });

  it('should check walkability via tile', () => {
    const level = new Level(10, 10);
    expect(level.isWalkable({ x: 5, y: 5 })).toBe(true);
    level.setTerrain({ x: 5, y: 5 }, 'granite_wall');
    expect(level.isWalkable({ x: 5, y: 5 })).toBe(false);
  });

  it('should return false for out of bounds', () => {
    const level = new Level(10, 10);
    expect(level.isWalkable({ x: -1, y: 5 })).toBe(false);
    expect(level.isWalkable({ x: 100, y: 5 })).toBe(false);
  });

  it('should track level depth', () => {
    const level = new Level(10, 10, { depth: 5 });
    expect(level.depth).toBe(5);
  });
});

describe('GameWorld', () => {
  it('should hold current level and player', () => {
    const player = new Player({
      id: 'player',
      position: { x: 5, y: 5 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
    });
    const level = new Level(80, 25);
    const world = new GameWorld(player, level);

    expect(world.player).toBe(player);
    expect(world.currentLevel).toBe(level);
  });

  it('should track game turn', () => {
    const player = new Player({
      id: 'player',
      position: { x: 5, y: 5 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
    });
    const level = new Level(80, 25);
    const world = new GameWorld(player, level);

    expect(world.turn).toBe(0);
    world.advanceTurn();
    expect(world.turn).toBe(1);
  });

  it('should allow changing levels', () => {
    const player = new Player({
      id: 'player',
      position: { x: 5, y: 5 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
    });
    const level1 = new Level(80, 25, { depth: 1 });
    const level2 = new Level(80, 25, { depth: 2 });
    const world = new GameWorld(player, level1);

    expect(world.currentLevel.depth).toBe(1);
    world.changeLevel(level2);
    expect(world.currentLevel.depth).toBe(2);
  });
});
