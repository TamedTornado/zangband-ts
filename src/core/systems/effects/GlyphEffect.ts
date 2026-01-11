/**
 * GlyphEffect - Creates a glyph of warding on the floor
 *
 * From Zangband: warding_glyph() places a glyph that monsters
 * cannot cross unless they break it.
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';

export class GlyphEffect extends SelfGPEffect {
  execute(_context: GPEffectContext): GPEffectResult {
    // TODO: Implement actual glyph placement when terrain modification is supported
    // For now, just show a message
    return this.success(['You inscribe a glyph of warding beneath you.']);
  }
}
