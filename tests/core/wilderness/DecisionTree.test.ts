import { describe, it, expect, beforeAll } from 'vitest';
import { WildDecisionTree } from '@/core/systems/wilderness/DecisionTree';
import type { WildGenData } from '@/core/data/WildernessTypes';
import wInfoData from '@/data/wilderness/w_info.json';
import * as ROT from 'rot-js';

describe('WildDecisionTree', () => {
  let tree: WildDecisionTree;

  beforeAll(() => {
    // Build tree from actual w_info.json data
    ROT.RNG.setSeed(12345);
    tree = new WildDecisionTree(wInfoData as WildGenData[], ROT.RNG);
  });

  describe('tree construction', () => {
    it('should build tree from w_info data without errors', () => {
      expect(tree).toBeDefined();
    });

    it('should accept empty data gracefully', () => {
      const emptyTree = new WildDecisionTree([], ROT.RNG);
      expect(emptyTree).toBeDefined();
    });

    it('should build tree from single entry', () => {
      const singleEntry: WildGenData[] = [
        {
          id: 1,
          comment: 'test',
          mapFeature: 10,
          bounds: { hgtmin: 0, hgtmax: 255, popmin: 0, popmax: 255, lawmin: 0, lawmax: 255 },
          genRoutine: 2,
          chance: 100,
          roughType: [],
          data: [1, 1, 1, 1, 1, 1, 1, 1],
        },
      ];
      const singleTree = new WildDecisionTree(singleEntry, ROT.RNG);
      expect(singleTree).toBeDefined();
      // Should return the only type for any input
      expect(singleTree.getGenType(0, 0, 0)).toBe(1);
      expect(singleTree.getGenType(128, 128, 128)).toBe(1);
      expect(singleTree.getGenType(255, 255, 255)).toBe(1);
    });
  });

  describe('terrain type lookup', () => {
    it('should return mudflats (id 1) for low hgt, low pop, low law', () => {
      // Entry 1: W:0:43:0:43:0:43 - mudflats
      const type = tree.getGenType(20, 20, 20);
      // Should be within the mudflats region bounds
      expect(type).toBe(1);
    });

    it('should return a valid terrain type for any input', () => {
      // Test various combinations
      const testPoints = [
        [0, 0, 0],
        [255, 255, 255],
        [128, 128, 128],
        [50, 100, 200],
        [200, 50, 100],
        [100, 200, 50],
      ];

      for (const [hgt, pop, law] of testPoints) {
        const type = tree.getGenType(hgt, pop, law);
        expect(type).toBeGreaterThan(0);
        // Type should be a valid id from w_info
        const genData = wInfoData.find((d) => d.id === type);
        expect(genData).toBeDefined();
      }
    });

    it('should be deterministic for same inputs', () => {
      const results1: number[] = [];
      const results2: number[] = [];

      // First round
      ROT.RNG.setSeed(42);
      for (let i = 0; i < 100; i++) {
        results1.push(tree.getGenType(i, i * 2, 255 - i));
      }

      // Second round
      ROT.RNG.setSeed(42);
      for (let i = 0; i < 100; i++) {
        results2.push(tree.getGenType(i, i * 2, 255 - i));
      }

      expect(results1).toEqual(results2);
    });

    it('should respect terrain bounds', () => {
      // Test that points well inside a region return that region's type

      // Entry 1: mudflats - W:0:43:0:43:0:43
      // A point in the center of this region should return mudflats
      const mudflatsCenter = tree.getGenType(21, 21, 21);
      expect(mudflatsCenter).toBe(1);

      // Entry 4: desert - W:0:43:0:43:128:171
      // Center of this region
      const desertCenter = tree.getGenType(21, 21, 150);
      expect(desertCenter).toBe(4);
    });
  });

  describe('boundary conditions', () => {
    it('should handle minimum values (0, 0, 0)', () => {
      const type = tree.getGenType(0, 0, 0);
      expect(type).toBeGreaterThan(0);
    });

    it('should handle maximum values (255, 255, 255)', () => {
      const type = tree.getGenType(255, 255, 255);
      expect(type).toBeGreaterThan(0);
    });

    it('should handle boundary values between regions', () => {
      // Test at the exact boundary between mudflats (hgt 0-43) and other regions
      const atBoundary = tree.getGenType(43, 21, 21);
      expect(atBoundary).toBeGreaterThan(0);

      // Just past boundary
      const pastBoundary = tree.getGenType(44, 21, 21);
      expect(pastBoundary).toBeGreaterThan(0);
    });
  });

  describe('generation type coverage', () => {
    it('should be able to return various terrain types', () => {
      // Sample many points and verify we get variety
      const types = new Set<number>();

      for (let hgt = 0; hgt <= 255; hgt += 32) {
        for (let pop = 0; pop <= 255; pop += 32) {
          for (let law = 0; law <= 255; law += 32) {
            types.add(tree.getGenType(hgt, pop, law));
          }
        }
      }

      // Should find many different terrain types
      expect(types.size).toBeGreaterThan(20);
    });

    it('should return types that exist in w_info data', () => {
      const validIds = new Set(wInfoData.map((d) => d.id));

      // Test random points
      ROT.RNG.setSeed(99);
      for (let i = 0; i < 100; i++) {
        const hgt = Math.floor(ROT.RNG.getUniform() * 256);
        const pop = Math.floor(ROT.RNG.getUniform() * 256);
        const law = Math.floor(ROT.RNG.getUniform() * 256);
        const type = tree.getGenType(hgt, pop, law);
        expect(validIds.has(type)).toBe(true);
      }
    });
  });

  describe('getGenData', () => {
    it('should return the generation data for a type id', () => {
      const genData = tree.getGenData(1);
      expect(genData).toBeDefined();
      expect(genData?.id).toBe(1);
      expect(genData?.comment).toBe('mudflats');
    });

    it('should return undefined for invalid type id', () => {
      const genData = tree.getGenData(99999);
      expect(genData).toBeUndefined();
    });
  });

  describe('overlapping regions with chances', () => {
    it('should handle overlapping regions using chance weights', () => {
      // Some regions in w_info have low chance values (like ponds with chance:1)
      // vs base terrain with chance:100
      // The tree should probabilistically select between them

      // Find a point where pond (id 37, chance:1) overlaps with forest (id 22, chance:100)
      // Entry 37: W:0:43:128:171:128:171 - pond
      // Entry 22: W:0:43:128:171:128:171 - forest (same bounds!)

      // This is hard to test deterministically, but we can verify
      // that multiple samples return valid types
      const types = new Set<number>();
      ROT.RNG.setSeed(777);
      for (let i = 0; i < 100; i++) {
        types.add(tree.getGenType(21, 150, 150));
      }

      // All types should be valid
      const validIds = new Set(wInfoData.map((d) => d.id));
      for (const t of types) {
        expect(validIds.has(t)).toBe(true);
      }
    });
  });
});
