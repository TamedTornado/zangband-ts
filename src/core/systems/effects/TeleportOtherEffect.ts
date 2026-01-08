/**
 * TeleportOtherEffect - Teleport a monster away to a random location
 *
 * Used by wands and rods of teleport other.
 * Monsters with RES_TELE flag are immune.
 *
 * Example: { type: "teleportOther", distance: 45 }
 */

import { PositionGPEffect } from './PositionGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';

export interface TeleportOtherEffectDef extends GPEffectDef {
  type: 'teleportOther';
  distance?: number;
}

// Default distance is MAX_SIGHT * 2 + 5 = 45 from Zangband
const DEFAULT_DISTANCE = 45;

export class TeleportOtherEffect extends PositionGPEffect {
  readonly distance: number;

  constructor(def: GPEffectDef) {
    super(def);
    const teleportDef = def as TeleportOtherEffectDef;
    this.distance = teleportDef.distance ?? DEFAULT_DISTANCE;
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { level } = context;
    const targetPos = this.getTargetPosition(context);

    // Get monster at target position
    const monster = level.getMonsterAt(targetPos);

    if (!monster) {
      return {
        success: false,
        messages: ['There is nothing there to teleport.'],
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

    // Get monster info for name and resistance check
    const monsterInfo = context.getMonsterInfo
      ? context.getMonsterInfo(monster)
      : { name: 'creature', flags: [] };

    // Check for teleport resistance
    if (monsterInfo.flags.includes('RES_TELE')) {
      return {
        success: true,
        messages: [`The ${monsterInfo.name} is unaffected!`],
        turnConsumed: true,
      };
    }

    // Find a valid teleport destination
    const newPos = this.findTeleportDestination(context, monster.position);

    if (!newPos) {
      return {
        success: true,
        messages: [`The ${monsterInfo.name} resists the teleportation!`],
        turnConsumed: true,
      };
    }

    // Move the monster by updating its position
    monster.position = newPos;

    return {
      success: true,
      messages: [`The ${monsterInfo.name} disappears!`],
      turnConsumed: true,
    };
  }

  /**
   * Find a valid position to teleport to.
   * Tries to find a position at distance/2 to distance from the original position.
   */
  private findTeleportDestination(
    context: GPEffectContext,
    originalPos: { x: number; y: number }
  ): { x: number; y: number } | null {
    const { level, rng } = context;
    const minDistance = Math.floor(this.distance / 2);
    const maxDistance = this.distance;

    // Try up to 500 times to find a valid position (matching Zangband)
    for (let i = 0; i < 500; i++) {
      // Generate random offset within distance
      const angle = rng.getUniform() * 2 * Math.PI;
      const dist = minDistance + rng.getUniform() * (maxDistance - minDistance);

      const nx = Math.round(originalPos.x + Math.cos(angle) * dist);
      const ny = Math.round(originalPos.y + Math.sin(angle) * dist);

      // Check if in bounds
      if (nx < 0 || nx >= level.width || ny < 0 || ny >= level.height) {
        continue;
      }

      // Check if walkable
      if (level.isWalkable && !level.isWalkable({ x: nx, y: ny })) {
        continue;
      }

      // Check for existing monster
      if (level.getMonsterAt({ x: nx, y: ny })) {
        continue;
      }

      // Check not on player
      if (context.actor.position.x === nx && context.actor.position.y === ny) {
        continue;
      }

      // Valid position found
      return { x: nx, y: ny };
    }

    return null;
  }
}
