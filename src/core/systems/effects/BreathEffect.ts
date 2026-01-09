/**
 * BreathEffect - Cone-shaped breath attack from caster toward target
 *
 * Unlike balls which explode at a point, breaths form a cone that starts
 * narrow at the caster and expands toward the target. This matches how
 * dragon breath attacks work in Zangband.
 *
 * Cone mechanics:
 * - Width at distance d from caster = (radius * d) / targetDistance
 * - At caster: width 0 (point)
 * - At target: width = radius
 * - Continues past target up to targetDistance + radius
 *
 * Used by: Monster breath attacks (BR_FIRE, BR_COLD, etc.)
 */

import { PositionGPEffect } from './PositionGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Position, Element } from '@/core/types';
import { Element as ElementConst, ELEMENT_NAMES } from '@/core/types';
import type { Monster } from '@/core/entities/Monster';

export interface BreathEffectDef extends GPEffectDef {
  type: 'breath';
  damage: number; // Fixed damage
  element?: Element; // Damage type (default: magic)
  radius?: number; // Max cone width at target (default: 2)
}

export class BreathEffect extends PositionGPEffect {
  readonly damage: number;
  readonly element: Element;
  readonly radius: number;

  constructor(def: GPEffectDef) {
    super(def);
    const breathDef = def as BreathEffectDef;
    this.damage = breathDef.damage ?? 0;
    this.element = (breathDef.element as Element) ?? ElementConst.Magic;
    this.radius = breathDef.radius ?? 2;
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng } = context;
    const target = this.getTargetPosition(context);
    const origin = actor.position;

    // Calculate distance to target
    const targetDistance = this.distance(origin, target);
    if (targetDistance === 0) {
      // Can't breathe on self
      return {
        success: false,
        messages: ['You cannot breathe on yourself!'],
        turnConsumed: false,
      };
    }

    // Find all monsters in the cone
    const monstersHit = this.getMonstersInCone(origin, target, targetDistance, level);

    const elementName = ELEMENT_NAMES[this.element];
    const messages: string[] = [];
    let totalDamage = 0;

    if (monstersHit.length === 0) {
      messages.push(
        elementName
          ? `You breathe ${elementName}!`
          : 'You breathe!'
      );
      return {
        success: true,
        messages,
        turnConsumed: true,
      };
    }

    // Apply damage to each monster in the cone
    for (const monster of monstersHit) {
      // Get monster name from definition
      const monsterName = monster.def.name;

      // Apply resistance using polymorphic resistDamage()
      const { damage: finalDamage, status } = monster.resistDamage(this.element, this.damage, rng);

      // Apply damage
      monster.takeDamage(finalDamage);

      messages.push(this.buildDamageMessage(monsterName, finalDamage, status));
      totalDamage += finalDamage;

      if (monster.isDead) {
        messages.push(`The ${monsterName} is destroyed!`);
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
   * Build damage message based on resistance status
   */
  private buildDamageMessage(targetName: string, damage: number, status: string): string {
    const name = `The ${targetName}`;
    const elementName = ELEMENT_NAMES[this.element];

    if (damage === 0) {
      return `${name} is unaffected.`;
    }

    switch (status) {
      case 'immune':
        return `${name} resists a lot. (${damage} damage)`;
      case 'resists':
        return `${name} resists. (${damage} damage)`;
      case 'vulnerable':
        return `${name} is hit hard! (${damage} damage)`;
      default: {
        const damageDesc = elementName ? `${damage} ${elementName} damage` : `${damage} damage`;
        return `${name} takes ${damageDesc}.`;
      }
    }
  }

  /**
   * Get all monsters within the breath cone
   */
  private getMonstersInCone(
    origin: Position,
    target: Position,
    targetDistance: number,
    level: { getMonsters?: () => Monster[] }
  ): Monster[] {
    if (!level.getMonsters) {
      return [];
    }

    const allMonsters = level.getMonsters();
    const maxDistance = targetDistance + this.radius;

    return allMonsters.filter((m) => {
      if (m.isDead) return false;

      const pos = m.position;

      // Skip if at origin (caster position)
      if (pos.x === origin.x && pos.y === origin.y) return false;

      // Calculate distance from origin
      const distFromOrigin = this.distance(origin, pos);

      // Must be within range (up to target + radius)
      if (distFromOrigin > maxDistance) return false;
      if (distFromOrigin <= 0) return false;

      // Calculate perpendicular distance from the breath line
      const perpDist = this.perpendicularDistance(pos, origin, target);

      // Calculate cone width at this distance
      // Width expands linearly: width = (radius * distance) / targetDistance
      const coneWidth = (this.radius * distFromOrigin) / targetDistance;

      // Check if monster is within the cone
      return perpDist <= coneWidth;
    });
  }

  /**
   * Calculate distance between two positions
   */
  private distance(from: Position, to: Position): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate perpendicular distance from a point to a line defined by two points.
   * Uses the formula: |((y2-y1)*px - (x2-x1)*py + x2*y1 - y2*x1)| / sqrt((y2-y1)^2 + (x2-x1)^2)
   */
  private perpendicularDistance(point: Position, lineStart: Position, lineEnd: Position): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;

    // If line is a point, return distance to that point
    const lineLengthSq = dx * dx + dy * dy;
    if (lineLengthSq === 0) {
      return this.distance(point, lineStart);
    }

    // Calculate perpendicular distance
    const numerator = Math.abs(
      dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x
    );
    const denominator = Math.sqrt(lineLengthSq);

    return numerator / denominator;
  }
}
