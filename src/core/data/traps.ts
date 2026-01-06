/**
 * Trap Definition Types
 *
 * Defines trap data structures and the TrapDataManager.
 */

import { RNG } from 'rot-js';

export interface TrapDef {
  key: string;
  index: number;
  name: string;
  symbol: string;
  color: string;
  minDepth: number;
  rarity: number;
  effect: string;
  damage: string;
  extraDamage?: string;
  poisonDamage?: string;
  teleportRange?: number;
  duration?: string;
  xpDrain?: string;
  summonCount?: string;
  saveType: string;
  saveDifficulty: number;
  flags: string[];
}

export type TrapRecord = Record<string, TrapDef>;

/**
 * An entry in the allocation table for trap generation
 */
export interface TrapAllocationEntry {
  trapKey: string;
  index: number;
  depth: number;
  probability: number;
}

/**
 * Trap Data Manager
 *
 * Provides trap lookup and weighted random selection.
 */
export class TrapDataManager {
  private traps: TrapRecord;
  private allocationTable: TrapAllocationEntry[] = [];
  private rng: typeof RNG;

  constructor(traps: TrapRecord, rng: typeof RNG = RNG) {
    this.traps = traps;
    this.rng = rng;
    this.buildAllocationTable();
  }

  /**
   * Build the allocation table sorted by depth
   */
  private buildAllocationTable(): void {
    this.allocationTable = [];

    for (const [key, trap] of Object.entries(this.traps)) {
      if (trap.rarity > 0) {
        this.allocationTable.push({
          trapKey: key,
          index: trap.index,
          depth: trap.minDepth,
          probability: Math.floor(100 / trap.rarity),
        });
      }
    }

    // Sort by depth
    this.allocationTable.sort((a, b) => a.depth - b.depth);
  }

  /**
   * Get the allocation table (for testing/debugging)
   */
  getAllocationTable(): TrapAllocationEntry[] {
    return [...this.allocationTable];
  }

  /**
   * Get a trap definition by key
   */
  getTrapDef(key: string): TrapDef | undefined {
    return this.traps[key];
  }

  /**
   * Get all traps eligible for a given depth
   */
  getTrapsForDepth(depth: number): TrapDef[] {
    const result: TrapDef[] = [];

    for (const entry of this.allocationTable) {
      if (entry.depth > depth) break;
      const trap = this.traps[entry.trapKey];
      if (trap) {
        result.push(trap);
      }
    }

    return result;
  }

  /**
   * Select a random trap appropriate for the given depth
   */
  selectTrap(depth: number): TrapDef | null {
    // Calculate total probability for eligible traps
    let total = 0;
    const eligible: Array<{ entry: TrapAllocationEntry; trap: TrapDef }> = [];

    for (const entry of this.allocationTable) {
      if (entry.depth > depth) break;

      const trap = this.traps[entry.trapKey];
      if (!trap) continue;

      total += entry.probability;
      eligible.push({ entry, trap });
    }

    if (total <= 0 || eligible.length === 0) return null;

    // Random selection
    let value = this.randint0(total);

    for (const { entry, trap } of eligible) {
      value -= entry.probability;
      if (value < 0) {
        return trap;
      }
    }

    return eligible[eligible.length - 1]?.trap ?? null;
  }

  /**
   * Random integer in range [0, max)
   */
  private randint0(max: number): number {
    if (max <= 0) return 0;
    return this.rng.getUniformInt(0, max - 1);
  }
}
