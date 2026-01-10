/**
 * Town Generator - creates the town level at depth 0
 *
 * Generates a level with store buildings, dungeon entrance,
 * and walkable areas for the player.
 */

import { Level } from '@/core/world/Level';
import type { Position } from '@/core/types';
import type { TerrainDef } from '@/core/data/terrain';
import storesData from '@/data/stores/stores.json';
import type { StoreDef } from '@/core/data/stores';

const stores = storesData as Record<string, StoreDef>;

export interface StorePlacement {
  storeKey: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TownLayout {
  key: string;
  name: string;
  width: number;
  height: number;
  stores: StorePlacement[];
  dungeonEntrance: Position;
  playerStart: Position;
}

export interface StoreEntrance {
  storeKey: string;
  position: Position;
}

export interface GeneratedTown {
  level: Level;
  storeEntrances: StoreEntrance[];
  playerStart: Position;
  getStoreKeyAt(pos: Position): string | undefined;
}

// Town-specific terrain definitions
const TOWN_FLOOR: TerrainDef = {
  key: 'town_floor',
  index: 200,
  name: 'town floor',
  symbol: '.',
  color: 'w',
  flags: [], // No BLOCK = walkable
};

const TOWN_WALL: TerrainDef = {
  key: 'town_wall',
  index: 201,
  name: 'town wall',
  symbol: '#',
  color: 'u',
  flags: ['BLOCK', 'PERM'],
};

const PERMANENT_WALL: TerrainDef = {
  key: 'permanent_wall',
  index: 60,
  name: 'permanent wall',
  symbol: '#',
  color: 'w',
  flags: ['BLOCK', 'USE_TRANS', 'ICKY', 'PERM', 'OBJECT', 'MARK'],
};

const DOWN_STAIRS: TerrainDef = {
  key: 'down_staircase',
  index: 7,
  name: 'down staircase',
  symbol: '>',
  color: 'w',
  flags: ['USE_TRANS', 'ICKY', 'PERM', 'OBJECT', 'MARK'],
};

/**
 * Creates store entrance terrain with the store's symbol and color
 */
function createStoreEntranceTerrain(storeKey: string): TerrainDef {
  const storeDef = stores[storeKey];
  if (!storeDef) {
    throw new Error(`Unknown store: ${storeKey}`);
  }

  return {
    key: `store_entrance_${storeKey}`,
    index: 202, // Index doesn't matter for custom terrain
    name: storeDef.name,
    symbol: storeDef.symbol,
    color: storeDef.color,
    flags: [], // No BLOCK = walkable
  };
}

export class TownGenerator {
  private storeEntranceMap: Map<string, string> = new Map(); // "x,y" -> storeKey

  generate(layout: TownLayout): GeneratedTown {
    const level = new Level(layout.width, layout.height, { depth: 0 });
    this.storeEntranceMap.clear();

    // Fill with floor tiles
    this.fillFloor(level, layout);

    // Add boundary walls
    this.addBoundaryWalls(level, layout);

    // Place store buildings
    const storeEntrances = this.placeStores(level, layout);

    // Place dungeon entrance
    this.placeDungeonEntrance(level, layout);

    return {
      level,
      storeEntrances,
      playerStart: layout.playerStart,
      getStoreKeyAt: (pos: Position) => this.getStoreKeyAt(pos),
    };
  }

  private fillFloor(level: Level, layout: TownLayout): void {
    for (let y = 0; y < layout.height; y++) {
      for (let x = 0; x < layout.width; x++) {
        const tile = level.getTile({ x, y });
        if (tile) {
          tile.terrain = TOWN_FLOOR;
        }
      }
    }
  }

  private addBoundaryWalls(level: Level, layout: TownLayout): void {
    // Top and bottom edges
    for (let x = 0; x < layout.width; x++) {
      const topTile = level.getTile({ x, y: 0 });
      if (topTile) topTile.terrain = PERMANENT_WALL;

      const bottomTile = level.getTile({ x, y: layout.height - 1 });
      if (bottomTile) bottomTile.terrain = PERMANENT_WALL;
    }

    // Left and right edges
    for (let y = 0; y < layout.height; y++) {
      const leftTile = level.getTile({ x: 0, y });
      if (leftTile) leftTile.terrain = PERMANENT_WALL;

      const rightTile = level.getTile({ x: layout.width - 1, y });
      if (rightTile) rightTile.terrain = PERMANENT_WALL;
    }
  }

  private placeStores(level: Level, layout: TownLayout): StoreEntrance[] {
    const entrances: StoreEntrance[] = [];

    for (const store of layout.stores) {
      // Calculate entrance position: bottom center of building
      const entranceX = store.x + Math.floor(store.width / 2);
      const entranceY = store.y + store.height - 1;

      // Draw building walls
      this.drawStoreBuilding(level, store, { x: entranceX, y: entranceY });

      // Place entrance terrain
      const entranceTerrain = createStoreEntranceTerrain(store.storeKey);
      const entranceTile = level.getTile({ x: entranceX, y: entranceY });
      if (entranceTile) {
        entranceTile.terrain = entranceTerrain;
      }

      // Record entrance position
      const entrancePos: Position = { x: entranceX, y: entranceY };
      this.storeEntranceMap.set(`${entranceX},${entranceY}`, store.storeKey);
      entrances.push({ storeKey: store.storeKey, position: entrancePos });
    }

    return entrances;
  }

  private drawStoreBuilding(
    level: Level,
    store: StorePlacement,
    entrancePos: Position
  ): void {
    // Draw rectangular building with walls, leaving entrance open
    for (let y = store.y; y < store.y + store.height; y++) {
      for (let x = store.x; x < store.x + store.width; x++) {
        const isEdge =
          x === store.x ||
          x === store.x + store.width - 1 ||
          y === store.y ||
          y === store.y + store.height - 1;

        const isEntrance = x === entrancePos.x && y === entrancePos.y;

        if (isEdge && !isEntrance) {
          const tile = level.getTile({ x, y });
          if (tile) {
            tile.terrain = TOWN_WALL;
          }
        }
      }
    }
  }

  private placeDungeonEntrance(level: Level, layout: TownLayout): void {
    const tile = level.getTile(layout.dungeonEntrance);
    if (tile) {
      tile.terrain = DOWN_STAIRS;
    }
  }

  private getStoreKeyAt(pos: Position): string | undefined {
    return this.storeEntranceMap.get(`${pos.x},${pos.y}`);
  }
}
