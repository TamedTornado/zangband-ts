/**
 * SelfGPEffect - Base class for self-targeted effects
 *
 * Effects that only affect the caster (heal, buff, cure, teleport).
 * No targeting required - executes immediately.
 */

import { BaseGPEffect } from './BaseGPEffect';
import type { GPEffectContext } from './GPEffect';

/**
 * Base class for effects that target self only.
 * canExecute always returns true since no targeting needed.
 */
export abstract class SelfGPEffect extends BaseGPEffect {
  canExecute(_context: GPEffectContext): boolean {
    return true; // Self-targeting is always valid
  }
}
