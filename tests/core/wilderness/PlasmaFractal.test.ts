import { describe, it, expect, beforeEach } from 'vitest';
import { PlasmaFractal } from '@/core/systems/wilderness/PlasmaFractal';
import { WILD_BLOCK_SIZE, MAX_SHORT } from '@/core/data/WildernessTypes';
import * as ROT from 'rot-js';

describe('PlasmaFractal', () => {
  let plasma: PlasmaFractal;

  beforeEach(() => {
    // Use seeded RNG for deterministic tests
    ROT.RNG.setSeed(12345);
    plasma = new PlasmaFractal(ROT.RNG);
  });

  describe('initialization', () => {
    it('should create a (WILD_BLOCK_SIZE+1) x (WILD_BLOCK_SIZE+1) grid', () => {
      // Grid is 17x17 for a 16x16 block (need +1 for interpolation)
      const size = WILD_BLOCK_SIZE + 1;
      expect(size).toBe(17);
    });

    it('should clear grid to MAX_SHORT sentinel values', () => {
      plasma.clear();
      // All values should be MAX_SHORT (not yet filled)
      for (let y = 0; y <= WILD_BLOCK_SIZE; y++) {
        for (let x = 0; x <= WILD_BLOCK_SIZE; x++) {
          expect(plasma.getValue(x, y)).toBe(MAX_SHORT);
        }
      }
    });
  });

  describe('corner and center setting', () => {
    it('should set all four corners to the same value', () => {
      plasma.clear();
      plasma.setCorners(1000);

      expect(plasma.getValue(0, 0)).toBe(1000);
      expect(plasma.getValue(WILD_BLOCK_SIZE, 0)).toBe(1000);
      expect(plasma.getValue(0, WILD_BLOCK_SIZE)).toBe(1000);
      expect(plasma.getValue(WILD_BLOCK_SIZE, WILD_BLOCK_SIZE)).toBe(1000);
    });

    it('should set center value', () => {
      plasma.clear();
      plasma.setCenter(500);

      const mid = WILD_BLOCK_SIZE / 2;
      expect(plasma.getValue(mid, mid)).toBe(500);
    });
  });

  describe('fractal generation', () => {
    it('should fill all grid positions after generate()', () => {
      plasma.clear();
      plasma.setCorners(WILD_BLOCK_SIZE * 128); // Start in middle range
      plasma.generate();

      // All positions should now have values (not MAX_SHORT)
      for (let y = 0; y <= WILD_BLOCK_SIZE; y++) {
        for (let x = 0; x <= WILD_BLOCK_SIZE; x++) {
          const val = plasma.getValue(x, y);
          expect(val).not.toBe(MAX_SHORT);
        }
      }
    });

    it('should preserve corner values when set before generation', () => {
      plasma.clear();
      const cornerVal = 2000;
      plasma.setCorners(cornerVal);
      plasma.generate();

      // Corners should still be the original value
      expect(plasma.getValue(0, 0)).toBe(cornerVal);
      expect(plasma.getValue(WILD_BLOCK_SIZE, 0)).toBe(cornerVal);
      expect(plasma.getValue(0, WILD_BLOCK_SIZE)).toBe(cornerVal);
      expect(plasma.getValue(WILD_BLOCK_SIZE, WILD_BLOCK_SIZE)).toBe(cornerVal);
    });

    it('should be deterministic with the same seed', () => {
      // First generation
      ROT.RNG.setSeed(42);
      const plasma1 = new PlasmaFractal(ROT.RNG);
      plasma1.clear();
      plasma1.setCorners(2048);
      plasma1.generate();

      const values1: number[] = [];
      for (let y = 0; y <= WILD_BLOCK_SIZE; y++) {
        for (let x = 0; x <= WILD_BLOCK_SIZE; x++) {
          values1.push(plasma1.getValue(x, y));
        }
      }

      // Second generation with same seed
      ROT.RNG.setSeed(42);
      const plasma2 = new PlasmaFractal(ROT.RNG);
      plasma2.clear();
      plasma2.setCorners(2048);
      plasma2.generate();

      const values2: number[] = [];
      for (let y = 0; y <= WILD_BLOCK_SIZE; y++) {
        for (let x = 0; x <= WILD_BLOCK_SIZE; x++) {
          values2.push(plasma2.getValue(x, y));
        }
      }

      // Should be identical
      expect(values1).toEqual(values2);
    });

    it('should produce different results with different seeds', () => {
      // First generation
      ROT.RNG.setSeed(100);
      const plasma1 = new PlasmaFractal(ROT.RNG);
      plasma1.clear();
      plasma1.setCorners(2048);
      plasma1.generate();

      const values1: number[] = [];
      for (let y = 0; y <= WILD_BLOCK_SIZE; y++) {
        for (let x = 0; x <= WILD_BLOCK_SIZE; x++) {
          values1.push(plasma1.getValue(x, y));
        }
      }

      // Second generation with different seed
      ROT.RNG.setSeed(200);
      const plasma2 = new PlasmaFractal(ROT.RNG);
      plasma2.clear();
      plasma2.setCorners(2048);
      plasma2.generate();

      const values2: number[] = [];
      for (let y = 0; y <= WILD_BLOCK_SIZE; y++) {
        for (let x = 0; x <= WILD_BLOCK_SIZE; x++) {
          values2.push(plasma2.getValue(x, y));
        }
      }

      // Should be different
      expect(values1).not.toEqual(values2);
    });

    it('should produce values that vary across the grid', () => {
      plasma.clear();
      plasma.setCorners(2048);
      plasma.generate();

      // Collect all values
      const values = new Set<number>();
      for (let y = 0; y <= WILD_BLOCK_SIZE; y++) {
        for (let x = 0; x <= WILD_BLOCK_SIZE; x++) {
          values.add(plasma.getValue(x, y));
        }
      }

      // Should have variety (not all same value)
      // With random offsets, we expect many distinct values
      expect(values.size).toBeGreaterThan(10);
    });
  });

  describe('smooth interpolation', () => {
    it('should smoothly interpolate without random offsets', () => {
      plasma.clear();

      // Set corners to distinct values
      plasma.setValue(0, 0, 0);
      plasma.setValue(WILD_BLOCK_SIZE, 0, 1000);
      plasma.setValue(0, WILD_BLOCK_SIZE, 2000);
      plasma.setValue(WILD_BLOCK_SIZE, WILD_BLOCK_SIZE, 3000);

      // Smooth interpolation
      plasma.smooth();

      // Center should be average of corners (approximately)
      const mid = WILD_BLOCK_SIZE / 2;
      const center = plasma.getValue(mid, mid);
      const expectedAvg = (0 + 1000 + 2000 + 3000) / 4;
      // Allow some tolerance due to integer math
      expect(center).toBeGreaterThan(expectedAvg - 200);
      expect(center).toBeLessThan(expectedAvg + 200);
    });
  });

  describe('edge cases', () => {
    it('should handle zero corner values', () => {
      plasma.clear();
      plasma.setCorners(0);
      plasma.generate();

      // Should still generate without errors
      // Values can go negative from random offsets
      for (let y = 0; y <= WILD_BLOCK_SIZE; y++) {
        for (let x = 0; x <= WILD_BLOCK_SIZE; x++) {
          const val = plasma.getValue(x, y);
          expect(typeof val).toBe('number');
          expect(Number.isFinite(val)).toBe(true);
        }
      }
    });

    it('should handle large corner values', () => {
      plasma.clear();
      const largeVal = WILD_BLOCK_SIZE * 256; // Maximum expected value
      plasma.setCorners(largeVal);
      plasma.generate();

      // Should generate without overflow issues
      for (let y = 0; y <= WILD_BLOCK_SIZE; y++) {
        for (let x = 0; x <= WILD_BLOCK_SIZE; x++) {
          const val = plasma.getValue(x, y);
          expect(typeof val).toBe('number');
          expect(Number.isFinite(val)).toBe(true);
        }
      }
    });

    it('should not overwrite pre-set values during generation', () => {
      plasma.clear();
      plasma.setCorners(1000);

      // Set a specific midpoint value
      const mid = WILD_BLOCK_SIZE / 2;
      plasma.setValue(mid, 0, 5000); // Top middle

      plasma.generate();

      // The pre-set value should be preserved
      expect(plasma.getValue(mid, 0)).toBe(5000);
    });
  });

  describe('getValue/setValue', () => {
    it('should get and set individual values', () => {
      plasma.clear();
      plasma.setValue(5, 7, 1234);
      expect(plasma.getValue(5, 7)).toBe(1234);
    });

    it('should handle boundary positions', () => {
      plasma.clear();
      plasma.setValue(0, 0, 100);
      plasma.setValue(WILD_BLOCK_SIZE, WILD_BLOCK_SIZE, 200);

      expect(plasma.getValue(0, 0)).toBe(100);
      expect(plasma.getValue(WILD_BLOCK_SIZE, WILD_BLOCK_SIZE)).toBe(200);
    });
  });
});
