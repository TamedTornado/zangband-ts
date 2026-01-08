/**
 * RecallEffect - Word of Recall / Recall effect
 *
 * Self-targeted effect that toggles the "recalling" status.
 * If already recalling, cancels the pending recall.
 * Otherwise, starts the recall countdown.
 *
 * The actual level transition is triggered when the status expires.
 *
 * Example: { type: "recall", duration: "15+1d20" }
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';
import { createStatus } from '@/core/systems/status';
import { rollDiceExpression } from './EffectExecutor';

export class RecallEffect extends SelfGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const actor = context.actor;

    // Check if already recalling - if so, cancel it
    if (actor.statuses.has('recalling')) {
      const messages = actor.statuses.clear('recalling', actor);
      return this.success(['You feel less charged.', ...messages], {
        statusesCured: ['recalling'],
      });
    }

    // Apply recalling status with duration
    const durationExpr = this.getString('duration', '15+1d20');
    const duration = rollDiceExpression(durationExpr, context.rng);

    const status = createStatus('recalling', { duration });
    const messages = actor.statuses.add(status, actor);

    return this.success(messages, { statusesApplied: ['recalling'] });
  }
}
