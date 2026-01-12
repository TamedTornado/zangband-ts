/**
 * DimensionDoorEffect - Controlled teleport to a chosen position
 *
 * Unlike random teleport, dimension door lets the player choose a destination.
 * Has a chance to fail based on distance and player level:
 * - Fails if target is out of range (level + 2)
 * - Fails if target is a wall or occupied
 * - Random failure chance: 1/(level*level/2)
 *
 * On failure: random teleport to (range * 2) distance instead.
 *
 * Used by: Dimension Door (sorcery)
 */

import { PositionGPEffect } from './PositionGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';

export interface DimensionDoorEffectDef extends GPEffectDef {
  type: 'dimensionDoor';
  range?: string; // Formula like "level+2" (default: "level+2")
}

export class DimensionDoorEffect extends PositionGPEffect {
  readonly rangeFormula: string;

  constructor(def: GPEffectDef) {
    super(def);
    const dimDef = def as DimensionDoorEffectDef;
    this.rangeFormula = dimDef.range ?? 'level+2';
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng } = context;
    const targetPos = this.getTargetPosition(context);
    const currentPos = actor.position;

    // Evaluate range formula
    const actorLevel = (actor as any).level ?? 1;
    const range = this.evaluateFormula(this.rangeFormula, actorLevel);

    // Calculate distance to target
    const dx = targetPos.x - currentPos.x;
    const dy = targetPos.y - currentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check failure conditions
    let failed = false;
    let failReason = '';

    // Check range
    if (distance > range) {
      failed = true;
      failReason = 'out of range';
    }

    // Check if target is walkable
    if (!failed && !level.isWalkable(targetPos)) {
      failed = true;
      failReason = 'invalid destination';
    }

    // Check if target is occupied
    if (!failed && level.getMonsterAt(targetPos)) {
      failed = true;
      failReason = 'destination occupied';
    }

    // Random failure chance: 1/(level*level/2) - decreases with level
    // At level 10: 1/50 = 2%
    // At level 20: 1/200 = 0.5%
    // At level 50: 1/1250 = 0.08%
    if (!failed) {
      const failChance = 2.0 / (actorLevel * actorLevel);
      if (rng.getUniform() < failChance) {
        failed = true;
        failReason = 'dimensional instability';
      }
    }

    if (failed) {
      // On failure: random teleport to (range * 2) distance
      const failDistance = range * 2;
      this.randomTeleport(actor, level, rng, failDistance);

      return {
        success: true, // Still consumed turn
        messages: [`You fail to exit the dimensional gate correctly! (${failReason})`],
        turnConsumed: true,
      };
    }

    // Success: teleport to chosen position
    actor.position = { ...targetPos };

    return {
      success: true,
      messages: ['You step through the dimensional gate.'],
      turnConsumed: true,
    };
  }

  /**
   * Perform a random teleport (fallback on failure)
   */
  private randomTeleport(
    actor: { position: { x: number; y: number } },
    level: { isWalkable: (pos: { x: number; y: number }) => boolean; getMonsterAt: (pos: { x: number; y: number }) => unknown },
    rng: { getUniformInt: (min: number, max: number) => number },
    distance: number
  ): void {
    const currentPos = actor.position;
    const minDistance = Math.floor(distance / 2);

    // Find valid destination within range
    const candidates: Array<{ x: number; y: number }> = [];

    for (let dx = -distance; dx <= distance; dx++) {
      for (let dy = -distance; dy <= distance; dy++) {
        const x = currentPos.x + dx;
        const y = currentPos.y + dy;

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > distance || dist < minDistance) continue;

        if (!level.isWalkable({ x, y })) continue;
        if (level.getMonsterAt({ x, y })) continue;

        candidates.push({ x, y });
      }
    }

    if (candidates.length > 0) {
      const dest = candidates[rng.getUniformInt(0, candidates.length - 1)];
      actor.position = dest;
    }
    // If no valid candidates, player stays in place (shouldn't happen in normal play)
  }

  /**
   * Evaluate a formula like "level+2" or "level*4"
   */
  private evaluateFormula(formula: string, level: number): number {
    const expr = formula.replace(/level/gi, String(level));

    try {
      if (!/^[\d+\-*/\s.()]+$/.test(expr)) {
        return parseInt(expr, 10) || 22;
      }
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expr})`)();
      return Math.floor(result);
    } catch {
      return parseInt(expr, 10) || 22;
    }
  }
}
