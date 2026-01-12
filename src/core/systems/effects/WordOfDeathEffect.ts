/**
 * WordOfDeathEffect - Dispel living monsters
 *
 * Deals level * 3 damage to all "living" monsters within sight range.
 * Living monsters are those that are NOT undead, demons, or nonliving.
 *
 * Used by: Word of Death (death realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Monster } from '@/core/entities/Monster';

/** Maximum sight range */
const MAX_SIGHT = 20;

/** Flags that indicate a monster is NOT living */
const NON_LIVING_FLAGS = ['UNDEAD', 'DEMON', 'NONLIVING'];

export interface WordOfDeathEffectDef extends GPEffectDef {
  type: 'wordOfDeath';
}

export class WordOfDeathEffect extends SelfGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, getMonsterInfo } = context;
    const playerPos = actor.position;

    // Get actor level for damage calculation
    const actorLevel = 'level' in actor ? (actor as { level: number }).level : 20;

    // Damage = level * 3 (from C: dispel_living(plev * 3))
    const damage = actorLevel * 3;

    // Get all monsters within sight range
    const nearbyMonsters = level.getMonsters().filter((m: Monster) => {
      if (m.isDead) return false;

      // Calculate distance
      const dx = m.position.x - playerPos.x;
      const dy = m.position.y - playerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance <= MAX_SIGHT;
    });

    // Filter to only living monsters
    const livingMonsters = nearbyMonsters.filter((m: Monster) => {
      let flags: string[] = [];
      if (getMonsterInfo) {
        flags = getMonsterInfo(m).flags;
      } else if (m.def?.flags) {
        flags = m.def.flags;
      }

      // A monster is "living" if it does NOT have any non-living flags
      return !NON_LIVING_FLAGS.some(flag => flags.includes(flag));
    });

    if (livingMonsters.length === 0) {
      return {
        success: true,
        messages: ['Nothing happens.'],
        turnConsumed: true,
        damageDealt: 0,
      };
    }

    // Damage all living monsters
    let totalDamage = 0;
    const messages: string[] = [];

    for (const monster of livingMonsters) {
      const monsterName = getMonsterInfo
        ? getMonsterInfo(monster).name
        : monster.def.name;

      monster.takeDamage(damage);
      totalDamage += damage;

      if (monster.isDead) {
        messages.push(`The ${monsterName} dissolves!`);
      } else {
        messages.push(`The ${monsterName} shudders.`);
      }
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      damageDealt: totalDamage,
    };
  }
}
