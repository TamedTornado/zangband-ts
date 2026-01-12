/**
 * GlyphAreaEffect - Creates glyphs of warding in an area around the player
 *
 * From Zangband's "Warding True" spell which calls both:
 * - warding_glyph() - place glyph on player's tile
 * - glyph_creation() - place glyphs in radius 1 (8 adjacent tiles)
 *
 * Combined, this creates a 3x3 pattern of protection glyphs.
 *
 * Used by: Warding True (life realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';
import type { Position } from '@/core/types';

export interface GlyphAreaEffectDef {
  type: 'glyphArea';
}

interface GlyphAreaData {
  glyphPositions: Position[];
}

// 8 directions plus center
const DIRECTIONS = [
  { dx: -1, dy: -1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 0 }, // center (player position)
  { dx: 1, dy: 0 },
  { dx: -1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 1 },
];

export class GlyphAreaEffect extends SelfGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level } = context;
    if (!actor || !level) {
      return { success: false, messages: ['No valid target.'], turnConsumed: false };
    }

    const messages: string[] = [];

    // Calculate positions for all 9 glyphs (player tile + 8 adjacent)
    const glyphPositions: Position[] = DIRECTIONS.map(({ dx, dy }) => ({
      x: actor.position.x + dx,
      y: actor.position.y + dy,
    }));

    // Place glyphs on all 9 tiles
    for (const pos of glyphPositions) {
      if (level.isInBounds(pos)) {
        level.setTerrain(pos, 'glyph_of_warding');
      }
    }

    messages.push('You inscribe a glyph of warding beneath you.');
    messages.push('Glyphs of warding surround you!');

    const data: GlyphAreaData = {
      glyphPositions,
    };

    return {
      success: true,
      messages,
      turnConsumed: true,
      data,
    };
  }
}
