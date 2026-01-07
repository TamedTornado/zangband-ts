/**
 * ItemTargetGPEffect - Base class for item-targeted effects
 *
 * Effects that require selecting an inventory item (identify, enchant, recharge).
 */

import { BaseGPEffect } from './BaseGPEffect';
import type { GPEffectContext } from './GPEffect';

/**
 * Base class for effects that target an inventory item.
 * Requires context.targetItem to be set.
 */
export abstract class ItemTargetGPEffect extends BaseGPEffect {
  canExecute(context: GPEffectContext): boolean {
    return context.targetItem !== undefined;
  }

  /** Get the target item (throws if not set - use after canExecute) */
  protected getTargetItem(context: GPEffectContext) {
    if (!context.targetItem) {
      throw new Error('ItemTargetGPEffect requires targetItem in context');
    }
    return context.targetItem;
  }
}
