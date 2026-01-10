/**
 * DisarmEffect - Disarms a trap at target position
 *
 * Used by wands and rods of disarming, and manual disarm attempts.
 * Uses disarming skill vs trap difficulty to determine success.
 *
 * Formula: success = roll < max(2, disarmSkill - trapDifficulty * 5)
 * This ensures at least 2% chance of success.
 *
 * Example: { type: "disarm", target: "position" }
 */

import { PositionGPEffect } from './PositionGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import { Player } from '@/core/entities/Player';

/** Minimum success chance (2%) per Zangband */
const MIN_DISARM_CHANCE = 2;

/** Difficulty multiplier for trap saveDifficulty */
const DIFFICULTY_MULTIPLIER = 5;

export class DisarmEffect extends PositionGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { level, actor, rng } = context;
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

    // Calculate disarm chance
    let disarmSkill = 50; // Default for non-player actors
    if (actor instanceof Player) {
      disarmSkill = actor.skills.disarming;
    }

    // Get trap difficulty (default to 5 if not specified)
    const trapDifficulty = trap.definition.saveDifficulty ?? 5;

    // Calculate success chance: skill - difficulty * multiplier, min 2%
    const successChance = Math.max(MIN_DISARM_CHANCE, disarmSkill - trapDifficulty * DIFFICULTY_MULTIPLIER);

    // Roll for success
    const roll = rng.getUniformInt(0, 99);
    const disarmSucceeded = roll < successChance;

    if (disarmSucceeded) {
      trap.disarm();
      return {
        success: true,
        messages: ['You disarm the trap.'],
        turnConsumed: true,
      };
    }

    // Disarm failed
    return {
      success: true, // Turn was consumed, just didn't disarm
      messages: ['You fail to disarm the trap.'],
      turnConsumed: true,
    };
  }
}
