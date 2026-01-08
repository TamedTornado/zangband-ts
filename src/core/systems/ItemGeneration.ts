/**
 * Item Generation System
 *
 * This module handles the generation of items in the dungeon, including:
 * - Base item selection by depth using allocation tables
 * - Ego item (prefix/suffix) application
 * - Artifact generation
 * - Magic item bonuses
 *
 * Ported from Zangband's object2.c
 */

import { RNG } from 'rot-js';
import { Item } from '@/core/entities/Item';
import type { ItemDef } from '@/core/data/items';
import type { EgoItemDef } from '@/core/data/ego-items';
import type { ArtifactDef } from '@/core/data/artifacts';

// Constants from Zangband defines.h
const MAX_DEPTH = 128;
const GREAT_OBJ = 50; // 1 in 50 chance of out-of-depth item
const EGO_INFLATE = 10; // 1 in 10 chance of ego item level boost

// Equipment slot constants (ES_*)
const ES_CROWN = 21;
const ES_DIG = 22;
const ES_AMMO = 23;
const ES_WIELD = 24;
const ES_BOW = 25;
const ES_NECK = 28;
const ES_LITE = 29;
const ES_BODY = 30;
const ES_OUTER = 31;
const ES_ARM = 32;
const ES_HEAD = 33;
const ES_HANDS = 34;
const ES_FEET = 35;

// Object creation flags
const OC_NORMAL = 0x01;
const OC_FORCE_GOOD = 0x02;
const OC_FORCE_BAD = 0x04;

/**
 * An entry in the allocation table for item generation
 */
export interface AllocationEntry {
  itemKey: string;
  index: number;
  depth: number;
  probability: number;
}

/**
 * Configuration for the item generation system
 */
export interface ItemGenerationConfig {
  items: Record<string, ItemDef>;
  egoItems: Record<string, EgoItemDef>;
  artifacts: Record<string, ArtifactDef>;
}

/**
 * Represents a generated item with all its properties
 */
export interface GeneratedItem {
  baseItem: ItemDef;
  egoItem?: EgoItemDef;
  artifact?: ArtifactDef;
  toHit: number;
  toDam: number;
  toAc: number;
  pval: number;
  flags: string[];
  cost?: number;
  dd?: number; // Damage dice (may be modified)
  ds?: number; // Damage sides (may be modified)
  identified?: boolean; // Whether item properties have been revealed
  // Device charge tracking
  charges?: number; // Current charges (wands, staffs)
  maxCharges?: number; // Maximum charges when generated (for display: "5/8")
  timeout?: number; // Recharge timeout (rods) - 0 when ready
}

/**
 * Parsed weapon damage dice
 */
export interface WeaponDamage {
  dice: number;
  sides: number;
}

/**
 * Item Generation System
 *
 * Handles all aspects of item creation including base item selection,
 * ego item application, and artifact generation.
 */
export class ItemGeneration {
  private items: Record<string, ItemDef>;
  private egoItems: Record<string, EgoItemDef>;
  private artifacts: Record<string, ArtifactDef>;
  private allocationTable: AllocationEntry[] = [];
  private createdArtifacts: Set<string> = new Set();
  private rng: typeof RNG;

  constructor(config: ItemGenerationConfig, rng: typeof RNG = RNG) {
    this.items = config.items;
    this.egoItems = config.egoItems;
    this.artifacts = config.artifacts;
    this.rng = rng;
    this.buildAllocationTable();
  }

  /**
   * Build the allocation table sorted by depth
   *
   * The allocation table is used for weighted random selection of items.
   * Probability is calculated as floor(100 / rarity).
   */
  private buildAllocationTable(): void {
    this.allocationTable = [];

    for (const [key, item] of Object.entries(this.items)) {
      // Use allocation array if available, otherwise use base depth/rarity
      if (item.allocation && item.allocation.length > 0) {
        for (const alloc of item.allocation) {
          if (alloc.rarity > 0) {
            this.allocationTable.push({
              itemKey: key,
              index: item.index,
              depth: alloc.depth,
              probability: Math.floor(100 / alloc.rarity),
            });
          }
        }
      } else if (item.rarity > 0) {
        this.allocationTable.push({
          itemKey: key,
          index: item.index,
          depth: item.depth,
          probability: Math.floor(100 / item.rarity),
        });
      }
    }

    // Sort by depth (required for efficient selection)
    this.allocationTable.sort((a, b) => a.depth - b.depth);
  }

  /**
   * Get the allocation table (for testing/debugging)
   */
  getAllocationTable(): AllocationEntry[] {
    return [...this.allocationTable];
  }

  /**
   * Get an item definition by key
   */
  getItemDef(key: string): ItemDef | undefined {
    return this.items[key];
  }

  /**
   * Get an ego item definition by key
   */
  getEgoItemDef(key: string): EgoItemDef | undefined {
    return this.egoItems[key];
  }

  /**
   * Get an artifact definition by key
   */
  getArtifactDef(key: string): ArtifactDef | undefined {
    return this.artifacts[key];
  }

  /**
   * Calculate a level-dependent bonus
   *
   * This is the m_bonus function from Zangband.
   * The bonus moves toward max as level increases.
   * Result is normally distributed around (max * level / MAX_DEPTH).
   *
   * @param max - Maximum possible bonus
   * @param level - Current dungeon level
   * @returns A value between 0 and max
   */
  mBonus(max: number, level: number): number {
    // Enforce maximal level
    if (level > MAX_DEPTH - 1) level = MAX_DEPTH - 1;

    // The bonus moves toward the max
    let bonus = Math.floor((max * level) / MAX_DEPTH);

    // Simulate floating point: add 1 if random < remainder
    const extra = (max * level) % MAX_DEPTH;
    if (this.randint0(MAX_DEPTH) < extra) bonus++;

    // The standard deviation is 1/4 of the max
    let stand = Math.floor(max / 4);
    const standExtra = max % 4;
    if (this.randint0(4) < standExtra) stand++;

    // Choose a value from normal distribution
    const value = this.randNormal(bonus, stand);

    // Clamp to valid range
    return Math.max(0, Math.min(max, value));
  }

  /**
   * Weighted bonus based on level difference
   *
   * This creates bonuses that depend on the difference between
   * the item's normal level and the current level.
   *
   * @param max - Maximum bonus (must be >= 6)
   * @param levDif - Level difference (current - item level)
   * @returns A positive or negative bonus
   */
  wBonus(max: number, levDif: number): number {
    if (max < 6) return 0;
    if (Math.abs(levDif) < 10) return 0;

    if (levDif < 0) {
      // Negative bonus for out-of-depth items
      return -this.mBonus(max - 5, -levDif);
    } else {
      // Positive bonus for below-level items
      return this.randint1(5) + this.mBonus(max - 5, levDif * 3);
    }
  }

  /**
   * Select a base item type appropriate for the given level
   *
   * Uses a weighted random selection biased toward higher-level items.
   * Has a 1 in GREAT_OBJ chance of boosting the level.
   *
   * @param level - Current dungeon level
   * @param minLevel - Minimum item level (default 0)
   * @returns The selected item definition, or null if none available
   */
  selectBaseItem(level: number, minLevel: number = 0): ItemDef | null {
    // Occasional level boost (out-of-depth items)
    if (this.oneIn(GREAT_OBJ)) {
      // Bizarre calculation from original: 1 + (level * MAX_DEPTH / rand(MAX_DEPTH))
      level = 1 + Math.floor((level * MAX_DEPTH) / this.randint1(MAX_DEPTH));
    }

    // Calculate total probability for eligible items
    let total = 0;
    for (const entry of this.allocationTable) {
      if (entry.depth > level) break; // Items are sorted by depth
      if (entry.depth < minLevel) continue;
      total += entry.probability;
    }

    if (total <= 0) return null;

    // Pick with bias toward higher-value items
    // Try 3 times and take the highest (bias toward rarer items)
    let value = this.randint0(total);
    for (let i = 0; i < 3; i++) {
      const newValue = this.randint0(total);
      if (newValue > value) {
        value = newValue;
      }
    }

    // Find the selected item
    for (const entry of this.allocationTable) {
      if (entry.depth < minLevel) continue;
      if (entry.depth > level) break;

      value -= entry.probability;
      if (value < 0) {
        return this.items[entry.itemKey] ?? null;
      }
    }

    return null;
  }

  /**
   * Calculate the chance of an item being "good" at a given level
   *
   * Formula: f = (lev * 3) / 5 + 10, capped at 42
   *
   * @param level - Current dungeon level
   * @returns Chance percentage (0-42)
   */
  calculateGoodChance(level: number): number {
    let f = Math.floor((level * 3) / 5) + 10;
    if (f > 42) f = 42;
    return f;
  }

  /**
   * Determine if an item should be "good" (ego item candidate)
   *
   * @param level - Current dungeon level
   * @returns True if the item should be good
   */
  shouldBeGood(level: number): boolean {
    const f = this.calculateGoodChance(level);
    return this.randint0(100) < f;
  }

  /**
   * Select an ego item appropriate for the given slot and level
   *
   * @param level - Current dungeon level
   * @param slot - Equipment slot (ES_* constant)
   * @param good - True for good ego items, false for cursed
   * @returns The selected ego item, or null if none available
   */
  selectEgoItem(level: number, slot: number, good: boolean): EgoItemDef | null {
    // Occasional level boost
    if (this.oneIn(EGO_INFLATE)) {
      level = 1 + Math.floor((level * MAX_DEPTH) / this.randint1(MAX_DEPTH));
    }

    // Filter matching ego items
    const matching: Array<{ ego: EgoItemDef; probability: number }> = [];
    let total = 0;

    for (const ego of Object.values(this.egoItems)) {
      // Check slot match
      if (ego.slot !== slot) continue;

      // Check good/bad match (rating > 0 means good)
      if (good && ego.rating <= 0) continue;
      if (!good && ego.rating > 0) continue;

      // Check level requirement
      if (ego.depth > level) continue;

      // Calculate probability (100 / rarity)
      const prob = ego.rarity > 0 ? Math.floor(100 / ego.rarity) : 0;
      if (prob > 0) {
        matching.push({ ego, probability: prob });
        total += prob;
      }
    }

    if (total <= 0 || matching.length === 0) return null;

    // Random selection
    let value = this.randint1(total);
    for (const entry of matching) {
      value -= entry.probability;
      if (value <= 0) {
        return entry.ego;
      }
    }

    return matching[matching.length - 1]?.ego ?? null;
  }

  /**
   * Apply an ego item to a generated item
   *
   * This adds the ego item's bonuses and flags to the item.
   * For cursed items, bonuses are subtracted instead.
   *
   * @param item - The item to modify
   * @param ego - The ego item to apply
   */
  applyEgoItem(item: GeneratedItem, ego: EgoItemDef): void {
    item.egoItem = ego;

    // Check if item is cursed (has CURSED flag or cost is 0)
    const isCursed = item.flags.includes('CURSED') || item.cost === 0;

    if (isCursed) {
      // Apply penalties for cursed items
      if (ego.maxToHit > 0) item.toHit -= this.randint1(ego.maxToHit);
      if (ego.maxToDam > 0) item.toDam -= this.randint1(ego.maxToDam);
      if (ego.maxToAc > 0) item.toAc -= this.randint1(ego.maxToAc);
      if (ego.pval > 0) item.pval -= this.randint1(ego.pval);
    } else {
      // Apply bonuses for good items
      if (ego.maxToHit > 0) item.toHit += this.randint1(ego.maxToHit);
      if (ego.maxToDam > 0) item.toDam += this.randint1(ego.maxToDam);
      if (ego.maxToAc > 0) item.toAc += this.randint1(ego.maxToAc);

      // Add pval only if object has no pval, or normally has one
      if (ego.pval > 0 && (item.pval === 0 || item.baseItem.pval !== 0)) {
        item.pval += this.randint1(ego.pval);
      }
    }

    // Add ego flags
    for (const flag of ego.flags) {
      if (!item.flags.includes(flag)) {
        item.flags.push(flag);
      }
    }

    // Update cost
    item.cost = (item.cost ?? item.baseItem.cost) + ego.cost;
  }

  /**
   * Attempt to create an artifact
   *
   * Artifacts can only be created once per game.
   * They have depth and rarity requirements.
   *
   * @param playerDepth - Current player depth
   * @param deltaLevel - Bonus to item quality
   * @returns The artifact definition, or null if not created
   */
  tryCreateArtifact(playerDepth: number, _deltaLevel: number): ArtifactDef | null {
    for (const artifact of Object.values(this.artifacts)) {
      // Skip empty or already created artifacts
      if (!artifact.name) continue;
      if (this.createdArtifacts.has(artifact.key)) continue;

      // Skip quest items (marked with QUESTITEM flag)
      if (artifact.flags.includes('QUESTITEM')) continue;

      // Check depth requirement with out-of-depth chance
      if (artifact.depth > playerDepth) {
        const d = (artifact.depth - playerDepth) * 2;
        if (!this.oneIn(d)) continue;
      }

      // Artifact rarity roll
      if (!this.oneIn(artifact.rarity)) continue;

      // Mark as created
      this.createdArtifacts.add(artifact.key);

      return artifact;
    }

    return null;
  }

  /**
   * Get list of already-created artifact keys
   */
  getCreatedArtifacts(): string[] {
    return [...this.createdArtifacts];
  }

  /**
   * Reset artifact creation status (for new game)
   */
  resetArtifacts(): void {
    this.createdArtifacts.clear();
  }

  /**
   * Generate a complete item
   *
   * This is the main entry point for item generation.
   * It selects a base item, applies magic bonuses,
   * and potentially makes it an ego item or artifact.
   *
   * @param level - Current dungeon level
   * @param deltaLevel - Bonus to item quality (0 for normal)
   * @returns A generated item, or null if generation failed
   */
  generateItem(level: number, deltaLevel: number): GeneratedItem | null {
    // Calculate special item probability
    let prob = deltaLevel > 0 ? Math.floor(800 / deltaLevel) : 800;
    if (prob < 10) prob = 10;

    // Normalize delta level with some randomness
    const actualDelta = this.randint0(Math.max(1, deltaLevel));
    const base = Math.min(level + actualDelta, 100);

    // Determine flags based on delta level
    let flags = OC_NORMAL;
    let minLevel = 0;

    if (deltaLevel > 15) {
      flags = OC_FORCE_GOOD;
      minLevel = Math.floor(level + deltaLevel / 2);
    }

    // Try to create an artifact first
    if (this.oneIn(prob)) {
      const artifact = this.tryCreateArtifact(level, deltaLevel);
      if (artifact) {
        return this.createArtifactItem(artifact);
      }
    }

    // Select base item
    const baseItem = this.selectBaseItem(base, minLevel);
    if (!baseItem) return null;

    // Create generated item
    const item: GeneratedItem = {
      baseItem,
      toHit: baseItem.toHit,
      toDam: baseItem.toDam,
      toAc: baseItem.toAc,
      pval: baseItem.pval,
      flags: [...baseItem.flags],
      cost: baseItem.cost,
    };

    // Apply magic bonuses based on item type
    this.applyMagic(item, base, base - baseItem.depth, flags);

    return item;
  }

  /**
   * Create an item from an artifact definition
   */
  private createArtifactItem(artifact: ArtifactDef): GeneratedItem {
    // Find the base item for this artifact
    const baseItem = this.findBaseItemForArtifact(artifact);

    return {
      baseItem: baseItem ?? this.createDummyBaseItem(artifact),
      artifact,
      toHit: artifact.toHit,
      toDam: artifact.toDam,
      toAc: artifact.toAc,
      pval: artifact.pval,
      flags: [...artifact.flags],
      cost: artifact.cost,
    };
  }

  /**
   * Find the base item that corresponds to an artifact
   */
  private findBaseItemForArtifact(artifact: ArtifactDef): ItemDef | null {
    for (const item of Object.values(this.items)) {
      if (item.type === artifact.type && item.sval === artifact.sval) {
        return item;
      }
    }
    return null;
  }

  /**
   * Create a dummy base item for an artifact when no matching item exists
   */
  private createDummyBaseItem(artifact: ArtifactDef): ItemDef {
    return {
      key: `artifact_base_${artifact.key}`,
      index: artifact.index,
      name: artifact.name,
      symbol: '?',
      color: 'w',
      type: artifact.type,
      sval: artifact.sval,
      pval: artifact.pval,
      depth: artifact.depth,
      rarity: artifact.rarity,
      weight: artifact.weight,
      cost: artifact.cost,
      allocation: [],
      baseAc: artifact.baseAc,
      damage: artifact.damage,
      toHit: artifact.toHit,
      toDam: artifact.toDam,
      toAc: artifact.toAc,
      flags: [],
    };
  }

  /**
   * Apply magic to an item based on its type
   *
   * This applies enchantment bonuses and potentially ego items.
   *
   * @param item - The item to enchant
   * @param level - Current dungeon level
   * @param levDif - Level difference (item level vs dungeon level)
   * @param flags - Creation flags (OC_NORMAL, OC_FORCE_GOOD, OC_FORCE_BAD)
   */
  private applyMagic(item: GeneratedItem, level: number, levDif: number, flags: number): void {
    // Cap level
    if (level > MAX_DEPTH - 1) level = MAX_DEPTH - 1;

    // Base chance of being good
    let f = this.calculateGoodChance(level);

    // Roll for ego items
    if ((flags & OC_NORMAL) !== 0 && this.randint0(100) < f) {
      if (this.randint0(100) < f) {
        flags |= OC_FORCE_GOOD;
      } else if (this.randint0(100) < f) {
        flags |= OC_FORCE_BAD;
      }
    }

    const type = item.baseItem.type;

    // Apply type-specific magic
    if (this.isWeapon(type)) {
      this.applyWeaponMagic(item, level, levDif, flags);
    } else if (this.isArmor(type)) {
      this.applyArmorMagic(item, level, levDif, flags);
    } else if (type === 'ring' || type === 'amulet') {
      this.applyJewelryMagic(item, level, flags);
    } else if (type === 'light') {
      this.applyLiteMagic(item, level, flags);
    } else if (type === 'wand' || type === 'staff' || type === 'rod') {
      this.applyDeviceMagic(item, level);
    }

    // Random curse chance (15% for normal items)
    if ((flags & OC_NORMAL) !== 0 && this.randint0(100) < 15) {
      if (!item.flags.includes('CURSED')) {
        item.flags.push('CURSED');
      }
    }
  }

  /**
   * Apply magic to a weapon
   */
  private applyWeaponMagic(item: GeneratedItem, level: number, levDif: number, flags: number): void {
    const tohit1 = this.wBonus(10, levDif);
    const todam1 = this.wBonus(10, levDif);
    const tohit2 = this.mBonus(10, level);
    const todam2 = this.mBonus(10, level);

    // Base enchantment
    item.toHit += tohit1;
    item.toDam += todam1;

    // Good items get extra bonuses
    if ((flags & OC_FORCE_GOOD) !== 0) {
      item.toHit += tohit2;
      item.toDam += todam2;

      // Roll for random artifact (1 in 40)
      if (this.oneIn(40)) {
        // Would create random artifact here
        // For now, just apply ego item
      }

      // Roll for ego item
      const slot = this.getSlotForType(item.baseItem.type);
      const ego = this.selectEgoItem(level, slot, true);
      if (ego) {
        this.applyEgoItem(item, ego);

        // Super-charge damage dice (rare)
        if (this.oneIn(10 * (item.dd ?? 1) * (item.ds ?? 1))) {
          const damage = this.parseWeaponDamage(item.baseItem.damage);
          item.ds = damage.sides + Math.floor((damage.sides * this.randint1(5)) / 5);
        }
      }
    } else if ((flags & OC_FORCE_BAD) !== 0) {
      // Cursed items get penalties
      item.toHit -= tohit2 * 2;
      item.toDam -= todam2 * 2;

      // Roll for cursed ego item
      const slot = this.getSlotForType(item.baseItem.type);
      const ego = this.selectEgoItem(level, slot, false);
      if (ego) {
        this.applyEgoItem(item, ego);
      }
    }
  }

  /**
   * Apply magic to armor
   */
  private applyArmorMagic(item: GeneratedItem, level: number, levDif: number, flags: number): void {
    const toac1 = this.wBonus(10, levDif);
    const toac2 = this.mBonus(10, level);

    // Base enchantment
    item.toAc += toac1;

    // Good items get extra bonuses
    if ((flags & OC_FORCE_GOOD) !== 0) {
      item.toAc += toac2;

      // Roll for ego item
      const slot = this.getSlotForType(item.baseItem.type);
      const ego = this.selectEgoItem(level, slot, true);
      if (ego) {
        this.applyEgoItem(item, ego);
      }
    } else if ((flags & OC_FORCE_BAD) !== 0) {
      // Cursed items get penalties
      item.toAc -= toac2 * 2;

      // Roll for cursed ego item
      const slot = this.getSlotForType(item.baseItem.type);
      const ego = this.selectEgoItem(level, slot, false);
      if (ego) {
        this.applyEgoItem(item, ego);
      }
    }
  }

  /**
   * Apply magic to jewelry (rings and amulets)
   */
  private applyJewelryMagic(_item: GeneratedItem, _level: number, _flags: number): void {
    // Jewelry is mostly handled by the base item type
    // Special processing would go here
  }

  /**
   * Apply magic to light sources
   */
  private applyLiteMagic(item: GeneratedItem, level: number, flags: number): void {
    // Lights have increased chance of being ego items
    if ((flags & OC_FORCE_GOOD) !== 0) {
      const ego = this.selectEgoItem(level, ES_LITE, true);
      if (ego) {
        this.applyEgoItem(item, ego);
      }
    }
  }

  /**
   * Apply magic to devices (wands, staffs, rods)
   * Initializes charges based on the item's pval and level
   */
  private applyDeviceMagic(item: GeneratedItem, level: number): void {
    const type = item.baseItem.type;
    const basePval = item.baseItem.pval;

    if (type === 'wand') {
      // Wands: charges = base pval + random bonus based on level
      // Base charges from pval, plus 1-3 bonus at low levels, more at higher levels
      const bonus = 1 + this.mBonus(Math.max(1, Math.floor(basePval / 2)), level);
      const charges = basePval + bonus;
      item.charges = charges;
      item.maxCharges = charges;
    } else if (type === 'staff') {
      // Staffs: similar to wands but typically fewer charges
      // Divide by 2 for staffs since they're more powerful
      const bonus = 1 + this.mBonus(Math.max(1, Math.floor(basePval / 3)), level);
      const charges = Math.max(1, Math.floor(basePval / 2)) + bonus;
      item.charges = charges;
      item.maxCharges = charges;
    } else if (type === 'rod') {
      // Rods: timeout starts at 0 (ready to use)
      // pval represents the recharge time after use
      item.timeout = 0;
    }
  }

  private static readonly WEAPON_TYPES = new Set([
    'digging', 'hafted', 'polearm', 'sword', 'bow', 'shot', 'arrow', 'bolt'
  ]);

  private static readonly ARMOR_TYPES = new Set([
    'dragon_armor', 'hard_armor', 'soft_armor', 'shield', 'helm', 'crown', 'cloak', 'gloves', 'boots'
  ]);

  private static readonly TYPE_TO_SLOT: Record<string, number> = {
    sword: ES_WIELD,
    hafted: ES_WIELD,
    polearm: ES_WIELD,
    bow: ES_BOW,
    digging: ES_DIG,
    shot: ES_AMMO,
    arrow: ES_AMMO,
    bolt: ES_AMMO,
    soft_armor: ES_BODY,
    hard_armor: ES_BODY,
    dragon_armor: ES_BODY,
    cloak: ES_OUTER,
    shield: ES_ARM,
    helm: ES_HEAD,
    crown: ES_CROWN,
    gloves: ES_HANDS,
    boots: ES_FEET,
    light: ES_LITE,
    amulet: ES_NECK,
  };

  /**
   * Check if a type represents a weapon
   */
  private isWeapon(type: string): boolean {
    return ItemGeneration.WEAPON_TYPES.has(type);
  }

  /**
   * Check if a type represents armor
   */
  private isArmor(type: string): boolean {
    return ItemGeneration.ARMOR_TYPES.has(type);
  }

  /**
   * Get the ego item slot for a given type
   */
  getSlotForType(type: string): number {
    return ItemGeneration.TYPE_TO_SLOT[type] ?? 0;
  }

  /**
   * Parse weapon damage notation (e.g., "2d5")
   */
  parseWeaponDamage(damage: string): WeaponDamage {
    const match = damage.match(/^(\d+)d(\d+)$/);
    if (!match) {
      return { dice: 0, sides: 0 };
    }
    return {
      dice: parseInt(match[1], 10),
      sides: parseInt(match[2], 10),
    };
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

  /**
   * Normal distribution random number
   */
  private randNormal(mean: number, stdDev: number): number {
    // Box-Muller transform using rot.js RNG
    const u1 = this.rng.getUniform();
    const u2 = this.rng.getUniform();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.round(mean + z * stdDev);
  }

  /**
   * Create an Item entity from an item key (for starting equipment, etc.)
   */
  createItemByKey(itemKey: string): Item | null {
    const itemDef = this.items[itemKey];
    if (!itemDef) return null;

    const generated: GeneratedItem = {
      baseItem: itemDef,
      toHit: itemDef.toHit,
      toDam: itemDef.toDam,
      toAc: itemDef.toAc,
      pval: itemDef.pval,
      flags: [...itemDef.flags],
      cost: itemDef.cost,
    };

    return new Item({
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      position: { x: 0, y: 0 },
      symbol: itemDef.symbol,
      color: itemDef.color,
      generated,
    });
  }
}
