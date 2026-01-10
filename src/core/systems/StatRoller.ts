import type { Stats } from '@/core/entities/Player';
import type { RaceDef } from '@/core/data/races';
import type { ClassDef } from '@/core/data/classes';
import type { Sex, AutorollerMinimums, PhysicalAttributes } from '@/core/data/characterCreation';
import type { RNG as ROTRng } from 'rot-js';

/**
 * Zangband stat rolling algorithm:
 * 1. Roll 18 dice: for each i in 0..17, roll 1d(3 + i%3)
 *    - dice[0,3,6,9,12,15] roll 1d3
 *    - dice[1,4,7,10,13,16] roll 1d4
 *    - dice[2,5,8,11,14,17] roll 1d5
 * 2. Sum all dice - must be between 42 and 57 (exclusive), else reroll
 * 3. Each stat = 5 + dice[3*i] + dice[3*i+1] + dice[3*i+2]
 *    - Stat range: 5 + (1+1+1) = 8 minimum, 5 + (3+4+5) = 17 maximum
 */
export function rollBaseStats(rng: typeof ROTRng): Stats {
  let dice: number[];
  let total: number;

  // Keep rolling until total is within range (42 < total < 57)
  do {
    dice = [];
    total = 0;
    for (let i = 0; i < 18; i++) {
      const sides = 3 + (i % 3); // 3, 4, 5, 3, 4, 5, ...
      const roll = rng.getUniformInt(1, sides);
      dice.push(roll);
      total += roll;
    }
  } while (total <= 42 || total >= 57);

  // Distribute dice to stats
  return {
    str: 5 + dice[0] + dice[1] + dice[2],
    int: 5 + dice[3] + dice[4] + dice[5],
    wis: 5 + dice[6] + dice[7] + dice[8],
    dex: 5 + dice[9] + dice[10] + dice[11],
    con: 5 + dice[12] + dice[13] + dice[14],
    chr: 5 + dice[15] + dice[16] + dice[17],
  };
}

/**
 * Apply race and class bonuses to base stats
 */
export function applyStatBonuses(baseStats: Stats, raceDef: RaceDef, classDef: ClassDef): Stats {
  return {
    str: baseStats.str + raceDef.stats.str + classDef.stats.str,
    int: baseStats.int + raceDef.stats.int + classDef.stats.int,
    wis: baseStats.wis + raceDef.stats.wis + classDef.stats.wis,
    dex: baseStats.dex + raceDef.stats.dex + classDef.stats.dex,
    con: baseStats.con + raceDef.stats.con + classDef.stats.con,
    chr: baseStats.chr + raceDef.stats.chr + classDef.stats.chr,
  };
}

/**
 * Check if rolled stats meet autoroller minimums
 */
export function meetsMinimums(finalStats: Stats, minimums: AutorollerMinimums): boolean {
  return (
    finalStats.str >= minimums.str &&
    finalStats.int >= minimums.int &&
    finalStats.wis >= minimums.wis &&
    finalStats.dex >= minimums.dex &&
    finalStats.con >= minimums.con &&
    finalStats.chr >= minimums.chr
  );
}

/**
 * Check if a race can select a class
 * classChoice is a bitmask where bit N corresponds to class with index N
 */
export function canSelectClass(raceDef: RaceDef, classDef: ClassDef): boolean {
  return (raceDef.classChoice & (1 << classDef.index)) !== 0;
}

/**
 * Get list of valid classes for a race
 */
export function getValidClasses(
  raceDef: RaceDef,
  allClasses: Record<string, ClassDef>,
): ClassDef[] {
  return Object.values(allClasses)
    .filter((c) => canSelectClass(raceDef, c))
    .sort((a, b) => a.index - b.index);
}

/**
 * Generate physical attributes based on sex and race
 */
export function generatePhysicalAttributes(
  rng: typeof ROTRng,
  raceDef: RaceDef,
  sex: Sex,
): PhysicalAttributes {
  const bodyStats = sex === 'male' ? raceDef.male : raceDef.female;

  // Age: base + 1d(mod) - but mod can't be 0, so handle that
  const ageMod = raceDef.age.mod > 0 ? rng.getUniformInt(1, raceDef.age.mod) : 0;
  const age = raceDef.age.base + ageMod;

  // Height: normal distribution around base with mod as std dev
  // Using a simple approximation since rot.js getNormal may not be available
  // Approximate normal with uniform +/- 2*mod
  const heightVariance = rng.getUniformInt(-bodyStats.height.mod, bodyStats.height.mod);
  const height = bodyStats.height.base + heightVariance;

  // Weight: similar approach
  const weightVariance = rng.getUniformInt(-bodyStats.weight.mod, bodyStats.weight.mod);
  const weight = bodyStats.weight.base + weightVariance;

  return { age, height, weight };
}

/**
 * Calculate starting HP based on race and class hit dice
 * At level 1, HP = race hitDie + class hitDie
 */
export function calculateStartingHP(raceDef: RaceDef, classDef: ClassDef): number {
  return raceDef.hitDie + classDef.hitDie;
}
