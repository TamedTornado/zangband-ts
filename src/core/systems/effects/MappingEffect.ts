/**
 * MappingEffect - Reveals the map around the player
 *
 * From Zangband: map_area() reveals the dungeon layout
 * in a radius around the player.
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';

export class MappingEffect extends SelfGPEffect {
  execute(_context: GPEffectContext): GPEffectResult {
    // TODO: Implement actual map revealing when fog of war system supports it
    // For now, just show a message
    return this.success(['You sense your surroundings.']);
  }
}
