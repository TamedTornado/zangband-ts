/**
 * AlterRealityEffect - Regenerate the dungeon level
 *
 * Causes the current dungeon level to be regenerated with a new layout.
 * Only works in the dungeon (depth > 0). On the surface, it has no effect.
 *
 * Based on Zangband's alter_reality() which sets p_ptr->state.leaving = TRUE
 * to trigger level regeneration.
 *
 * Used by: Alter Reality (chaos realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';

export interface AlterRealityEffectDef extends GPEffectDef {
  type: 'alterReality';
}

interface AlterRealityData {
  type: 'alterReality';
  regenerateLevel: boolean;
}

export class AlterRealityEffect extends SelfGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { level } = context;

    // Get current depth from level
    const depth = (level as any).depth ?? 0;

    if (depth > 0) {
      // In dungeon - regenerate the level
      const data: AlterRealityData = {
        type: 'alterReality',
        regenerateLevel: true,
      };

      return {
        success: true,
        messages: ['The world changes!'],
        turnConsumed: true,
        data,
      };
    } else {
      // On surface - does nothing
      const data: AlterRealityData = {
        type: 'alterReality',
        regenerateLevel: false,
      };

      return {
        success: true,
        messages: ['The world seems to change for a moment!'],
        turnConsumed: true,
        data,
      };
    }
  }
}
