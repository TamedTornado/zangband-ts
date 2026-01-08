/**
 * Damage System - Elemental damage calculation with resistances
 *
 * Implements Zangband's resistance formula from effects.c and spells1.c.
 *
 * ## Resistance Math
 *
 * ### Player Resistance Level System
 *
 * Player resistance uses a "level" value that starts at 9:
 *
 * ```
 * level = 9 (base, no resistance)
 *
 * if (immune)     level = 0      // TR_IM_* flag
 * if (resist)     level /= 3     // TR_RES_* flag from equipment
 * if (oppose)     level /= 3     // Temporary status (stacks with resist!)
 * if (vulnerable) level *= 2     // TR_HURT_* flag
 *
 * final_damage = (damage * level + 8) / 9   // +8 for rounding up
 * ```
 *
 * Resulting damage percentages:
 * - level=9 (none):           100% damage
 * - level=3 (resist):          33% damage
 * - level=1 (resist+oppose):   11% damage
 * - level=0 (immune):           0% damage
 * - level=18 (vulnerable):    200% damage
 * - level=6 (vuln+oppose):     67% damage (vulnerability partially countered)
 *
 * ### Monster Resistance System
 *
 * Monsters use flag-based checks with different formulas:
 *
 * - **Immunity (IM_*)**: `damage /= 9` (~11% damage)
 *   Message: "resists a lot"
 *
 * - **Resistance (RES_*)**: `damage = damage * 3 / rand_range(7, 12)` (~25-43%, avg ~33%)
 *   Message: "resists"
 *
 * - **Vulnerability (HURT_*)**: `damage *= 2` (200% damage)
 *   Message: "is hit hard"
 *
 * ### Element-to-Flag Mapping
 *
 * | Element   | Immune Flag | Resist Flag | Vulnerable Flag |
 * |-----------|-------------|-------------|-----------------|
 * | fire      | IM_FIRE     | RES_FIRE    | HURT_FIRE       |
 * | cold      | IM_COLD     | RES_COLD    | HURT_COLD       |
 * | acid      | IM_ACID     | RES_ACID    | HURT_ACID       |
 * | lightning | IM_ELEC     | RES_ELEC    | HURT_ELEC       |
 * | poison    | IM_POIS     | RES_POIS    | -               |
 * | light     | -           | RES_LITE    | HURT_LITE       |
 * | dark      | -           | RES_DARK    | -               |
 * | chaos     | -           | RES_CHAOS   | -               |
 * | nether    | -           | RES_NETHER  | -               |
 * | nexus     | -           | RES_NEXUS   | -               |
 * | sound     | -           | RES_SOUND   | -               |
 * | shards    | -           | RES_SHARDS  | -               |
 * | confusion | -           | RES_CONF    | -               |
 * | disenchant| -           | RES_DISEN   | -               |
 *
 * Note: "magic" element has no resistances (pure damage).
 */

import type { RNG } from 'rot-js';
import type { Actor } from '@/core/entities/Actor';
import type { Player } from '@/core/entities/Player';
import { Element, ELEMENT_NAMES } from '@/core/types';

/**
 * Info about a monster target (name and flags from definition)
 */
export interface MonsterTargetInfo {
  name: string;
  flags: string[];
}

/**
 * Result of applying damage to a target
 */
export interface DamageResult {
  /** Original damage before resistances */
  originalDamage: number;
  /** Final damage after resistances */
  finalDamage: number;
  /** Whether target was killed */
  killed: boolean;
  /** Resistance status for messaging */
  resistStatus: 'immune' | 'resists_lot' | 'resists' | 'normal' | 'vulnerable';
  /** Message describing the damage */
  message: string;
}

/**
 * Element to monster flag mapping
 */
const ELEMENT_FLAGS: Record<
  string,
  { immune?: string; resist?: string; vulnerable?: string }
> = {
  fire: { immune: 'IM_FIRE', resist: 'RES_FIRE', vulnerable: 'HURT_FIRE' },
  cold: { immune: 'IM_COLD', resist: 'RES_COLD', vulnerable: 'HURT_COLD' },
  acid: { immune: 'IM_ACID', resist: 'RES_ACID', vulnerable: 'HURT_ACID' },
  lightning: { immune: 'IM_ELEC', resist: 'RES_ELEC', vulnerable: 'HURT_ELEC' },
  poison: { immune: 'IM_POIS', resist: 'RES_POIS' },
  light: { resist: 'RES_LITE', vulnerable: 'HURT_LITE' },
  dark: { resist: 'RES_DARK' },
  chaos: { resist: 'RES_CHAOS' },
  nether: { resist: 'RES_NETHER' },
  nexus: { resist: 'RES_NEXUS' },
  sound: { resist: 'RES_SOUND' },
  shards: { resist: 'RES_SHARDS' },
  confusion: { resist: 'RES_CONF' },
  disenchant: { resist: 'RES_DISEN' },
  plasma: { resist: 'RES_PLAS' },
  // These elements have no standard resistances
  physical: {},
  magic: {},
  holy: {},
  arrow: {},
  force: {},
  gravity: {},
  inertia: {},
  time: {},
  mana: {},
};

/**
 * Element to player oppose status mapping
 */
const ELEMENT_OPPOSE_STATUS: Record<string, string | undefined> = {
  fire: 'oppose_fire',
  cold: 'oppose_cold',
  acid: 'oppose_acid',
  lightning: 'oppose_elec',
  poison: 'oppose_pois',
};

/**
 * Calculate player resistance level for an element.
 * Returns a value where 9 = no resistance, lower = more resistant.
 */
export function getPlayerResistLevel(player: Player, element: Element): number {
  let level = 9;

  const flags = ELEMENT_FLAGS[element];
  if (!flags) return level;

  // Check equipment flags (would come from player.getFlags() or similar)
  // For now, check statuses for oppose effects
  const opposeStatus = ELEMENT_OPPOSE_STATUS[element];

  // Check immunity - TODO: implement equipment flag checking
  // if (player.hasFlag(flags.immune)) return 0;

  // Check resistance - TODO: implement equipment flag checking
  // if (player.hasFlag(flags.resist)) level = Math.floor(level / 3);

  // Check temporary opposition from status effects
  if (opposeStatus && player.statuses.has(opposeStatus)) {
    level = Math.floor(level / 3);
  }

  // Check vulnerability - TODO: implement equipment flag checking
  // if (player.hasFlag(flags.vulnerable)) level *= 2;

  return level;
}

/**
 * Apply player resistance formula.
 * Formula: (damage * level + 8) / 9
 */
export function applyPlayerResistance(damage: number, resistLevel: number): number {
  if (resistLevel <= 0) return 0; // Immune
  return Math.floor((damage * resistLevel + 8) / 9);
}

/**
 * Check monster flags for resistance/immunity/vulnerability
 */
export function getMonsterResistStatus(
  monsterFlags: string[],
  element: Element
): 'immune' | 'resists' | 'vulnerable' | 'normal' {
  const elementFlags = ELEMENT_FLAGS[element];
  if (!elementFlags) return 'normal';

  if (elementFlags.immune && monsterFlags.includes(elementFlags.immune)) {
    return 'immune';
  }
  if (elementFlags.vulnerable && monsterFlags.includes(elementFlags.vulnerable)) {
    return 'vulnerable';
  }
  if (elementFlags.resist && monsterFlags.includes(elementFlags.resist)) {
    return 'resists';
  }

  return 'normal';
}

/**
 * Apply monster resistance formula.
 * - Immune: damage /= 9
 * - Resist: damage = damage * 3 / rand(7-12)
 * - Vulnerable: damage *= 2
 */
export function applyMonsterResistance(
  damage: number,
  status: 'immune' | 'resists' | 'vulnerable' | 'normal',
  rng: typeof RNG
): number {
  switch (status) {
    case 'immune':
      return Math.floor(damage / 9);
    case 'resists':
      // rand_range(7, 12) in C is inclusive 7-12
      const divisor = rng.getUniformInt(7, 12);
      return Math.floor((damage * 3) / divisor);
    case 'vulnerable':
      return damage * 2;
    default:
      return damage;
  }
}

/**
 * Apply elemental damage to the player.
 */
export function applyDamageToPlayer(
  player: Player,
  damage: number,
  element: Element,
  _rng: typeof RNG
): DamageResult {
  const elementName = ELEMENT_NAMES[element];
  const level = getPlayerResistLevel(player, element);
  let finalDamage: number;
  let resistStatus: DamageResult['resistStatus'] = 'normal';

  if (level <= 0) {
    resistStatus = 'immune';
    finalDamage = 0;
  } else if (level === 1) {
    // Resist + oppose stacking = ~11% damage
    resistStatus = 'resists_lot';
    finalDamage = applyPlayerResistance(damage, level);
  } else if (level < 9) {
    // Single resistance or partial = 33-89% damage
    resistStatus = 'resists';
    finalDamage = applyPlayerResistance(damage, level);
  } else if (level > 9) {
    resistStatus = 'vulnerable';
    finalDamage = applyPlayerResistance(damage, level);
  } else {
    // level == 9, no resistance
    finalDamage = damage;
  }

  // Apply the damage
  player.takeDamage(finalDamage);

  // Build message
  let message: string;
  if (finalDamage === 0) {
    message = 'You are unaffected.';
  } else {
    const damageDesc = elementName ? `${finalDamage} ${elementName} damage` : `${finalDamage} damage`;
    message = `You take ${damageDesc}.`;
  }

  return {
    originalDamage: damage,
    finalDamage,
    killed: player.isDead,
    resistStatus,
    message,
  };
}

/**
 * Apply elemental damage to a monster.
 * Requires monster info (name, flags) from the monster's definition.
 */
export function applyDamageToMonster(
  target: Actor,
  monsterInfo: MonsterTargetInfo,
  damage: number,
  element: Element,
  rng: typeof RNG
): DamageResult {
  const elementName = ELEMENT_NAMES[element];
  const status = getMonsterResistStatus(monsterInfo.flags, element);
  let resistStatus: DamageResult['resistStatus'] = 'normal';

  if (status === 'immune') {
    resistStatus = 'resists_lot'; // Monsters use "resists a lot" for immunity
  } else if (status === 'resists') {
    resistStatus = 'resists';
  } else if (status === 'vulnerable') {
    resistStatus = 'vulnerable';
  }

  const finalDamage = applyMonsterResistance(damage, status, rng);

  // Apply the damage
  target.takeDamage(finalDamage);

  // Build message
  const targetName = `The ${monsterInfo.name}`;
  let message: string;

  if (finalDamage === 0) {
    message = `${targetName} is unaffected.`;
  } else {
    const damageDesc = elementName ? `${finalDamage} ${elementName} damage` : `${finalDamage} damage`;

    switch (resistStatus) {
      case 'resists_lot':
        message = `${targetName} resists a lot. (${finalDamage} damage)`;
        break;
      case 'resists':
        message = `${targetName} resists. (${finalDamage} damage)`;
        break;
      case 'vulnerable':
        message = `${targetName} is hit hard! (${finalDamage} damage)`;
        break;
      default:
        message = `${targetName} takes ${damageDesc}.`;
    }
  }

  return {
    originalDamage: damage,
    finalDamage,
    killed: target.isDead,
    resistStatus,
    message,
  };
}

/**
 * Shorthand for applying physical damage to a monster
 */
export function applyPhysicalDamageToMonster(
  target: Actor,
  monsterInfo: MonsterTargetInfo,
  damage: number,
  rng: typeof RNG
): DamageResult {
  return applyDamageToMonster(target, monsterInfo, damage, Element.Physical, rng);
}
