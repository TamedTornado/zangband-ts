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
  /** Dungeon entrance position */
  dungeonEntrance: { x: number; y: number };
  /** Player starting position */
  playerStart: { x: number; y: number };
}

/**
 * Feature constants (from terrain.json indices)
 */
const FEAT_FLOOR = 1;
const FEAT_GRASS = 89;
const FEAT_PERM_EXTRA = 60; // permanent wall
const FEAT_DOWN_STAIRS = 7;

/**
 * Store types for vanilla town
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
   */
  getTownType(place: WildPlace): TownType {
    if (place.type === 'dungeon') {
      return TownType.TOWN_DUNGEON;
    }

    // Starting town uses vanilla layout
    if (place.key === 'starting_town') {
      return TownType.TOWN_OLD;
    }

    // Other towns use fractal city
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

    // Place door (floor tile at entrance)
    if (doorY >= 0 && doorY < tiles.length && doorX >= 0 && doorX < tiles[0].length) {
      tiles[doorY][doorX] = { feat: FEAT_FLOOR, info: 0 };
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
   * Uses plasma fractal to determine building placement.
   */
  generateFractalCity(place: WildPlace): GeneratedTownData {
    const width = place.xsize * WILD_BLOCK_SIZE;
    const height = place.ysize * WILD_BLOCK_SIZE;

    // Initialize tiles with grass
    const tiles: TownTile[][] = [];
    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      for (let x = 0; x < width; x++) {
        tiles[y][x] = { feat: FEAT_GRASS, info: 0 };
      }
    }

    // Seed RNG with place seed
    this.rng.setSeed(place.seed);

    // Generate plasma fractal for city layout
    this.plasma.clear();
    this.plasma.setCorners(WILD_BLOCK_SIZE * 64);
    this.plasma.setCenter(WILD_BLOCK_SIZE * place.data); // Use population for density

    this.plasma.generate();

    // Determine building positions using a grid approach
    // Each building takes 8x8 pixels, so we can fit (width/8) x (height/8) grid cells
    const gridW = Math.floor(width / 8);
    const gridH = Math.floor(height / 8);

    const buildPositions: { x: number; y: number }[] = [];

    // Use plasma to decide which grid cells get buildings
    for (let gy = 1; gy < gridH - 1; gy++) {
      for (let gx = 1; gx < gridW - 1; gx++) {
        // Map grid position to plasma coordinates
        const px = Math.min(gx, WILD_BLOCK_SIZE - 1);
        const py = Math.min(gy, WILD_BLOCK_SIZE - 1);
        const element = this.plasma.getValue(px, py);

        // Use both high plasma values and random chance
        if (element > WILD_BLOCK_SIZE * 100 || this.randint0(4) === 0) {
          buildPositions.push({ x: gx, y: gy });
        }
      }
    }

    // Ensure at least one building if we got none
    if (buildPositions.length === 0) {
      const cx = Math.floor(gridW / 2);
      const cy = Math.floor(gridH / 2);
      buildPositions.push({ x: cx, y: cy });
    }

    // Draw buildings at selected positions
    const storePositions: StorePosition[] = [];
    let storeIndex = 0;

    for (const pos of buildPositions) {
      const bx = pos.x * 8;
      const by = pos.y * 8;

      if (bx + 7 < width && by + 7 < height) {
        // Draw a simple building
        for (let dy = 1; dy < 6; dy++) {
          for (let dx = 1; dx < 6; dx++) {
            tiles[by + dy][bx + dx] = { feat: FEAT_PERM_EXTRA, info: 0 };
          }
        }

        // Add entrance and assign store
        if (storeIndex < STORE_TYPES.length) {
          tiles[by + 5][bx + 3] = { feat: FEAT_FLOOR, info: 0 };
          storePositions.push({
            storeKey: STORE_TYPES[storeIndex],
            x: bx + 3,
            y: by + 5,
          });
          storeIndex++;
        }

        // Draw floor around building
        for (let dy = 0; dy < 8; dy++) {
          for (let dx = 0; dx < 8; dx++) {
            const tx = bx + dx;
            const ty = by + dy;
            if (tiles[ty][tx].feat === FEAT_GRASS) {
              tiles[ty][tx] = { feat: FEAT_FLOOR, info: 0 };
            }
          }
        }
      }
    }

    // Place dungeon entrance
    const dungeonEntrance = this.placeCityDungeonEntrance(tiles, width, height);

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
   */
  generateDungeonEntrance(place: WildPlace): GeneratedTownData {
    const width = place.xsize * WILD_BLOCK_SIZE;
    const height = place.ysize * WILD_BLOCK_SIZE;

    // Initialize tiles with grass
    const tiles: TownTile[][] = [];
    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      for (let x = 0; x < width; x++) {
        tiles[y][x] = { feat: FEAT_GRASS, info: 0 };
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
