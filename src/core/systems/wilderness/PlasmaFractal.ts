/**
 * Plasma Fractal Generator
 *
 * Ported from Zangband wild3.c:frac_block()
 *
 * Uses midpoint displacement algorithm to generate a heightmap.
 * The algorithm works by:
 * 1. Setting corner values
 * 2. Repeatedly subdividing and filling midpoints
 * 3. Each midpoint is the average of neighbors plus a random offset
 * 4. The random offset decreases with each subdivision level
 */

import { WILD_BLOCK_SIZE, MAX_SHORT } from '@/core/data/WildernessTypes';
import type * as ROT from 'rot-js';

export class PlasmaFractal {
  /** The 2D grid of height values. Size is (WILD_BLOCK_SIZE+1) x (WILD_BLOCK_SIZE+1) */
  private grid: number[][];

  /** Grid size (17 for 16x16 blocks) */
  private readonly size = WILD_BLOCK_SIZE;

  /** RNG instance */
  private rng: typeof ROT.RNG;

  constructor(rng: typeof ROT.RNG) {
    this.rng = rng;
    // Initialize grid with size+1 for interpolation at edges
    this.grid = [];
    for (let y = 0; y <= this.size; y++) {
      this.grid[y] = [];
      for (let x = 0; x <= this.size; x++) {
        this.grid[y][x] = MAX_SHORT;
      }
    }
  }

  /**
   * Clear the grid to MAX_SHORT sentinel values.
   * MAX_SHORT indicates "not yet filled".
   */
  clear(): void {
    for (let y = 0; y <= this.size; y++) {
      for (let x = 0; x <= this.size; x++) {
        this.grid[y][x] = MAX_SHORT;
      }
    }
  }

  /**
   * Set all four corner values to the same value.
   */
  setCorners(val: number): void {
    this.grid[0][0] = val;
    this.grid[0][this.size] = val;
    this.grid[this.size][0] = val;
    this.grid[this.size][this.size] = val;
  }

  /**
   * Set the center value.
   */
  setCenter(val: number): void {
    const mid = this.size / 2;
    this.grid[mid][mid] = val;
  }

  /**
   * Get value at position.
   */
  getValue(x: number, y: number): number {
    return this.grid[y][x];
  }

  /**
   * Set value at position.
   */
  setValue(x: number, y: number, val: number): void {
    this.grid[y][x] = val;
  }

  /**
   * Generate fractal heightmap using midpoint displacement.
   *
   * Port of wild3.c:frac_block()
   *
   * The algorithm repeatedly subdivides the grid:
   * - First pass fills horizontal midpoints (avg of left/right + random)
   * - Second pass fills vertical midpoints (avg of top/bottom + random)
   * - Third pass fills center points (avg of all 4 corners + scaled random)
   *
   * The random offset is proportional to the current step size,
   * and the diagonal offset is scaled by 181/256 to reduce grid artifacts.
   */
  generate(): void {
    let lstep: number;
    let hstep: number;

    // Initialize step sizes
    lstep = hstep = this.size;

    // Fill in the square with fractal height data
    while (hstep > 1) {
      // Halve the step sizes
      lstep = hstep;
      hstep = Math.floor(hstep / 2);

      // Middle top to bottom (horizontal midpoints)
      for (let i = hstep; i <= this.size - hstep; i += lstep) {
        for (let j = 0; j <= this.size; j += lstep) {
          // Only write to points that are "blank"
          if (this.grid[j][i] === MAX_SHORT) {
            // Average of left and right points + random bit
            const left = this.grid[j][i - hstep];
            const right = this.grid[j][i + hstep];
            const randomOffset = this.randint1(lstep * 256) - hstep * 256;
            this.grid[j][i] = Math.floor((left + right + randomOffset) / 2);
          }
        }
      }

      // Middle left to right (vertical midpoints)
      for (let j = hstep; j <= this.size - hstep; j += lstep) {
        for (let i = 0; i <= this.size; i += lstep) {
          // Only write to points that are "blank"
          if (this.grid[j][i] === MAX_SHORT) {
            // Average of up and down points + random bit
            const up = this.grid[j - hstep][i];
            const down = this.grid[j + hstep][i];
            const randomOffset = this.randint1(lstep * 256) - hstep * 256;
            this.grid[j][i] = Math.floor((up + down + randomOffset) / 2);
          }
        }
      }

      // Center points
      for (let i = hstep; i <= this.size - hstep; i += lstep) {
        for (let j = hstep; j <= this.size - hstep; j += lstep) {
          // Only write to points that are "blank"
          if (this.grid[j][i] === MAX_SHORT) {
            // Average over all four corners
            const tl = this.grid[j - hstep][i - hstep];
            const tr = this.grid[j - hstep][i + hstep];
            const bl = this.grid[j + hstep][i - hstep];
            const br = this.grid[j + hstep][i + hstep];
            const avg = Math.floor((tl + tr + bl + br) / 4);

            // Scale by 181/256 to reduce the effect of the square grid
            // on the shape of the fractal
            const randomOffset = this.randint1(lstep * 256) - hstep * 256;
            const scaledOffset = Math.floor((randomOffset * 181) / 256);

            this.grid[j][i] = avg + scaledOffset;
          }
        }
      }
    }
  }

  /**
   * Smooth interpolation without random offsets.
   *
   * Port of wild3.c:smooth_block()
   *
   * Similar to generate() but without random offsets.
   * Used for creating smooth gradients.
   */
  smooth(): void {
    let lstep: number;
    let hstep: number;

    // Initialize step sizes
    lstep = hstep = this.size;

    while (hstep > 1) {
      // Halve the step sizes
      lstep = hstep;
      hstep = Math.floor(hstep / 2);

      // Middle top to bottom (horizontal midpoints)
      for (let i = hstep; i <= this.size - hstep; i += lstep) {
        for (let j = 0; j <= this.size; j += lstep) {
          if (this.grid[j][i] === MAX_SHORT) {
            const left = this.grid[j][i - hstep];
            const right = this.grid[j][i + hstep];
            this.grid[j][i] = Math.floor((left + right) / 2);
          }
        }
      }

      // Middle left to right (vertical midpoints)
      for (let j = hstep; j <= this.size - hstep; j += lstep) {
        for (let i = 0; i <= this.size; i += lstep) {
          if (this.grid[j][i] === MAX_SHORT) {
            const up = this.grid[j - hstep][i];
            const down = this.grid[j + hstep][i];
            this.grid[j][i] = Math.floor((up + down) / 2);
          }
        }
      }

      // Center points
      for (let i = hstep; i <= this.size - hstep; i += lstep) {
        for (let j = hstep; j <= this.size - hstep; j += lstep) {
          if (this.grid[j][i] === MAX_SHORT) {
            const tl = this.grid[j - hstep][i - hstep];
            const tr = this.grid[j - hstep][i + hstep];
            const bl = this.grid[j + hstep][i - hstep];
            const br = this.grid[j + hstep][i + hstep];
            this.grid[j][i] = Math.floor((tl + tr + bl + br) / 4);
          }
        }
      }
    }
  }

  /**
   * Generate random integer from 1 to max (inclusive).
   * Port of Zangband's randint1().
   */
  private randint1(max: number): number {
    if (max <= 0) return 0;
    return Math.floor(this.rng.getUniform() * max) + 1;
  }
}
