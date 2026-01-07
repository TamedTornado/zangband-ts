/**
 * DelayedGPActiveEffect - Countdown trigger effect
 *
 * Triggers an effect when countdown reaches zero.
 * Example: delayed fireball that explodes after 3 turns.
 */

import { BaseGPActiveEffect } from './BaseGPActiveEffect';
import type {
  GPActiveEffectDef,
  GPActiveEffectContext,
  GPActiveEffectTickResult,
} from './GPActiveEffect';
import type { Position } from '@/core/types';

export abstract class DelayedGPActiveEffect extends BaseGPActiveEffect {
  position: Position;
  countdown: number;
  private _triggered: boolean = false;

  constructor(def: GPActiveEffectDef, id: string, position: Position) {
    super(def, id);
    this.position = position;
    this.countdown = this.getNumber('countdown', 3);
  }

  tick(context: GPActiveEffectContext): GPActiveEffectTickResult {
    this.countdown--;

    if (this.countdown <= 0) {
      this._triggered = true;
      return this.onCountdownComplete(context);
    }

    // Optionally show countdown message
    if (this.shouldShowCountdown()) {
      return this.tickResult([`The ${this.getEffectName()} will trigger in ${this.countdown} turns...`]);
    }

    return this.tickResult();
  }

  isExpired(): boolean {
    return this._triggered;
  }

  /**
   * Whether to show countdown messages
   */
  protected shouldShowCountdown(): boolean {
    return this.countdown <= 3;
  }

  /**
   * Get a name for this effect for messages
   */
  protected getEffectName(): string {
    return this.getString('name', 'effect');
  }

  /**
   * Called when countdown reaches zero
   */
  protected abstract onCountdownComplete(context: GPActiveEffectContext): GPActiveEffectTickResult;
}
