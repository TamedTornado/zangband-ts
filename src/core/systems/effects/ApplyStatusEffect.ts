/**
 * ApplyStatusEffect - Apply a status effect to the actor
 *
 * Bridges GPEffect system to Status system.
 * Example: { type: "applyStatus", status: "heroism", duration: "25+1d25" }
 * Example: { type: "applyStatus", status: "poison", duration: "10", damage: 3 }
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';
import { createStatus } from '@/core/systems/status';
import { rollDiceExpression } from './EffectExecutor';

export class ApplyStatusEffect extends SelfGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const statusId = this.getString('status', '');
    if (!statusId) {
      return this.fail('No status specified');
    }

    const params: Record<string, number> = {};

    // Parse duration expression
    const durationExpr = this.getString('duration', '');
    if (durationExpr) {
      params['duration'] = rollDiceExpression(durationExpr, context.rng);
    }

    // Parse intensity expression
    const intensityExpr = this.getString('intensity', '');
    if (intensityExpr) {
      params['intensity'] = rollDiceExpression(intensityExpr, context.rng);
    }

    // Direct damage for poison
    const damage = this.getNumber('damage', 0);
    if (damage > 0) {
      params['damage'] = damage;
    }

    const status = createStatus(statusId, params);
    const messages = context.actor.statuses.add(status, context.actor);

    return this.success(messages, { statusesApplied: [statusId] });
  }
}
