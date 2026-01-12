/**
 * FetchEffect - Telekinetically move items to the player
 *
 * Used by: Telekinesis (sorcery), Trump Reach (trump)
 *
 * Moves an item from the target position to the player's position.
 * Has a weight limit that can be level-based.
 */

import { PositionGPEffect } from './PositionGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Player } from '@/core/entities/Player';

export interface FetchEffectDef extends GPEffectDef {
  type: 'fetch';
  /** Weight limit - number or formula like "level*15" */
  weight: number | string;
}

export class FetchEffect extends PositionGPEffect {
  readonly weightLimit: number | string;

  constructor(def: GPEffectDef) {
    super(def);
    const typed = def as FetchEffectDef;
    this.weightLimit = typed.weight ?? 500;
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level } = context;
    const targetPos = this.getTargetPosition(context);
    const playerPos = actor.position;

    // Check if player is standing on an item
    const itemsAtPlayer = level.getItemsAt(playerPos);
    if (itemsAtPlayer.length > 0) {
      return {
        success: false,
        messages: ["You can't fetch when you're already standing on something."],
        turnConsumed: true,
      };
    }

    // Get items at target position
    const itemsAtTarget = level.getItemsAt(targetPos);
    if (itemsAtTarget.length === 0) {
      return {
        success: false,
        messages: ['There is no object at this place.'],
        turnConsumed: true,
      };
    }

    // Calculate weight limit
    const maxWeight = this.calculateWeightLimit(actor as Player);

    // Get the first item (could enhance to select specific item later)
    const item = itemsAtTarget[0];
    const itemWeight = item.weight;

    if (itemWeight > maxWeight) {
      return {
        success: false,
        messages: ['The object is too heavy.'],
        turnConsumed: true,
      };
    }

    // Move item to player position
    item.position = { x: playerPos.x, y: playerPos.y };

    return {
      success: true,
      messages: [`${item.name} flies through the air to your feet.`],
      turnConsumed: true,
      itemsAffected: [item.name],
    };
  }

  private calculateWeightLimit(player: Player): number {
    if (typeof this.weightLimit === 'number') {
      return this.weightLimit;
    }

    // Parse simple formula like "level*15"
    const formula = this.weightLimit.toLowerCase();
    if (formula.includes('level')) {
      // Replace 'level' with actual player level and evaluate
      const expr = formula.replace(/level/g, String(player.level));
      // Simple safe evaluation for basic math
      return this.evaluateSimpleExpr(expr);
    }

    // Try to parse as number
    return parseInt(this.weightLimit, 10) || 500;
  }

  private evaluateSimpleExpr(expr: string): number {
    // Only allow numbers, +, -, *, / and spaces
    if (!/^[\d\s+\-*/()]+$/.test(expr)) {
      return 500; // Default if invalid
    }

    try {
      // Safe evaluation using Function constructor
      // Only works for simple math expressions
      const result = new Function(`return ${expr}`)();
      return typeof result === 'number' ? Math.floor(result) : 500;
    } catch {
      return 500;
    }
  }
}
