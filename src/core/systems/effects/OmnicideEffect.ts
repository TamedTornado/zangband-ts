/**
 * OmnicideEffect - Kill all non-unique monsters on the entire level
 *
 * The ultimate death spell - kills all non-unique, non-questor monsters
 * on the ENTIRE level, not just in sight. However, the caster takes 1d4
 * damage per monster killed and absorbs 1 mana per kill (up to 2x max mana).
 *
 * Used by: Omnicide (death realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Monster } from '@/core/entities/Monster';

export interface OmnicideEffectDef extends GPEffectDef {
  type: 'omnicide';
}

export class OmnicideEffect extends SelfGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng, getMonsterInfo } = context;

    // Get ALL monsters on the level (not just in sight)
    const allMonsters = level.getMonsters();

    // Filter to killable monsters (not UNIQUE, not QUESTOR)
    const killableMonsters = allMonsters.filter((m: Monster) => {
      if (m.isDead) return false;

      let flags: string[] = [];
      if (getMonsterInfo) {
        flags = getMonsterInfo(m).flags;
      } else if (m.def?.flags) {
        flags = m.def.flags;
      }

      // Skip unique and questor monsters
      if (flags.includes('UNIQUE') || flags.includes('QUESTOR')) {
        return false;
      }

      return true;
    });

    if (killableMonsters.length === 0) {
      return {
        success: true,
        messages: ['The world grows quiet for a moment...'],
        turnConsumed: true,
        manaGained: 0,
      };
    }

    // Kill each monster and deal strain damage
    let killed = 0;
    let totalStrainDamage = 0;

    for (const monster of killableMonsters) {
      // Kill the monster (deal massive damage)
      monster.takeDamage(monster.hp + 1);
      killed++;

      // Deal 1d4 strain damage to caster
      const strainDamage = rng.getUniformInt(1, 4);
      totalStrainDamage += strainDamage;
    }

    // Apply total strain damage to caster
    if (totalStrainDamage > 0) {
      actor.takeDamage(totalStrainDamage);
    }

    // Mana absorbed = 1 per kill (actual application handled elsewhere)
    const manaAbsorbed = killed;

    const messages: string[] = [
      `You feel the power of ${killed} souls drain away... (${totalStrainDamage} strain damage)`,
    ];

    if (actor.isDead) {
      messages.push('The strain proves too much...');
    } else {
      messages.push(`You absorb ${manaAbsorbed} mana from the fallen.`);
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      damageDealt: killed, // Number killed (not damage per se)
      manaGained: manaAbsorbed,
    };
  }
}
