/**
 * CloneMonsterEffect - Duplicate a monster (cursed wand effect)
 *
 * Position-targeted effect that creates a copy of the monster nearby.
 * Unique monsters cannot be cloned.
 *
 * Example: { type: "cloneMonster", target: "position" }
 */

import { PositionGPEffect } from './PositionGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';

export class CloneMonsterEffect extends PositionGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const pos = this.getTargetPosition(context);

    const monster = context.level.getMonsterAt(pos);
    if (!monster || monster.isDead) {
      return this.noEffect('There is nothing there to clone.');
    }

    const monsterInfo = context.getMonsterInfo?.(monster);
    const monsterName = monsterInfo?.name ?? 'The monster';
    const flags = monsterInfo?.flags ?? [];

    // Unique monsters cannot be cloned
    if (flags.includes('UNIQUE')) {
      return this.success([`${monsterName} is unaffected.`]);
    }

    // Need monster data manager to create the clone
    const dataManager = this.resources?.monsterDataManager;
    if (!dataManager) {
      return this.fail('Cannot clone without monster data manager.');
    }

    const def = dataManager.getMonsterDef(monster.definitionKey);
    if (!def) {
      return this.noEffect(`${monsterName} resists cloning.`);
    }

    // Find an adjacent empty spot for the clone
    const clonePos = this.findAdjacentEmpty(context, pos);
    if (!clonePos) {
      return this.noEffect('There is no room for a clone.');
    }

    // Create the clone
    const clone = dataManager.createMonsterFromDef(def, clonePos);
    context.level.addMonster(clone);
    clone.wake();

    return this.success([`${monsterName} is cloned!`]);
  }

  /**
   * Find an empty adjacent tile for the clone
   */
  private findAdjacentEmpty(
    context: GPEffectContext,
    center: { x: number; y: number }
  ): { x: number; y: number } | null {
    const offsets = [
      { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
      { x: -1, y: 0 },                   { x: 1, y: 0 },
      { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 },
    ];

    // Shuffle offsets for randomness
    for (let i = offsets.length - 1; i > 0; i--) {
      const j = context.rng.getUniformInt(0, i);
      [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
    }

    for (const offset of offsets) {
      const newPos = { x: center.x + offset.x, y: center.y + offset.y };
      if (context.level.isWalkable(newPos) && !context.level.isOccupied?.(newPos)) {
        return newPos;
      }
    }

    return null;
  }
}
