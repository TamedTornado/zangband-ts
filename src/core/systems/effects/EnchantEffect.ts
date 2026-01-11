/**
 * EnchantEffect - Enchant weapons and armor
 *
 * Implements Zangband-style enchantment with:
 * - Success chance based on current bonus (harder at higher levels)
 * - Variable increment (1d3 at low, 1d2 at mid, 1 at high)
 * - Separate caps for to-hit/to-ac (+15) and to-dam (+25)
 *
 * Examples:
 *   { type: "enchantWeapon", target: "item", numHit: 1, numDam: 0 }  // Enchant Weapon Skill
 *   { type: "enchantWeapon", target: "item", numHit: 0, numDam: 1 }  // Enchant Weapon Deadliness
 *   { type: "enchantWeapon", target: "item", numHit: "1d5", numDam: "1d5" }  // *Enchant Weapon*
 *   { type: "enchantArmor", target: "item", numAc: 1 }  // Enchant Armor
 *   { type: "enchantArmor", target: "item", numAc: "2d3+1" }  // *Enchant Armor* (2-7)
 */

import { RNG } from 'rot-js';
import { ItemTargetGPEffect } from './ItemTargetGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';
import type { Item } from '@/core/entities/Item';

import { ENCHANT_MAX_HIT, ENCHANT_MAX_DAM, ENCHANT_MAX_AC } from '@/core/constants';

// Failure probability tables (out of 1000)
// Index = current bonus, value = failure chance
const ENCHANT_TABLE: number[] = [
  0, 10, 50, 100, 200, 300, 400, 500, 650, 800,
  950, 987, 993, 995, 998, 1000,
];

const ENCHANT_TABLE_DAM: number[] = [
  0, 115, 221, 319, 407, 488, 561, 627, 686, 738,
  784, 824, 859, 889, 914, 936, 953, 967, 978, 986,
  992, 996, 998, 999, 999, 1000,
];

interface EnchantOptions {
  noFail?: boolean;
  fixedIncrement?: number | undefined;
}

/**
 * Attempt a single enchantment on an item property.
 * Returns the amount added (0 if failed).
 */
function attemptEnchant(
  currentBonus: number,
  maxBonus: number,
  failureTable: number[],
  options: EnchantOptions = {}
): number {
  // Already at max
  if (currentBonus >= maxBonus) {
    return 0;
  }

  // Check for failure (unless noFail is set)
  if (!options.noFail) {
    const tableIndex = Math.min(currentBonus, failureTable.length - 1);
    const failureChance = failureTable[tableIndex] ?? 1000;

    const roll = RNG.getUniformInt(1, 1000);
    if (roll <= failureChance) {
      return 0; // Failed
    }
  }

  // Determine increment
  let increment: number;
  if (options.fixedIncrement !== undefined) {
    increment = options.fixedIncrement;
  } else if (currentBonus >= 8) {
    increment = 1;
  } else if (currentBonus >= 5) {
    increment = RNG.getUniformInt(1, 2);
  } else {
    increment = RNG.getUniformInt(1, 3);
  }

  // Don't exceed max
  return Math.min(increment, maxBonus - currentBonus);
}

/**
 * Parse a number or dice expression (e.g., "1d5", "2d3+1", or just 3)
 */
function parseAmount(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    // Parse dice expression like "1d5" or "1d6+1"
    const match = value.match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
    if (match) {
      const dice = parseInt(match[1], 10);
      const sides = parseInt(match[2], 10);
      const bonus = match[3] ? parseInt(match[3], 10) : 0;
      let total = bonus;
      for (let i = 0; i < dice; i++) {
        total += RNG.getUniformInt(1, sides);
      }
      return total;
    }
    // Try parsing as plain number
    const num = parseInt(value, 10);
    if (!isNaN(num)) return num;
  }
  return 0;
}

/**
 * Check if item is a weapon
 */
function isWeapon(item: Item): boolean {
  const type = item.type;
  return ['sword', 'hafted', 'polearm', 'bow', 'crossbow', 'shot', 'arrow', 'bolt'].includes(type);
}

/**
 * Check if item is armor
 */
function isArmor(item: Item): boolean {
  const type = item.type;
  return [
    'soft_armor', 'hard_armor', 'dragon_armor',
    'shield', 'helm', 'crown', 'gloves', 'boots', 'cloak'
  ].includes(type);
}

/**
 * EnchantWeaponEffect - Enchant a weapon's to-hit and/or to-dam
 *
 * Def options:
 *   numHit: number | string - Number of to-hit attempts (can be dice like "1d5")
 *   numDam: number | string - Number of to-dam attempts
 *   noFail: boolean - Skip failure chance (for services)
 *   fixedIncrement: number - Fixed increment per success
 *   maxHit: number - Custom max for to-hit (default 15)
 *   maxDam: number - Custom max for to-dam (default 25)
 */
export class EnchantWeaponEffect extends ItemTargetGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const item = this.getTargetItem(context);

    if (!item.generated) {
      return this.fail('That item cannot be enchanted.');
    }

    if (!isWeapon(item)) {
      return this.fail('That is not a weapon.');
    }

    const numHit = parseAmount(this.def['numHit']);
    const numDam = parseAmount(this.def['numDam']);

    if (numHit === 0 && numDam === 0) {
      return this.fail('Nothing to enchant.');
    }

    const options: EnchantOptions = {
      noFail: this.def['noFail'] === true,
      fixedIncrement: typeof this.def['fixedIncrement'] === 'number' ? this.def['fixedIncrement'] : undefined,
    };
    const maxHit = typeof this.def['maxHit'] === 'number' ? this.def['maxHit'] : ENCHANT_MAX_HIT;
    const maxDam = typeof this.def['maxDam'] === 'number' ? this.def['maxDam'] : ENCHANT_MAX_DAM;

    let totalHitGain = 0;
    let totalDamGain = 0;
    const messages: string[] = [];

    // Attempt to-hit enchantments
    for (let i = 0; i < numHit; i++) {
      const gain = attemptEnchant(item.generated.toHit, maxHit, ENCHANT_TABLE, options);
      if (gain > 0) {
        item.generated.toHit += gain;
        totalHitGain += gain;
      }
    }

    // Attempt to-dam enchantments
    for (let i = 0; i < numDam; i++) {
      const gain = attemptEnchant(item.generated.toDam, maxDam, ENCHANT_TABLE_DAM, options);
      if (gain > 0) {
        item.generated.toDam += gain;
        totalDamGain += gain;
      }
    }

    // Build result message
    if (totalHitGain === 0 && totalDamGain === 0) {
      return this.noEffect('The enchantment failed!');
    }

    const parts: string[] = [];
    if (totalHitGain > 0) {
      parts.push(`+${totalHitGain} to hit`);
    }
    if (totalDamGain > 0) {
      parts.push(`+${totalDamGain} to damage`);
    }

    messages.push(`Your ${item.name} glows brightly! (${parts.join(', ')})`);

    return this.success(messages, {
      itemsAffected: [item.id],
    });
  }
}

/**
 * EnchantArmorEffect - Enchant armor's to-ac
 *
 * Def options:
 *   numAc: number | string - Number of to-ac attempts (can be dice like "2d3+1")
 *   noFail: boolean - Skip failure chance (for services)
 *   fixedIncrement: number - Fixed increment per success
 *   maxAc: number - Custom max for to-ac (default 15)
 */
export class EnchantArmorEffect extends ItemTargetGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const item = this.getTargetItem(context);

    if (!item.generated) {
      return this.fail('That item cannot be enchanted.');
    }

    if (!isArmor(item)) {
      return this.fail('That is not armor.');
    }

    const numAc = parseAmount(this.def['numAc']);

    if (numAc === 0) {
      return this.fail('Nothing to enchant.');
    }

    const options: EnchantOptions = {
      noFail: this.def['noFail'] === true,
      fixedIncrement: typeof this.def['fixedIncrement'] === 'number' ? this.def['fixedIncrement'] : undefined,
    };
    const maxAc = typeof this.def['maxAc'] === 'number' ? this.def['maxAc'] : ENCHANT_MAX_AC;

    let totalAcGain = 0;

    // Attempt to-ac enchantments
    for (let i = 0; i < numAc; i++) {
      const gain = attemptEnchant(item.generated.toAc, maxAc, ENCHANT_TABLE, options);
      if (gain > 0) {
        item.generated.toAc += gain;
        totalAcGain += gain;
      }
    }

    if (totalAcGain === 0) {
      return this.noEffect('The enchantment failed!');
    }

    return this.success(
      [`Your ${item.name} glows brightly! (+${totalAcGain} to AC)`],
      { itemsAffected: [item.id] }
    );
  }
}
