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
import type { Actor } from '@/core/entities/Actor';
import type { Monster } from '@/core/entities/Monster';
import type { ILevel } from '@/core/world/Level';

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

    // Trace line from actor to target, find first actor blocking the path
    const hitActor = this.findFirstActorInPath(actor.position, target, level);

    if (!hitActor) {
      const elementName = ELEMENT_NAMES[this.element];
      return {
        success: true,
        messages: [elementName ? `The ${elementName} bolt hits nothing.` : 'The bolt hits nothing.'],
        turnConsumed: true,
      };
    }

    const isPlayer = hitActor === level.player;
    const targetName = isPlayer ? 'you' : (hitActor as Monster).def.name;

    // Roll damage
    const damage = rollDiceExpression(this.dice, rng);

    // Apply resistance using polymorphic resistDamage()
    const { damage: finalDamage, status } = hitActor.resistDamage(this.element, damage, rng);

    // Apply damage
    hitActor.takeDamage(finalDamage);

    // Build message based on status
    const messages: string[] = [this.buildDamageMessage(targetName, finalDamage, status, isPlayer)];

    if (hitActor.isDead) {
      if (isPlayer) {
        messages.push('You die...');
      } else {
        messages.push(`The ${targetName} is destroyed!`);
      }
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      damageDealt: finalDamage,
    };
  }

  /**
   * Build damage message based on resistance status
   */
  private buildDamageMessage(targetName: string, damage: number, status: string, isPlayer: boolean): string {
    const name = isPlayer ? 'You' : `The ${targetName}`;
    const elementName = ELEMENT_NAMES[this.element];

    if (damage === 0) {
      return isPlayer ? 'You are unaffected.' : `${name} is unaffected.`;
    }

    switch (status) {
      case 'immune':
        return isPlayer ? `You resist a lot. (${damage} damage)` : `${name} resists a lot. (${damage} damage)`;
      case 'resists':
        return isPlayer ? `You resist. (${damage} damage)` : `${name} resists. (${damage} damage)`;
      case 'vulnerable':
        return isPlayer ? `You are hit hard! (${damage} damage)` : `${name} is hit hard! (${damage} damage)`;
      default: {
        const damageDesc = elementName ? `${damage} ${elementName} damage` : `${damage} damage`;
        return isPlayer ? `You take ${damageDesc}.` : `${name} takes ${damageDesc}.`;
      }
    }
  }

  /**
   * Trace a line from origin to target and find the first actor.
   * Uses Bresenham's line algorithm.
   */
  private findFirstActorInPath(
    origin: Position,
    target: Position,
    level: ILevel
  ): Actor | undefined {
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
        // Check for any actor at this position
        const actor = level.getActorAt({ x: x0, y: y0 });
        if (actor) {
          return actor;
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
