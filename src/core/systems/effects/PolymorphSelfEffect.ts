/**
 * PolymorphSelfEffect - Randomly transforms the player
 *
 * From Zangband's do_poly_self() which can:
 * - Change player's race to a random race
 * - Change player's sex
 * - Cause stat decreases (deformity)
 * - Add or remove mutations
 * - Polymorph wounds
 *
 * The chance and magnitude of effects depends on player level.
 *
 * Used by: Polymorph Self (chaos realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Player } from '@/core/entities/Player';
import racesData from '@/data/races/races.json';

export interface PolymorphSelfEffectDef extends GPEffectDef {
  type: 'polymorphSelf';
}

interface PolymorphSelfData {
  raceChanged?: boolean;
  oldRace?: string;
  newRace?: string;
  sexChanged?: boolean;
  deformed?: boolean;
  statChanges?: Record<string, number>;
  damageTaken?: number;
}

// Get all race keys
const RACE_KEYS = Object.keys(racesData);

export class PolymorphSelfEffect extends SelfGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, rng } = context;
    const player = actor as Player;
    const messages: string[] = [];
    const data: PolymorphSelfData = {};

    const power = (player as any).level ?? 1;

    messages.push('You feel a change coming over you...');

    // Check for racial polymorph (power > rand(20) and 1/3 chance)
    if (power > rng.getUniformInt(0, 19) && rng.getUniformInt(1, 3) === 1) {
      let racePower = power - 10;

      // Check for sex change (power > rand(5) and 1/4 chance)
      if (racePower > rng.getUniformInt(0, 4) && rng.getUniformInt(1, 4) === 1) {
        racePower -= 2;
        data.sexChanged = true;
        messages.push('You feel different...');
      }

      // Check for deformity (power > rand(30) and 1/5 chance)
      if (racePower > rng.getUniformInt(0, 29) && rng.getUniformInt(1, 5) === 1) {
        racePower -= 15;
        data.deformed = true;
        data.statChanges = {
          str: -rng.getUniformInt(1, 6),
          int: -rng.getUniformInt(1, 6),
          wis: -rng.getUniformInt(1, 6),
          dex: -rng.getUniformInt(1, 6),
          con: -rng.getUniformInt(1, 6),
          chr: -rng.getUniformInt(1, 6),
        };
        messages.push('Your body twists and deforms!');
      }

      // Pick a new race based on remaining power
      // Higher power = can get higher exp races
      const goalExpFactor = racePower < 0 ? 100 : 100 + 3 * rng.getUniformInt(0, racePower);

      // Find valid races (different from current and within exp limit)
      const currentRace = (player as any)._raceKey ?? 'human';
      const validRaces = RACE_KEYS.filter(key => {
        if (key === currentRace) return false;
        const race = racesData[key as keyof typeof racesData];
        return race && race.expMod <= goalExpFactor;
      });

      if (validRaces.length > 0) {
        const newRaceKey = validRaces[rng.getUniformInt(0, validRaces.length - 1)];
        const newRace = racesData[newRaceKey as keyof typeof racesData];

        data.raceChanged = true;
        data.oldRace = currentRace;
        data.newRace = newRaceKey;

        // Determine article (a/an)
        const startsWithVowel = /^[aeiou]/i.test(newRace.name);
        messages.push(`You turn into a${startsWithVowel ? 'n' : ''} ${newRace.name}!`);

        // Note: Actual race change would be handled by game state manager
        // The effect returns data indicating what should happen
      }
    }

    // Check for abomination (power > rand(30) and 1/6 chance)
    if (power > rng.getUniformInt(0, 29) && rng.getUniformInt(1, 6) === 1) {
      messages.push('Your internal organs are rearranged!');

      if (!data.statChanges) {
        data.statChanges = {};
      }

      // Additional stat damage
      data.statChanges.str = (data.statChanges.str ?? 0) - rng.getUniformInt(6, 12);
      data.statChanges.int = (data.statChanges.int ?? 0) - rng.getUniformInt(6, 12);
      data.statChanges.wis = (data.statChanges.wis ?? 0) - rng.getUniformInt(6, 12);
      data.statChanges.dex = (data.statChanges.dex ?? 0) - rng.getUniformInt(6, 12);
      data.statChanges.con = (data.statChanges.con ?? 0) - rng.getUniformInt(6, 12);
      data.statChanges.chr = (data.statChanges.chr ?? 0) - rng.getUniformInt(6, 12);

      // May cause damage (1/6 chance)
      if (rng.getUniformInt(1, 6) === 1) {
        const numDice = rng.getUniformInt(1, 10);
        let damage = 0;
        for (let i = 0; i < numDice; i++) {
          damage += rng.getUniformInt(1, power);
        }
        data.damageTaken = damage;
        messages.push('You find living difficult in your present form!');

        // Actually apply the damage
        actor.takeDamage(damage);
      }
    }

    // TODO: Implement mutation gain/loss when mutation system is ready
    // While power > rand(15) and 1/3: gain_mutation
    // While power > rand(20) and 1/10: lose_mutation

    return {
      success: true,
      messages,
      turnConsumed: true,
      data,
    };
  }
}
