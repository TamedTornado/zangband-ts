/**
 * ChainLightningEffect - Fires electric beams in all 8 directions
 *
 * From Zangband's Chain Lightning spell which fires fire_beam(GF_ELEC, dir, ...)
 * for all 10 directions (0-9), effectively covering all 8 cardinal/diagonal directions.
 *
 * Damage: (5 + plev/10)d8 per beam
 *
 * Used by: Chain Lightning (chaos realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Position } from '@/core/types';
import { Element as ElementConst, ELEMENT_NAMES } from '@/core/types';
import type { Actor } from '@/core/entities/Actor';
import type { Monster } from '@/core/entities/Monster';
import type { ILevel } from '@/core/world/Level';

export interface ChainLightningEffectDef extends GPEffectDef {
  type: 'chainLightning';
  damage?: string; // Override damage formula (default uses C formula)
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

interface BeamData {
  dx: number;
  dy: number;
  damage: number;
  element: string;
  hits: string[];
}

export class ChainLightningEffect extends SelfGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng } = context;
    const messages: string[] = [];
    const beams: BeamData[] = [];
    let totalHits = 0;
    let totalDamage = 0;

    messages.push('Lightning arcs in all directions!');

    // Calculate damage dice: (5 + level/10)d8
    const playerLevel = (actor as any).level ?? 1;
    const numDice = 5 + Math.floor(playerLevel / 10);

    // Fire a beam in each of the 8 directions
    for (const { dx, dy } of DIRECTIONS) {
      // Roll damage for this beam
      let damage = 0;
      for (let i = 0; i < numDice; i++) {
        damage += rng.getUniformInt(1, 8);
      }

      const beamHits: string[] = [];

      // Trace the beam and hit all actors in path
      const hitActors = this.traceBeam(actor.position, dx, dy, level);

      for (const hitActor of hitActors) {
        const isPlayer = hitActor === level.player;
        const targetName = isPlayer ? 'you' : (hitActor as Monster).def?.name ?? 'creature';

        // Apply resistance
        const { damage: finalDamage, status } = hitActor.resistDamage(ElementConst.Electricity, damage, rng);

        // Apply damage
        hitActor.takeDamage(finalDamage);
        totalDamage += finalDamage;
        totalHits++;

        beamHits.push(targetName);

        // Build message
        if (finalDamage > 0) {
          const elementName = ELEMENT_NAMES[ElementConst.Electricity];
          if (status === 'resists') {
            messages.push(isPlayer ? `You resist. (${finalDamage} damage)` : `The ${targetName} resists. (${finalDamage} damage)`);
          } else if (status === 'immune') {
            messages.push(isPlayer ? `You are unaffected.` : `The ${targetName} is unaffected.`);
          } else {
            messages.push(isPlayer ? `You are shocked for ${finalDamage} damage!` : `The ${targetName} is shocked for ${finalDamage} damage!`);
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

      beams.push({
        dx,
        dy,
        damage,
        element: 'electricity',
        hits: beamHits,
      });
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      damageDealt: totalDamage,
      data: {
        beams,
        totalHits,
      },
    };
  }

  /**
   * Trace a beam from origin in the given direction until hitting a wall.
   * Returns all actors hit along the way.
   */
  private traceBeam(
    origin: Position,
    dx: number,
    dy: number,
    level: ILevel,
    maxRange: number = 20
  ): Actor[] {
    const actors: Actor[] = [];
    let x = origin.x;
    let y = origin.y;

    for (let i = 0; i < maxRange; i++) {
      x += dx;
      y += dy;

      // Check for wall (beam stops)
      const tile = level.getTile({ x, y });
      if (!tile || tile.terrain?.flags?.includes('WALL')) {
        break;
      }

      // Check for any actor at this position
      const actor = level.getActorAt({ x, y });
      if (actor) {
        actors.push(actor);
      }
    }

    return actors;
  }
}
