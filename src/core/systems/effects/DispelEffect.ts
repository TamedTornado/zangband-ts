/**
 * DispelEffect - Damage all monsters with a specific flag in radius
 *
 * Used by staves of dispel evil, dispel undead, etc.
 *
 * Example: { type: "dispel", damage: "60", targetFlag: "EVIL", radius: 20 }
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import { rollDiceExpression } from './EffectExecutor';

export interface DispelEffectDef extends GPEffectDef {
  type: 'dispel';
  damage: string;
  targetFlag: string;
  radius?: number;
}

// Default radius is MAX_SIGHT (20 tiles)
const DEFAULT_RADIUS = 20;

export class DispelEffect extends SelfGPEffect {
  readonly damageExpr: string;
  readonly targetFlag: string;
  readonly radius: number;

  constructor(def: GPEffectDef) {
    super(def);
    const dispelDef = def as DispelEffectDef;
    this.damageExpr = dispelDef.damage;
    this.targetFlag = dispelDef.targetFlag;
    this.radius = dispelDef.radius ?? DEFAULT_RADIUS;
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng } = context;
    const monsters = level.getMonsters ? level.getMonsters() : [];

    let totalDamage = 0;
    const messages: string[] = [];

    for (const monster of monsters) {
      // Calculate distance from actor
      const dx = monster.position.x - actor.position.x;
      const dy = monster.position.y - actor.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Skip monsters outside radius
      if (distance > this.radius) {
        continue;
      }

      // Skip dead monsters
      if (monster.isDead) {
        continue;
      }

      // Get monster info for flag check
      const monsterInfo = context.getMonsterInfo
        ? context.getMonsterInfo(monster)
        : { name: 'creature', flags: [] };

      // Check if monster has the target flag
      if (!monsterInfo.flags.includes(this.targetFlag)) {
        continue;
      }

      // Roll damage
      const damage = rollDiceExpression(this.damageExpr, rng);

      // Apply damage
      monster.takeDamage(damage);
      totalDamage += damage;

      if (monster.isDead) {
        messages.push(`The ${monsterInfo.name} is destroyed!`);
      } else {
        messages.push(`The ${monsterInfo.name} shudders.`);
      }
    }

    if (messages.length === 0) {
      messages.push('Nothing happens.');
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      damageDealt: totalDamage,
    };
  }
}
