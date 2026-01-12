/**
 * SatisfyHungerEffect - Magically fills player's stomach
 *
 * Used by: Satisfy Hunger (arcane)
 *
 * Sets food to just below MAX (full but not gorged),
 * matching the C implementation: set_food(PY_FOOD_MAX - 1)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import { FoodLevel, type Player } from '@/core/entities/Player';

export interface SatisfyHungerEffectDef extends GPEffectDef {
  type: 'satisfyHunger';
}

export class SatisfyHungerEffect extends SelfGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor } = context;

    // Only players have hunger
    if (!('setFood' in actor)) {
      return {
        success: false,
        messages: ['This effect only works on the player.'],
        turnConsumed: false,
      };
    }

    const player = actor as Player;
    const targetFood = FoodLevel.MAX - 1;

    // Check if already at target
    if (player.food >= targetFood) {
      return {
        success: true,
        messages: ['You are already full.'],
        turnConsumed: true,
      };
    }

    // Set food to just below max (full but not gorged)
    const message = player.setFood(targetFood);

    return {
      success: true,
      messages: message ? [message] : ['You are full!'],
      turnConsumed: true,
    };
  }
}
