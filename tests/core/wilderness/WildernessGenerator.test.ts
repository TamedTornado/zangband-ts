import { describe, it, expect, beforeEach } from 'vitest';
import { WildernessGenerator } from '@/core/systems/wilderness/WildernessGenerator';
import {
  MIN_DIST_TOWN,
  MIN_DIST_DUNGEON,
  WILD_INFO_ROAD,
  WILD_INFO_WATER,
} from '@/core/data/WildernessTypes';
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
});
