/**
 * IdentifyEffect - Identify an item
 *
 * Reveals the properties of a selected item.
 * Example: { type: "identify", target: "item" }
 */

import { ItemTargetGPEffect } from './ItemTargetGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';

export class IdentifyEffect extends ItemTargetGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const item = this.getTargetItem(context);

    if (!item.generated) {
      return this.noEffect('That item has no hidden properties.');
    }

    if (item.generated.identified) {
      return this.success([`${item.name} is already identified.`]);
    }

    item.generated.identified = true;
    return this.success([`You have identified: ${item.name}`], {
      itemsAffected: [item.id],
    });
  }
}
