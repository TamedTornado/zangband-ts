/**
 * DirectionGPEffect - Base class for direction-targeted effects
 *
 * Effects that require selecting one of 8 directions (adjacent effects, door destruction).
 */

import { BaseGPEffect } from './BaseGPEffect';
import type { GPEffectContext } from './GPEffect';
import type { Direction } from '@/core/types';

/**
 * Base class for effects that target a direction.
 * Requires context.targetDirection to be set.
 */
export abstract class DirectionGPEffect extends BaseGPEffect {
  canExecute(context: GPEffectContext): boolean {
    return context.targetDirection !== undefined;
  }

  /** Get the target direction (throws if not set - use after canExecute) */
  protected getTargetDirection(context: GPEffectContext): Direction {
    if (!context.targetDirection) {
      throw new Error('DirectionGPEffect requires targetDirection in context');
    }
    return context.targetDirection;
  }
}
