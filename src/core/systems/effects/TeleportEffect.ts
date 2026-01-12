/**
 * TeleportEffect - Teleport the actor with formula-based distance
 *
 * Similar to TeleportSelfEffect but supports level-based formulas like "level*4".
 * Matches the C implementation's teleport_player(dis) function.
 *
 * Formula examples:
 * - "100" - fixed distance of 100
 * - "level*4" - 4x player level
 * - "level+10" - player level + 10
 *
 * Maximum distance is capped at 200 (matching C implementation).
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';

export interface TeleportEffectDef extends GPEffectDef {
  type: 'teleport';
  distance?: string; // Formula like "level*4" or fixed number "100"
}

/** Maximum teleport distance (matches C implementation) */
const MAX_TELEPORT_DISTANCE = 200;

export class TeleportEffect extends SelfGPEffect {
  readonly distanceFormula: string;

  constructor(def: GPEffectDef) {
    super(def);
    const teleportDef = def as TeleportEffectDef;
    this.distanceFormula = teleportDef.distance ?? '100';
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng } = context;
    const currentPos = actor.position;

    // Evaluate the distance formula
    const actorLevel = (actor as any).level ?? 1;
    let distance = this.evaluateFormula(this.distanceFormula, actorLevel);

    // Cap at maximum (matches C: if (dis > 200) dis = 200)
    if (distance > MAX_TELEPORT_DISTANCE) {
      distance = MAX_TELEPORT_DISTANCE;
    }

    // Minimum distance is half the max (or 1/3 for long range >50)
    const minDistance = distance > 50 ? Math.floor(distance / 3) : Math.floor(distance / 2);

    // Find valid destination within range
    const candidates: Array<{ x: number; y: number }> = [];

    for (let dx = -distance; dx <= distance; dx++) {
      for (let dy = -distance; dy <= distance; dy++) {
        const x = currentPos.x + dx;
        const y = currentPos.y + dy;

        // Check distance (circular)
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > distance || dist < minDistance) continue;

        // Check valid landing spot using level.isWalkable
        if (!level.isWalkable({ x, y })) continue;

        // Check not occupied by monster
        if (level.getMonsterAt({ x, y })) continue;

        candidates.push({ x, y });
      }
    }

    if (candidates.length === 0) {
      return {
        success: true,
        messages: ['You fail to teleport.'],
        turnConsumed: true,
      };
    }

    // Pick random destination
    const dest = candidates[rng.getUniformInt(0, candidates.length - 1)];
    actor.position = dest;

    const actualDistance = Math.floor(
      Math.sqrt(
        (dest.x - currentPos.x) ** 2 + (dest.y - currentPos.y) ** 2
      )
    );

    return {
      success: true,
      messages: [`You teleport ${actualDistance} squares.`],
      turnConsumed: true,
    };
  }

  /**
   * Evaluate a formula like "level*4" or "level+10"
   * Supports: +, -, *, / operators and "level" variable
   */
  private evaluateFormula(formula: string, level: number): number {
    // Replace 'level' with actual value
    const expr = formula.replace(/level/gi, String(level));

    // Try to evaluate as simple math expression
    try {
      // Safety check: only allow digits, operators, and whitespace
      if (!/^[\d+\-*/\s.()]+$/.test(expr)) {
        return parseInt(expr, 10) || 100;
      }

      // Use Function constructor for safe math evaluation
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expr})`)();
      return Math.floor(result);
    } catch {
      // Fallback to parsing as simple integer
      return parseInt(expr, 10) || 100;
    }
  }
}
