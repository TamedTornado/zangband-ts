/**
 * MassTeleportEffect - Teleport all monsters away
 *
 * Teleports ALL monsters within sight range away to a random location.
 * Based on Zangband's banish_monsters() which uses GF_AWAY_ALL.
 *
 * Resistance (RES_TELE):
 * - Unique monsters with RES_TELE always resist
 * - Non-unique with RES_TELE: resist if level > random(150)
 * - Monsters without RES_TELE are always teleported
 *
 * Used by: Banish (trump realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult, MonsterInfo } from './GPEffect';
import type { Monster } from '@/core/entities/Monster';

/** Maximum sight range */
const MAX_SIGHT = 20;

export interface MassTeleportEffectDef extends GPEffectDef {
  type: 'massTeleport';
  power?: number; // Teleport distance
}

export class MassTeleportEffect extends SelfGPEffect {
  readonly power: number;

  constructor(def: GPEffectDef) {
    super(def);
    const typed = def as MassTeleportEffectDef;
    this.power = typed.power ?? 100;
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng, getMonsterInfo } = context;
    const playerPos = actor.position;

    // Get all monsters within sight range
    const nearbyMonsters = level.getMonsters().filter((m: Monster) => {
      if (m.isDead) return false;

      const dx = m.position.x - playerPos.x;
      const dy = m.position.y - playerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance <= MAX_SIGHT;
    });

    if (nearbyMonsters.length === 0) {
      return {
        success: true,
        messages: ['Nothing happens.'],
        turnConsumed: true,
      };
    }

    // Teleport each monster
    const messages: string[] = [];
    let teleported = 0;

    for (const monster of nearbyMonsters) {
      const monsterInfo: MonsterInfo & { level?: number } = getMonsterInfo
        ? getMonsterInfo(monster)
        : { name: monster.def.name, flags: monster.def.flags ?? [] };
      const monsterFlags = monsterInfo.flags;
      const monsterLevel = monsterInfo.level ?? monster.def.depth ?? 10;
      const monsterName = monsterInfo.name;

      // Check for teleport resistance
      if (monsterFlags.includes('RES_TELE')) {
        // Unique with RES_TELE always resist
        if (monsterFlags.includes('UNIQUE')) {
          messages.push(`The ${monsterName} is unaffected!`);
          continue;
        }

        // Non-unique: resist if level > random(150)
        const roll = rng.getUniformInt(1, 150);
        if (monsterLevel > roll) {
          messages.push(`The ${monsterName} resists!`);
          continue;
        }
      }

      // Find teleport destination
      const newPos = this.findTeleportDestination(context, monster.position);

      if (!newPos) {
        messages.push(`The ${monsterName} resists the banishment!`);
        continue;
      }

      // Teleport the monster
      monster.position = newPos;
      messages.push(`The ${monsterName} disappears!`);
      teleported++;
    }

    if (teleported === 0 && messages.length === 0) {
      messages.push('Nothing happens.');
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
    };
  }

  /**
   * Find a valid position to teleport to.
   */
  private findTeleportDestination(
    context: GPEffectContext,
    originalPos: { x: number; y: number }
  ): { x: number; y: number } | null {
    const { level, rng } = context;
    const minDistance = Math.floor(this.power / 2);
    const maxDistance = this.power;

    // Try up to 500 times to find a valid position
    for (let i = 0; i < 500; i++) {
      const angle = rng.getUniform() * 2 * Math.PI;
      const dist = minDistance + rng.getUniform() * (maxDistance - minDistance);

      const nx = Math.round(originalPos.x + Math.cos(angle) * dist);
      const ny = Math.round(originalPos.y + Math.sin(angle) * dist);

      // Check bounds
      if (nx < 0 || nx >= level.width || ny < 0 || ny >= level.height) {
        continue;
      }

      // Check walkable
      if (level.isWalkable && !level.isWalkable({ x: nx, y: ny })) {
        continue;
      }

      // Check not occupied by another monster
      if (level.getMonsterAt({ x: nx, y: ny })) {
        continue;
      }

      // Check not on player
      if (context.actor.position.x === nx && context.actor.position.y === ny) {
        continue;
      }

      return { x: nx, y: ny };
    }

    return null;
  }
}
