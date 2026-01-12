/**
 * PhlogistonEffect - Refuel a torch or lantern
 *
 * Adds fuel to the equipped light source. Only works on torches (sval=0)
 * and lanterns (sval=1). Permanent light sources cannot be refueled.
 * Adds half of the max fuel capacity, capping at max.
 *
 * Used by: Phlogiston (arcane realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Player } from '@/core/entities/Player';

// Light source sval values
const SVAL_TORCH = 0;
const SVAL_LANTERN = 1;

export interface PhlogistonEffectDef extends GPEffectDef {
  type: 'phlogiston';
}

export class PhlogistonEffect extends SelfGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor } = context;

    // Check if actor is a Player with equipment
    if (!('getEquipped' in actor)) {
      return {
        success: false,
        messages: ['Only players can use phlogiston.'],
        turnConsumed: false,
      };
    }

    const player = actor as Player;
    const light = player.getEquipped('light');

    // Check if player has a light source equipped
    if (!light) {
      return {
        success: false,
        messages: ['You are not wielding anything which uses phlogiston.'],
        turnConsumed: true,
      };
    }

    // Check if it's a torch or lantern (sval 0 or 1)
    const baseItem = light.generated?.baseItem as { sval?: number; pval?: number } | undefined;
    const sval = baseItem?.sval;
    if (sval !== SVAL_TORCH && sval !== SVAL_LANTERN) {
      return {
        success: false,
        messages: ['This light source cannot be refueled.'],
        turnConsumed: true,
      };
    }

    // Get max fuel from pval
    const maxFuel = baseItem?.pval ?? 4000;
    const currentFuel = light.generated?.timeout ?? 0;

    // Check if already full
    if (currentFuel >= maxFuel) {
      return {
        success: false,
        messages: ['No more phlogiston can be put in this item.'],
        turnConsumed: true,
      };
    }

    // Add half of max fuel
    const fuelToAdd = Math.floor(maxFuel / 2);
    const newFuel = Math.min(currentFuel + fuelToAdd, maxFuel);

    // Update the item's fuel (timeout)
    if (light.generated) {
      light.generated.timeout = newFuel;
    }

    const messages: string[] = ['You add phlogiston to your light item.'];

    if (newFuel >= maxFuel) {
      messages.push('Your light item is full.');
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
    };
  }
}
