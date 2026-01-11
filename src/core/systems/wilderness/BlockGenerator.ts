/**
 * Wilderness Block Generator
 *
 * Generates 16x16 tile blocks for the wilderness.
 * Port of wild3.c make_wild_01(), make_wild_02(), make_wild_03(), make_wild_04()
 *
 * Four generation routines:
 * 1. Plasma fractal terrain with weighted feature selection
 * 2. Flat probability terrain (cumulative chance)
 * 3. Overlay circle on base terrain
 * 4. Farm pattern with buildings
 */

import {
  WILD_BLOCK_SIZE,
  WILD_INFO_ROAD,
  WILD_INFO_WATER,
  WILD_INFO_LAVA,
  WILD_INFO_ACID,
  type WildBlock,
  type WildGenData,
} from '@/core/data/WildernessTypes';
import { PlasmaFractal } from './PlasmaFractal';
import type * as ROT from 'rot-js';

/**
 * A single tile in a generated block
 */
export interface WildTile {
  /** Feature type (terrain index) */
  feat: number;
  /** Info flags (road, water, etc.) */
  info: number;
}

/**
 * Feature constants (from terrain.json indices)
 */
const FEAT_FLOOR = 1;
const FEAT_GRASS = 89;
const FEAT_DIRT = 88;
const FEAT_SHAL_WATER = 84;
const FEAT_DEEP_WATER = 83;
const FEAT_SHAL_LAVA = 86;
const FEAT_PERM_EXTRA = 60; // permanent wall (building)

export class WildBlockGenerator {
  /** Map of id -> WildGenData for quick access */
  private dataById: Map<number, WildGenData>;

  /** Plasma fractal generator for terrain generation */
  private plasma: PlasmaFractal;

  /** RNG instance */
  private rng: typeof ROT.RNG;

  constructor(
    rng: typeof ROT.RNG,
    data: WildGenData[]
  ) {
    this.rng = rng;
    this.dataById = new Map();
    this.plasma = new PlasmaFractal(rng);

    for (const entry of data) {
      this.dataById.set(entry.id, entry);
    }
  }

  /**
   * Get the generation data for a terrain type.
   */
  getGenData(typeId: number): WildGenData | undefined {
    return this.dataById.get(typeId);
  }

  /**
   * Generate a 16x16 tile block.
   *
   * @param block The wilderness block data
   * @param wildX Block X coordinate in wilderness
   * @param wildY Block Y coordinate in wilderness
   * @param wildSeed Base seed for deterministic generation
   * @returns 16x16 grid of tiles
   */
  generateBlock(block: WildBlock, wildX: number, wildY: number, wildSeed: number): WildTile[][] {
    // Seed RNG deterministically based on position
    const blockSeed = wildSeed + wildX * 1000 + wildY * 1000000;
    this.rng.setSeed(blockSeed);

    const genData = this.getGenData(block.wild);
    if (!genData) {
      // Fallback: generate grass
      return this.generateGrass();
    }

    // Check if this is a road block (affects generation routine 4)
    const hasRoad = (block.info & WILD_INFO_ROAD) !== 0;

    // Generate base terrain based on generation routine
    let tiles: WildTile[][];
    switch (genData.genRoutine) {
      case 1:
        tiles = this.makeWild01(genData.data, hasRoad);
        break;
      case 2:
        tiles = this.makeWild02(genData.data, hasRoad);
        break;
      case 3:
        tiles = this.makeWild03(genData.data, hasRoad);
        break;
      case 4:
        tiles = this.makeWild04(genData.data, hasRoad);
        break;
      default:
        tiles = this.generateGrass();
    }

    // Apply overlays based on block info flags
    this.applyOverlays(tiles, block.info);

    return tiles;
  }

  /**
   * Generate a default grass block.
   */
  private generateGrass(): WildTile[][] {
    const tiles: WildTile[][] = [];
    for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
      tiles[y] = [];
      for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
        tiles[y][x] = { feat: FEAT_GRASS, info: 0 };
      }
    }
    return tiles;
  }

  /**
   * Generation routine 1: Plasma fractal terrain.
   *
   * Port of wild3.c:make_wild_01()
   *
   * Uses plasma fractal to generate height values, then maps
   * heights to features using weighted probability.
   */
  private makeWild01(data: number[], _road: boolean): WildTile[][] {
    const tiles: WildTile[][] = [];

    // Initialize temporary block
    this.plasma.clear();
    this.plasma.setCorners(WILD_BLOCK_SIZE * 128);
    this.plasma.setCenter(WILD_BLOCK_SIZE * 128);

    // Generate plasma fractal
    this.plasma.generate();

    // Make terrain block based on height map
    for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
      tiles[y] = [];
      for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
        // Get height value, normalize to 0-255
        const element = Math.floor(this.plasma.getValue(x, y) / WILD_BLOCK_SIZE);

        // Pick feature based on height
        const feat = this.pickFeat(
          data[0],
          data[2],
          data[4],
          data[6],
          data[1],
          data[3],
          data[5],
          data[7],
          Math.max(0, Math.min(255, element))
        );

        tiles[y][x] = { feat, info: 0 };
      }
    }

    return tiles;
  }

  /**
   * Generation routine 2: Flat probability terrain.
   *
   * Port of wild3.c:make_wild_02()
   *
   * Makes a uniform field from the feature in data[0].
   * Adds lower probability features using cumulative chances.
   */
  private makeWild02(data: number[], _road: boolean): WildTile[][] {
    const tiles: WildTile[][] = [];

    for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
      tiles[y] = [];
      for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
        let k = 0;
        let feat = FEAT_GRASS; // Default if first feature is zero

        while (true) {
          // Get feature
          const newFeat = data[k * 2];

          // End of list?
          if (newFeat === 0) break;

          // Use new feature
          feat = newFeat;

          // Done counting?
          if (k === 3) break;

          const chance = data[k * 2 + 1];

          // Exit if chance is zero
          if (!chance) break;

          // Stop if chance fails (randint0(chance + 1) != 0)
          if (this.randint0(chance + 1) !== 0) break;

          // Increment counter + loop
          k++;
        }

        tiles[y][x] = { feat, info: 0 };
      }
    }

    return tiles;
  }

  /**
   * Generation routine 3: Overlay circle.
   *
   * Port of wild3.c:make_wild_03()
   *
   * Generates base terrain from another type, then overlays
   * a "circle" of other terrain on top.
   */
  private makeWild03(data: number[], road: boolean): WildTile[][] {
    // Get base terrain type
    const baseType = data[0];
    const baseGenData = this.getGenData(baseType);

    let tiles: WildTile[][];

    // Generate base terrain
    if (baseGenData) {
      tiles = this.callGenRoutine(baseGenData.data, baseGenData.genRoutine, road);
    } else {
      tiles = this.generateGrass();
    }

    // Initialize plasma for circle overlay
    this.plasma.clear();

    // Large in center - small on sides
    this.plasma.setCorners(WILD_BLOCK_SIZE * 64);
    this.plasma.setCenter(WILD_BLOCK_SIZE * 256);

    // Generate plasma fractal
    this.plasma.generate();

    // Overlay the "circle" of terrain
    for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
      for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
        const element = this.plasma.getValue(x, y);

        // Outside circle?
        if (element < WILD_BLOCK_SIZE * 128) continue;

        if (element < WILD_BLOCK_SIZE * 171 && this.oneIn(2)) {
          // Outermost terrain
          if (data[1]) tiles[y][x].feat = data[1];
          continue;
        }

        if (element < WILD_BLOCK_SIZE * 213 && this.oneIn(2)) {
          // Middle terrain
          if (data[2]) tiles[y][x].feat = data[2];
          continue;
        }

        // Inner terrain
        if (data[3]) tiles[y][x].feat = data[3];
      }
    }

    return tiles;
  }

  /**
   * Generation routine 4: Farm pattern.
   *
   * Port of wild3.c:make_wild_04()
   *
   * Draw a pleasant field (farm) with optional building.
   */
  private makeWild04(_data: number[], road: boolean): WildTile[][] {
    const tiles: WildTile[][] = [];

    // Hack - generate and throw away a few random numbers
    this.randint0(100);
    this.randint0(100);
    this.randint0(100);

    // Get location of building
    const buildX = this.randRange(4, 11);
    const buildY = this.randRange(3, 12);

    // Get size of building
    const x1 = buildX - this.randint1(3);
    const x2 = buildX + this.randint1(3);
    const y1 = buildY - this.randint1(2);
    const y2 = buildY + this.randint1(2);

    // Get type of ground
    let type: number;
    switch (this.randint0(8)) {
      case 0:
      case 1:
      case 2:
        // Grass
        type = 1;
        break;
      case 3:
      case 4:
        // Alternating grass & dirt
        type = 3;
        break;
      case 5:
        // Dirt
        type = 2;
        break;
      case 6:
        // Dirt with building
        type = 4;
        break;
      default:
        // Grass with building
        type = 5;
        break;
    }

    // If there is a road, use types 1 or 2 (no building)
    if (road && type > 2) {
      type = this.randRange(1, 2);
    }

    for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
      tiles[y] = [];
      for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
        let feat: number;

        // Place ground
        if (type === 1 || (type === 3 && y % 2 === 0) || type === 5) {
          feat = FEAT_GRASS;
        } else {
          feat = FEAT_DIRT;
        }

        // Build an invulnerable rectangular building
        if (x >= x1 && x <= x2 && y >= y1 && y <= y2 && type >= 4) {
          feat = FEAT_PERM_EXTRA;
        } else if (x >= x1 - 1 && x <= x2 + 1 && y >= y1 - 1 && y <= y2 + 1 && type >= 4) {
          feat = FEAT_DIRT;
        }

        tiles[y][x] = { feat, info: 0 };
      }
    }

    return tiles;
  }

  /**
   * Call the appropriate generation routine.
   */
  private callGenRoutine(data: number[], genRoutine: number, road: boolean): WildTile[][] {
    switch (genRoutine) {
      case 1:
        return this.makeWild01(data, road);
      case 2:
        return this.makeWild02(data, road);
      case 3:
        return this.makeWild03(data, road);
      case 4:
        return this.makeWild04(data, road);
      default:
        return this.generateGrass();
    }
  }

  /**
   * Pick a feature based on inverse distance weighting.
   *
   * Port of wild3.c:pick_feat()
   *
   * The closer prob is to a feature's probability threshold,
   * the more likely that feature is to be selected.
   */
  private pickFeat(
    feat1: number,
    feat2: number,
    feat3: number,
    feat4: number,
    prob1: number,
    prob2: number,
    prob3: number,
    prob4: number,
    prob: number
  ): number {
    // Calculate chance factors using inverse distance
    let c1 = 0,
      c2 = 0,
      c3 = 0,
      c4 = 0;

    const MAX_CHANCE = 0x1000000;

    if (feat1) {
      if (prob1 === prob) {
        c1 = MAX_CHANCE;
      } else {
        c1 = Math.floor(MAX_CHANCE / Math.abs(prob1 - prob));
      }
    }

    if (feat2) {
      if (prob2 === prob) {
        c2 = MAX_CHANCE;
      } else {
        c2 = Math.floor(MAX_CHANCE / Math.abs(prob2 - prob));
      }
    }

    if (feat3) {
      if (prob3 === prob) {
        c3 = MAX_CHANCE;
      } else {
        c3 = Math.floor(MAX_CHANCE / Math.abs(prob3 - prob));
      }
    }

    if (feat4) {
      if (prob4 === prob) {
        c4 = MAX_CHANCE;
      } else {
        c4 = Math.floor(MAX_CHANCE / Math.abs(prob4 - prob));
      }
    }

    const total = c1 + c2 + c3 + c4;
    if (total === 0) {
      return feat1 || FEAT_GRASS;
    }

    // Get random choice
    let choice = Math.floor(this.rng.getUniform() * total);

    // Return terrain feature based on weighted chance
    if (choice < c1) return feat1;
    choice -= c1;

    if (choice < c2) return feat2;
    choice -= c2;

    if (choice < c3) return feat3;

    return feat4 || feat1 || FEAT_GRASS;
  }

  /**
   * Apply overlay effects based on block info flags.
   */
  private applyOverlays(tiles: WildTile[][], info: number): void {
    // Apply road overlay
    if (info & WILD_INFO_ROAD) {
      this.applyRoadOverlay(tiles);
    }

    // Apply water overlay
    if (info & WILD_INFO_WATER) {
      this.applyWaterOverlay(tiles);
    }

    // Apply lava overlay
    if (info & WILD_INFO_LAVA) {
      this.applyLavaOverlay(tiles);
    }

    // Apply acid overlay
    if (info & WILD_INFO_ACID) {
      this.applyAcidOverlay(tiles);
    }
  }

  /**
   * Apply road overlay using plasma fractal.
   *
   * Port of wild3.c:make_wild_road()
   */
  private applyRoadOverlay(tiles: WildTile[][]): void {
    // Generate a simple road through the center
    // Full implementation would consider adjacent blocks

    this.plasma.clear();
    this.plasma.setCorners(WILD_BLOCK_SIZE * 64);
    this.plasma.setCenter(WILD_BLOCK_SIZE * 192);
    this.plasma.generate();

    for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
      for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
        const element = this.plasma.getValue(x, y);

        // Road in center of fractal
        if (element > WILD_BLOCK_SIZE * 140) {
          tiles[y][x].feat = FEAT_FLOOR;
          tiles[y][x].info |= WILD_INFO_ROAD;
        }
      }
    }
  }

  /**
   * Apply water overlay (river/stream).
   */
  private applyWaterOverlay(tiles: WildTile[][]): void {
    this.plasma.clear();
    this.plasma.setCorners(WILD_BLOCK_SIZE * 64);
    this.plasma.setCenter(WILD_BLOCK_SIZE * 192);
    this.plasma.generate();

    for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
      for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
        const element = this.plasma.getValue(x, y);

        // Water in center of fractal
        if (element > WILD_BLOCK_SIZE * 160) {
          tiles[y][x].feat = FEAT_DEEP_WATER;
          tiles[y][x].info |= WILD_INFO_WATER;
        } else if (element > WILD_BLOCK_SIZE * 140) {
          tiles[y][x].feat = FEAT_SHAL_WATER;
          tiles[y][x].info |= WILD_INFO_WATER;
        }
      }
    }
  }

  /**
   * Apply lava overlay.
   */
  private applyLavaOverlay(tiles: WildTile[][]): void {
    this.plasma.clear();
    this.plasma.setCorners(WILD_BLOCK_SIZE * 64);
    this.plasma.setCenter(WILD_BLOCK_SIZE * 192);
    this.plasma.generate();

    for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
      for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
        const element = this.plasma.getValue(x, y);

        if (element > WILD_BLOCK_SIZE * 150) {
          tiles[y][x].feat = FEAT_SHAL_LAVA;
          tiles[y][x].info |= WILD_INFO_LAVA;
        }
      }
    }
  }

  /**
   * Apply acid overlay.
   */
  private applyAcidOverlay(tiles: WildTile[][]): void {
    // Use shallow acid (94) for acid pools
    const FEAT_SHAL_ACID = 94;

    this.plasma.clear();
    this.plasma.setCorners(WILD_BLOCK_SIZE * 64);
    this.plasma.setCenter(WILD_BLOCK_SIZE * 192);
    this.plasma.generate();

    for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
      for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
        const element = this.plasma.getValue(x, y);

        if (element > WILD_BLOCK_SIZE * 150) {
          tiles[y][x].feat = FEAT_SHAL_ACID;
          tiles[y][x].info |= WILD_INFO_ACID;
        }
      }
    }
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

  /**
   * Returns true with 1/n probability.
   */
  private oneIn(n: number): boolean {
    return this.randint0(n) === 0;
  }
}
