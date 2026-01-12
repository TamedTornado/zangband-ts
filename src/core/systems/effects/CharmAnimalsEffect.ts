/**
 * CharmAnimalsEffect - Charm all animals in sight
 *
 * Attempts to charm all ANIMAL monsters within sight range, turning them into pets.
 * Based on Zangband's charm_animals() which uses GF_CONTROL_ANIMAL.
 *
 * Requirements:
 * - Monster must have ANIMAL flag to be affected
 *
 * Resistance:
 * - UNIQUE monsters are immune
 * - QUESTOR monsters are immune
 * - NO_CONF monsters are immune
 * - Other animals resist if: monster_level > random(1, power * 3)
 *
 * Used by: Animal Friendship (nature realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult, MonsterInfo } from './GPEffect';
import type { Monster } from '@/core/entities/Monster';

/** Maximum sight range */
const MAX_SIGHT = 20;

export interface CharmAnimalsEffectDef extends GPEffectDef {
  type: 'charmAnimals';
  power?: number;
}

export class CharmAnimalsEffect extends SelfGPEffect {
  readonly power: number;

  constructor(def: GPEffectDef) {
    super(def);
    const typed = def as CharmAnimalsEffectDef;
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
    let charmed = 0;

    for (const monster of nearbyMonsters) {
      const monsterInfo: MonsterInfo & { level?: number } = getMonsterInfo
        ? getMonsterInfo(monster)
        : { name: monster.def.name, flags: monster.def.flags ?? [] };
      const monsterFlags = monsterInfo.flags;
      const monsterLevel = monsterInfo.level ?? monster.def.depth ?? 10;
      const monsterName = monsterInfo.name;

      // Must be an animal
      if (!monsterFlags.includes('ANIMAL')) {
        continue; // Not an animal, skip silently
      }

      // Check immunity flags
      if (monsterFlags.includes('UNIQUE')) {
        messages.push(`The ${monsterName} is unaffected!`);
        continue;
      }

      if (monsterFlags.includes('QUESTOR')) {
        messages.push(`The ${monsterName} is unaffected!`);
        continue;
      }

      if (monsterFlags.includes('NO_CONF')) {
        messages.push(`The ${monsterName} is unaffected!`);
        continue;
      }

      // Level-based resistance: monster resists if level > random(1, power * 3)
      const roll = rng.getUniformInt(1, this.power * 3);
      if (monsterLevel > roll) {
        messages.push(`The ${monsterName} resists!`);
        continue;
      }

      // Charm successful - make the monster a pet
      monster.tame();
      messages.push(`The ${monsterName} is tamed!`);
      charmed++;
    }

    if (charmed === 0 && messages.length === 0) {
      messages.push('Nothing happens.');
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
    };
  }
}
