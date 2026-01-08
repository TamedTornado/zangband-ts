/**
 * ApplyStatusEffect - Apply a status effect to an actor
 *
 * Bridges GPEffect system to Status system.
 * Uses targetActor if provided (for wands targeting monsters), otherwise self.
 *
 * Example: { type: "applyStatus", status: "heroism", duration: "25+1d25" }
 * Example: { type: "applyStatus", status: "slow", duration: 20 }
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';
import { createStatus } from '@/core/systems/status';
import { rollDiceExpression } from './diceUtils';
import type { Monster } from '@/core/entities/Monster';

export class ApplyStatusEffect extends SelfGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const statusId = this.getString('status', '');
    if (!statusId) {
      return this.fail('No status specified');
    }

    // Use targetActor if provided, otherwise self
    const target = context.targetActor ?? context.actor;

    // Get flags for resistance check (monsters have flags via getMonsterInfo)
    let flags: string[] = [];
    if (context.getMonsterInfo && 'definitionKey' in target) {
      const monsterInfo = context.getMonsterInfo(target as Monster);
      flags = monsterInfo.flags;
    }

    // Check if target can receive this status
    if (!target.canReceiveStatus(statusId, flags)) {
      const name = context.getMonsterInfo && 'definitionKey' in target
        ? context.getMonsterInfo(target as Monster).name
        : 'target';
      return this.success([`The ${name} is unaffected.`]);
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
    const messages = target.statuses.add(status, target);

    return this.success(messages, { statusesApplied: [statusId] });
  }
}
