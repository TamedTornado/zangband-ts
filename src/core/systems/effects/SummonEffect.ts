/**
 * SummonEffect - Summon hostile monsters near the player
 *
 * Self-targeted effect that spawns 1-4 hostile monsters within 1-2 tiles.
 * Used by Staff of Summoning (cursed effect).
 *
 * Example: { type: "summon", minCount: 1, maxCount: 4 }
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';

export interface SummonEffectDef extends GPEffectDef {
  type: 'summon';
  minCount?: number;
  maxCount?: number;
}

export class SummonEffect extends SelfGPEffect {
  readonly minCount: number;
  readonly maxCount: number;

  constructor(def: GPEffectDef) {
    super(def);
    const summonDef = def as SummonEffectDef;
    this.minCount = summonDef.minCount ?? 1;
    this.maxCount = summonDef.maxCount ?? 4;
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng } = context;
    const dataManager = this.resources?.monsterDataManager;

    if (!dataManager) {
      return this.fail('Cannot summon without monster data manager.');
    }

    // Determine how many monsters to summon
    const count = rng.getUniformInt(this.minCount, this.maxCount);
    const messages: string[] = [];
    let summoned = 0;

    // Get level depth for monster selection
    // Zangband formula: (base_level + req_lev) / 2 + 5, where both are depth for staff
    const depth = (level as any).depth ?? 10;
    const summonLevel = depth + 5;

    for (let i = 0; i < count; i++) {
      // Find an empty spot within 1-2 tiles of actor
      const spawnPos = this.findSpawnPosition(context, actor.position);
      if (!spawnPos) {
        continue; // No room
      }

      // Get a random monster appropriate for this depth
      // Note: In Zangband, type=0 can summon any monster (including uniques)
      // for the calculated level - no type restrictions
      const candidates = dataManager.getMonstersForDepth(summonLevel);
      if (candidates.length === 0) {
        continue;
      }
      const monsterDef = candidates[rng.getUniformInt(0, candidates.length - 1)];

      // Create and place the monster
      const monster = dataManager.createMonsterFromDef(monsterDef, spawnPos);
      level.addMonster(monster);
      monster.wake(); // Summoned monsters are hostile and awake

      summoned++;
    }

    if (summoned > 0) {
      if (summoned === 1) {
        messages.push('A monster appears nearby!');
      } else {
        messages.push(`${summoned} monsters appear nearby!`);
      }
    } else {
      messages.push('You hear a faint crackling noise.');
    }

    return this.success(messages);
  }

  /**
   * Find an empty position within 1-2 tiles of center
   */
  private findSpawnPosition(
    context: GPEffectContext,
    center: { x: number; y: number }
  ): { x: number; y: number } | null {
    const { level, rng } = context;

    // Generate all positions within distance 2
    const candidates: { x: number; y: number }[] = [];
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dy === 0) continue; // Skip center
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        if (dist >= 1 && dist <= 2) {
          candidates.push({ x: center.x + dx, y: center.y + dy });
        }
      }
    }

    // Shuffle candidates
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = rng.getUniformInt(0, i);
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    // Find first valid position
    for (const pos of candidates) {
      if (level.isWalkable(pos) && !level.isOccupied?.(pos)) {
        return pos;
      }
    }

    return null;
  }
}
