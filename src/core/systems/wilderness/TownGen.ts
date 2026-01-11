/**
 * Zangband Town Generator
 *
 * Generates towns for the wilderness system.
 * Port of wild2.c van_town_gen(), draw_city(), and related functions.
 *
 * Town Types:
 * - TOWN_OLD: Vanilla Angband-style town (3x4 grid of stores)
 * - TOWN_FRACT: Fractal city generation with walls and gates
 * - TOWN_DUNGEON: Dungeon entrance point
 */

import { WILD_BLOCK_SIZE, type WildPlace } from '@/core/data/WildernessTypes';
import { PlasmaFractal } from './PlasmaFractal';
import type * as ROT from 'rot-js';

/**
 * Town type constants
 */
export const TownType = {
  TOWN_OLD: 'town_old',
  TOWN_FRACT: 'town_fract',
  TOWN_DUNGEON: 'town_dungeon',
} as const;

export type TownType = (typeof TownType)[keyof typeof TownType];

/**
 * A single tile in a generated town
 */
export interface TownTile {
  /** Feature type (terrain index) */
  feat: number;
  /** Info flags */
  info: number;
}

/**
 * Store position with key
 */
export interface StorePosition {
  storeKey: string;
  x: number;
  y: number;
}

/**
 * Result of town generation
 */
export interface GeneratedTownData {
  /** 2D array of tiles [y][x] */
  tiles: TownTile[][];
  /** Width in tiles */
  width: number;
  /** Height in tiles */
  height: number;
  /** Store entrance positions */
  storePositions: StorePosition[];
  /** Dungeon entrance position (null if town has no dungeon) */
  dungeonEntrance: { x: number; y: number } | null;
  /** Player starting position */
  playerStart: { x: number; y: number };
}

/**
 * Feature constants (from terrain.json indices)
 */
const FEAT_NONE = 0; // Transparent - wilderness shows through (per wild3.c:107)
const FEAT_FLOOR = 1;
const FEAT_PERM_EXTRA = 60; // permanent wall
const FEAT_DOWN_STAIRS = 7;

/**
 * Store entrance terrain indices (from terrain.json)
 */
const STORE_TERRAIN: Record<string, number> = {
  general_store: 140,
  armory: 141,
  weapon_smith: 142,
  temple: 143,
  alchemy_shop: 144,
  magic_shop: 145,
  black_market: 146,
  home: 147,
};

/**
 * Store types for towns (in order of preference)
 */
const STORE_TYPES = [
  'general_store',
  'armory',
  'weapon_smith',
  'temple',
  'alchemy_shop',
  'magic_shop',
  'black_market',
  'home',
  'library',
];

/**
 * Required stores for starting town per wild_first_town[] in Zangband reference.
 * These must be placed in the starting town.
 */
const STARTING_TOWN_STORES = [
  'general_store',
  'home',
  'armory',       // BUILD_WARHALL0
  'temple',
  'magic_shop',
  'black_market',
];

/**
 * Town dimensions for vanilla town (from C defines)
 */
const TOWN_WID = 64;
const TOWN_HGT = 21;
const V_TOWN_BLOCK_WID = 80;
const V_TOWN_BLOCK_HGT = 24;

export class ZangbandTownGenerator {
  private plasma: PlasmaFractal;
  private rng: typeof ROT.RNG;

  constructor(rng: typeof ROT.RNG) {
    this.rng = rng;
    this.plasma = new PlasmaFractal(rng);
  }

  /**
   * Generate a place based on its type.
   */
  generate(place: WildPlace): GeneratedTownData {
    if (place.type === 'dungeon') {
      return this.generateDungeonEntrance(place);
    }

    const townType = this.getTownType(place);
    if (townType === TownType.TOWN_OLD) {
      return this.generateVanillaTown(place);
    } else {
      return this.generateFractalCity(place);
    }
  }

  /**
   * Determine the town type for a place.
   *
   * Per Zangband reference: ALL towns use fractal city generation.
   * Starting town just has specific required buildings (DATA, not special code).
   */
  getTownType(place: WildPlace): TownType {
    if (place.type === 'dungeon') {
      return TownType.TOWN_DUNGEON;
    }

    // All towns use fractal city generation per Zangband reference
    return TownType.TOWN_FRACT;
  }

  /**
   * Generate a vanilla Angband-style town.
   *
   * Port of wild2.c:van_town_gen()
   *
   * Creates a rectangular town with:
   * - Permanent walls around the edges
   * - Floor tiles inside
   * - 3x4 grid of stores
   * - Dungeon entrance (down stairs)
   */
  generateVanillaTown(place: WildPlace): GeneratedTownData {
    const width = V_TOWN_BLOCK_WID;
    const height = V_TOWN_BLOCK_HGT;

    // Initialize tiles with permanent walls
    const tiles: TownTile[][] = [];
    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      for (let x = 0; x < width; x++) {
        tiles[y][x] = { feat: FEAT_PERM_EXTRA, info: 0 };
      }
    }

    // Seed RNG with place seed for deterministic generation
    this.rng.setSeed(place.seed);

    // Place floor tiles inside
    for (let y = 1; y < TOWN_HGT - 1; y++) {
      for (let x = 1; x < TOWN_WID - 1; x++) {
        tiles[y][x] = { feat: FEAT_FLOOR, info: 0 };
      }
    }

    // Place stores in 3x4 grid
    const storePositions = this.placeVanillaStores(tiles);

    // Place dungeon entrance
    const dungeonEntrance = this.placeDungeonStairs(tiles, storePositions);

    // Player starts near dungeon entrance
    const playerStart = { x: dungeonEntrance.x, y: dungeonEntrance.y + 1 };

    return {
      tiles,
      width,
      height,
      storePositions,
      dungeonEntrance,
      playerStart,
    };
  }

  /**
   * Place stores in a 3x4 grid pattern.
   *
   * Port of wild2.c:town_gen_hack()
   */
  private placeVanillaStores(tiles: TownTile[][]): StorePosition[] {
    const storePositions: StorePosition[] = [];

    // Prepare array of store indices
    const rooms: number[] = [];
    for (let n = 0; n < 12; n++) rooms[n] = n;
    let n = 12;

    // Place three rows of stores
    for (let row = 0; row < 3; row++) {
      // Place four stores per row
      for (let col = 0; col < 4; col++) {
        // Pick a random unplaced store
        const k = n <= 1 ? 0 : this.randint0(n);

        // Only build real stores (first 9 are actual stores)
        if (rooms[k] < STORE_TYPES.length) {
          const storeKey = STORE_TYPES[rooms[k]];
          const pos = this.buildStore(tiles, col, row, storeKey);
          storePositions.push(pos);
        }

        // Shift stores down, remove one store
        rooms[k] = rooms[--n];
      }
    }

    return storePositions;
  }

  /**
   * Build a single store building.
   *
   * Port of wild2.c:build_store()
   */
  private buildStore(tiles: TownTile[][], xx: number, yy: number, storeKey: string): StorePosition {
    // Find the "center" of the store
    const y0 = yy * 6 + 4;
    const x0 = xx * 16 + 8;

    // Determine store boundaries
    const y1 = y0 - this.randint1(2);
    const y2 = y0 + this.randint1(2);
    const x1 = x0 - this.randint1(5);
    const x2 = x0 + this.randint1(5);

    // Build invulnerable rectangular building
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
          tiles[y][x] = { feat: FEAT_PERM_EXTRA, info: 0 };
        }
      }
    }

    // Pick a door direction (S,N,E,W)
    let tmp = this.randint0(4);

    // Re-roll "annoying" doors
    if (
      (tmp === 0 && yy === 2) ||
      (tmp === 1 && yy === 0) ||
      (tmp === 2 && xx === 3) ||
      (tmp === 3 && xx === 0)
    ) {
      tmp = this.randint0(4);
    }

    // Extract door location
    let doorX: number, doorY: number;
    switch (tmp) {
      case 0: // Bottom side
        doorY = y2;
        doorX = this.randRange(x1, x2);
        break;
      case 1: // Top side
        doorY = y1;
        doorX = this.randRange(x1, x2);
        break;
      case 2: // Right side
        doorY = this.randRange(y1, y2);
        doorX = x2;
        break;
      default: // Left side
        doorY = this.randRange(y1, y2);
        doorX = x1;
        break;
    }

    // Place door (store terrain at entrance)
    const storeFeat = STORE_TERRAIN[storeKey] ?? FEAT_FLOOR;
    if (doorY >= 0 && doorY < tiles.length && doorX >= 0 && doorX < tiles[0].length) {
      tiles[doorY][doorX] = { feat: storeFeat, info: 0 };
    }

    return { storeKey, x: doorX, y: doorY };
  }

  /**
   * Place dungeon entrance (down stairs) at a valid location.
   */
  private placeDungeonStairs(
    tiles: TownTile[][],
    storePositions: StorePosition[]
  ): { x: number; y: number } {
    const storeSet = new Set(storePositions.map((s) => `${s.x},${s.y}`));

    // Try to find an empty floor tile
    let attempts = 0;
    while (attempts < 1000) {
      const xx = this.randRange(3, TOWN_WID - 4);
      const yy = this.randRange(3, TOWN_HGT - 4);

      // Skip if it's a store entrance
      if (storeSet.has(`${xx},${yy}`)) {
        attempts++;
        continue;
      }

      // Check if it's floor
      if (tiles[yy] && tiles[yy][xx] && tiles[yy][xx].feat === FEAT_FLOOR) {
        tiles[yy][xx] = { feat: FEAT_DOWN_STAIRS, info: 0 };
        return { x: xx, y: yy };
      }

      attempts++;
    }

    // Fallback: place at center
    const cx = Math.floor(TOWN_WID / 2);
    const cy = Math.floor(TOWN_HGT / 2);
    tiles[cy][cx] = { feat: FEAT_DOWN_STAIRS, info: 0 };
    return { x: cx, y: cy };
  }

  /**
   * Generate a fractal city.
   *
   * Port of wild2.c:draw_city()
   *
   * temp_block is 16x16 BUILDING SLOTS (not tiles!)
   * Each slot represents an 8x8 tile area.
   * Town is always 8x8 blocks = 128x128 tiles (per Zangband).
   */
  generateFractalCity(place: WildPlace): GeneratedTownData {
    // Town is always 8x8 blocks = 128x128 tiles
    const TOWN_BLOCKS = 8;
    const width = TOWN_BLOCKS * WILD_BLOCK_SIZE;
    const height = TOWN_BLOCKS * WILD_BLOCK_SIZE;

    // Initialize tiles with FEAT_NONE (transparent - wilderness shows through)
    const tiles: TownTile[][] = [];
    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      for (let x = 0; x < width; x++) {
        tiles[y][x] = { feat: FEAT_NONE, info: 0 };
      }
    }

    // Seed RNG with place seed
    this.rng.setSeed(place.seed);

    // Generate plasma fractal in temp_block[16][16]
    // Each cell is a building SLOT (8x8 tiles)
    this.plasma.clear();
    this.plasma.setCorners(WILD_BLOCK_SIZE * 64); // = 1024
    this.plasma.setCenter(WILD_BLOCK_SIZE * place.data); // = 16 * pop
    this.plasma.generate();

    // Cell states (like Zangband's CITY_OUTSIDE, CITY_WALL, CITY_INSIDE)
    const CITY_OUTSIDE = 0;
    const CITY_WALL = 1;
    const CITY_INSIDE = 2;

    // Step 1: Convert plasma to city shape (find_walls)
    // Threshold: values < WILD_BLOCK_SIZE * 128 (2048) become CITY_OUTSIDE
    const tempBlock: number[][] = [];
    const threshold = WILD_BLOCK_SIZE * 128;

    for (let j = 0; j < WILD_BLOCK_SIZE; j++) {
      tempBlock[j] = [];
      for (let i = 0; i < WILD_BLOCK_SIZE; i++) {
        const val = this.plasma.getValue(i, j);
        tempBlock[j][i] = val < threshold ? CITY_OUTSIDE : val;
      }
    }

    // Step 2: Mark walls (any inside cell adjacent to outside or edge)
    for (let j = 0; j < WILD_BLOCK_SIZE; j++) {
      for (let i = 0; i < WILD_BLOCK_SIZE; i++) {
        if (tempBlock[j][i] !== CITY_OUTSIDE) {
          // Check all 8 neighbors
          let isWall = false;
          for (let dj = -1; dj <= 1 && !isWall; dj++) {
            for (let di = -1; di <= 1 && !isWall; di++) {
              const ni = i + di;
              const nj = j + dj;
              if (ni < 0 || ni >= WILD_BLOCK_SIZE || nj < 0 || nj >= WILD_BLOCK_SIZE) {
                isWall = true; // Edge = wall
              } else if (tempBlock[nj][ni] === CITY_OUTSIDE) {
                isWall = true;
              }
            }
          }
          if (isWall) {
            tempBlock[j][i] = CITY_WALL;
          }
        }
      }
    }

    // Step 3: Flood fill from center to find building positions
    const buildPositions: { x: number; y: number; pop: number }[] = [];
    const centerI = Math.floor(WILD_BLOCK_SIZE / 2);
    const centerJ = Math.floor(WILD_BLOCK_SIZE / 2);

    // Check center is inside city
    if (tempBlock[centerJ][centerI] !== CITY_OUTSIDE && tempBlock[centerJ][centerI] !== CITY_WALL) {
      const stack: { i: number; j: number }[] = [{ i: centerI, j: centerJ }];

      while (stack.length > 0) {
        const { i, j } = stack.pop()!;
        if (i < 0 || i >= WILD_BLOCK_SIZE || j < 0 || j >= WILD_BLOCK_SIZE) continue;
        if (tempBlock[j][i] === CITY_OUTSIDE || tempBlock[j][i] === CITY_WALL || tempBlock[j][i] === CITY_INSIDE) continue;

        // Save population value before marking
        const popVal = Math.floor(tempBlock[j][i] / WILD_BLOCK_SIZE);
        tempBlock[j][i] = CITY_INSIDE;
        buildPositions.push({ x: i, y: j, pop: popVal });

        // Add all 8 neighbors
        for (let dj = -1; dj <= 1; dj++) {
          for (let di = -1; di <= 1; di++) {
            if (di !== 0 || dj !== 0) {
              stack.push({ i: i + di, j: j + dj });
            }
          }
        }
      }
    }

    // Step 4: Remove islands (wall cells not adjacent to CITY_INSIDE)
    for (let j = 0; j < WILD_BLOCK_SIZE; j++) {
      for (let i = 0; i < WILD_BLOCK_SIZE; i++) {
        if (tempBlock[j][i] === CITY_WALL) {
          let hasInside = false;
          for (let dj = -1; dj <= 1 && !hasInside; dj++) {
            for (let di = -1; di <= 1 && !hasInside; di++) {
              const ni = i + di;
              const nj = j + dj;
              if (ni >= 0 && ni < WILD_BLOCK_SIZE && nj >= 0 && nj < WILD_BLOCK_SIZE) {
                if (tempBlock[nj][ni] === CITY_INSIDE) hasInside = true;
              }
            }
          }
          if (!hasInside) tempBlock[j][i] = CITY_OUTSIDE;
        }
      }
    }

    // Step 5: Fill interior with floor (all CITY_INSIDE cells)
    // This prevents wilderness from showing through inside the town walls.
    for (let j = 0; j < WILD_BLOCK_SIZE; j++) {
      for (let i = 0; i < WILD_BLOCK_SIZE; i++) {
        if (tempBlock[j][i] === CITY_INSIDE) {
          const x = i * 8;
          const y = j * 8;
          this.fillRect(tiles, x, y, x + 7, y + 7, FEAT_FLOOR);
        }
      }
    }

    // Step 6: Draw walls as connecting LINES (not filling entire cells)
    for (let j = 0; j < WILD_BLOCK_SIZE; j++) {
      for (let i = 0; i < WILD_BLOCK_SIZE; i++) {
        if (tempBlock[j][i] === CITY_WALL) {
          const x = i * 8;
          const y = j * 8;

          // Wall goes up (neighbor above is CITY_WALL)
          if (j > 0 && tempBlock[j - 1][i] === CITY_WALL) {
            this.fillRect(tiles, x + 3, y, x + 4, y + 4, FEAT_PERM_EXTRA);
          }
          // Wall goes left
          if (i > 0 && tempBlock[j][i - 1] === CITY_WALL) {
            this.fillRect(tiles, x, y + 3, x + 4, y + 4, FEAT_PERM_EXTRA);
          }
          // Wall goes right
          if (i < WILD_BLOCK_SIZE - 1 && tempBlock[j][i + 1] === CITY_WALL) {
            this.fillRect(tiles, x + 3, y + 3, x + 7, y + 4, FEAT_PERM_EXTRA);
          }
          // Wall goes down
          if (j < WILD_BLOCK_SIZE - 1 && tempBlock[j + 1][i] === CITY_WALL) {
            this.fillRect(tiles, x + 3, y + 3, x + 4, y + 7, FEAT_PERM_EXTRA);
          }
        }
      }
    }

    // Step 7: Find gate positions (extremes of city shape)
    const gates = this.findGatePositions(tempBlock);

    // Step 8: Draw gates (floor openings at gate positions)
    for (const gate of gates) {
      const gx = gate.x * 8 + 4;
      const gy = gate.y * 8 + 4;
      // Make a 3x3 floor opening for the gate
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (gy + dy >= 0 && gy + dy < height && gx + dx >= 0 && gx + dx < width) {
            tiles[gy + dy][gx + dx] = { feat: FEAT_FLOOR, info: 0 };
          }
        }
      }
    }

    // Step 9: Draw buildings and assign stores
    const storesToPlace = place.key === 'starting_town'
      ? STARTING_TOWN_STORES
      : STORE_TYPES;

    const storePositions: StorePosition[] = [];
    let storeIndex = 0;

    // Shuffle building positions for variety
    for (let i = buildPositions.length - 1; i > 0; i--) {
      const j = this.randint0(i + 1);
      [buildPositions[i], buildPositions[j]] = [buildPositions[j], buildPositions[i]];
    }

    for (const pos of buildPositions) {
      const bx = pos.x * 8;
      const by = pos.y * 8;

      // Draw building (5x5 walls centered in 8x8 cell)
      for (let dy = 1; dy < 6; dy++) {
        for (let dx = 1; dx < 6; dx++) {
          if (by + dy < height && bx + dx < width) {
            tiles[by + dy][bx + dx] = { feat: FEAT_PERM_EXTRA, info: 0 };
          }
        }
      }

      // Add entrance and assign store
      if (storeIndex < storesToPlace.length) {
        const doorX = bx + 3;
        const doorY = by + 5;
        const storeKey = storesToPlace[storeIndex];
        const storeFeat = STORE_TERRAIN[storeKey] ?? FEAT_FLOOR;
        if (doorY < height && doorX < width) {
          tiles[doorY][doorX] = { feat: storeFeat, info: 0 };
          storePositions.push({
            storeKey,
            x: doorX,
            y: doorY,
          });
          storeIndex++;
        }
      }
    }

    // Only place dungeon entrance in towns that have a dungeon (starting_town)
    const dungeonEntrance = place.dungeonTypeId !== undefined
      ? this.placeCityDungeonEntrance(tiles, width, height)
      : null;

    // Player starts near center
    const playerStart = { x: Math.floor(width / 2), y: Math.floor(height / 2) };

    return {
      tiles,
      width,
      height,
      storePositions,
      dungeonEntrance,
      playerStart,
    };
  }

  /**
   * Find gate positions at N/S/E/W extremes of city shape.
   */
  private findGatePositions(tempBlock: number[][]): { x: number; y: number }[] {
    const CITY_WALL = 1;
    const gates: { x: number; y: number }[] = [];

    let maxI = -1, minI = WILD_BLOCK_SIZE, maxJ = -1, minJ = WILD_BLOCK_SIZE;
    let rightGate = { x: 0, y: 0 };
    let leftGate = { x: 0, y: 0 };
    let bottomGate = { x: 0, y: 0 };
    let topGate = { x: 0, y: 0 };

    for (let j = 0; j < WILD_BLOCK_SIZE; j++) {
      for (let i = 0; i < WILD_BLOCK_SIZE; i++) {
        if (tempBlock[j][i] === CITY_WALL) {
          if (i > maxI) { maxI = i; rightGate = { x: i, y: j }; }
          if (i < minI) { minI = i; leftGate = { x: i, y: j }; }
          if (j > maxJ) { maxJ = j; bottomGate = { x: i, y: j }; }
          if (j < minJ) { minJ = j; topGate = { x: i, y: j }; }
        }
      }
    }

    if (maxI >= 0) gates.push(rightGate);
    if (minI < WILD_BLOCK_SIZE) gates.push(leftGate);
    if (maxJ >= 0) gates.push(bottomGate);
    if (minJ < WILD_BLOCK_SIZE) gates.push(topGate);

    return gates;
  }

  /**
   * Fill a rectangle with a feature.
   */
  private fillRect(tiles: TownTile[][], x1: number, y1: number, x2: number, y2: number, feat: number): void {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
          tiles[y][x] = { feat, info: 0 };
        }
      }
    }
  }

  /**
   * Place dungeon entrance in a fractal city.
   */
  private placeCityDungeonEntrance(
    tiles: TownTile[][],
    width: number,
    height: number
  ): { x: number; y: number } {
    // Try to find an empty floor tile near center
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);

    for (let r = 0; r < 20; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = cx + dx;
          const y = cy + dy;

          if (y >= 0 && y < height && x >= 0 && x < width) {
            if (tiles[y][x].feat === FEAT_FLOOR) {
              tiles[y][x] = { feat: FEAT_DOWN_STAIRS, info: 0 };
              return { x, y };
            }
          }
        }
      }
    }

    // Fallback
    tiles[cy][cx] = { feat: FEAT_DOWN_STAIRS, info: 0 };
    return { x: cx, y: cy };
  }

  /**
   * Generate a dungeon entrance point.
   * Most tiles are FEAT_NONE (transparent), with a small clearing at center.
   */
  generateDungeonEntrance(place: WildPlace): GeneratedTownData {
    const width = place.xsize * WILD_BLOCK_SIZE;
    const height = place.ysize * WILD_BLOCK_SIZE;

    // Initialize tiles with FEAT_NONE (transparent - wilderness shows through)
    const tiles: TownTile[][] = [];
    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      for (let x = 0; x < width; x++) {
        tiles[y][x] = { feat: FEAT_NONE, info: 0 };
      }
    }

    // Place down stairs at center
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);

    // Create a small clearing around the entrance
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (y >= 0 && y < height && x >= 0 && x < width) {
          tiles[y][x] = { feat: FEAT_FLOOR, info: 0 };
        }
      }
    }

    // Place down stairs
    tiles[cy][cx] = { feat: FEAT_DOWN_STAIRS, info: 0 };

    return {
      tiles,
      width,
      height,
      storePositions: [],
      dungeonEntrance: { x: cx, y: cy },
      playerStart: { x: cx, y: cy + 1 },
    };
  }

  /**
   * Random integer 0 to max-1.
   */
  private randint0(max: number): number {
    if (max <= 0) return 0;
    return Math.floor(this.rng.getUniform() * max);
  }

  /**
   * Random integer 1 to max.
   */
  private randint1(max: number): number {
    if (max <= 0) return 0;
    return Math.floor(this.rng.getUniform() * max) + 1;
  }

  /**
   * Random integer in range [min, max].
   */
  private randRange(min: number, max: number): number {
    return min + Math.floor(this.rng.getUniform() * (max - min + 1));
  }
}
