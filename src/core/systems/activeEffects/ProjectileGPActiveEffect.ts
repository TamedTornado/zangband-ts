/**
 * ProjectileGPActiveEffect - Moving projectile effect
 *
 * Moves toward a target position, potentially hitting actors on the way.
 * Example: orb of annihilation that slowly seeks a target.
 */

import { BaseGPActiveEffect } from './BaseGPActiveEffect';
import type {
  GPActiveEffectDef,
  GPActiveEffectContext,
  GPActiveEffectTickResult,
} from './GPActiveEffect';
import type { Position } from '@/core/types';
import type { Actor } from '@/core/entities/Actor';

export abstract class ProjectileGPActiveEffect extends BaseGPActiveEffect {
  position: Position;
  target: Position;
  speed: number;
  private _arrived: boolean = false;
  private _hit: boolean = false;

  constructor(def: GPActiveEffectDef, id: string, position: Position, target: Position) {
    super(def, id);
    this.position = { ...position };
    this.target = target;
    this.speed = this.getNumber('speed', 1);
  }

  tick(context: GPActiveEffectContext): GPActiveEffectTickResult {
    // Move toward target
    const arrived = this.moveToward();
    if (arrived) {
      this._arrived = true;
      return this.onArrival(context);
    }

    // Check for collision with actor
    const actor = this.getActorAt(context);
    if (actor) {
      this._hit = true;
      return this.onHit(actor, context);
    }

    return this.tickResult();
  }

  isExpired(): boolean {
    return this._arrived || this._hit;
  }

  /**
   * Move toward target by speed tiles
   * Returns true if arrived at target
   */
  protected moveToward(): boolean {
    const dx = this.target.x - this.position.x;
    const dy = this.target.y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= this.speed) {
      this.position = { ...this.target };
      return true;
    }

    // Normalize and move
    const nx = dx / dist;
    const ny = dy / dist;
    this.position = {
      x: Math.round(this.position.x + nx * this.speed),
      y: Math.round(this.position.y + ny * this.speed),
    };

    return false;
  }

  /**
   * Get actor at current position
   */
  protected getActorAt(context: GPActiveEffectContext): Actor | null {
    const { level } = context;

    // Check for monster
    const monster = level.getMonsterAt(this.position);
    if (monster && !monster.isDead) {
      return monster;
    }

    // Check for player (via tile occupant)
    const tile = level.getTile(this.position);
    if (tile?.occupant && 'stats' in tile.occupant) {
      return tile.occupant;
    }

    return null;
  }

  /**
   * Called when projectile reaches target
   */
  protected abstract onArrival(context: GPActiveEffectContext): GPActiveEffectTickResult;

  /**
   * Called when projectile hits an actor
   */
  protected abstract onHit(actor: Actor, context: GPActiveEffectContext): GPActiveEffectTickResult;
}
