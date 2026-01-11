/**
 * Wilderness Generator
 *
 * Generates the complete wilderness map including:
 * - Height, population, and law parameter maps (using plasma fractals)
 * - Rivers flowing from high to low terrain
 * - Lakes placed at appropriate locations
 * - Towns and dungeons with minimum distance constraints
 * - Roads connecting places
 *
 * Port of wild1.c:create_wilderness() and related functions.
 */

import {
  WILD_BLOCK_SIZE,
  WILD_TOWN_SIZE,
  SEA_FRACTION,
  LAKE_NUM,
  RIVER_NUM,
  ROAD_DIST,
  MIN_DIST_TOWN,
  MIN_DIST_DUNGEON,
  NUM_TOWNS,
  NUM_DUNGEON,
  MAX_WILD,
  WILD_INFO_WATER,
  WILD_INFO_ROAD,
  WILD_INFO_TRACK,
  WILD_INFO_LAVA,
  WILD_INFO_ACID,
  type WildBlock,
  type WildPlace,
  type WildGenData,
} from '@/core/data/WildernessTypes';
import { PlasmaFractal } from './PlasmaFractal';
import { WildDecisionTree } from './DecisionTree';
import type * as ROT from 'rot-js';

/**
 * Result of wilderness generation
 */
export interface WildernessMap {
  /** 2D array of wilderness blocks [y][x] */
  blocks: WildBlock[][];

  /** List of places (towns, dungeons) */
  places: WildPlace[];

  /** Get a block by coordinates */
  getBlock(x: number, y: number): WildBlock | undefined;

  /** Get a place by key */
  getPlace(key: string): WildPlace | undefined;

  /** Get the starting position (center of starting town) */
  getStartingPosition(): { x: number; y: number };

  /** The seed used for generation */
  seed: number;

  /** Map dimensions */
  size: number;
}

/**
 * Wilderness Generator
 */
export class WildernessGenerator {
  /** Decision tree for terrain type lookup */
  private decisionTree: WildDecisionTree;

  /** Plasma fractal generator */
  private plasma: PlasmaFractal;

  /** Height parameter map */
  private hgtMap: number[][] = [];

  /** Population parameter map */
  private popMap: number[][] = [];

  /** Law parameter map */
  private lawMap: number[][] = [];

  /** Generated wilderness blocks */
  private blocks: WildBlock[][] = [];

  /** Generated places */
  private places: WildPlace[] = [];

  /** Place counter for assigning place IDs */
  private placeCount = 0;

  /** Map of place key to place */
  private placesByKey: Map<string, WildPlace> = new Map();

  /** RNG instance */
  private rng: typeof ROT.RNG;

  /** Size of the wilderness map */
  readonly size: number;

  constructor(
    rng: typeof ROT.RNG,
    genData: WildGenData[],
    size: number = MAX_WILD
  ) {
    this.rng = rng;
    this.size = size;
    this.decisionTree = new WildDecisionTree(genData, rng);
    this.plasma = new PlasmaFractal(rng);
  }

  /**
   * Generate the complete wilderness map.
   *
   * Port of wild1.c:create_wilderness()
   */
  generate(): WildernessMap {
    // Reset state
    this.hgtMap = [];
    this.popMap = [];
    this.lawMap = [];
    this.blocks = [];
    this.places = [];
    this.placeCount = 0;
    this.placesByKey.clear();

    // Initialize block array
    for (let y = 0; y < this.size; y++) {
      this.blocks[y] = [];
      for (let x = 0; x < this.size; x++) {
        this.blocks[y][x] = {
          wild: 0,
          place: 0,
          info: 0,
          monGen: 0,
          monProb: 0,
        };
      }
    }

    // Generate parameter maps using plasma fractals
    this.createWildInfo();

    // Add rivers
    this.createRivers();

    // Add lakes
    this.createLakes();

    // Place towns and dungeons
    this.initPlaces();

    // Create roads connecting places
    this.createRoads();

    // Convert parameters to terrain types
    this.createTerrain();

    // Calculate monster generation levels
    this.calculateMonsterLevels();

    // Build result
    const seed = Math.floor(this.rng.getUniform() * 1000000);
    return this.buildResult(seed);
  }

  /**
   * Generate the height, population, and law parameter maps.
   *
   * Port of wild1.c:create_wild_info()
   */
  private createWildInfo(): void {
    // Generate height map
    this.hgtMap = this.generateParameterMap();

    // Generate population map (affected by height - no population in ocean)
    this.popMap = this.generateParameterMap();

    // Generate law map
    this.lawMap = this.generateParameterMap();

    // Normalize maps to 0-255 range
    this.normalizeMap(this.hgtMap);
    this.normalizeMap(this.popMap);
    this.normalizeMap(this.lawMap);

    // Reduce population in ocean areas (low height)
    const seaLevel = 256 / SEA_FRACTION;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.hgtMap[y][x] < seaLevel) {
          this.popMap[y][x] = 0;
          this.lawMap[y][x] = Math.floor(this.lawMap[y][x] / 2);
        }
      }
    }
  }

  /**
   * Generate a single parameter map using plasma fractal.
   */
  private generateParameterMap(): number[][] {
    const map: number[][] = [];

    // Initialize map
    for (let y = 0; y < this.size; y++) {
      map[y] = [];
      for (let x = 0; x < this.size; x++) {
        map[y][x] = 0;
      }
    }

    // Use plasma fractal to generate the map
    this.plasma.clear();
    this.plasma.setCorners(Math.floor(this.rng.getUniform() * 4096));
    this.plasma.generate();

    // Sample from fractal grid
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const fx = Math.floor((x / this.size) * WILD_BLOCK_SIZE);
        const fy = Math.floor((y / this.size) * WILD_BLOCK_SIZE);
        map[y][x] = this.plasma.getValue(fx, fy);
      }
    }

    return map;
  }

  /**
   * Normalize a parameter map to 0-255 range.
   */
  private normalizeMap(map: number[][]): void {
    let min = Infinity;
    let max = -Infinity;

    // Find min/max
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        min = Math.min(min, map[y][x]);
        max = Math.max(max, map[y][x]);
      }
    }

    // Normalize
    const range = max - min;
    if (range > 0) {
      for (let y = 0; y < this.size; y++) {
        for (let x = 0; x < this.size; x++) {
          map[y][x] = Math.floor(((map[y][x] - min) / range) * 255);
        }
      }
    }
  }

  /**
   * Create rivers flowing from high to low terrain.
   *
   * Port of wild1.c:create_rivers()
   */
  private createRivers(): void {
    const numRivers = RIVER_NUM * RIVER_NUM;
    const seaLevel = 256 / SEA_FRACTION;

    // Find high points to start rivers
    const highPoints: Array<{ x: number; y: number; height: number }> = [];

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.hgtMap[y][x] > 180) {
          highPoints.push({ x, y, height: this.hgtMap[y][x] });
        }
      }
    }

    // Sort by height descending
    highPoints.sort((a, b) => b.height - a.height);

    // Create rivers from highest points
    const riverCount = Math.min(numRivers, highPoints.length);
    for (let i = 0; i < riverCount; i++) {
      this.flowRiver(highPoints[i].x, highPoints[i].y, seaLevel);
    }
  }

  /**
   * Flow a river from a high point to low terrain.
   */
  private flowRiver(startX: number, startY: number, seaLevel: number): void {
    let x = startX;
    let y = startY;
    let currentHeight = this.hgtMap[y][x];

    const maxSteps = this.size * 2;
    for (let step = 0; step < maxSteps; step++) {
      // Mark current position as water
      this.blocks[y][x].info |= WILD_INFO_WATER;

      // Stop if we reach sea level
      if (currentHeight < seaLevel) break;

      // Find lowest neighbor
      let lowestX = x;
      let lowestY = y;
      let lowestHeight = currentHeight;

      const neighbors = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ];

      for (const [dx, dy] of neighbors) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
          const neighborHeight = this.hgtMap[ny][nx];
          if (neighborHeight < lowestHeight) {
            lowestHeight = neighborHeight;
            lowestX = nx;
            lowestY = ny;
          }
        }
      }

      // Stop if no lower neighbor (local minimum)
      if (lowestX === x && lowestY === y) break;

      x = lowestX;
      y = lowestY;
      currentHeight = lowestHeight;
    }
  }

  /**
   * Create lakes in appropriate locations.
   *
   * Port of wild1.c:create_lakes()
   */
  private createLakes(): void {
    const seaLevel = 256 / SEA_FRACTION;

    for (let i = 0; i < LAKE_NUM; i++) {
      // Try to place a lake at a random location
      const x = Math.floor(this.rng.getUniform() * (this.size - 4)) + 2;
      const y = Math.floor(this.rng.getUniform() * (this.size - 4)) + 2;

      // Must be above sea level
      if (this.hgtMap[y][x] < seaLevel) continue;

      // Create a small lake (3x3 to 5x5)
      const lakeSize = 1 + Math.floor(this.rng.getUniform() * 2);

      for (let dy = -lakeSize; dy <= lakeSize; dy++) {
        for (let dx = -lakeSize; dx <= lakeSize; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
            // Circular shape
            if (dx * dx + dy * dy <= lakeSize * lakeSize) {
              this.blocks[ny][nx].info |= WILD_INFO_WATER;
            }
          }
        }
      }
    }
  }

  /**
   * Place towns and dungeons.
   *
   * Port of wild1.c:init_places()
   */
  private initPlaces(): void {
    const seaLevel = 256 / SEA_FRACTION;

    // Find the best location for the starting town
    // Should be high law, high population, above sea level
    // Must leave room for town to fit within bounds
    let bestX = Math.floor(this.size / 2);
    let bestY = Math.floor(this.size / 2);
    let bestScore = -Infinity;

    for (let y = 2; y < this.size - WILD_TOWN_SIZE; y++) {
      for (let x = 2; x < this.size - WILD_TOWN_SIZE; x++) {
        if (this.hgtMap[y][x] < seaLevel) continue;
        if (this.blocks[y][x].info & WILD_INFO_WATER) continue;

        const score = this.lawMap[y][x] + this.popMap[y][x];
        if (score > bestScore) {
          bestScore = score;
          bestX = x;
          bestY = y;
        }
      }
    }

    // Create starting town
    // Per Zangband: all fractal cities are 8x8 blocks (128x128 tiles)
    // Starting town uses pop = 192 (64 + 128)
    this.addPlace({
      key: 'starting_town',
      type: 'town',
      name: 'The Town',
      x: bestX,
      y: bestY,
      xsize: WILD_TOWN_SIZE,
      ysize: WILD_TOWN_SIZE,
      seed: Math.floor(this.rng.getUniform() * 1000000),
      data: 192, // Starting town pop = 64 + 128 per Zangband
      monstType: 1, // Villagers
    });

    // Add more towns
    this.placeMultiple('town', NUM_TOWNS - 1, MIN_DIST_TOWN);

    // Add dungeons
    this.placeMultiple('dungeon', NUM_DUNGEON, MIN_DIST_DUNGEON);
  }

  /**
   * Place multiple places of a type with minimum distance constraint.
   */
  private placeMultiple(type: 'town' | 'dungeon', count: number, minDist: number): void {
    const seaLevel = 256 / SEA_FRACTION;
    let placed = 0;
    let attempts = 0;
    const maxAttempts = count * 50;

    // Towns use WILD_TOWN_SIZE, dungeons are 1x1
    const placeSize = type === 'town' ? WILD_TOWN_SIZE : 1;

    while (placed < count && attempts < maxAttempts) {
      attempts++;

      // Leave room for place size within bounds
      const x = Math.floor(this.rng.getUniform() * (this.size - placeSize - 2)) + 2;
      const y = Math.floor(this.rng.getUniform() * (this.size - placeSize - 2)) + 2;

      // Must be above sea level
      if (this.hgtMap[y][x] < seaLevel) continue;

      // Must not be in water
      if (this.blocks[y][x].info & WILD_INFO_WATER) continue;

      // Check minimum distance to existing places of same type
      let tooClose = false;
      for (const place of this.places) {
        if (place.type === type) {
          const dist = Math.abs(place.x - x) + Math.abs(place.y - y);
          if (dist < minDist) {
            tooClose = true;
            break;
          }
        }
      }

      if (tooClose) continue;

      // Place it
      const key = `${type}_${placed + 1}`;
      const name = type === 'town' ? `Town ${placed + 2}` : `Dungeon ${placed + 1}`;

      // Per Zangband: all fractal cities are 8x8 blocks
      // Population affects city shape (higher = larger area within 8x8)
      const pop = 100 + Math.floor(this.rng.getUniform() * 128);

      this.addPlace({
        key,
        type,
        name,
        x,
        y,
        xsize: type === 'town' ? WILD_TOWN_SIZE : 1,
        ysize: type === 'town' ? WILD_TOWN_SIZE : 1,
        seed: Math.floor(this.rng.getUniform() * 1000000),
        data: type === 'town' ? pop : 0,
        monstType: type === 'town' ? 1 + Math.floor(this.rng.getUniform() * 5) : 0,
      });

      placed++;
    }
  }

  /**
   * Add a place to the map.
   */
  private addPlace(place: WildPlace): void {
    this.placeCount++;
    this.places.push(place);
    this.placesByKey.set(place.key, place);

    // Mark blocks occupied by this place
    for (let dy = 0; dy < place.ysize; dy++) {
      for (let dx = 0; dx < place.xsize; dx++) {
        const bx = place.x + dx;
        const by = place.y + dy;
        if (bx >= 0 && bx < this.size && by >= 0 && by < this.size) {
          this.blocks[by][bx].place = this.placeCount;
        }
      }
    }
  }

  /**
   * Create roads connecting places.
   *
   * Port of wild1.c:create_roads()
   */
  private createRoads(): void {
    // Connect each place to nearest neighbors
    for (let i = 0; i < this.places.length; i++) {
      const place1 = this.places[i];

      // Find closest other place, preferring those within ROAD_DIST
      let closestDistInRange = Infinity;
      let closestPlaceInRange: WildPlace | null = null;
      let closestDistAny = Infinity;
      let closestPlaceAny: WildPlace | null = null;

      for (let j = 0; j < this.places.length; j++) {
        if (i === j) continue;

        const place2 = this.places[j];
        const dist = Math.abs(place1.x - place2.x) + Math.abs(place1.y - place2.y);

        // Track closest within ROAD_DIST
        if (dist < ROAD_DIST && dist < closestDistInRange) {
          closestDistInRange = dist;
          closestPlaceInRange = place2;
        }

        // Also track absolute closest (fallback for isolated places)
        if (dist < closestDistAny) {
          closestDistAny = dist;
          closestPlaceAny = place2;
        }
      }

      // Use in-range neighbor if found, otherwise fallback to nearest
      const closestPlace = closestPlaceInRange ?? closestPlaceAny;

      if (closestPlace) {
        // Connect from center of each place (not corner)
        // Per C code road_connect(): "Dodgy hack = just output median place square"
        const x1 = place1.x + Math.floor(place1.xsize / 2);
        const y1 = place1.y + Math.floor(place1.ysize / 2);
        const x2 = closestPlace.x + Math.floor(closestPlace.xsize / 2);
        const y2 = closestPlace.y + Math.floor(closestPlace.ysize / 2);
        this.roadLink(x1, y1, x2, y2);
      }
    }
  }

  /**
   * Link two points with a road using recursive midpoint displacement.
   *
   * Port of wild1.c:road_link()
   */
  private roadLink(x1: number, y1: number, x2: number, y2: number): void {
    const dist = Math.abs(x2 - x1) + Math.abs(y2 - y1);

    if (dist > 6) {
      // Divide and recurse
      const midX = Math.floor((x1 + x2) / 2);
      const midY = Math.floor((y1 + y2) / 2);

      // Add random perturbation
      const perturbX = Math.floor((this.rng.getUniform() - 0.5) * dist * 0.3);
      const perturbY = Math.floor((this.rng.getUniform() - 0.5) * dist * 0.3);

      const px = Math.max(0, Math.min(this.size - 1, midX + perturbX));
      const py = Math.max(0, Math.min(this.size - 1, midY + perturbY));

      this.roadLink(x1, y1, px, py);
      this.roadLink(px, py, x2, y2);
      return;
    }

    // Draw straight line
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    if (steps === 0) return;

    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x1 + ((x2 - x1) * i) / steps);
      const y = Math.round(y1 + ((y2 - y1) * i) / steps);

      if (x >= 0 && x < this.size && y >= 0 && y < this.size) {
        const block = this.blocks[y][x];

        // Don't put roads through water, lava, or acid
        if (block.info & (WILD_INFO_WATER | WILD_INFO_LAVA | WILD_INFO_ACID)) {
          continue;
        }

        // Use road or track based on law+pop
        const lawPop = this.lawMap[y][x] + this.popMap[y][x];
        if (lawPop >= 256) {
          block.info |= WILD_INFO_ROAD;
        } else {
          block.info |= WILD_INFO_TRACK;
        }
      }
    }
  }

  /**
   * Convert parameter values to terrain types.
   *
   * Port of wild1.c:create_terrain()
   */
  private createTerrain(): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const hgt = this.hgtMap[y][x];
        const pop = this.popMap[y][x];
        const law = this.lawMap[y][x];

        // Get terrain type from decision tree
        this.blocks[y][x].wild = this.decisionTree.getGenType(hgt, pop, law);
      }
    }
  }

  /**
   * Calculate monster generation levels for each block.
   */
  private calculateMonsterLevels(): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const law = this.lawMap[y][x];
        const block = this.blocks[y][x];

        // Monster level inversely proportional to law
        // High law = civilized = fewer/weaker monsters
        block.monGen = Math.floor((255 - law) / 4); // 0-63 range
        block.monProb = Math.floor((255 - law) / 16); // 0-15 range

        // Reduce near places
        if (block.place > 0) {
          block.monGen = Math.floor(block.monGen / 4);
          block.monProb = Math.floor(block.monProb / 4);
        }
      }
    }
  }

  /**
   * Build the final WildernessMap result.
   */
  private buildResult(seed: number): WildernessMap {
    const blocks = this.blocks;
    const places = this.places;
    const size = this.size;
    const placesByKey = this.placesByKey;

    return {
      blocks,
      places,
      seed,
      size,

      getBlock(x: number, y: number): WildBlock | undefined {
        if (x < 0 || x >= size || y < 0 || y >= size) {
          return undefined;
        }
        return blocks[y][x];
      },

      getPlace(key: string): WildPlace | undefined {
        return placesByKey.get(key);
      },

      getStartingPosition(): { x: number; y: number } {
        const startingTown = placesByKey.get('starting_town');
        if (startingTown) {
          return { x: startingTown.x, y: startingTown.y };
        }
        return { x: Math.floor(size / 2), y: Math.floor(size / 2) };
      },
    };
  }
}
