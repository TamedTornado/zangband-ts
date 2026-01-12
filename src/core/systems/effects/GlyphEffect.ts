/**
 * GlyphEffect - Creates a glyph of warding on the floor
 *
 * From Zangband: warding_glyph() places a glyph that monsters
 * cannot cross unless they break it.
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';

export class GlyphEffect extends SelfGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level } = context;
    if (!actor || !level) {
      return { success: false, messages: ['No valid target.'], turnConsumed: false };
    }

    // Place glyph of warding at player's position
    level.setTerrain(actor.position, 'glyph_of_warding');

    return this.success(['You inscribe a glyph of warding beneath you.']);
  }
}
