/**
 * DrainLifeEffect - Drain life from a living monster
 *
 * Only affects living monsters (not UNDEAD, DEMON, or NONLIVING).
 * Used by wands and rods of drain life.
 *
 * Example: { type: "drainLife", damage: 100 }
 */

import { PositionGPEffect } from './PositionGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';

export interface DrainLifeEffectDef extends GPEffectDef {
  type: 'drainLife';
  damage?: number;
}

// Flags that indicate a monster is not living
const NON_LIVING_FLAGS = ['UNDEAD', 'DEMON', 'NONLIVING'];

export class DrainLifeEffect extends PositionGPEffect {
  readonly damage: number;

  constructor(def: GPEffectDef) {
    super(def);
    const drainDef = def as DrainLifeEffectDef;
    this.damage = drainDef.damage ?? 0;
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { level } = context;
    const targetPos = this.getTargetPosition(context);

    // Get monster at target position
    const monster = level.getMonsterAt(targetPos);

    if (!monster) {
      return {
        success: false,
        messages: ['There is nothing there to drain.'],
        turnConsumed: false,
      };
    }

    if (monster.isDead) {
      return {
        success: false,
        messages: ['The target is already dead.'],
        turnConsumed: false,
      };
    }

    // Get monster info for name and living check
    const monsterInfo = context.getMonsterInfo
      ? context.getMonsterInfo(monster)
      : { name: 'creature', flags: [] };

    // Check if monster is living (not undead, demon, or nonliving)
    const isNonLiving = NON_LIVING_FLAGS.some(flag => monsterInfo.flags.includes(flag));

    if (isNonLiving) {
      return {
        success: true,
        messages: [`The ${monsterInfo.name} is unaffected!`],
        turnConsumed: true,
        damageDealt: 0,
      };
    }

    // Apply damage to living monster
    monster.takeDamage(this.damage);

    const messages: string[] = [];

    if (monster.isDead) {
      messages.push(`The ${monsterInfo.name} is destroyed!`);
    } else {
      messages.push(`The ${monsterInfo.name} shrivels!`);
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      damageDealt: this.damage,
    };
  }
}
