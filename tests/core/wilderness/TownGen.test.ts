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
      expect(result.dungeonEntrance.x).toBeGreaterThanOrEqual(0);
      expect(result.dungeonEntrance.y).toBeGreaterThanOrEqual(0);
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
    it('should generate a fractal city with varied layout', () => {
      const place: WildPlace = {
        key: 'test_city',
        type: 'town',
        name: 'Test City',
        x: 32,
        y: 32,
        xsize: 2,
        ysize: 2,
        seed: 42,
        data: 200, // high population
        monstType: 0,
      };

      const result = generator.generateFractalCity(place);

      expect(result).toBeDefined();
      expect(result.tiles).toBeDefined();
      expect(result.width).toBe(place.xsize * WILD_BLOCK_SIZE);
      expect(result.height).toBe(place.ysize * WILD_BLOCK_SIZE);
    });

    it('should have buildings placed', () => {
      const place: WildPlace = {
        key: 'test_city',
        type: 'town',
        name: 'Test City',
        x: 32,
        y: 32,
        xsize: 2,
        ysize: 2,
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
        xsize: 2,
        ysize: 2,
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
      const { x, y } = result.dungeonEntrance;

      // Should have down stairs at entrance
      expect(result.tiles[y][x].feat).toBe(7); // FEAT_DOWN_STAIRS
    });
  });

  describe('getTownType', () => {
    it('should return TOWN_OLD for starting town', () => {
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
      expect(townType).toBe(TownType.TOWN_OLD);
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
        xsize: 4,
        ysize: 3,
        seed: 42,
        data: 128,
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
  });
});
