/**
 * ReduceEffect - Reduce intensity of a status effect
 *
 * Example: { type: "reduce", status: "cut", amount: 50 }
 * Example: { type: "reduce", status: "stun", amount: 25 }
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';

export class ReduceEffect extends SelfGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const statusId = this.getString('status', '');
    const amount = this.getNumber('amount', 0);

    if (!statusId || amount <= 0) {
      return this.fail('Invalid reduce parameters');
    }

    const messages = context.actor.statuses.reduce(statusId, amount, context.actor);
    return this.success(messages, { statusesReduced: [statusId] });
  }
}
