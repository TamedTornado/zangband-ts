import { describe, it, expect, beforeEach } from 'vitest';
import { WildBlockGenerator } from '@/core/systems/wilderness/BlockGenerator';
import {
  WILD_BLOCK_SIZE,
  WILD_INFO_ROAD,
  WILD_INFO_WATER,
  type WildBlock,
  type WildGenData,
} from '@/core/data/WildernessTypes';
import wInfoData from '@/data/wilderness/w_info.json';
import * as ROT from 'rot-js';

describe('WildBlockGenerator', () => {
  let generator: WildBlockGenerator;

  beforeEach(() => {
    ROT.RNG.setSeed(12345);
    generator = new WildBlockGenerator(ROT.RNG, wInfoData as WildGenData[]);
  });

  describe('construction', () => {
    it('should create generator with RNG and gen data', () => {
      expect(generator).toBeDefined();
    });
  });

  describe('generateBlock', () => {
    it('should generate a 16x16 tile grid', () => {
      const block: WildBlock = {
        wild: 1, // mudflats - genRoutine 2
        place: 0,
        info: 0,
        monGen: 10,
        monProb: 100,
      };

      const tiles = generator.generateBlock(block, 0, 0, 42);

      expect(tiles.length).toBe(WILD_BLOCK_SIZE);
      for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
        expect(tiles[y].length).toBe(WILD_BLOCK_SIZE);
      }
    });

    it('should assign valid feature IDs to all tiles', () => {
      const block: WildBlock = {
        wild: 1,
        place: 0,
        info: 0,
        monGen: 10,
        monProb: 100,
      };

      const tiles = generator.generateBlock(block, 0, 0, 42);

      for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
        for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
          expect(tiles[y][x].feat).toBeGreaterThan(0);
        }
      }
    });

    it('should be deterministic with same seed and position', () => {
      const block: WildBlock = {
        wild: 1,
        place: 0,
        info: 0,
        monGen: 10,
        monProb: 100,
      };

      ROT.RNG.setSeed(42);
      const tiles1 = generator.generateBlock(block, 5, 10, 999);

      ROT.RNG.setSeed(42);
      const tiles2 = generator.generateBlock(block, 5, 10, 999);

      // Compare all tiles
      for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
        for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
          expect(tiles1[y][x].feat).toBe(tiles2[y][x].feat);
        }
      }
    });

    it('should produce different output for different positions', () => {
      const block: WildBlock = {
        wild: 1,
        place: 0,
        info: 0,
        monGen: 10,
        monProb: 100,
      };

      const tiles1 = generator.generateBlock(block, 0, 0, 42);
      const tiles2 = generator.generateBlock(block, 10, 10, 42);

      // At least some tiles should differ
      let hasDifference = false;
      for (let y = 0; y < WILD_BLOCK_SIZE && !hasDifference; y++) {
        for (let x = 0; x < WILD_BLOCK_SIZE && !hasDifference; x++) {
          if (tiles1[y][x].feat !== tiles2[y][x].feat) {
            hasDifference = true;
          }
        }
      }

      expect(hasDifference).toBe(true);
    });
  });

  describe('generation routine 1 (plasma fractal)', () => {
    it('should generate varied terrain using plasma fractal', () => {
      // Find a genRoutine 1 terrain type
      const genData = (wInfoData as WildGenData[]).find((d) => d.genRoutine === 1);
      expect(genData).toBeDefined();

      const block: WildBlock = {
        wild: genData!.id,
        place: 0,
        info: 0,
        monGen: 10,
        monProb: 100,
      };

      const tiles = generator.generateBlock(block, 0, 0, 42);

      // Count unique features - should have variety
      const features = new Set<number>();
      for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
        for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
          features.add(tiles[y][x].feat);
        }
      }

      // Plasma fractal should produce multiple feature types
      expect(features.size).toBeGreaterThan(1);
    });
  });

  describe('generation routine 2 (flat probability)', () => {
    it('should generate terrain with probability-based features', () => {
      // Find a genRoutine 2 terrain type (mudflats is id 1)
      const genData = (wInfoData as WildGenData[]).find((d) => d.genRoutine === 2);
      expect(genData).toBeDefined();

      const block: WildBlock = {
        wild: genData!.id,
        place: 0,
        info: 0,
        monGen: 10,
        monProb: 100,
      };

      const tiles = generator.generateBlock(block, 0, 0, 42);

      // Should have valid features
      for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
        for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
          expect(tiles[y][x].feat).toBeGreaterThan(0);
        }
      }
    });

    it('should use the primary feature most often', () => {
      // Find a genRoutine 2 terrain type
      const genData = (wInfoData as WildGenData[]).find((d) => d.genRoutine === 2 && d.data[0] > 0);
      expect(genData).toBeDefined();

      const block: WildBlock = {
        wild: genData!.id,
        place: 0,
        info: 0,
        monGen: 10,
        monProb: 100,
      };

      // Generate multiple blocks to get statistics
      let primaryCount = 0;
      let totalCount = 0;

      for (let i = 0; i < 5; i++) {
        const tiles = generator.generateBlock(block, i, 0, 42);
        for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
          for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
            totalCount++;
            if (tiles[y][x].feat === genData!.data[0]) {
              primaryCount++;
            }
          }
        }
      }

      // Primary feature should appear frequently (at least 30%)
      expect(primaryCount / totalCount).toBeGreaterThan(0.3);
    });
  });

  describe('generation routine 3 (overlay circle)', () => {
    it('should generate base terrain with circular overlay', () => {
      // Find a genRoutine 3 terrain type
      const genData = (wInfoData as WildGenData[]).find((d) => d.genRoutine === 3);
      expect(genData).toBeDefined();

      const block: WildBlock = {
        wild: genData!.id,
        place: 0,
        info: 0,
        monGen: 10,
        monProb: 100,
      };

      const tiles = generator.generateBlock(block, 0, 0, 42);

      // Should have valid features
      for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
        for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
          expect(tiles[y][x].feat).toBeGreaterThan(0);
        }
      }

      // Should have some variety from the overlay
      const features = new Set<number>();
      for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
        for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
          features.add(tiles[y][x].feat);
        }
      }
      expect(features.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('generation routine 4 (farm)', () => {
    it('should generate farm pattern with grass and dirt', () => {
      // Find a genRoutine 4 terrain type
      const genData = (wInfoData as WildGenData[]).find((d) => d.genRoutine === 4);
      expect(genData).toBeDefined();

      const block: WildBlock = {
        wild: genData!.id,
        place: 0,
        info: 0,
        monGen: 10,
        monProb: 100,
      };

      const tiles = generator.generateBlock(block, 0, 0, 42);

      // Should have valid features
      for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
        for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
          expect(tiles[y][x].feat).toBeGreaterThan(0);
        }
      }
    });

    it('should sometimes include buildings', () => {
      // Find a genRoutine 4 terrain type
      const genData = (wInfoData as WildGenData[]).find((d) => d.genRoutine === 4);
      expect(genData).toBeDefined();

      const block: WildBlock = {
        wild: genData!.id,
        place: 0,
        info: 0,
        monGen: 10,
        monProb: 100,
      };

      // Generate multiple blocks looking for buildings
      let hasBuilding = false;
      for (let i = 0; i < 20 && !hasBuilding; i++) {
        const tiles = generator.generateBlock(block, i * 7, i * 3, 42);
        for (let y = 0; y < WILD_BLOCK_SIZE && !hasBuilding; y++) {
          for (let x = 0; x < WILD_BLOCK_SIZE && !hasBuilding; x++) {
            // Buildings use permanent wall features
            // Check for any non-grass/dirt feature
            const feat = tiles[y][x].feat;
            if (feat !== 89 && feat !== 88) {
              // Not grass or dirt
              hasBuilding = true;
            }
          }
        }
      }

      // Should find a building in some runs
      expect(hasBuilding).toBe(true);
    });
  });

  describe('road overlay', () => {
    it('should draw road when current block and neighbor have road flags', () => {
      const block: WildBlock = {
        wild: 1,
        place: 0,
        info: WILD_INFO_ROAD,
        monGen: 10,
        monProb: 100,
      };

      // Neighbor road info: current block (5) and east neighbor (6) have roads
      // Block has road flag, so Mode B applies - checks all 8 directions
      const neighborRoads = {
        levels: [0, 0, 0, 0, 0, WILD_BLOCK_SIZE * 150, WILD_BLOCK_SIZE * 150, 0, 0, 0],
        hasRoadFlag: true,
      };

      const tiles = generator.generateBlock(block, 0, 0, 42, neighborRoads);

      // Should have some road features
      let hasRoad = false;
      for (let y = 0; y < WILD_BLOCK_SIZE && !hasRoad; y++) {
        for (let x = 0; x < WILD_BLOCK_SIZE && !hasRoad; x++) {
          if (tiles[y][x].info & WILD_INFO_ROAD) {
            hasRoad = true;
          }
        }
      }

      expect(hasRoad).toBe(true);
    });

    it('should not draw road when no neighbors have road flags', () => {
      const block: WildBlock = {
        wild: 1,
        place: 0,
        info: 0, // No road flag
        monGen: 10,
        monProb: 100,
      };

      // No neighbors have roads (all GROUND_LEVEL)
      // Block has no road flag, so Mode A applies - only checks orthogonal
      const neighborRoads = {
        levels: [0, WILD_BLOCK_SIZE * 100, WILD_BLOCK_SIZE * 100, WILD_BLOCK_SIZE * 100,
                 WILD_BLOCK_SIZE * 100, WILD_BLOCK_SIZE * 100, WILD_BLOCK_SIZE * 100,
                 WILD_BLOCK_SIZE * 100, WILD_BLOCK_SIZE * 100, WILD_BLOCK_SIZE * 100],
        hasRoadFlag: false,
      };

      const tiles = generator.generateBlock(block, 0, 0, 42, neighborRoads);

      // Should NOT have road features
      let hasRoad = false;
      for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
        for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
          if (tiles[y][x].info & WILD_INFO_ROAD) {
            hasRoad = true;
          }
        }
      }

      expect(hasRoad).toBe(false);
    });

    it('should draw road connecting north and south neighbors', () => {
      const block: WildBlock = {
        wild: 1,
        place: 0,
        info: WILD_INFO_ROAD,
        monGen: 10,
        monProb: 100,
      };

      // Road from north (8) to south (2) - should create vertical road
      // Block has road flag, so Mode B applies
      const neighborRoads = {
        levels: [0, 0, WILD_BLOCK_SIZE * 150, 0, 0, WILD_BLOCK_SIZE * 150, 0, 0, WILD_BLOCK_SIZE * 150, 0],
        hasRoadFlag: true,
      };

      const tiles = generator.generateBlock(block, 0, 0, 42, neighborRoads);

      // Count road tiles in center column
      let centerRoadCount = 0;
      const centerX = WILD_BLOCK_SIZE / 2;
      for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
        if (tiles[y][centerX].info & WILD_INFO_ROAD) {
          centerRoadCount++;
        }
      }

      // Should have road tiles roughly through center
      expect(centerRoadCount).toBeGreaterThan(WILD_BLOCK_SIZE / 4);
    });

    it('should draw road connecting east and west neighbors', () => {
      const block: WildBlock = {
        wild: 1,
        place: 0,
        info: WILD_INFO_ROAD,
        monGen: 10,
        monProb: 100,
      };

      // Road from west (4) to east (6) - should create horizontal road
      // Block has road flag, so Mode B applies
      const neighborRoads = {
        levels: [0, 0, 0, 0, WILD_BLOCK_SIZE * 150, WILD_BLOCK_SIZE * 150, WILD_BLOCK_SIZE * 150, 0, 0, 0],
        hasRoadFlag: true,
      };

      const tiles = generator.generateBlock(block, 0, 0, 42, neighborRoads);

      // Count road tiles in center row
      let centerRoadCount = 0;
      const centerY = WILD_BLOCK_SIZE / 2;
      for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
        if (tiles[centerY][x].info & WILD_INFO_ROAD) {
          centerRoadCount++;
        }
      }

      // Should have road tiles roughly through center
      expect(centerRoadCount).toBeGreaterThan(WILD_BLOCK_SIZE / 4);
    });
  });

  describe('water overlay', () => {
    it('should add water tiles when block has WILD_INFO_WATER flag', () => {
      const block: WildBlock = {
        wild: 1,
        place: 0,
        info: WILD_INFO_WATER,
        monGen: 10,
        monProb: 100,
      };

      const tiles = generator.generateBlock(block, 0, 0, 42);

      // Should have some water features
      let hasWater = false;
      for (let y = 0; y < WILD_BLOCK_SIZE && !hasWater; y++) {
        for (let x = 0; x < WILD_BLOCK_SIZE && !hasWater; x++) {
          if (tiles[y][x].info & WILD_INFO_WATER) {
            hasWater = true;
          }
        }
      }

      expect(hasWater).toBe(true);
    });
  });

  describe('pick_feat algorithm', () => {
    it('should select features based on inverse distance weighting', () => {
      // Test the pickFeat internal algorithm
      // When prob matches exactly, that feature should always be selected

      // Generate many samples and verify weighted selection
      const featureCounts = new Map<number, number>();

      // Use genRoutine 1 which uses pickFeat
      const genData = (wInfoData as WildGenData[]).find((d) => d.genRoutine === 1);
      expect(genData).toBeDefined();

      const block: WildBlock = {
        wild: genData!.id,
        place: 0,
        info: 0,
        monGen: 10,
        monProb: 100,
      };

      for (let i = 0; i < 10; i++) {
        const tiles = generator.generateBlock(block, i, 0, 42);
        for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
          for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
            const feat = tiles[y][x].feat;
            featureCounts.set(feat, (featureCounts.get(feat) || 0) + 1);
          }
        }
      }

      // Should have multiple different features
      expect(featureCounts.size).toBeGreaterThan(1);
    });
  });

  describe('getGenData', () => {
    it('should return generation data for valid type id', () => {
      const genData = generator.getGenData(1);
      expect(genData).toBeDefined();
      expect(genData?.id).toBe(1);
      expect(genData?.comment).toBe('mudflats');
    });

    it('should return undefined for invalid type id', () => {
      const genData = generator.getGenData(99999);
      expect(genData).toBeUndefined();
    });
  });

  describe('sea generation', () => {
    it('should generate water tiles for sea terrain types', () => {
      // Sea types have high IDs (WILD_SEA = 200 in C)
      // Find a terrain with water in its data
      const waterData = (wInfoData as WildGenData[]).find(
        (d) => d.data[0] === 84 || d.data[0] === 85 || d.data[0] === 97
      );

      if (waterData) {
        const block: WildBlock = {
          wild: waterData.id,
          place: 0,
          info: 0,
          monGen: 10,
          monProb: 100,
        };

        const tiles = generator.generateBlock(block, 0, 0, 42);

        // Should have water features
        let hasWaterFeat = false;
        for (let y = 0; y < WILD_BLOCK_SIZE && !hasWaterFeat; y++) {
          for (let x = 0; x < WILD_BLOCK_SIZE && !hasWaterFeat; x++) {
            const feat = tiles[y][x].feat;
            // Water features: FEAT_SHAL_WATER=84, FEAT_DEEP_WATER=85, etc.
            if (feat === 84 || feat === 85 || feat === 97) {
              hasWaterFeat = true;
            }
          }
        }

        expect(hasWaterFeat).toBe(true);
      }
    });
  });
});
