import { RNG } from 'rot-js';

/**
 * Maximum saving throw chance (always 5% chance to fail per Zangband)
 */
const MAX_SAVING_THROW = 95;

/**
 * Attempt a saving throw against an effect.
 *
 * This is a simple percentage check: roll < savingScore means success.
 * Per Zangband, there's always at least a 5% chance to fail (max 95% save).
 *
 * @param savingScore - The player's saving throw score (from skills.saving)
 * @param rng - Random number generator (default: rot-js RNG)
 * @returns true if the save succeeds, false if it fails
 */
export function attemptSavingThrow(savingScore: number, rng: typeof RNG = RNG): boolean {
  // Clamp saving score to valid range [0, 95]
  const effectiveScore = Math.max(0, Math.min(MAX_SAVING_THROW, savingScore));

  // Roll d100 and check if under saving score
  const roll = rng.getUniformInt(0, 99);
  return roll < effectiveScore;
}

/**
 * Create a saving throw check function for repeated use.
 *
 * Useful when you need to make multiple checks against the same save score.
 *
 * @param baseSavingScore - The base saving throw score
 * @param rng - Random number generator
 * @returns A function that performs the save check with optional difficulty adjustment
 */
export function makeSavingThrowCheck(
  baseSavingScore: number,
  rng: typeof RNG = RNG
): (difficulty?: number) => boolean {
  return (difficulty = 0) => {
    const effectiveScore = baseSavingScore - difficulty;
    return attemptSavingThrow(effectiveScore, rng);
  };
}
