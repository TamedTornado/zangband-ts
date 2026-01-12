/**
 * CallTheVoidEffect - Extremely powerful but risky void spell
 *
 * From Zangband's call_the_() which:
 * - If all 8 adjacent tiles are open floor:
 *   - Fire 8 rocket balls (175 dmg, radius 2) in all directions
 *   - Fire 8 mana balls (175 dmg, radius 3) in all directions
 *   - Fire 8 nuke balls (175 dmg, radius 4) in all directions
 * - Otherwise (near a wall):
 *   - Backfires catastrophically
 *   - Destroys area around player (radius 20 + level)
 *   - Deals 100-250 damage to player
 *
 * Used by: Call the Void (chaos realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Position } from '@/core/types';
import { Element as ElementConst } from '@/core/types';
import type { Actor } from '@/core/entities/Actor';
import type { Monster } from '@/core/entities/Monster';
import type { ILevel } from '@/core/world/Level';

export interface CallTheVoidEffectDef extends GPEffectDef {
  type: 'callTheVoid';
}

// 8 cardinal and diagonal directions
const DIRECTIONS = [
  { dx: 1, dy: 0 },   // East
  { dx: -1, dy: 0 },  // West
  { dx: 0, dy: 1 },   // South
  { dx: 0, dy: -1 },  // North
  { dx: 1, dy: 1 },   // Southeast
  { dx: -1, dy: 1 },  // Southwest
  { dx: 1, dy: -1 },  // Northeast
  { dx: -1, dy: -1 }, // Northwest
];

// Wave definitions: element, damage, radius
const WAVES: Array<{ element: string; damage: number; radius: number }> = [
  { element: 'rocket', damage: 175, radius: 2 },
  { element: 'mana', damage: 175, radius: 3 },
  { element: 'nuke', damage: 175, radius: 4 },
];

export class CallTheVoidEffect extends SelfGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng } = context;
    const messages: string[] = [];
    const playerLevel = (actor as any).level ?? 1;

    // Check if all 8 adjacent tiles are open (not walls)
    const isOpenSpace = this.checkOpenSpace(actor.position, level);

    if (isOpenSpace) {
      return this.executeNormal(context, messages);
    } else {
      return this.executeBackfire(context, messages, playerLevel);
    }
  }

  /**
   * Check if all 8 adjacent tiles are open floor (not walls)
   */
  private checkOpenSpace(pos: Position, level: ILevel): boolean {
    for (const { dx, dy } of DIRECTIONS) {
      const tile = level.getTile({ x: pos.x + dx, y: pos.y + dy });
      if (!tile || tile.terrain?.flags?.includes('WALL')) {
        return false;
      }
    }
    return true;
  }

  /**
   * Normal execution - fire three waves of balls in all directions
   */
  private executeNormal(context: GPEffectContext, messages: string[]): GPEffectResult {
    const { actor, level, rng } = context;
    let totalDamage = 0;
    let totalHits = 0;
    let ballCount = 0;

    messages.push('You invoke the power of the Void!');

    for (const wave of WAVES) {
      for (const { dx, dy } of DIRECTIONS) {
        // Target position for the ball
        const target = {
          x: actor.position.x + dx * 6,
          y: actor.position.y + dy * 6,
        };

        // Find all actors in the blast radius
        const hitActors = this.findActorsInRadius(target, wave.radius, level);

        for (const hitActor of hitActors) {
          if (hitActor === actor) continue;

          const isPlayer = hitActor === level.player;
          const targetName = isPlayer ? 'you' : (hitActor as Monster).def?.name ?? 'creature';

          // Use fire element for rocket/nuke, magic for mana
          const element = wave.element === 'mana' ? ElementConst.Magic : ElementConst.Fire;

          // Apply resistance
          const { damage: finalDamage, status } = hitActor.resistDamage(element, wave.damage, rng);

          // Apply damage
          hitActor.takeDamage(finalDamage);
          totalDamage += finalDamage;
          totalHits++;

          if (finalDamage > 0) {
            if (status === 'resists') {
              messages.push(`The ${targetName} resists. (${finalDamage} damage)`);
            } else {
              messages.push(`The ${targetName} is blasted! (${finalDamage} damage)`);
            }
          }

          if (hitActor.isDead) {
            messages.push(`The ${targetName} is destroyed!`);
          }
        }

        ballCount++;
      }
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      damageDealt: totalDamage,
      data: {
        backfired: false,
        waves: WAVES.length,
        ballCount,
        totalHits,
      },
    };
  }

  /**
   * Backfire execution - spell cast too close to wall
   */
  private executeBackfire(context: GPEffectContext, messages: string[], playerLevel: number): GPEffectResult {
    const { actor, rng } = context;

    messages.push('You cast the spell too close to a wall!');
    messages.push('There is a loud explosion!');
    messages.push('The dungeon collapses around you!');

    // Calculate self damage (100-250)
    const selfDamage = rng.getUniformInt(100, 250);

    // Apply damage to player
    actor.takeDamage(selfDamage);

    messages.push(`You take ${selfDamage} damage!`);

    if (actor.isDead) {
      messages.push('You die from a suicidal Call the Void...');
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      damageDealt: selfDamage,
      data: {
        backfired: true,
        destroyArea: true,
        destroyRadius: 20 + playerLevel,
        selfDamage,
      },
    };
  }

  /**
   * Find all actors within a radius of a position
   */
  private findActorsInRadius(center: Position, radius: number, level: ILevel): Actor[] {
    const actors: Actor[] = [];

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (dx * dx + dy * dy > radius * radius) continue;

        const pos = { x: center.x + dx, y: center.y + dy };
        const actor = level.getActorAt(pos);
        if (actor && !actors.includes(actor)) {
          actors.push(actor);
        }
      }
    }

    return actors;
  }
}
