/**
 * Monster Data Manager
 *
 * Handles monster data loading and selection for spawning.
 * Implements Zangband's get_mon_num() algorithm with:
 * - Allocation table sorted by depth
 * - Level boosting for out-of-depth monsters
 * - Biased selection toward harder monsters
 * - Unique tracking
 *
 * Ported from Zangband's monster2.c
 */

import { RNG } from 'rot-js';
import type { MonsterDef } from './monsters';
import type { Position } from '@/core/types';
import { Monster } from '@/core/entities/Monster';

// Constants from Zangband defines.h
const MAX_DEPTH = 128;
const GREAT_MON = 50; // 1 in 50 chance of level boost
const NASTY_MON = 50; // 1 in 50 chance per nasty pass to boost by 7

// Monster ID counter for creation
let monsterIdCounter = 1000000; // Start high to avoid collision with spawner

/**
 * An entry in the allocation table for monster generation
 */
export interface MonsterAllocationEntry {
  monsterKey: string;
  index: number;
  depth: number;
  probability: number;
}

/**
 * Monster Data Manager
 *
 * Provides monster lookup and weighted random selection
 * following Zangband's algorithms.
 */
export class MonsterDataManager {
  private monsters: Record<string, MonsterDef>;
  private allocationTable: MonsterAllocationEntry[] = [];
  private killedUniques: Set<string> = new Set();
  private rng: typeof RNG;

  constructor(monsters: Record<string, MonsterDef>, rng: typeof RNG = RNG) {
    this.monsters = monsters;
    this.rng = rng;
    this.buildAllocationTable();
  }

  /**
   * Build the allocation table sorted by depth
   *
   * Probability is calculated as floor(100 / rarity).
   */
  private buildAllocationTable(): void {
    this.allocationTable = [];

    for (const [key, monster] of Object.entries(this.monsters)) {
      if (monster.rarity > 0) {
        this.allocationTable.push({
          monsterKey: key,
          index: monster.index,
          depth: monster.depth,
          probability: Math.floor(100 / monster.rarity),
        });
      }
    }

    // Sort by depth (required for efficient selection)
    this.allocationTable.sort((a, b) => a.depth - b.depth);
  }

  /**
   * Get the allocation table (for testing/debugging)
   */
  getAllocationTable(): MonsterAllocationEntry[] {
    return [...this.allocationTable];
  }

  /**
   * Get a monster definition by key
   */
  getMonsterDef(key: string): MonsterDef | undefined {
    return this.monsters[key];
  }

  /**
   * Get all monsters eligible for a given depth
   */
  getMonstersForDepth(depth: number): MonsterDef[] {
    const result: MonsterDef[] = [];

    for (const entry of this.allocationTable) {
      if (entry.depth > depth) break; // Table is sorted by depth
      const monster = this.monsters[entry.monsterKey];
      if (monster) {
        result.push(monster);
      }
    }

    return result;
  }

  /**
   * Select a monster appropriate for the given level
   *
   * Uses Zangband's get_mon_num() algorithm:
   * 1. Level boosting (1 in GREAT_MON chance)
   * 2. NASTY_MON passes for additional boosting
   * 3. Filter by depth and flags
   * 4. Biased selection toward harder monsters
   *
   * @param level - Current dungeon level
   * @returns The selected monster definition, or null if none available
   */
  selectMonster(level: number): MonsterDef | null {
    // Level boosting (out-of-depth monsters)
    let effectiveLevel = level;

    // 1 in GREAT_MON chance of level boost
    if (this.oneIn(GREAT_MON)) {
      effectiveLevel += this.randint1(10);
    }

    // Two NASTY_MON passes - each has 1/NASTY_MON chance to boost by 7
    if (this.oneIn(NASTY_MON)) {
      effectiveLevel += 7;
    }
    if (this.oneIn(NASTY_MON)) {
      effectiveLevel += 7;
    }

    // Cap at MAX_DEPTH
    if (effectiveLevel > MAX_DEPTH - 1) {
      effectiveLevel = MAX_DEPTH - 1;
    }

    // Calculate total probability for eligible monsters
    let total = 0;
    const eligible: Array<{ entry: MonsterAllocationEntry; monster: MonsterDef }> = [];

    for (const entry of this.allocationTable) {
      if (entry.depth > effectiveLevel) break; // Table is sorted by depth

      const monster = this.monsters[entry.monsterKey];
      if (!monster) continue;

      // Skip killed uniques
      if (monster.flags.includes('UNIQUE') && this.killedUniques.has(monster.key)) {
        continue;
      }

      // Skip FORCE_DEPTH monsters if we're too shallow
      if (monster.flags.includes('FORCE_DEPTH') && level < monster.depth) {
        continue;
      }

      total += entry.probability;
      eligible.push({ entry, monster });
    }

    if (total <= 0 || eligible.length === 0) return null;

    // Biased selection: pick random, 50% chance to pick again and take max
    let value = this.randint0(total);
    if (this.oneIn(2)) {
      const newValue = this.randint0(total);
      if (newValue > value) {
        value = newValue;
      }
    }

    // Find the selected monster
    for (const { entry, monster } of eligible) {
      value -= entry.probability;
      if (value < 0) {
        return monster;
      }
    }

    return eligible[eligible.length - 1]?.monster ?? null;
  }

  /**
   * Check if a unique monster has been killed
   */
  isUniqueKilled(key: string): boolean {
    return this.killedUniques.has(key);
  }

  /**
   * Mark a unique monster as killed
   */
  markUniqueKilled(key: string): void {
    const monster = this.monsters[key];
    if (monster?.flags.includes('UNIQUE')) {
      this.killedUniques.add(key);
    }
  }

  /**
   * Reset killed uniques (for new game)
   */
  resetUniques(): void {
    this.killedUniques.clear();
  }

  /**
   * Get list of killed unique keys
   */
  getKilledUniques(): string[] {
    return [...this.killedUniques];
  }

  /**
   * Select a monster suitable for polymorphing to from a given level.
   * Similar to selectMonster but without GREAT_MON/NASTY_MON boosting.
   *
   * @param level - The approximate level to select from
   * @returns The selected monster definition, or null if none available
   */
  selectPolymorphTarget(level: number): MonsterDef | null {
    // Polymorph variation: +/- 5 levels
    const variation = this.randint0(11) - 5; // -5 to +5
    let effectiveLevel = Math.max(1, level + variation);

    // Cap at MAX_DEPTH
    if (effectiveLevel > MAX_DEPTH - 1) {
      effectiveLevel = MAX_DEPTH - 1;
    }

    // Calculate total probability for eligible monsters
    let total = 0;
    const eligible: Array<{ entry: MonsterAllocationEntry; monster: MonsterDef }> = [];

    for (const entry of this.allocationTable) {
      if (entry.depth > effectiveLevel) break;

      const monster = this.monsters[entry.monsterKey];
      if (!monster) continue;

      // Skip uniques (can't polymorph into a unique)
      if (monster.flags.includes('UNIQUE')) continue;

      // Skip FORCE_DEPTH monsters if we're too shallow
      if (monster.flags.includes('FORCE_DEPTH') && level < monster.depth) continue;

      total += entry.probability;
      eligible.push({ entry, monster });
    }

    if (total <= 0 || eligible.length === 0) return null;

    // Simple random selection (no bias for polymorph)
    let value = this.randint0(total);

    for (const { entry, monster } of eligible) {
      value -= entry.probability;
      if (value < 0) {
        return monster;
      }
    }

    return eligible[eligible.length - 1]?.monster ?? null;
  }

  /**
   * Create a Monster entity from a definition at a position.
   * Used for polymorph, summoning, etc.
   *
   * @param def - Monster definition to create from
   * @param pos - Position for the new monster
   * @returns New Monster entity
   */
  createMonsterFromDef(def: MonsterDef, pos: Position): Monster {
    const hp = this.rollDice(def.hp);

    return new Monster({
      id: `monster_poly_${++monsterIdCounter}`,
      position: { x: pos.x, y: pos.y },
      symbol: def.symbol,
      color: def.color,
      def,
      speed: def.speed,
      maxHp: hp,
    });
  }

  /**
   * Roll dice in XdY format
   */
  private rollDice(diceStr: string): number {
    const match = diceStr.match(/^(\d+)d(\d+)$/);
    if (!match) return 1;

    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += this.rng.getUniformInt(1, sides);
    }
    return total;
  }

  // Random number utilities

  /**
   * Random integer in range [0, max)
   */
  private randint0(max: number): number {
    if (max <= 0) return 0;
    return this.rng.getUniformInt(0, max - 1);
  }

  /**
   * Random integer in range [1, max]
   */
  private randint1(max: number): number {
    if (max <= 0) return 1;
    return this.rng.getUniformInt(1, max);
  }

  /**
   * Returns true 1/n of the time
   */
  private oneIn(n: number): boolean {
    return this.randint0(n) === 0;
  }
}
