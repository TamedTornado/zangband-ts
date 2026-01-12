/**
 * WhirlwindAttackEffect - Attack all adjacent monsters
 *
 * Performs a melee attack against every monster adjacent to the player.
 * Based on Zangband's whirlwind_attack() which calls py_attack() on all
 * adjacent tiles containing monsters.
 *
 * Damage is based on player stats and a base weapon damage.
 *
 * Used by: Whirlwind Attack (nature realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult, MonsterInfo } from './GPEffect';
import type { Monster } from '@/core/entities/Monster';
import type { Player } from '@/core/entities/Player';

/** Adjacent directions (8 directions) */
const DIRECTIONS = [
  { dx: -1, dy: -1 }, // NW
  { dx: 0, dy: -1 },  // N
  { dx: 1, dy: -1 },  // NE
  { dx: -1, dy: 0 },  // W
  { dx: 1, dy: 0 },   // E
  { dx: -1, dy: 1 },  // SW
  { dx: 0, dy: 1 },   // S
  { dx: 1, dy: 1 },   // SE
];

export interface WhirlwindAttackEffectDef extends GPEffectDef {
  type: 'whirlwindAttack';
}

export class WhirlwindAttackEffect extends SelfGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng, getMonsterInfo } = context;
    const playerPos = actor.position;

    // Check if actor is a Player with stats
    if (!('stats' in actor)) {
      return {
        success: false,
        messages: ['Only players can perform whirlwind attacks.'],
        turnConsumed: false,
      };
    }

    const player = actor as Player;
    const messages: string[] = [];
    let monstersHit = 0;

    // Check all adjacent positions for monsters
    for (const dir of DIRECTIONS) {
      const targetX = playerPos.x + dir.dx;
      const targetY = playerPos.y + dir.dy;

      // Get monster at this position
      const monster = level.getMonsterAt({ x: targetX, y: targetY }) as Monster | undefined;
      if (!monster || monster.isDead) {
        continue;
      }

      // Get monster info for name
      const monsterInfo: MonsterInfo = getMonsterInfo
        ? getMonsterInfo(monster)
        : { name: monster.def.name, flags: monster.def.flags ?? [] };
      const monsterName = monsterInfo.name;

      // Calculate damage based on player stats
      // Simple formula: base damage + STR bonus
      const strBonus = Math.floor((player.stats.str - 10) / 2);
      const baseDamage = 8; // Base weapon damage (d8)
      const damageRoll = rng.getUniformInt(1, baseDamage) + strBonus;

      // Apply damage to monster
      const damage = Math.max(1, damageRoll);
      monster.takeDamage(damage);
      monstersHit++;

      if (monster.isDead) {
        messages.push(`You hit the ${monsterName} for ${damage} damage. It dies!`);
      } else {
        messages.push(`You hit the ${monsterName} for ${damage} damage.`);
      }
    }

    if (monstersHit === 0) {
      messages.push('There is nothing to attack nearby.');
    } else if (monstersHit > 1) {
      messages.unshift(`You spin in a whirlwind of attacks!`);
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
    };
  }
}
