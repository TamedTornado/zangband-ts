/**
 * PoisonStatus - stacking DOT status
 *
 * Uses params.duration and params.damage from invocation.
 * Multiple poison sources stack as separate instances.
 */

import { RNG } from 'rot-js';
import type { Actor } from '@/core/entities/Actor';
import { type Status, type StatusDef, type StatusParams, type TickResult, getStatusDef } from './Status';

/**
 * Poison status - stacking damage over time
 */
export class PoisonStatus implements Status {
  readonly id: string;
  private readonly def: StatusDef;
  private remaining: number;
  private damage: number;

  constructor(id: string, def: StatusDef, params: StatusParams) {
    this.id = id;
    this.def = def;
    this.remaining = params['duration'] ?? 0;
    this.damage = params['damage'] ?? 0;
  }

  onApply(_actor: Actor): string[] {
    return [];
  }

  onExpire(_actor: Actor): string[] {
    return [];
  }

  tick(actor: Actor, _rng: typeof RNG): TickResult {
    actor.takeDamage(this.damage);
    this.remaining--;

    return {
      messages: [`You take ${this.damage} poison damage.`],
    };
  }

  merge(_incoming: Status): boolean {
    // Don't merge - keep both stacks
    return false;
  }

  isExpired(): boolean {
    return this.remaining <= 0;
  }

  getDef(): StatusDef {
    return this.def;
  }

  get duration(): number {
    return this.remaining;
  }

  get damagePerTick(): number {
    return this.damage;
  }

  reduce(amount: number): number {
    const consumed = Math.min(amount, this.remaining);
    this.remaining -= consumed;
    return consumed;
  }
}

export function createPoisonStatus(duration: number, damage: number): PoisonStatus {
  const def = getStatusDef('poisoned');
  return new PoisonStatus('poisoned', def, { duration, damage });
}
