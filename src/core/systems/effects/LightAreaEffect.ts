/**
 * LightAreaEffect - Illuminates the area around the player
 *
 * Used by: Staff of Light, Rod of Light, Rod of Illumination
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';

export interface LightAreaEffectDef extends GPEffectDef {
  type: 'lightArea';
  radius?: number;  // Default 2-3
}

export class LightAreaEffect extends SelfGPEffect {
  readonly radius: number;

  constructor(def: GPEffectDef) {
    super(def);
    this.radius = (def as LightAreaEffectDef).radius ?? 2;
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level } = context;
    if (!actor || !level) {
      return { success: false, messages: ['No valid target.'], turnConsumed: false };
    }

    const pos = actor.position;
    let tilesLit = 0;

    // Light tiles in radius around player
    for (let dy = -this.radius; dy <= this.radius; dy++) {
      for (let dx = -this.radius; dx <= this.radius; dx++) {
        const x = pos.x + dx;
        const y = pos.y + dy;

        // Check if within circular radius
        if (dx * dx + dy * dy > this.radius * this.radius) continue;

        const tile = level.getTile({ x, y });
        if (tile) {
          // Mark tile as explored and lit
          tile.explored = true;
          tilesLit++;
        }
      }
    }

    return {
      success: true,
      messages: ['The area is illuminated.'],
      turnConsumed: true,
    };
  }
}
