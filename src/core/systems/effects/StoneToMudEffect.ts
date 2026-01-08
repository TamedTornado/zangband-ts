/**
 * StoneToMudEffect - Convert a wall to floor
 *
 * Used by wands of stone to mud.
 * Converts walls, doors, and rubble to passable floor.
 *
 * Example: { type: "stoneToMud", target: "position" }
 */

import { PositionGPEffect } from './PositionGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';

export class StoneToMudEffect extends PositionGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { level } = context;
    const targetPos = this.getTargetPosition(context);

    const tile = level.getTile(targetPos);
    if (!tile) {
      return {
        success: false,
        messages: ['There is nothing there.'],
        turnConsumed: false,
      };
    }

    const terrain = tile.terrain;
    const isBlocked = terrain.flags?.includes('BLOCK');

    // Check if already passable (floor, open door, etc.)
    if (!isBlocked) {
      return {
        success: true,
        messages: ['The floor is already passable.'],
        turnConsumed: true,
      };
    }

    // Check for permanent walls (like dungeon boundaries)
    if (terrain.flags?.includes('PERMANENT')) {
      return {
        success: true,
        messages: ['The wall is impervious.'],
        turnConsumed: true,
      };
    }

    // Convert the tile to floor
    level.setTerrain(targetPos, 'floor');

    // Determine appropriate message based on what was destroyed
    let message: string;
    if (terrain.flags?.includes('DOOR')) {
      message = 'The door dissolves!';
    } else if (terrain.flags?.includes('RUBBLE')) {
      message = 'The rubble dissolves!';
    } else {
      message = 'The wall dissolves!';
    }

    return {
      success: true,
      messages: [message],
      turnConsumed: true,
    };
  }
}
