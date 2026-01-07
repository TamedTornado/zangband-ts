/**
 * BaseGPActiveEffect - Abstract base class for active effects
 *
 * Provides common functionality for all active effect types.
 */

import type {
  GPActiveEffect,
  GPActiveEffectDef,
  GPActiveEffectContext,
  GPActiveEffectTickResult,
  GameEvent,
  GPActiveEffectTriggerResult,
} from './GPActiveEffect';
import type { Position } from '@/core/types';
import type { Actor } from '@/core/entities/Actor';

export abstract class BaseGPActiveEffect implements GPActiveEffect {
  readonly id: string;
  readonly def: GPActiveEffectDef;
  position?: Position;
  attachedTo?: Actor;

  constructor(def: GPActiveEffectDef, id: string) {
    this.def = def;
    this.id = id;
  }

  get type(): string {
    return this.def.type;
  }

  abstract tick(context: GPActiveEffectContext): GPActiveEffectTickResult;
  abstract isExpired(): boolean;

  shouldTrigger?(_event: GameEvent): boolean;
  onTrigger?(_event: GameEvent, _context: GPActiveEffectContext): GPActiveEffectTriggerResult;

  /**
   * Helper to get a string parameter from the definition
   */
  protected getString(key: string, defaultValue: string = ''): string {
    const value = this.def[key];
    return typeof value === 'string' ? value : defaultValue;
  }

  /**
   * Helper to get a number parameter from the definition
   */
  protected getNumber(key: string, defaultValue: number = 0): number {
    const value = this.def[key];
    return typeof value === 'number' ? value : defaultValue;
  }

  /**
   * Helper for creating tick results
   */
  protected tickResult(messages: string[] = [], extra?: Partial<GPActiveEffectTickResult>): GPActiveEffectTickResult {
    return {
      messages,
      ...extra,
    };
  }
}
