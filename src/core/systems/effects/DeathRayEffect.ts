/**
 * DeathRayEffect - Fires a death ray bolt at target
 *
 * A devastating bolt effect that deals level * 50 damage, but has
 * special resistance handling:
 * - Undead and Nonliving monsters are immune
 * - Unique monsters almost always resist (1/666 chance to hit)
 * - Non-unique monsters can resist based on level check
 *
 * Used by: Death Ray (death realm)
 */

import { PositionGPEffect } from './PositionGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult, MonsterInfo } from './GPEffect';
import type { Position } from '@/core/types';
import type { Actor } from '@/core/entities/Actor';
import type { Monster } from '@/core/entities/Monster';
import type { ILevel } from '@/core/world/Level';

export interface DeathRayEffectDef extends GPEffectDef {
  type: 'deathRay';
}

export class DeathRayEffect extends PositionGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng, getMonsterInfo } = context;
    const target = this.getTargetPosition(context);

    // Get actor level (for damage calculation)
    const actorLevel = 'level' in actor ? (actor as { level: number }).level : 20;

    // Damage = level * 50
    const baseDamage = actorLevel * 50;

    // Trace line from actor to target, find first monster in path
    const hitMonster = this.findFirstMonsterInPath(actor.position, target, level);

    if (!hitMonster) {
      return {
        success: true,
        messages: ['The death ray hits nothing.'],
        turnConsumed: true,
      };
    }

    const monsterName = hitMonster.def.name;

    // Get monster info for resistance checks
    let monsterFlags: string[] = [];
    let monsterLevel = 10;
    if (getMonsterInfo) {
      const info: MonsterInfo & { level?: number } = getMonsterInfo(hitMonster);
      monsterFlags = info.flags;
      monsterLevel = info.level ?? (hitMonster.def as { level?: number }).level ?? 10;
    } else if (hitMonster.def.flags) {
      monsterFlags = hitMonster.def.flags;
      monsterLevel = (hitMonster.def as { level?: number }).level ?? 10;
    }

    // Check immunity: UNDEAD or NONLIVING are immune
    if (monsterFlags.includes('UNDEAD') || monsterFlags.includes('NONLIVING')) {
      return {
        success: true,
        messages: [`The ${monsterName} is immune to the death ray.`],
        turnConsumed: true,
        damageDealt: 0,
      };
    }

    // Check resistance
    let resisted = false;

    // Unique monsters resist except 1/666 chance
    if (monsterFlags.includes('UNIQUE')) {
      // one_in_(666) = 1/666 chance to NOT resist
      if (rng.getUniformInt(1, 666) !== 1) {
        resisted = true;
      }
    } else {
      // Non-unique: resist if monster_level > random(dam/30)
      const resistThreshold = Math.floor(baseDamage / 30);
      const roll = rng.getUniformInt(1, Math.max(1, resistThreshold));
      if (monsterLevel > roll) {
        resisted = true;
      }
    }

    if (resisted) {
      return {
        success: true,
        messages: [`The ${monsterName} resists the death ray!`],
        turnConsumed: true,
        damageDealt: 0,
      };
    }

    // Apply damage
    hitMonster.takeDamage(baseDamage);

    const messages: string[] = [`The death ray strikes the ${monsterName}! (${baseDamage} damage)`];

    if (hitMonster.isDead) {
      messages.push(`The ${monsterName} is destroyed!`);
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      damageDealt: baseDamage,
    };
  }

  /**
   * Trace a line from origin to target and find the first monster.
   * Uses Bresenham's line algorithm.
   */
  private findFirstMonsterInPath(
    origin: Position,
    target: Position,
    level: ILevel
  ): Monster | undefined {
    let x0 = origin.x;
    let y0 = origin.y;
    const x1 = target.x;
    const y1 = target.y;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      // Skip origin (where caster is standing)
      if (x0 !== origin.x || y0 !== origin.y) {
        // Check for monster at this position
        const monster = level.getMonsterAt({ x: x0, y: y0 });
        if (monster && !monster.isDead) {
          return monster;
        }

        // Check for wall (bolt stops)
        const tile = level.getTile({ x: x0, y: y0 });
        if (tile?.terrain?.flags?.includes('WALL')) {
          return undefined;
        }
      }

      if (x0 === x1 && y0 === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }

    return undefined;
  }
}
