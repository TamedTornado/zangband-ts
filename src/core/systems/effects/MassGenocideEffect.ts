/**
 * MassGenocideEffect - Kill all nearby non-unique monsters
 *
 * Unlike regular genocide which targets by symbol, mass genocide
 * kills all non-unique monsters within sight range. Unique and
 * questor monsters are unaffected.
 *
 * Casting cost: 1d3 damage per monster killed.
 *
 * Used by: Mass Genocide (death)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Monster } from '@/core/entities/Monster';

/** Maximum sight range for mass genocide */
const MAX_SIGHT = 20;

export interface MassGenocideEffectDef extends GPEffectDef {
  type: 'massGenocide';
}

export class MassGenocideEffect extends SelfGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng, getMonsterInfo } = context;
    const playerPos = actor.position;

    // Get all monsters within sight range
    const nearbyMonsters = level.getMonsters().filter((m: Monster) => {
      if (m.isDead) return false;

      // Calculate distance
      const dx = m.position.x - playerPos.x;
      const dy = m.position.y - playerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance <= MAX_SIGHT;
    });

    // Filter out unique and questor monsters
    const killableMonsters = nearbyMonsters.filter((m: Monster) => {
      // Get monster flags from def or context helper
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
        messages: ['The world falls quiet for a moment...'],
        turnConsumed: true,
      };
    }

    // Kill each monster and deal damage to player
    let killed = 0;
    let playerDamage = 0;

    for (const monster of killableMonsters) {
      // Kill the monster
      monster.takeDamage(monster.hp + 1);
      killed++;

      // Deal 1d3 damage to player per monster
      const strainDamage = rng.getUniformInt(1, 3);
      playerDamage += strainDamage;
    }

    // Apply damage to player (the strain of casting)
    if (playerDamage > 0) {
      actor.takeDamage(playerDamage);
    }

    const messages = [`You feel a great disturbance... ${killed} creatures destroyed.`];

    if (playerDamage > 0) {
      messages.push(`The strain costs you ${playerDamage} HP.`);
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      damageDealt: killed,
    };
  }
}
