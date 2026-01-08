/**
 * DisarmEffect - Disarms a trap at target position
 *
 * Used by wands and rods of disarming.
 * Disarms (but does not destroy) traps at target position.
 *
 * Example: { type: "disarm", target: "position" }
 */

import { PositionGPEffect } from './PositionGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';

export class DisarmEffect extends PositionGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { level } = context;
    const targetPos = this.getTargetPosition(context);

    // Check for trap at position
    const trap = level.getTrapAt ? level.getTrapAt(targetPos) : undefined;

    if (!trap) {
      return {
        success: true,
        messages: ['There is no trap there.'],
        turnConsumed: true,
      };
    }

    // Check if already disarmed
    if (trap.isDisarmed) {
      return {
        success: true,
        messages: ['The trap is already disarmed.'],
        turnConsumed: true,
      };
    }

    // Disarm the trap
    trap.disarm();

    return {
      success: true,
      messages: ['You disarm the trap.'],
      turnConsumed: true,
    };
  }
}
