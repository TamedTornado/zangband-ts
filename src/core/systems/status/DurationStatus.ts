/**
 * DurationStatus - generic duration-based status
 *
 * Most statuses just count down and refresh duration on reapply.
 * Reads modifiers/flags from def.data, duration from params.
 */

import { RNG } from 'rot-js';
import type { Actor } from '@/core/entities/Actor';
import { type Status, type StatusDef, type StatusParams, type TickResult, getStatusDef } from './Status';

/**
 * Generic duration-based status.
 * Counts down each turn, refreshes to max duration on merge.
 */
export class DurationStatus implements Status {
  readonly id: string;
  protected readonly def: StatusDef;
  protected remaining: number;

  constructor(id: string, def: StatusDef, params: StatusParams) {
    this.id = id;
    this.def = def;
    this.remaining = params['duration'] ?? 0;
  }

  onApply(_actor: Actor): string[] {
    return [];
  }

  onExpire(_actor: Actor): string[] {
    return [];
  }

  tick(_actor: Actor, _rng: typeof RNG): TickResult {
    this.remaining--;
    return { messages: [] };
  }

  merge(incoming: Status): boolean {
    const other = incoming as DurationStatus;
    this.remaining = Math.max(this.remaining, other.remaining);
    return true;
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

  reduce(amount: number): number {
    const consumed = Math.min(amount, this.remaining);
    this.remaining -= consumed;
    return consumed;
  }
}

/**
 * Factory function for backwards compatibility
 */
export function createDurationStatus(id: string, duration: number): DurationStatus {
  const def = getStatusDef(id);
  return new DurationStatus(id, def, { duration });
}
