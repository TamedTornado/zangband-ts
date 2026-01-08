/**
 * BoltEffect - Fires a projectile at a target position
 *
 * Traces a line from actor to target, hitting the first monster in the path.
 * Used by: Wand of Magic Missile, Frost Bolts, Fire Bolts, etc.
 */

import { PositionGPEffect } from './PositionGPEffect';
import { rollDiceExpression } from './diceUtils';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Position, Element } from '@/core/types';
import { Element as ElementConst, ELEMENT_NAMES } from '@/core/types';
import type { Monster } from '@/core/entities/Monster';
import { applyDamageToMonster, type MonsterTargetInfo } from '@/core/systems/Damage';

export interface BoltEffectDef extends GPEffectDef {
  type: 'bolt';
  dice: string; // Damage dice like "3d8" or "6d6"
  element?: Element; // Damage type (default: magic)
}

export class BoltEffect extends PositionGPEffect {
  readonly dice: string;
  readonly element: Element;

  constructor(def: GPEffectDef) {
    super(def);
    const boltDef = def as BoltEffectDef;
    this.dice = boltDef.dice ?? '1d1';
    this.element = (boltDef.element as Element) ?? ElementConst.Magic;
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng } = context;
    const target = this.getTargetPosition(context);

    // Trace line from actor to target, find first monster
    const hitMonster = this.findFirstMonsterInPath(
      actor.position,
      target,
      level
    );

    if (!hitMonster) {
      const elementName = ELEMENT_NAMES[this.element];
      return {
        success: true,
        messages: [elementName ? `The ${elementName} bolt hits nothing.` : 'The bolt hits nothing.'],
        turnConsumed: true,
      };
    }

    // Get monster info for damage calculation
    const monsterInfo: MonsterTargetInfo = context.getMonsterInfo
      ? context.getMonsterInfo(hitMonster)
      : { name: 'creature', flags: [] };

    // Roll damage
    const damage = rollDiceExpression(this.dice, rng);

    // Apply damage with resistances
    const damageResult = applyDamageToMonster(
      hitMonster,
      monsterInfo,
      damage,
      this.element,
      rng
    );

    const messages: string[] = [damageResult.message];

    if (damageResult.killed) {
      messages.push(`The ${monsterInfo.name} is destroyed!`);
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      damageDealt: damageResult.finalDamage,
    };
  }

  /**
   * Trace a line from origin to target and find the first monster.
   * Uses Bresenham's line algorithm.
   */
  private findFirstMonsterInPath(
    origin: Position,
    target: Position,
    level: { getMonsterAt: (pos: Position) => Monster | undefined; getTile: (pos: Position) => { terrain?: { flags?: string[] } } | undefined }
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
