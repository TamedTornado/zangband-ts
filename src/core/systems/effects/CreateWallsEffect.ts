/**
 * CreateWallsEffect - Creates stone walls around the player
 *
 * From Zangband's wall_stone() which uses GF_STONE_WALL
 * in a radius 1 ball around the player, creating walls on
 * the 8 adjacent tiles.
 *
 * Used by: Wall of Stone (nature realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';
import type { Position } from '@/core/types';

export interface CreateWallsEffectDef {
  type: 'createWalls';
}

// 8 cardinal and diagonal directions (not center)
const ADJACENT = [
  { dx: -1, dy: -1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: -1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 1 },
];

export class CreateWallsEffect extends SelfGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level } = context;
    if (!actor || !level) {
      return { success: false, messages: ['No valid target.'], turnConsumed: false };
    }

    const messages: string[] = [];

    // Calculate positions for 8 adjacent tiles
    const positions: Position[] = ADJACENT.map(({ dx, dy }) => ({
      x: actor.position.x + dx,
      y: actor.position.y + dy,
    }));

    // Create walls on adjacent tiles
    for (const pos of positions) {
      if (level.isInBounds(pos)) {
        level.setTerrain(pos, 'granite_wall_48');
      }
    }

    messages.push('Walls of stone rise around you!');

    return {
      success: true,
      messages,
      turnConsumed: true,
      data: { positions },
    };
  }
}
