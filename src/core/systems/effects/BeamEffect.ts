/**
 * BeamEffect - Fires a beam that passes through all targets
 *
 * Unlike bolts which stop at the first target, beams pierce through
 * and hit every monster in their path.
 *
 * Used by: Beam of Gravity (chaos), Ray of Light (arcane)
 */

import { PositionGPEffect } from './PositionGPEffect';
import { rollDiceExpression } from './diceUtils';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Position, Element } from '@/core/types';
import { Element as ElementConst, ELEMENT_NAMES } from '@/core/types';
import type { Actor } from '@/core/entities/Actor';
import type { Monster } from '@/core/entities/Monster';
import type { ILevel } from '@/core/world/Level';

export interface BeamEffectDef extends GPEffectDef {
  type: 'beam';
  damage: string; // Damage expression like "3d8" or "9d8+level"
  element?: Element; // Damage type (default: magic)
}

export class BeamEffect extends PositionGPEffect {
  readonly damage: string;
  readonly element: Element;

  constructor(def: GPEffectDef) {
    super(def);
    const beamDef = def as BeamEffectDef;
    this.damage = beamDef.damage ?? '1d1';
    this.element = (beamDef.element as Element) ?? ElementConst.Magic;
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng } = context;
    const target = this.getTargetPosition(context);

    // Find all actors in the beam's path
    const hitActors = this.findAllActorsInPath(actor.position, target, level);

    if (hitActors.length === 0) {
      const elementName = ELEMENT_NAMES[this.element];
      return {
        success: true,
        messages: [elementName ? `The ${elementName} beam hits nothing.` : 'The beam hits nothing.'],
        turnConsumed: true,
      };
    }

    // Process damage formula (replace 'level' with actor's level)
    const damageExpr = this.processDamageFormula(actor);

    const messages: string[] = [];
    let totalDamage = 0;

    // Apply damage to each actor hit
    for (const hitActor of hitActors) {
      const isPlayer = hitActor === level.player;
      const targetName = isPlayer ? 'you' : (hitActor as Monster).def.name;

      // Roll damage for each target (same formula, but rolled separately)
      const damage = rollDiceExpression(damageExpr, rng);

      // Apply resistance using polymorphic resistDamage()
      const { damage: finalDamage, status } = hitActor.resistDamage(this.element, damage, rng);

      // Apply damage
      hitActor.takeDamage(finalDamage);
      totalDamage += finalDamage;

      // Build message based on status
      messages.push(this.buildDamageMessage(targetName, finalDamage, status, isPlayer));

      if (hitActor.isDead) {
        if (isPlayer) {
          messages.push('You die...');
        } else {
          messages.push(`The ${targetName} is destroyed!`);
        }
      }
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      damageDealt: totalDamage,
    };
  }

  /**
   * Process damage formula, replacing 'level' with actor's level
   */
  private processDamageFormula(actor: Actor): string {
    const actorLevel = (actor as any).level ?? 1;
    // Replace 'level' in formula with actual value
    // Handles "9d8+level" -> "9d8+20" for level 20
    return this.damage.replace(/level/gi, String(actorLevel));
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
   * Trace a line from origin to target and find ALL actors in the path.
   * Uses Bresenham's line algorithm. Continues through actors (unlike bolt).
   */
  private findAllActorsInPath(
    origin: Position,
    target: Position,
    level: ILevel
  ): Actor[] {
    const actors: Actor[] = [];
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
        // Check for wall (beam stops)
        const tile = level.getTile({ x: x0, y: y0 });
        if (tile?.terrain?.flags?.includes('WALL')) {
          break;
        }

        // Check for any actor at this position (but continue past them)
        const actor = level.getActorAt({ x: x0, y: y0 });
        if (actor) {
          actors.push(actor);
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

    return actors;
  }
}
