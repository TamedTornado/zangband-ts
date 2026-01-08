/**
 * AreaStatusEffect - Apply a status effect to all monsters in radius
 *
 * Used by staves of slow monsters, sleep monsters, haste monsters, etc.
 *
 * Example: { type: "areaStatus", status: "slow", duration: "20", radius: 20 }
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import { createStatus } from '../status';
import { rollDiceExpression } from './EffectExecutor';

export interface AreaStatusEffectDef extends GPEffectDef {
  type: 'areaStatus';
  status: string;
  duration: string;
  radius?: number;
}

// Default radius is MAX_SIGHT (20 tiles)
const DEFAULT_RADIUS = 20;

export class AreaStatusEffect extends SelfGPEffect {
  readonly statusId: string;
  readonly duration: string;
  readonly radius: number;

  constructor(def: GPEffectDef) {
    super(def);
    const areaDef = def as AreaStatusEffectDef;
    this.statusId = areaDef.status;
    this.duration = areaDef.duration;
    this.radius = areaDef.radius ?? DEFAULT_RADIUS;
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng } = context;
    const monsters = level.getMonsters ? level.getMonsters() : [];

    let affectedCount = 0;
    let resistedCount = 0;
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

      // Get monster info for resistance check
      const monsterInfo = context.getMonsterInfo
        ? context.getMonsterInfo(monster)
        : { name: 'creature', flags: [] };

      // Check if monster can receive this status
      if (!monster.canReceiveStatus(this.statusId, monsterInfo.flags)) {
        resistedCount++;
        continue;
      }

      // Create and apply the status
      const params: Record<string, number> = {
        duration: rollDiceExpression(this.duration, rng),
      };
      const status = createStatus(this.statusId, params);
      monster.statuses.add(status, monster);
      affectedCount++;
    }

    // Build result message
    if (affectedCount === 0 && resistedCount === 0) {
      messages.push('Nothing happens.');
    } else if (affectedCount === 0) {
      messages.push('The monsters are unaffected.');
    } else {
      const statusName = this.getStatusDisplayName();
      messages.push(`${affectedCount} monster${affectedCount > 1 ? 's' : ''} ${statusName}.`);
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
    };
  }

  private getStatusDisplayName(): string {
    switch (this.statusId) {
      case 'slow':
        return 'slowed';
      case 'sleeping':
        return 'fall asleep';
      case 'haste':
        return 'speed up';
      case 'confused':
        return 'become confused';
      case 'afraid':
        return 'become frightened';
      default:
        return `are affected by ${this.statusId}`;
    }
  }
}
