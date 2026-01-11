/**
 * Wilderness Decision Tree
 *
 * Maps (height, population, law) parameters to wilderness generation types.
 *
 * The original C implementation uses a binary space partition tree for O(log n)
 * lookups. This implementation uses a simpler approach that is functionally
 * equivalent but O(n). It can be optimized to match the C implementation if
 * performance becomes an issue.
 *
 * Port of wild1.c:get_gen_type() and tree construction functions.
 */

import type { WildGenData, WildBoundBox } from '@/core/data/WildernessTypes';
import type * as ROT from 'rot-js';

export class WildDecisionTree {
  /** Map of id -> WildGenData for quick access */
  private dataById: Map<number, WildGenData>;

  /** All generation data entries */
  private readonly genData: WildGenData[];

  /** RNG instance */
  private rng: typeof ROT.RNG;

  constructor(
    data: WildGenData[],
    rng: typeof ROT.RNG
  ) {
    this.rng = rng;
    this.genData = data;
    this.dataById = new Map();

    for (const entry of data) {
      this.dataById.set(entry.id, entry);
    }
  }

  /**
   * Get the terrain generation type for the given parameters.
   *
   * Port of wild1.c:get_gen_type()
   *
   * @param hgt Height parameter (0-255)
   * @param pop Population parameter (0-255)
   * @param law Law parameter (0-255)
   * @returns The terrain type id that matches the parameters
   */
  getGenType(hgt: number, pop: number, law: number): number {
    // Find all matching entries
    const matches: WildGenData[] = [];

    for (const entry of this.genData) {
      if (this.isInBounds(hgt, pop, law, entry.bounds)) {
        matches.push(entry);
      }
    }

    if (matches.length === 0) {
      // No match found - this shouldn't happen if w_info covers all parameter space
      // Return first entry as fallback
      return this.genData.length > 0 ? this.genData[0].id : 0;
    }

    if (matches.length === 1) {
      return matches[0].id;
    }

    // Multiple matches - use chance-weighted random selection
    return this.selectByChance(matches);
  }

  /**
   * Get the generation data for a terrain type.
   *
   * @param typeId The terrain type id
   * @returns The WildGenData for this type, or undefined if not found
   */
  getGenData(typeId: number): WildGenData | undefined {
    return this.dataById.get(typeId);
  }

  /**
   * Check if the given parameters are within the bounds.
   */
  private isInBounds(hgt: number, pop: number, law: number, bounds: WildBoundBox): boolean {
    return (
      hgt >= bounds.hgtmin &&
      hgt <= bounds.hgtmax &&
      pop >= bounds.popmin &&
      pop <= bounds.popmax &&
      law >= bounds.lawmin &&
      law <= bounds.lawmax
    );
  }

  /**
   * Select one entry from multiple matches using chance-weighted random selection.
   *
   * Port of the leaf node selection in wild1.c:get_gen_type()
   */
  private selectByChance(matches: WildGenData[]): number {
    // Calculate total chance
    let totalChance = 0;
    for (const entry of matches) {
      totalChance += entry.chance;
    }

    if (totalChance === 0) {
      // All chances are 0, just return first match
      return matches[0].id;
    }

    // Random selection weighted by chance
    const roll = Math.floor(this.rng.getUniform() * totalChance);

    let cumulative = 0;
    for (const entry of matches) {
      cumulative += entry.chance;
      if (roll < cumulative) {
        return entry.id;
      }
    }

    // Fallback (shouldn't reach here)
    return matches[matches.length - 1].id;
  }
}
