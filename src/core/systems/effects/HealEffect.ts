/**
 * HealEffect - Restore HP to the actor
 *
 * Supports both fixed amounts and dice expressions.
 * Example: { type: "heal", amount: 10 }
 * Example: { type: "heal", dice: "4d8+4" }
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';
import { rollDiceExpression } from './EffectExecutor';

export class HealEffect extends SelfGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    let amount = 0;

    // Support both 'amount' (fixed) and 'dice' (rolled)
    const fixedAmount = this.getNumber('amount', 0);
    const diceExpr = this.getString('dice', '');

    if (fixedAmount > 0) {
      amount = fixedAmount;
    } else if (diceExpr) {
      amount = rollDiceExpression(diceExpr, context.rng);
    }

    if (amount <= 0) {
      return this.noEffect();
    }

    const before = context.actor.hp;
    context.actor.heal(amount);
    const healed = context.actor.hp - before;

    if (healed > 0) {
      return this.success([`You feel better. (+${healed} HP)`], { healed });
    }

    return this.success(['You feel fine already.']);
  }
}
