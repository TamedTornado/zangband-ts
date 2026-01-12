/**
 * CreateStairsEffect - Creates stairs at the player's position
 *
 * From Zangband's stair_creation() which places stairs
 * at the player's current location. Creates down stairs
 * if depth is positive, up stairs otherwise.
 *
 * Used by: Stair Building (nature realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';
import type { Position } from '@/core/types';

export interface CreateStairsEffectDef {
  type: 'createStairs';
}

export class CreateStairsEffect extends SelfGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const { actor } = context;
    const messages: string[] = [];

    // Position where stairs will be created (player's position)
    const position: Position = {
      x: actor.position.x,
      y: actor.position.y,
    };

    // TODO: When terrain modification is implemented, actually create stairs
    // The direction (up/down) depends on current dungeon depth
    // For now, just return messages and position

    messages.push('A staircase grows beneath your feet.');

    return {
      success: true,
      messages,
      turnConsumed: true,
      data: { position },
    };
  }
}
