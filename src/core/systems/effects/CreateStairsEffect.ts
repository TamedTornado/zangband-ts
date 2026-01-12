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
    const { actor, level } = context;
    if (!actor || !level) {
      return { success: false, messages: ['No valid target.'], turnConsumed: false };
    }

    const messages: string[] = [];

    // Position where stairs will be created (player's position)
    const position: Position = {
      x: actor.position.x,
      y: actor.position.y,
    };

    // Only works in dungeons, not wilderness
    if (level.levelType !== 'dungeon') {
      messages.push('You cannot create stairs here.');
      return { success: false, messages, turnConsumed: false };
    }

    // Create up stairs to escape the dungeon
    level.setTerrain(position, 'up_staircase');

    messages.push('A staircase grows beneath your feet.');

    return {
      success: true,
      messages,
      turnConsumed: true,
      data: { position },
    };
  }
}
