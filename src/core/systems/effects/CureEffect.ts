/**
 * CureEffect - Remove a status effect from the actor
 *
 * Example: { type: "cure", status: "poison" }
 * Example: { type: "cure", status: "blind" }
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';

export class CureEffect extends SelfGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const statusId = this.getString('status', '');
    if (!statusId) {
      return this.fail('No status specified');
    }

    if (context.actor.statuses.has(statusId)) {
      const messages = context.actor.statuses.cure(statusId, context.actor);
      return this.success(messages, { statusesCured: [statusId] });
    }

    // Status not present - still succeeds, just nothing to cure
    return this.success([]);
  }
}
