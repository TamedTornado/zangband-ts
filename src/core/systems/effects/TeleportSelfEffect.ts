/**
 * TeleportSelfEffect - Teleport the actor (self)
 *
 * Moves the actor to a random location within range.
 * Example: { type: "teleportSelf", range: "10" }  (phase door)
 * Example: { type: "teleportSelf", range: "100" } (teleport)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';
import { rollDiceExpression } from './EffectExecutor';

export class TeleportSelfEffect extends SelfGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const rangeExpr = this.getString('range', '10');
    const range = rollDiceExpression(rangeExpr, context.rng);

    const { actor, level } = context;
    const currentPos = actor.position;

    // Find valid destination within range
    const candidates: Array<{ x: number; y: number }> = [];

    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        const x = currentPos.x + dx;
        const y = currentPos.y + dy;

        // Check distance (circular)
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > range) continue;

        // Check valid landing spot
        const tile = level.getTile({ x, y });
        if (!tile || !tile.isPassable) continue;

        // Check not occupied by monster
        if (level.getMonsterAt({ x, y })) continue;

        candidates.push({ x, y });
      }
    }

    if (candidates.length === 0) {
      return this.noEffect('You fail to teleport.');
    }

    // Pick random destination
    const dest = candidates[context.rng.getUniformInt(0, candidates.length - 1)];
    actor.position = dest;

    const distance = Math.floor(
      Math.sqrt(
        (dest.x - currentPos.x) ** 2 + (dest.y - currentPos.y) ** 2
      )
    );

    return this.success([`You teleport ${distance} squares.`]);
  }
}
