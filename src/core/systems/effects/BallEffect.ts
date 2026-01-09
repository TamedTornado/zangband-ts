/**
 * BallEffect - Explodes at a target position hitting all creatures in radius
 *
 * Unlike bolts, balls travel to the target and then explode, hitting all
 * creatures within the radius. Damage falls off with distance from center.
 *
 * Used by: Fire Ball, Cold Ball, Lightning Ball, Acid Ball, Dragon Breath, etc.
 */

import { PositionGPEffect } from './PositionGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Position, Element } from '@/core/types';
import { Element as ElementConst, ELEMENT_NAMES } from '@/core/types';
import type { Monster } from '@/core/entities/Monster';

export interface BallEffectDef extends GPEffectDef {
  type: 'ball';
  damage: number; // Fixed damage (balls use fixed, not dice)
  element?: Element; // Damage type (default: magic)
  radius?: number; // Explosion radius (default: 2)
}

export class BallEffect extends PositionGPEffect {
  readonly damage: number;
  readonly element: Element;
  readonly radius: number;

  constructor(def: GPEffectDef) {
    super(def);
    const ballDef = def as BallEffectDef;
    this.damage = ballDef.damage ?? 0;
    this.element = (ballDef.element as Element) ?? ElementConst.Magic;
    this.radius = ballDef.radius ?? 2;
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { level, rng } = context;
    const target = this.getTargetPosition(context);

    // Find all monsters within radius
    const monstersHit = this.getMonstersInRadius(target, this.radius, level);

    const elementName = ELEMENT_NAMES[this.element];
    const messages: string[] = [];
    let totalDamage = 0;

    if (monstersHit.length === 0) {
      messages.push(
        elementName
          ? `The ${elementName} ball explodes!`
          : 'The ball explodes!'
      );
      return {
        success: true,
        messages,
        turnConsumed: true,
      };
    }

    // Apply damage to each monster based on distance
    for (const monster of monstersHit) {
      const distance = this.getDistanceToPosition(monster.position, target);
      const damageAtDistance = this.calculateDamageAtDistance(this.damage, distance);

      // Get monster name from definition
      const monsterName = monster.def.name;

      // Apply resistance using polymorphic resistDamage()
      const { damage: finalDamage, status } = monster.resistDamage(this.element, damageAtDistance, rng);

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
   * Get all monsters within radius of center position
   */
  private getMonstersInRadius(
    center: Position,
    radius: number,
    level: { getMonsters?: () => Monster[]; getMonstersInRadius?: (center: Position, radius: number) => Monster[] }
  ): Monster[] {
    // Use getMonstersInRadius if available (for testing), otherwise use getMonsters
    if (level.getMonstersInRadius) {
      return level.getMonstersInRadius(center, radius);
    }

    if (!level.getMonsters) {
      return [];
    }

    const allMonsters = level.getMonsters();
    return allMonsters.filter((m) => {
      if (m.isDead) return false;
      const dist = this.getDistanceToPosition(m.position, center);
      return dist <= radius;
    });
  }

  /**
   * Calculate distance between two positions
   */
  private getDistanceToPosition(from: Position, to: Position): number {
    const dx = from.x - to.x;
    const dy = from.y - to.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate damage at a given distance from center.
   * Damage falls off linearly with distance.
   * At center (distance 0): full damage
   * At edge (distance = radius): damage / (radius + 1)
   */
  private calculateDamageAtDistance(baseDamage: number, distance: number): number {
    if (distance <= 0) return baseDamage;
    // Linear falloff: damage * (radius + 1 - distance) / (radius + 1)
    const falloff = (this.radius + 1 - distance) / (this.radius + 1);
    return Math.max(1, Math.floor(baseDamage * falloff));
  }
}
