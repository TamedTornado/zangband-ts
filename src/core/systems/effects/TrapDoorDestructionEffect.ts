/**
 * TrapDoorDestructionEffect - Destroys traps and doors
 *
 * Used by scrolls and wands of trap/door destruction.
 * Scroll: Area effect around player (target: self, radius: N)
 * Wand: Target a specific position (target: position)
 *
 * Example: { type: "trapDoorDestruction", target: "self", radius: 8 }
 * Example: { type: "trapDoorDestruction", target: "position" }
 */

import { BaseGPEffect } from './BaseGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import { TargetType } from './GPEffect';
import type { Position } from '@/core/types';

export class TrapDoorDestructionEffect extends BaseGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  canExecute(context: GPEffectContext): boolean {
    // Self-targeted (area mode) always works
    if (this.targetType === TargetType.Self) {
      return true;
    }
    // Position-targeted requires a target position
    return context.targetPosition !== undefined;
  }

  execute(context: GPEffectContext): GPEffectResult {
    if (this.targetType === TargetType.Self) {
      return this.executeArea(context);
    } else {
      return this.executePosition(context);
    }
  }

  private executeArea(context: GPEffectContext): GPEffectResult {
    const { actor, level } = context;
    const center = actor.position;
    const radius = this.getNumber('radius', 8);
    const messages: string[] = [];
    let destroyedCount = 0;

    // Destroy traps within radius
    const traps = level.getTraps ? level.getTraps() : [];
    for (const trap of traps) {
      const dist = this.distance(center, trap.position);
      if (dist <= radius) {
        level.removeTrap(trap);
        destroyedCount++;
      }
    }

    // Destroy doors within radius
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const pos = { x: center.x + dx, y: center.y + dy };
        const dist = this.distance(center, pos);
        if (dist > radius) continue;

        const tile = level.getTile(pos);
        if (tile && tile.terrain.flags?.includes('DOOR')) {
          level.setTerrain(pos, 'floor');
          destroyedCount++;
        }
      }
    }

    if (destroyedCount > 0) {
      messages.push('Traps and doors are destroyed!');
    } else {
      messages.push('There are no traps or doors nearby.');
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
    };
  }

  private executePosition(context: GPEffectContext): GPEffectResult {
    const { level, targetPosition } = context;
    const messages: string[] = [];

    if (!targetPosition) {
      return {
        success: false,
        messages: ['No target position.'],
        turnConsumed: false,
      };
    }

    // Check for trap at position
    const trap = level.getTrapAt ? level.getTrapAt(targetPosition) : undefined;
    if (trap) {
      level.removeTrap(trap);
      messages.push('The trap is destroyed!');
      return {
        success: true,
        messages,
        turnConsumed: true,
      };
    }

    // Check for door at position
    const tile = level.getTile(targetPosition);
    if (tile && tile.terrain.flags?.includes('DOOR')) {
      level.setTerrain(targetPosition, 'floor');
      messages.push('The door is destroyed!');
      return {
        success: true,
        messages,
        turnConsumed: true,
      };
    }

    // Nothing to destroy
    messages.push('There is nothing to destroy there.');
    return {
      success: true,
      messages,
      turnConsumed: true,
    };
  }

  private distance(a: Position, b: Position): number {
    // Use Chebyshev distance (8-way movement)
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  }
}
