/**
 * AreaGPActiveEffect - Ticking area effect (clouds, pools, grease)
 *
 * Affects all actors within a radius each tick.
 * Example: poison cloud that damages actors in area each turn.
 */

import { BaseGPActiveEffect } from './BaseGPActiveEffect';
import type {
  GPActiveEffectDef,
  GPActiveEffectContext,
  GPActiveEffectTickResult,
} from './GPActiveEffect';
import type { Position } from '@/core/types';
import type { Actor } from '@/core/entities/Actor';

export abstract class AreaGPActiveEffect extends BaseGPActiveEffect {
  position: Position;
  radius: number;
  remaining: number;

  constructor(def: GPActiveEffectDef, id: string, position: Position) {
    super(def, id);
    this.position = position;
    this.radius = this.getNumber('radius', 1);
    this.remaining = this.getNumber('duration', 10);
  }

  tick(context: GPActiveEffectContext): GPActiveEffectTickResult {
    this.remaining--;

    // Find actors in radius
    const actors = this.getActorsInRadius(context);
    if (actors.length === 0) {
      return this.tickResult();
    }

    return this.affectActors(actors, context);
  }

  isExpired(): boolean {
    return this.remaining <= 0;
  }

  /**
   * Get all actors within the effect's radius
   */
  protected getActorsInRadius(context: GPActiveEffectContext): Actor[] {
    const { level } = context;
    const actors: Actor[] = [];

    // Check player
    const player = this.findPlayer(level);
    if (player && this.isInRadius(player.position)) {
      actors.push(player);
    }

    // Check monsters
    for (const monster of level.getMonsters()) {
      if (!monster.isDead && this.isInRadius(monster.position)) {
        actors.push(monster);
      }
    }

    return actors;
  }

  /**
   * Check if a position is within radius
   */
  protected isInRadius(pos: Position): boolean {
    const dx = pos.x - this.position.x;
    const dy = pos.y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= this.radius;
  }

  /**
   * Find the player on the level (hacky but works)
   */
  private findPlayer(level: { width: number; height: number; getTile(pos: Position): { occupant: Actor | null } | undefined }): Actor | null {
    // Search for player by checking tiles - not ideal but works
    for (let x = 0; x < level.width; x++) {
      for (let y = 0; y < level.height; y++) {
        const tile = level.getTile({ x, y });
        if (tile?.occupant && 'stats' in tile.occupant) {
          return tile.occupant;
        }
      }
    }
    return null;
  }

  /**
   * Apply effect to actors in radius
   */
  protected abstract affectActors(actors: Actor[], context: GPActiveEffectContext): GPActiveEffectTickResult;
}
