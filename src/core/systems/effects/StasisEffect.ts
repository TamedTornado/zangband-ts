/**
 * StasisEffect - Put all monsters in sight into stasis
 *
 * Attempts to put all monsters within sight range into stasis (deep sleep).
 * Based on Zangband's stasis_monsters() which uses GF_STASIS.
 *
 * Resistance:
 * - UNIQUE monsters are immune
 * - Other monsters resist if: monster_level > random(1, power * 4)
 *
 * Stasis is a very deep sleep (duration 500) that lasts much longer than
 * normal sleep. Affected monsters display "is suspended!" message.
 *
 * Used by: Stasis (sorcery realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult, MonsterInfo } from './GPEffect';
import type { Monster } from '@/core/entities/Monster';

/** Maximum sight range */
const MAX_SIGHT = 20;

/** Stasis sleep duration (very long) */
const STASIS_DURATION = 500;

export interface StasisEffectDef extends GPEffectDef {
  type: 'stasis';
  power?: number;
}

export class StasisEffect extends SelfGPEffect {
  readonly power: number;

  constructor(def: GPEffectDef) {
    super(def);
    const typed = def as StasisEffectDef;
    this.power = typed.power ?? 20;
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng, getMonsterInfo } = context;
    const playerPos = actor.position;

    // Get all monsters within sight range
    const nearbyMonsters = level.getMonsters().filter((m: Monster) => {
      if (m.isDead) return false;

      const dx = m.position.x - playerPos.x;
      const dy = m.position.y - playerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance <= MAX_SIGHT;
    });

    if (nearbyMonsters.length === 0) {
      return {
        success: true,
        messages: ['Nothing happens.'],
        turnConsumed: true,
      };
    }

    const messages: string[] = [];
    let affected = 0;

    for (const monster of nearbyMonsters) {
      const monsterInfo: MonsterInfo & { level?: number } = getMonsterInfo
        ? getMonsterInfo(monster)
        : { name: monster.def.name, flags: monster.def.flags ?? [] };
      const monsterFlags = monsterInfo.flags;
      const monsterLevel = monsterInfo.level ?? monster.def.depth ?? 10;
      const monsterName = monsterInfo.name;

      // UNIQUE monsters are immune
      if (monsterFlags.includes('UNIQUE')) {
        messages.push(`The ${monsterName} is unaffected!`);
        continue;
      }

      // Level-based resistance: monster resists if level > random(1, power * 4)
      const roll = rng.getUniformInt(1, this.power * 4);
      if (monsterLevel > roll) {
        messages.push(`The ${monsterName} is unaffected!`);
        continue;
      }

      // Stasis successful - put monster into deep sleep
      monster.stasis(STASIS_DURATION);
      messages.push(`The ${monsterName} is suspended!`);
      affected++;
    }

    if (affected === 0 && messages.length === 0) {
      messages.push('Nothing happens.');
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
    };
  }
}
