/**
 * RestoreLevelEffect - Restores drained experience
 *
 * Used by: Restoration (life), Restore Life (death)
 *
 * Restores player's experience to their maximum (undoing level drain).
 * Returns false if player hasn't been drained.
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';
import type { Player } from '@/core/entities/Player';

export class RestoreLevelEffect extends SelfGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const { actor } = context;

    // Only works on players (monsters don't have experience)
    const player = actor as Player;
    if (!player.restoreLevel) {
      return {
        success: false,
        messages: ['Nothing happens.'],
        turnConsumed: true,
      };
    }

    const restored = player.restoreLevel();

    if (restored) {
      return {
        success: true,
        messages: ['You feel your life energies returning.'],
        turnConsumed: true,
      };
    } else {
      return {
        success: false,
        messages: ['Nothing happens.'],
        turnConsumed: true,
      };
    }
  }
}
