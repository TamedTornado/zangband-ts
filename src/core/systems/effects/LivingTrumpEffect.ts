/**
 * LivingTrumpEffect - Grant the player a trump-related mutation
 *
 * Transforms the player into a "Living Trump" by granting a mutation:
 * - 1/8 chance: Teleport Control (controlled teleportation)
 * - 7/8 chance: Random Teleportation (uncontrolled random teleports)
 *
 * Based on Zangband's Living Trump spell which calls gain_mutation().
 *
 * Used by: Living Trump (trump realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';

export interface LivingTrumpEffectDef extends GPEffectDef {
  type: 'livingTrump';
}

interface LivingTrumpData {
  type: 'livingTrump';
  mutation: 'teleportControl' | 'randomTeleport';
}

export class LivingTrumpEffect extends SelfGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { rng } = context;
    const messages: string[] = [];

    // Determine which mutation to grant (1/8 chance for control, 7/8 for random)
    let mutation: 'teleportControl' | 'randomTeleport';

    if (rng.getUniformInt(1, 8) === 1) {
      // Teleport Control - player can control teleport destinations
      mutation = 'teleportControl';
      messages.push('You have turned into a Living Trump.');
      messages.push('You feel you can control your teleportation!');
    } else {
      // Random Teleportation - player occasionally teleports randomly
      mutation = 'randomTeleport';
      messages.push('You have turned into a Living Trump.');
      messages.push('You feel your position becoming uncertain...');
    }

    const data: LivingTrumpData = {
      type: 'livingTrump',
      mutation,
    };

    return {
      success: true,
      messages,
      turnConsumed: true,
      data,
    };
  }
}
