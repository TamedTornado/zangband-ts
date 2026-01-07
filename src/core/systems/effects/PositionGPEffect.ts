/**
 * PositionGPEffect - Base class for position-targeted effects
 *
 * Effects that require selecting a map position (bolts, balls, wands, ranged spells).
 * Uses the existing TargetingState for cursor-based selection.
 */

import { BaseGPEffect } from './BaseGPEffect';
import type { GPEffectContext } from './GPEffect';
import type { Position } from '@/core/types';

/**
 * Base class for effects that target a map position.
 * Requires context.targetPosition to be set.
 */
export abstract class PositionGPEffect extends BaseGPEffect {
  canExecute(context: GPEffectContext): boolean {
    return context.targetPosition !== undefined;
  }

  /** Get the target position (throws if not set - use after canExecute) */
  protected getTargetPosition(context: GPEffectContext): Position {
    if (!context.targetPosition) {
      throw new Error('PositionGPEffect requires targetPosition in context');
    }
    return context.targetPosition;
  }

  /** Calculate distance from actor to target */
  protected getDistance(context: GPEffectContext): number {
    const target = this.getTargetPosition(context);
    const actor = context.actor.position;
    const dx = target.x - actor.x;
    const dy = target.y - actor.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
