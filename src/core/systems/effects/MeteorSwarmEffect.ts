/**
 * MeteorSwarmEffect - Calls down a swarm of meteors around the player
 *
 * From Zangband's Meteor Swarm spell which:
 * - Creates 10-20 meteor impacts
 * - Each lands within 5 squares of player (and in LOS, within distance 6)
 * - Each impact is a GF_METEOR ball (radius 2)
 * - Damage: (level * 3) / 2
 *
 * Used by: Meteor Swarm (chaos realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Position } from '@/core/types';
import { Element as ElementConst } from '@/core/types';
import type { Actor } from '@/core/entities/Actor';
import type { Monster } from '@/core/entities/Monster';
import type { ILevel } from '@/core/world/Level';

export interface MeteorSwarmEffectDef extends GPEffectDef {
  type: 'meteorSwarm';
}

interface MeteorImpact {
  x: number;
  y: number;
  damage: number;
}

export class MeteorSwarmEffect extends SelfGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng } = context;
    const messages: string[] = [];
    const impacts: MeteorImpact[] = [];
    let totalHits = 0;
    let totalDamage = 0;

    const playerLevel = (actor as any).level ?? 1;
    const baseDamage = Math.floor((playerLevel * 3) / 2);
    const radius = 2;

    // Number of meteors: 10-20
    const meteorCount = rng.getUniformInt(10, 20);

    messages.push('Meteors rain down from the sky!');

    // Create each meteor
    for (let i = 0; i < meteorCount; i++) {
      // Find a valid location for this meteor
      let x = 0;
      let y = 0;
      let found = false;

      for (let attempt = 0; attempt < 100; attempt++) {
        // Pick random spot within 5 squares of player
        x = actor.position.x - 5 + rng.getUniformInt(1, 10);
        y = actor.position.y - 5 + rng.getUniformInt(1, 10);

        // Check bounds
        const tile = level.getTile({ x, y });
        if (!tile) continue;

        // Check LOS (simplified - not blocked by walls)
        if (tile.terrain?.flags?.includes('WALL')) continue;

        // Check distance (should be within 6)
        const dx = Math.abs(x - actor.position.x);
        const dy = Math.abs(y - actor.position.y);
        const dist = Math.max(dx, dy);
        if (dist > 6) continue;

        found = true;
        break;
      }

      if (!found) continue;

      // Create meteor impact at this location
      const impactDamage = baseDamage + rng.getUniformInt(0, baseDamage);
      impacts.push({ x, y, damage: impactDamage });

      // Find all actors in the blast radius
      const hitActors = this.findActorsInRadius({ x, y }, radius, level);

      for (const hitActor of hitActors) {
        if (hitActor === actor) continue; // Don't hit self

        const isPlayer = hitActor === level.player;
        const targetName = isPlayer ? 'you' : (hitActor as Monster).def?.name ?? 'creature';

        // Apply resistance (meteors are fire+physical, use fire for simplicity)
        const { damage: finalDamage, status } = hitActor.resistDamage(ElementConst.Fire, impactDamage, rng);

        // Apply damage
        hitActor.takeDamage(finalDamage);
        totalDamage += finalDamage;
        totalHits++;

        if (finalDamage > 0) {
          if (status === 'resists') {
            messages.push(isPlayer ? `You resist the meteor. (${finalDamage} damage)` : `The ${targetName} resists. (${finalDamage} damage)`);
          } else {
            messages.push(isPlayer ? `You are hit by a meteor! (${finalDamage} damage)` : `The ${targetName} is hit by a meteor! (${finalDamage} damage)`);
          }
        }

        if (hitActor.isDead) {
          if (isPlayer) {
            messages.push('You die...');
          } else {
            messages.push(`The ${targetName} is destroyed!`);
          }
        }
      }
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      damageDealt: totalDamage,
      data: {
        meteorCount: impacts.length,
        baseDamage,
        impacts,
        totalHits,
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
        // Check if within circular radius
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
