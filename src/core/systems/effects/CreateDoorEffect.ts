/**
 * CreateDoorEffect - Creates doors around the player
 *
 * From Zangband's door_creation() which uses GF_MAKE_DOOR
 * in a radius 1 ball around the player, creating doors on
 * the 8 adjacent tiles.
 *
 * Used by: Door Building (nature realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';
import type { Position } from '@/core/types';

export interface CreateDoorEffectDef {
  type: 'createDoor';
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

export class CreateDoorEffect extends SelfGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const { actor } = context;
    const messages: string[] = [];

    // Calculate positions for 8 adjacent tiles
    const positions: Position[] = ADJACENT.map(({ dx, dy }) => ({
      x: actor.position.x + dx,
      y: actor.position.y + dy,
    }));

    // TODO: When terrain modification is implemented, actually create doors
    // For now, just return messages and positions

    messages.push('Doors appear around you!');

    return {
      success: true,
      messages,
      turnConsumed: true,
      data: { positions },
    };
  }
}
