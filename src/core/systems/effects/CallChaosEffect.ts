/**
 * CallChaosEffect - Invokes chaotic destruction with random elements
 *
 * From Zangband's call_chaos() which:
 * - Picks a random damage element from 30 chaos types
 * - 1/4 chance to use beams instead of balls
 * - 1/6 chance: fire in all 8 directions (75 damage)
 * - 1/3 of remaining: huge ball centered on player (300 damage, radius 8)
 * - Otherwise: targeted attack (150 damage)
 *
 * Used by: Call Chaos (chaos realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Position, Element } from '@/core/types';
import { Element as ElementConst, ELEMENT_NAMES } from '@/core/types';
import type { Actor } from '@/core/entities/Actor';
import type { Monster } from '@/core/entities/Monster';
import type { ILevel } from '@/core/world/Level';

export interface CallChaosEffectDef extends GPEffectDef {
  type: 'callChaos';
}

// 30 chaos hurt types - map C GF_ types to our elements
const CHAOS_ELEMENTS: Element[] = [
  ElementConst.Lightning, // GF_ELEC
  ElementConst.Poison, // GF_POIS
  ElementConst.Acid, // GF_ACID
  ElementConst.Cold, // GF_COLD
  ElementConst.Fire, // GF_FIRE
  ElementConst.Magic, // GF_MISSILE
  ElementConst.Magic, // GF_ARROW
  ElementConst.Fire, // GF_PLASMA (fire-ish)
  ElementConst.Light, // GF_HOLY_FIRE
  ElementConst.Cold, // GF_WATER
  ElementConst.Light, // GF_LITE
  ElementConst.Dark, // GF_DARK
  ElementConst.Magic, // GF_FORCE
  ElementConst.Magic, // GF_INERTIA
  ElementConst.Magic, // GF_MANA
  ElementConst.Fire, // GF_METEOR
  ElementConst.Cold, // GF_ICE
  ElementConst.Chaos, // GF_CHAOS
  ElementConst.Nether, // GF_NETHER
  ElementConst.Magic, // GF_DISENCHANT
  ElementConst.Magic, // GF_SHARDS
  ElementConst.Sound, // GF_SOUND
  ElementConst.Magic, // GF_NEXUS
  ElementConst.Confusion, // GF_CONFUSION
  ElementConst.Magic, // GF_TIME
  ElementConst.Magic, // GF_GRAVITY
  ElementConst.Fire, // GF_ROCKET
  ElementConst.Poison, // GF_NUKE
  ElementConst.Fire, // GF_HELL_FIRE
  ElementConst.Magic, // GF_DISINTEGRATE
];

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

export class CallChaosEffect extends SelfGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng } = context;
    const messages: string[] = [];
    const playerLevel = (actor as any).level ?? 1;

    // Pick random chaos element
    const element = CHAOS_ELEMENTS[rng.getUniformInt(0, CHAOS_ELEMENTS.length - 1)];
    const elementName = ELEMENT_NAMES[element] ?? 'chaos';

    // 1/4 chance for beams instead of balls
    const useBeams = rng.getUniformInt(1, 4) === 1;

    let mode: string;
    let totalDamage = 0;
    let totalHits = 0;

    // Determine which mode to use
    const roll = rng.getUniformInt(1, 6);

    if (roll === 1) {
      // 1/6 chance: fire in all 8 directions
      mode = 'allDirections';
      const damage = 75;

      messages.push(`Chaos energy explodes in all directions!`);

      for (const { dx, dy } of DIRECTIONS) {
        if (useBeams) {
          // Fire beam in this direction
          const hitActors = this.traceBeam(actor.position, dx, dy, level);
          for (const hitActor of hitActors) {
            if (hitActor === actor) continue;
            const result = this.applyDamage(hitActor, damage, element, rng, messages, level);
            totalDamage += result.damage;
            totalHits++;
          }
        } else {
          // Fire ball in this direction (radius 2)
          const target = {
            x: actor.position.x + dx * 5,
            y: actor.position.y + dy * 5,
          };
          const hitActors = this.findActorsInRadius(target, 2, level);
          for (const hitActor of hitActors) {
            if (hitActor === actor) continue;
            const result = this.applyDamage(hitActor, damage, element, rng, messages, level);
            totalDamage += result.damage;
            totalHits++;
          }
        }
      }

      return {
        success: true,
        messages,
        turnConsumed: true,
        damageDealt: totalDamage,
        data: {
          mode,
          element: elementName,
          useBeams,
          directionCount: 8,
          baseDamage: damage,
          totalHits,
        },
      };
    } else if (rng.getUniformInt(1, 3) === 1) {
      // 1/3 of remaining (about 1/4 overall): huge ball centered on player
      mode = 'centeredBall';
      const damage = 300;
      const radius = 8;

      messages.push(`A massive ball of ${elementName} energy erupts around you!`);

      // Find all actors in radius (excluding caster)
      const hitActors = this.findActorsInRadius(actor.position, radius, level);
      for (const hitActor of hitActors) {
        if (hitActor === actor) continue;
        const result = this.applyDamage(hitActor, damage, element, rng, messages, level);
        totalDamage += result.damage;
        totalHits++;
      }

      return {
        success: true,
        messages,
        turnConsumed: true,
        damageDealt: totalDamage,
        data: {
          mode,
          element: elementName,
          useBeams: false,
          radius,
          baseDamage: damage,
          totalHits,
        },
      };
    } else {
      // Targeted attack
      mode = 'targeted';
      const damage = 150;
      const radius = 3 + Math.floor(playerLevel / 35);

      // Pick a random direction for the "aimed" attack
      const dir = DIRECTIONS[rng.getUniformInt(0, DIRECTIONS.length - 1)];
      const target = {
        x: actor.position.x + dir.dx * 8,
        y: actor.position.y + dir.dy * 8,
      };

      if (useBeams) {
        messages.push(`A beam of ${elementName} energy streaks outward!`);
        const hitActors = this.traceBeam(actor.position, dir.dx, dir.dy, level);
        for (const hitActor of hitActors) {
          if (hitActor === actor) continue;
          const result = this.applyDamage(hitActor, damage, element, rng, messages, level);
          totalDamage += result.damage;
          totalHits++;
        }
      } else {
        messages.push(`A ball of ${elementName} energy streaks outward!`);
        const hitActors = this.findActorsInRadius(target, radius, level);
        for (const hitActor of hitActors) {
          if (hitActor === actor) continue;
          const result = this.applyDamage(hitActor, damage, element, rng, messages, level);
          totalDamage += result.damage;
          totalHits++;
        }
      }

      return {
        success: true,
        messages,
        turnConsumed: true,
        damageDealt: totalDamage,
        data: {
          mode,
          element: elementName,
          useBeams,
          radius: useBeams ? 0 : radius,
          baseDamage: damage,
          totalHits,
        },
      };
    }
  }

  /**
   * Apply damage to an actor with resistance handling
   */
  private applyDamage(
    hitActor: Actor,
    baseDamage: number,
    element: Element,
    rng: any,
    messages: string[],
    level: ILevel
  ): { damage: number } {
    const isPlayer = hitActor === level.player;
    const targetName = isPlayer ? 'you' : (hitActor as Monster).def?.name ?? 'creature';

    // Apply resistance
    const { damage: finalDamage, status } = hitActor.resistDamage(element, baseDamage, rng);

    // Apply damage
    hitActor.takeDamage(finalDamage);

    if (finalDamage > 0) {
      if (status === 'resists') {
        messages.push(isPlayer ? `You resist. (${finalDamage} damage)` : `The ${targetName} resists. (${finalDamage} damage)`);
      } else if (status === 'immune') {
        messages.push(isPlayer ? `You are unaffected.` : `The ${targetName} is unaffected.`);
      } else {
        messages.push(isPlayer ? `You are hit! (${finalDamage} damage)` : `The ${targetName} is hit! (${finalDamage} damage)`);
      }
    }

    if (hitActor.isDead) {
      if (isPlayer) {
        messages.push('You die...');
      } else {
        messages.push(`The ${targetName} is destroyed!`);
      }
    }

    return { damage: finalDamage };
  }

  /**
   * Trace a beam from origin in the given direction
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

      const tile = level.getTile({ x, y });
      if (!tile || tile.terrain?.flags?.includes('WALL')) {
        break;
      }

      const actor = level.getActorAt({ x, y });
      if (actor) {
        actors.push(actor);
      }
    }

    return actors;
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
