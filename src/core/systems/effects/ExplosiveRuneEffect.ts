/**
 * ExplosiveRuneEffect - Creates an explosive rune on the floor
 *
 * From Zangband's explosive_rune() which places FT_GLYPH_EXPLODE.
 * When a monster tries to cross an explosive rune:
 * - Monster must make a save vs 25 + player level * 2
 * - If failed: rune explodes dealing ~6d10 damage to adjacent monsters
 * - Rune is destroyed after exploding
 *
 * Used by: Explosive Rune (sorcery realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';
import type { Position } from '@/core/types';

export interface ExplosiveRuneEffectDef {
  type: 'explosiveRune';
}

interface ExplosiveRuneData {
  runePosition: Position;
}

export class ExplosiveRuneEffect extends SelfGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const { actor } = context;
    const messages: string[] = [];

    // Position where rune is placed (player's current position)
    const runePosition: Position = {
      x: actor.position.x,
      y: actor.position.y,
    };

    // TODO: When terrain/trap modification is implemented, actually place the rune
    // For now, just return messages and position

    messages.push('You carefully inscribe an explosive rune.');

    const data: ExplosiveRuneData = {
      runePosition,
    };

    return {
      success: true,
      messages,
      turnConsumed: true,
      data,
    };
  }
}
