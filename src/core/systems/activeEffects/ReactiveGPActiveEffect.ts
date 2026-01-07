/**
 * ReactiveGPActiveEffect - Reactive effect attached to an actor
 *
 * Triggers in response to game events (damage taken, attacks made, etc).
 * Example: damage shield that reduces incoming damage, thorns that damage attackers.
 */

import { BaseGPActiveEffect } from './BaseGPActiveEffect';
import type {
  GPActiveEffectDef,
  GPActiveEffectContext,
  GPActiveEffectTickResult,
  GameEvent,
  GPActiveEffectTriggerResult,
} from './GPActiveEffect';
import type { Actor } from '@/core/entities/Actor';

export abstract class ReactiveGPActiveEffect extends BaseGPActiveEffect {
  attachedTo: Actor;
  remaining: number;

  constructor(def: GPActiveEffectDef, id: string, attachedTo: Actor) {
    super(def, id);
    this.attachedTo = attachedTo;
    this.remaining = this.getNumber('duration', 10);
  }

  tick(_context: GPActiveEffectContext): GPActiveEffectTickResult {
    this.remaining--;
    return this.tickResult();
  }

  isExpired(): boolean {
    return this.remaining <= 0 || this.attachedTo.isDead;
  }

  /**
   * Check if a game event should trigger this effect
   */
  abstract shouldTrigger(event: GameEvent): boolean;

  /**
   * Handle the triggering event
   */
  abstract onTrigger(event: GameEvent, context: GPActiveEffectContext): GPActiveEffectTriggerResult;

  /**
   * Helper to create a trigger result
   */
  protected triggerResult(
    messages: string[] = [],
    extra?: Partial<GPActiveEffectTriggerResult>
  ): GPActiveEffectTriggerResult {
    return {
      messages,
      ...extra,
    };
  }
}
