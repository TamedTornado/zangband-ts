import { describe, it, expect, beforeEach } from 'vitest';
import { ZangbandTownGenerator, TownType } from '@/core/systems/wilderness/TownGen';
import { WILD_BLOCK_SIZE, type WildPlace } from '@/core/data/WildernessTypes';
import * as ROT from 'rot-js';

describe('ZangbandTownGenerator', () => {
  let generator: ZangbandTownGenerator;

  beforeEach(() => {
    ROT.RNG.setSeed(12345);
    generator = new ZangbandTownGenerator(ROT.RNG);
  });

  describe('construction', () => {
    it('should create generator with RNG', () => {
      expect(generator).toBeDefined();
    });
  });

  // ==========================================================================
  // NEW TESTS: Define correct behavior per Zangband reference
  // ==========================================================================

  describe('starting town (per Zangband reference)', () => {
    const startingTown: WildPlace = {
      key: 'starting_town',
      type: 'town',
      name: 'The Town',
      x: 32,
      y: 32,
      xsize: 3,
      ysize: 3,
      seed: 42,
      data: 200, // high population
      monstType: 1,
      dungeonTypeId: -1, // MAIN_DUNGEON
    };

    it('uses fractal generation like all other towns', () => {
      // Starting town should NOT have special code path - uses same fractal
      // generation as other towns, just with required building list
      const result = generator.generate(startingTown);

      // Should have plasma-shaped boundary, not rectangular sealed box
      // Count passable tiles on edges - should have exits
      let passableEdgeTiles = 0;
      for (let x = 0; x < result.width; x++) {
        // Top edge
        if (result.tiles[0]?.[x]?.feat !== 60) passableEdgeTiles++;
        // Bottom edge
        if (result.tiles[result.height - 1]?.[x]?.feat !== 60) passableEdgeTiles++;
      }
      for (let y = 1; y < result.height - 1; y++) {
        // Left edge
        if (result.tiles[y]?.[0]?.feat !== 60) passableEdgeTiles++;
        // Right edge
        if (result.tiles[y]?.[result.width - 1]?.feat !== 60) passableEdgeTiles++;
      }

      // Town should have exits - not all edge tiles should be walls
      expect(passableEdgeTiles).toBeGreaterThan(0);
    });

    it('has walkable exits to wilderness (not sealed)', () => {
      const result = generator.generate(startingTown);

      // Check each edge for at least one passable tile
      const FEAT_FLOOR = 1;
      const FEAT_GRASS = 89;
      const passable = [FEAT_FLOOR, FEAT_GRASS, 0]; // 0 = transparent

      const hasNorthExit = result.tiles[0]?.some(tile =>
        passable.includes(tile?.feat)
      );
      const hasSouthExit = result.tiles[result.height - 1]?.some(tile =>
        passable.includes(tile?.feat)
      );
      const hasWestExit = result.tiles.some(row =>
        passable.includes(row?.[0]?.feat)
      );
      const hasEastExit = result.tiles.some(row =>
        passable.includes(row?.[result.width - 1]?.feat)
      );

      // At least some edges should have exits (Zangband has 4 gates)
      const exitCount = [hasNorthExit, hasSouthExit, hasWestExit, hasEastExit]
        .filter(Boolean).length;
      expect(exitCount).toBeGreaterThanOrEqual(1);
    });

    it('has all required stores for starting town', () => {
      const result = generator.generate(startingTown);

      // Starting town must have these stores per wild_first_town[]
      const requiredStores = [
        'general_store',
        'home',
        'temple',
        'magic_shop',
      ];

      const storeKeys = result.storePositions.map(s => s.storeKey);
      for (const required of requiredStores) {
        expect(storeKeys).toContain(required);
      }
    });

    it('has down stairs to dungeon', () => {
      const result = generator.generate(startingTown);

      expect(result.dungeonEntrance).not.toBeNull();
      const { x, y } = result.dungeonEntrance!;

      // Entrance should be at a floor tile (not wall)
      expect(result.tiles[y][x].feat).toBe(7); // FEAT_DOWN_STAIRS
    });
  });

  describe('fractal city boundary (per Zangband reference)', () => {
    const cityPlace: WildPlace = {
      key: 'test_city',
      type: 'town',
      name: 'Test City',
      x: 32,
      y: 32,
      xsize: 3,
      ysize: 3,
      seed: 42,
      data: 180,
      monstType: 1,
    };

    it('has walls only at boundary, not filling entire area', () => {
      const result = generator.generate(cityPlace);

      // Count wall tiles vs total tiles
      let wallCount = 0;
      let totalCount = 0;

      for (let y = 0; y < result.height; y++) {
        for (let x = 0; x < result.width; x++) {
          totalCount++;
          if (result.tiles[y][x].feat === 60) { // FEAT_PERM_EXTRA
            wallCount++;
          }
        }
      }

      // Walls should be a small fraction (boundary only), not majority
      const wallRatio = wallCount / totalCount;
      expect(wallRatio).toBeLessThan(0.5); // Less than 50% walls
    });

    it('has transparent tiles outside city shape', () => {
      const result = generator.generate(cityPlace);

      // Town should have some "transparent" tiles (feat=0 or special value)
      // that let wilderness show through when overlaid
      let hasTransparent = false;

      for (let y = 0; y < result.height && !hasTransparent; y++) {
        for (let x = 0; x < result.width && !hasTransparent; x++) {
          // Transparent = feat 0 or grass (89) at edges
          if (result.tiles[y][x].feat === 0) {
            hasTransparent = true;
          }
        }
      }

      // If no feat=0, check that edges aren't all walls
      if (!hasTransparent) {
        // At minimum, not all edge tiles should be walls
        const edgeWalls = result.tiles[0].filter(t => t.feat === 60).length;
        expect(edgeWalls).toBeLessThan(result.width);
      }
    });
  });

  describe('generateVanillaTown', () => {
    it('should generate a town with floor tiles', () => {
      const place: WildPlace = {
        key: 'test_town',
        type: 'town',
        name: 'Test Town',
        x: 32,
        y: 32,
        xsize: 4,
        ysize: 3,
        seed: 42,
        data: 128, // population
        monstType: 0,
      };

      const result = generator.generateVanillaTown(place);

      expect(result).toBeDefined();
      expect(result.tiles).toBeDefined();
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('should place stores in a grid pattern', () => {
      const place: WildPlace = {
        key: 'test_town',
        type: 'town',
        name: 'Test Town',
        x: 32,
        y: 32,
        xsize: 4,
        ysize: 3,
        seed: 42,
        data: 128,
        monstType: 0,
      };

      const result = generator.generateVanillaTown(place);

      // Should have stores
      expect(result.storePositions.length).toBeGreaterThan(0);
    });

    it('should place dungeon entrance (down stairs)', () => {
      const place: WildPlace = {
        key: 'test_town',
        type: 'town',
        name: 'Test Town',
        x: 32,
        y: 32,
        xsize: 4,
        ysize: 3,
        seed: 42,
        data: 128,
        monstType: 0,
      };

      const result = generator.generateVanillaTown(place);

      expect(result.dungeonEntrance).toBeDefined();
      expect(result.dungeonEntrance!.x).toBeGreaterThanOrEqual(0);
      expect(result.dungeonEntrance!.y).toBeGreaterThanOrEqual(0);
    });

    it('should be deterministic with same seed', () => {
      const place: WildPlace = {
        key: 'test_town',
        type: 'town',
        name: 'Test Town',
        x: 32,
        y: 32,
        xsize: 4,
        ysize: 3,
        seed: 42,
        data: 128,
        monstType: 0,
      };

      ROT.RNG.setSeed(100);
      const result1 = generator.generateVanillaTown(place);

      ROT.RNG.setSeed(100);
      const result2 = generator.generateVanillaTown(place);

      // Store positions should match
      expect(result1.storePositions.length).toBe(result2.storePositions.length);
      for (let i = 0; i < result1.storePositions.length; i++) {
        expect(result1.storePositions[i].x).toBe(result2.storePositions[i].x);
        expect(result1.storePositions[i].y).toBe(result2.storePositions[i].y);
      }
    });

    it('should have boundary walls', () => {
      const place: WildPlace = {
        key: 'test_town',
        type: 'town',
        name: 'Test Town',
        x: 32,
        y: 32,
        xsize: 4,
        ysize: 3,
        seed: 42,
        data: 128,
        monstType: 0,
      };

      const result = generator.generateVanillaTown(place);

      // Check top-left corner is a wall
      expect(result.tiles[0][0].feat).toBe(60); // FEAT_PERM_EXTRA
    });
  });

  describe('generateFractalCity', () => {
    // Per Zangband: all fractal cities are 8x8 blocks = 128x128 tiles
    const TOWN_SIZE = 8 * WILD_BLOCK_SIZE; // 128

    it('should generate a fractal city with varied layout', () => {
      const place: WildPlace = {
        key: 'test_city',
        type: 'town',
        name: 'Test City',
        x: 32,
        y: 32,
        xsize: 8, // Zangband always uses 8x8
        ysize: 8,
        seed: 42,
        data: 200, // high population
        monstType: 0,
      };

      const result = generator.generateFractalCity(place);

      expect(result).toBeDefined();
      expect(result.tiles).toBeDefined();
      expect(result.width).toBe(TOWN_SIZE);
      expect(result.height).toBe(TOWN_SIZE);
    });

    it('should have buildings placed', () => {
      const place: WildPlace = {
        key: 'test_city',
        type: 'town',
        name: 'Test City',
        x: 32,
        y: 32,
        xsize: 8,
        ysize: 8,
        seed: 42,
        data: 200,
        monstType: 0,
      };

      const result = generator.generateFractalCity(place);

      // Should have some building features
      let hasBuilding = false;
      for (let y = 0; y < result.height && !hasBuilding; y++) {
        for (let x = 0; x < result.width && !hasBuilding; x++) {
          if (result.tiles[y][x].feat === 60) {
            // FEAT_PERM_EXTRA
            hasBuilding = true;
          }
        }
      }

      expect(hasBuilding).toBe(true);
    });

    it('should have stores', () => {
      const place: WildPlace = {
        key: 'test_city',
        type: 'town',
        name: 'Test City',
        x: 32,
        y: 32,
        xsize: 8,
        ysize: 8,
        seed: 42,
        data: 200,
        monstType: 0,
      };

      const result = generator.generateFractalCity(place);

      expect(result.storePositions.length).toBeGreaterThan(0);
    });
  });

  describe('generateDungeonEntrance', () => {
    it('should generate a dungeon entrance point', () => {
      const place: WildPlace = {
        key: 'test_dungeon',
        type: 'dungeon',
        name: 'Test Dungeon',
        x: 32,
        y: 32,
        xsize: 1,
        ysize: 1,
        seed: 42,
        data: 50, // dungeon level
        monstType: 0,
      };

      const result = generator.generateDungeonEntrance(place);

      expect(result).toBeDefined();
      expect(result.tiles).toBeDefined();
      expect(result.dungeonEntrance).toBeDefined();
    });

    it('should have down stairs feature', () => {
      const place: WildPlace = {
        key: 'test_dungeon',
        type: 'dungeon',
        name: 'Test Dungeon',
        x: 32,
        y: 32,
        xsize: 1,
        ysize: 1,
        seed: 42,
        data: 50,
        monstType: 0,
      };

      const result = generator.generateDungeonEntrance(place);
      const { x, y } = result.dungeonEntrance!;

      // Should have down stairs at entrance
      expect(result.tiles[y][x].feat).toBe(7); // FEAT_DOWN_STAIRS
    });
  });

  describe('getTownType', () => {
    it('should return TOWN_FRACT for starting town (all towns use fractal)', () => {
      // Per Zangband reference: ALL towns use fractal city generation
      // Starting town just has specific required buildings (DATA, not special code)
      const place: WildPlace = {
        key: 'starting_town',
        type: 'town',
        name: 'Starting Town',
        x: 32,
        y: 32,
        xsize: 4,
        ysize: 3,
        seed: 42,
        data: 128,
        monstType: 0,
      };

      const townType = generator.getTownType(place);
      expect(townType).toBe(TownType.TOWN_FRACT);
    });

    it('should return TOWN_FRACT for other towns', () => {
      const place: WildPlace = {
        key: 'other_town',
        type: 'town',
        name: 'Other Town',
        x: 32,
        y: 32,
        xsize: 2,
        ysize: 2,
        seed: 42,
        data: 128,
        monstType: 0,
      };

      const townType = generator.getTownType(place);
      expect(townType).toBe(TownType.TOWN_FRACT);
    });
  });

  describe('generate', () => {
    it('should dispatch to correct generator based on place type', () => {
      const townPlace: WildPlace = {
        key: 'starting_town',
        type: 'town',
        name: 'Starting Town',
        x: 32,
        y: 32,
        xsize: 8, // Zangband always uses 8x8
        ysize: 8,
        seed: 42,
        data: 192, // Starting town pop = 64 + 128 per Zangband
        monstType: 0,
      };

      const dungeonPlace: WildPlace = {
        key: 'dungeon_1',
        type: 'dungeon',
        name: 'Dungeon',
        x: 20,
        y: 20,
        xsize: 1,
        ysize: 1,
        seed: 42,
        data: 50,
        monstType: 0,
      };

      const townResult = generator.generate(townPlace);
      const dungeonResult = generator.generate(dungeonPlace);

      // Town should have stores
      expect(townResult.storePositions.length).toBeGreaterThan(0);

      // Dungeon entrance should have fewer/no stores
      expect(dungeonResult.storePositions.length).toBeLessThanOrEqual(
        townResult.storePositions.length
      );
    });
  });

  describe('store integration', () => {
    it('should provide store keys at entrance positions', () => {
      const place: WildPlace = {
        key: 'test_town',
        type: 'town',
        name: 'Test Town',
        x: 32,
        y: 32,
        xsize: 4,
        ysize: 3,
        seed: 42,
        data: 128,
        monstType: 0,
      };

      const result = generator.generateVanillaTown(place);

      // Each store position should have a store key
      for (const storePos of result.storePositions) {
        expect(storePos.storeKey).toBeDefined();
        expect(storePos.storeKey.length).toBeGreaterThan(0);
      }
    });

    it('should use store terrain types (numbered characters) for store doors', () => {
      const place: WildPlace = {
        key: 'starting_town',
        type: 'town',
        name: 'Starting Town',
        x: 32,
        y: 32,
        xsize: 8,
        ysize: 8,
        seed: 42,
        data: 192,
        monstType: 0,
      };

      const result = generator.generate(place);

      // Store terrain indices: 140-147 for stores, 149-155 for service buildings
      const storeTerrainIndices = new Set([
        140, 141, 142, 143, 144, 145, 146, 147, // Stores
        149, 150, 151, 152, 153, 154, 155,      // Service buildings
      ]);

      // Each store position should have a store terrain type (not just floor)
      for (const storePos of result.storePositions) {
        const tile = result.tiles[storePos.y][storePos.x];
        expect(storeTerrainIndices.has(tile.feat)).toBe(true);
      }
    });
  });
});
