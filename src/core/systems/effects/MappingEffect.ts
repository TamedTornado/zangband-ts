/**
 * MappingEffect - Reveals the map around the player
 *
 * From Zangband: map_area() reveals the dungeon layout
 * in a radius around the player.
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import { DETECT_RADIUS } from '@/core/constants';

export interface MappingEffectDef extends GPEffectDef {
  type: 'mapping';
  radius?: number;
}

export class MappingEffect extends SelfGPEffect {
  readonly radius: number;

  constructor(def: GPEffectDef) {
    super(def);
    const mappingDef = def as MappingEffectDef;
    this.radius = mappingDef.radius ?? DETECT_RADIUS;
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level } = context;
    if (!actor || !level) {
      return { success: false, messages: ['No valid target.'], turnConsumed: false };
    }

    const pos = actor.position;

    // Reveal tiles in radius around the player
    for (let dy = -this.radius; dy <= this.radius; dy++) {
      for (let dx = -this.radius; dx <= this.radius; dx++) {
        // Check if within radius (circular)
        if (dx * dx + dy * dy > this.radius * this.radius) continue;

        const tileX = pos.x + dx;
        const tileY = pos.y + dy;

        // Skip out of bounds
        if (!level.isInBounds({ x: tileX, y: tileY })) continue;

        const tile = level.getTile({ x: tileX, y: tileY });
        if (tile) {
          tile.explored = true;
        }
      }
    }

    return this.success(['You sense your surroundings.']);
  }
}
