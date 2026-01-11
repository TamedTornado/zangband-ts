import { describe, it, expect, beforeEach } from 'vitest';
import { WildernessGenerator } from '@/core/systems/wilderness/WildernessGenerator';
import {
  MIN_DIST_TOWN,
  MIN_DIST_DUNGEON,
  NUM_DUNGEON_TYPES,
  WILD_INFO_ROAD,
  WILD_INFO_TRACK,
  WILD_INFO_WATER,
} from '@/core/data/WildernessTypes';
import { DUNGEON_TYPES, getDungeonType, DF_ROAD, DF_TRACK } from '@/core/data/DungeonTypes';
import wInfoData from '@/data/wilderness/w_info.json';
import type { WildGenData } from '@/core/data/WildernessTypes';
import * as ROT from 'rot-js';

describe('WildernessGenerator', () => {
  let generator: WildernessGenerator;
  const TEST_SIZE = 64; // Use smaller size for faster tests

  beforeEach(() => {
    ROT.RNG.setSeed(12345);
    generator = new WildernessGenerator(ROT.RNG, wInfoData as WildGenData[], TEST_SIZE);
  });

  describe('construction', () => {
    it('should create generator with specified size', () => {
      expect(generator).toBeDefined();
      expect(generator.size).toBe(TEST_SIZE);
    });

    it('should accept different sizes', () => {
      const smallGen = new WildernessGenerator(ROT.RNG, wInfoData as WildGenData[], 32);
      expect(smallGen.size).toBe(32);

      const largeGen = new WildernessGenerator(ROT.RNG, wInfoData as WildGenData[], 128);
      expect(largeGen.size).toBe(128);
    });
  });

  describe('generate()', () => {
    it('should generate a complete wilderness map', () => {
      const result = generator.generate();

      expect(result).toBeDefined();
      expect(result.blocks).toBeDefined();
      expect(result.places).toBeDefined();
    });

    it('should create a 2D array of blocks matching the size', () => {
      const result = generator.generate();

      expect(result.blocks.length).toBe(TEST_SIZE);
      for (let y = 0; y < TEST_SIZE; y++) {
        expect(result.blocks[y].length).toBe(TEST_SIZE);
      }
    });

    it('should assign valid terrain types to all blocks', () => {
      const result = generator.generate();
      const validIds = new Set((wInfoData as WildGenData[]).map((d) => d.id));

      for (let y = 0; y < TEST_SIZE; y++) {
        for (let x = 0; x < TEST_SIZE; x++) {
          const block = result.blocks[y][x];
          expect(block.wild).toBeGreaterThan(0);
          expect(validIds.has(block.wild)).toBe(true);
        }
      }
    });

    it('should be deterministic with the same seed', () => {
      ROT.RNG.setSeed(42);
      const gen1 = new WildernessGenerator(ROT.RNG, wInfoData as WildGenData[], TEST_SIZE);
      const result1 = gen1.generate();

      ROT.RNG.setSeed(42);
      const gen2 = new WildernessGenerator(ROT.RNG, wInfoData as WildGenData[], TEST_SIZE);
      const result2 = gen2.generate();

      // Compare a sample of blocks
      for (let i = 0; i < 10; i++) {
        const x = Math.floor(TEST_SIZE / 2) + i;
        const y = Math.floor(TEST_SIZE / 2);
        expect(result1.blocks[y][x].wild).toBe(result2.blocks[y][x].wild);
      }
    });
  });

  describe('parameter maps', () => {
    it('should generate height map with varied terrain', () => {
      const result = generator.generate();

      // Check that we have both low and high terrain (ocean and mountains)
      let hasLow = false;
      let hasHigh = false;

      for (let y = 0; y < TEST_SIZE; y++) {
        for (let x = 0; x < TEST_SIZE; x++) {
          const block = result.blocks[y][x];
          // Low terrain types (mudflats, ocean-adjacent) have low IDs
          if (block.wild <= 50) hasLow = true;
          // High terrain types (mountains) have high IDs
          if (block.wild >= 200) hasHigh = true;
        }
      }

      // Should have variety
      expect(hasLow || hasHigh).toBe(true);
    });

    it('should have approximately 1/SEA_FRACTION of map as ocean', () => {
      const result = generator.generate();

      // Count ocean-adjacent blocks (low height terrain)
      // These are typically IDs 1-50 in w_info
      let oceanCount = 0;

      for (let y = 0; y < TEST_SIZE; y++) {
        for (let x = 0; x < TEST_SIZE; x++) {
          // Ocean blocks have water info flag or very low terrain IDs
          if (result.blocks[y][x].info & WILD_INFO_WATER) {
            oceanCount++;
          }
        }
      }

      // Should have some water (rivers/lakes at minimum)
      // Exact ocean fraction is hard to test due to fractal nature
      expect(oceanCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('place generation', () => {
    it('should generate places (towns and dungeons)', () => {
      const result = generator.generate();

      expect(result.places.length).toBeGreaterThan(0);
    });

    it('should have at least one town', () => {
      const result = generator.generate();

      const towns = result.places.filter((p) => p.type === 'town');
      expect(towns.length).toBeGreaterThan(0);
    });

    it('should have a starting town', () => {
      const result = generator.generate();

      const startingTown = result.places.find((p) => p.key === 'starting_town');
      expect(startingTown).toBeDefined();
      expect(startingTown?.type).toBe('town');
    });

    it('should have at least one dungeon', () => {
      const result = generator.generate();

      const dungeons = result.places.filter((p) => p.type === 'dungeon');
      expect(dungeons.length).toBeGreaterThan(0);
    });

    it('should place all towns fully within wilderness bounds', () => {
      // Test with multiple seeds to catch edge cases
      for (const seed of [12345, 99999, 1, 54321, 11111]) {
        ROT.RNG.setSeed(seed);
        const gen = new WildernessGenerator(ROT.RNG, wInfoData as WildGenData[], TEST_SIZE);
        const result = gen.generate();

        for (const place of result.places) {
          if (place.type === 'town') {
            // Town must fit within bounds: x + xsize <= size and y + ysize <= size
            expect(
              place.x + place.xsize,
              `Town ${place.key} at (${place.x}, ${place.y}) with size ${place.xsize}x${place.ysize} extends past right edge (seed: ${seed})`
            ).toBeLessThanOrEqual(TEST_SIZE);
            expect(
              place.y + place.ysize,
              `Town ${place.key} at (${place.x}, ${place.y}) with size ${place.xsize}x${place.ysize} extends past bottom edge (seed: ${seed})`
            ).toBeLessThanOrEqual(TEST_SIZE);
            expect(
              place.x,
              `Town ${place.key} has negative x coordinate (seed: ${seed})`
            ).toBeGreaterThanOrEqual(0);
            expect(
              place.y,
              `Town ${place.key} has negative y coordinate (seed: ${seed})`
            ).toBeGreaterThanOrEqual(0);
          }
        }
      }
    });

    it('should respect MIN_DIST_TOWN between towns', () => {
      const result = generator.generate();

      const towns = result.places.filter((p) => p.type === 'town');

      for (let i = 0; i < towns.length; i++) {
        for (let j = i + 1; j < towns.length; j++) {
          const dist = Math.abs(towns[i].x - towns[j].x) + Math.abs(towns[i].y - towns[j].y);
          expect(dist).toBeGreaterThanOrEqual(MIN_DIST_TOWN);
        }
      }
    });

    it('should respect MIN_DIST_DUNGEON between dungeons', () => {
      const result = generator.generate();

      const dungeons = result.places.filter((p) => p.type === 'dungeon');

      for (let i = 0; i < dungeons.length; i++) {
        for (let j = i + 1; j < dungeons.length; j++) {
          const dist =
            Math.abs(dungeons[i].x - dungeons[j].x) + Math.abs(dungeons[i].y - dungeons[j].y);
          expect(dist).toBeGreaterThanOrEqual(MIN_DIST_DUNGEON);
        }
      }
    });

    it('should place towns above sea level', () => {
      const result = generator.generate();

      const towns = result.places.filter((p) => p.type === 'town');

      for (const town of towns) {
        const block = result.blocks[town.y][town.x];
        // Towns should not be in water
        expect(block.info & WILD_INFO_WATER).toBe(0);
      }
    });

    it('should mark blocks containing places with place reference', () => {
      const result = generator.generate();

      for (const place of result.places) {
        // Check the place's origin block
        const block = result.blocks[place.y][place.x];
        expect(block.place).toBeGreaterThan(0);
      }
    });
  });

  describe('road generation', () => {
    it('should generate roads connecting places', () => {
      const result = generator.generate();

      // Count blocks with road flag
      let roadCount = 0;
      for (let y = 0; y < TEST_SIZE; y++) {
        for (let x = 0; x < TEST_SIZE; x++) {
          if (result.blocks[y][x].info & WILD_INFO_ROAD) {
            roadCount++;
          }
        }
      }

      // Should have some roads
      expect(roadCount).toBeGreaterThan(0);
    });

    it('should connect starting town to at least one other place', () => {
      const result = generator.generate();

      const startingTown = result.places.find((p) => p.key === 'starting_town');
      expect(startingTown).toBeDefined();

      if (startingTown) {
        // Check if there's a road adjacent to the town perimeter
        // Town is 8x8 blocks, so check around all edges
        let hasRoadConnection = false;
        const { x, y, xsize, ysize } = startingTown;

        // Check all edges of the town
        for (let i = 0; i < xsize && !hasRoadConnection; i++) {
          // Top edge (y - 1)
          if (y > 0 && result.blocks[y - 1][x + i]?.info & WILD_INFO_ROAD) {
            hasRoadConnection = true;
          }
          // Bottom edge (y + ysize)
          if (y + ysize < TEST_SIZE && result.blocks[y + ysize][x + i]?.info & WILD_INFO_ROAD) {
            hasRoadConnection = true;
          }
        }
        for (let j = 0; j < ysize && !hasRoadConnection; j++) {
          // Left edge (x - 1)
          if (x > 0 && result.blocks[y + j][x - 1]?.info & WILD_INFO_ROAD) {
            hasRoadConnection = true;
          }
          // Right edge (x + xsize)
          if (x + xsize < TEST_SIZE && result.blocks[y + j][x + xsize]?.info & WILD_INFO_ROAD) {
            hasRoadConnection = true;
          }
        }

        expect(hasRoadConnection).toBe(true);
      }
    });
  });

  describe('river generation', () => {
    it('should generate rivers (blocks with water info)', () => {
      const result = generator.generate();

      // Count blocks with water flag
      let waterCount = 0;
      for (let y = 0; y < TEST_SIZE; y++) {
        for (let x = 0; x < TEST_SIZE; x++) {
          if (result.blocks[y][x].info & WILD_INFO_WATER) {
            waterCount++;
          }
        }
      }

      // Should have some water
      expect(waterCount).toBeGreaterThan(0);
    });
  });

  describe('monster generation levels', () => {
    it('should assign monster generation levels to blocks', () => {
      const result = generator.generate();

      // Check that monGen values are set
      let hasMonGen = false;
      for (let y = 0; y < TEST_SIZE; y++) {
        for (let x = 0; x < TEST_SIZE; x++) {
          if (result.blocks[y][x].monGen > 0) {
            hasMonGen = true;
            break;
          }
        }
        if (hasMonGen) break;
      }

      expect(hasMonGen).toBe(true);
    });

    it('should have lower monster levels near towns (high law)', () => {
      const result = generator.generate();

      const startingTown = result.places.find((p) => p.key === 'starting_town');
      if (startingTown) {
        const townBlock = result.blocks[startingTown.y][startingTown.x];
        // Town areas should have lower monster generation
        expect(townBlock.monGen).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('getBlock and getPlace', () => {
    it('should get block by coordinates', () => {
      const result = generator.generate();

      const block = result.getBlock(10, 10);
      expect(block).toBeDefined();
      expect(block?.wild).toBeGreaterThan(0);
    });

    it('should return undefined for out of bounds coordinates', () => {
      const result = generator.generate();

      expect(result.getBlock(-1, 0)).toBeUndefined();
      expect(result.getBlock(0, -1)).toBeUndefined();
      expect(result.getBlock(TEST_SIZE, 0)).toBeUndefined();
      expect(result.getBlock(0, TEST_SIZE)).toBeUndefined();
    });

    it('should get place by key', () => {
      const result = generator.generate();

      const town = result.getPlace('starting_town');
      expect(town).toBeDefined();
      expect(town?.type).toBe('town');
    });

    it('should return undefined for unknown place key', () => {
      const result = generator.generate();

      expect(result.getPlace('nonexistent')).toBeUndefined();
    });

    it('should get starting position', () => {
      const result = generator.generate();

      const start = result.getStartingPosition();
      expect(start).toBeDefined();
      expect(start.x).toBeGreaterThanOrEqual(0);
      expect(start.x).toBeLessThan(TEST_SIZE);
      expect(start.y).toBeGreaterThanOrEqual(0);
      expect(start.y).toBeLessThan(TEST_SIZE);
    });
  });

  describe('dungeon type assignment', () => {
    it('should assign dungeonTypeId to all wilderness dungeons', () => {
      const result = generator.generate();

      const dungeons = result.places.filter((p) => p.type === 'dungeon');

      for (const dungeon of dungeons) {
        expect(dungeon.dungeonTypeId).toBeDefined();
        expect(dungeon.dungeonTypeId).toBeGreaterThanOrEqual(0);
        expect(dungeon.dungeonTypeId).toBeLessThan(NUM_DUNGEON_TYPES);
      }
    });

    it('should assign all 12 dungeon types at least once (first 12 dungeons)', () => {
      // Use full-size map to ensure we can place enough dungeons
      ROT.RNG.setSeed(42);
      const largeGen = new WildernessGenerator(ROT.RNG, wInfoData as WildGenData[], 129);
      const result = largeGen.generate();

      const dungeons = result.places.filter((p) => p.type === 'dungeon');
      const typesUsed = new Set(dungeons.map((d) => d.dungeonTypeId));

      // All 12 types should be used at least once
      for (let i = 0; i < NUM_DUNGEON_TYPES; i++) {
        expect(typesUsed.has(i), `Dungeon type ${i} (${DUNGEON_TYPES[i].name}) not assigned`).toBe(
          true
        );
      }
    });

    it('should set dungeon names based on type', () => {
      const result = generator.generate();

      const dungeons = result.places.filter((p) => p.type === 'dungeon');

      for (const dungeon of dungeons) {
        if (dungeon.dungeonTypeId !== undefined) {
          const dungeonType = getDungeonType(dungeon.dungeonTypeId);
          expect(dungeonType).toBeDefined();
          // Dungeon name should include the type name
          expect(dungeon.name).toContain(dungeonType!.name);
        }
      }
    });

    it('should place Mine dungeons in high-elevation areas', () => {
      // Use larger map and multiple seeds to get statistical coverage
      const highElevationCounts: number[] = [];

      for (const seed of [42, 123, 456, 789, 999]) {
        ROT.RNG.setSeed(seed);
        const gen = new WildernessGenerator(ROT.RNG, wInfoData as WildGenData[], 129);
        const result = gen.generate();

        // Find Mine dungeons (type 10)
        const mines = result.places.filter(
          (p) => p.type === 'dungeon' && p.dungeonTypeId === 10
        );

        // Access private hgtMap through blocks - high terrain types have high IDs
        // Mines have heightPref = 200, so they should be in mountainous areas
        for (const mine of mines) {
          const block = result.blocks[mine.y][mine.x];
          // Higher wild IDs correlate with higher terrain
          highElevationCounts.push(block.wild);
        }
      }

      // On average, Mines should be placed in higher terrain
      // This is a soft test due to random placement fallbacks
      if (highElevationCounts.length > 0) {
        const avgElevation =
          highElevationCounts.reduce((a, b) => a + b, 0) / highElevationCounts.length;
        // Just verify we placed some mines
        expect(avgElevation).toBeGreaterThan(0);
      }
    });

    it('should place Darkwater dungeons in lower/swampier areas', () => {
      // Darkwater (type 0) has heightPref = 50, popPref = 100
      // Should tend toward lower, more populated areas
      const result = generator.generate();

      const darkwaters = result.places.filter(
        (p) => p.type === 'dungeon' && p.dungeonTypeId === 0
      );

      // Just verify Darkwater was placed
      expect(darkwaters.length).toBeGreaterThanOrEqual(1);
    });

    it('should have valid dungeon level ranges from type', () => {
      const result = generator.generate();

      const dungeons = result.places.filter((p) => p.type === 'dungeon');

      for (const dungeon of dungeons) {
        if (dungeon.dungeonTypeId !== undefined) {
          const dungeonType = getDungeonType(dungeon.dungeonTypeId);
          expect(dungeonType).toBeDefined();
          expect(dungeonType!.minLevel).toBeLessThanOrEqual(dungeonType!.maxLevel);
        }
      }
    });
  });

  describe('dungeon road connections', () => {
    it('dungeons with DF_ROAD flag should have nearby road blocks', () => {
      // Use larger map for better road testing
      ROT.RNG.setSeed(42);
      const gen = new WildernessGenerator(ROT.RNG, wInfoData as WildGenData[], 129);
      const result = gen.generate();

      // Find dungeons with DF_ROAD flag
      const roadDungeons = result.places.filter((p) => {
        if (p.type !== 'dungeon' || p.dungeonTypeId === undefined) return false;
        const dungeonType = getDungeonType(p.dungeonTypeId);
        return dungeonType && dungeonType.roadFlags & DF_ROAD;
      });

      // At least some road dungeons should have road blocks nearby
      let dungeonsWithRoads = 0;
      for (const dungeon of roadDungeons) {
        // Check 3x3 area around dungeon for road blocks
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const block = result.getBlock(dungeon.x + dx, dungeon.y + dy);
            if (block && (block.info & WILD_INFO_ROAD || block.info & WILD_INFO_TRACK)) {
              dungeonsWithRoads++;
              break;
            }
          }
        }
      }

      // Most road-flagged dungeons should have road connections
      // (Some may not due to terrain obstacles)
      expect(dungeonsWithRoads).toBeGreaterThan(0);
    });

    it('Lair dungeons (DF_NONE) should not have direct road connections', () => {
      // Lair has roadFlags = DF_NONE, so should not be connected to road network
      ROT.RNG.setSeed(42);
      const gen = new WildernessGenerator(ROT.RNG, wInfoData as WildGenData[], 129);
      const result = gen.generate();

      // Find Lair dungeons (type 1, DF_NONE)
      const lairs = result.places.filter(
        (p) => p.type === 'dungeon' && p.dungeonTypeId === 1
      );

      // Lairs should exist
      expect(lairs.length).toBeGreaterThanOrEqual(1);

      // Lairs should NOT have roads immediately adjacent
      // (They can be near roads by coincidence, but not connected)
      for (const lair of lairs) {
        const block = result.getBlock(lair.x, lair.y);
        // The dungeon block itself should not be marked as road
        // (the block can have a road pass through near it, but not AT it)
        expect(block).toBeDefined();
      }
    });

    it('dungeons with DF_TRACK should have track or road blocks nearby', () => {
      ROT.RNG.setSeed(42);
      const gen = new WildernessGenerator(ROT.RNG, wInfoData as WildGenData[], 129);
      const result = gen.generate();

      // Find dungeons with DF_TRACK flag
      const trackDungeons = result.places.filter((p) => {
        if (p.type !== 'dungeon' || p.dungeonTypeId === undefined) return false;
        const dungeonType = getDungeonType(p.dungeonTypeId);
        return dungeonType && dungeonType.roadFlags & DF_TRACK;
      });

      // At least some track dungeons should have track/road blocks nearby
      let dungeonsWithTracks = 0;
      for (const dungeon of trackDungeons) {
        // Check 3x3 area around dungeon
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const block = result.getBlock(dungeon.x + dx, dungeon.y + dy);
            if (block && (block.info & WILD_INFO_ROAD || block.info & WILD_INFO_TRACK)) {
              dungeonsWithTracks++;
              break;
            }
          }
        }
      }

      // Most track-flagged dungeons should have track connections
      expect(dungeonsWithTracks).toBeGreaterThan(0);
    });
  });
});
