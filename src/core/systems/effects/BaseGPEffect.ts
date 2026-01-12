/**
 * BaseGPEffect - Abstract base class for all gameplay effects
 */

import {
  type GPEffect,
  type GPEffectDef,
  type GPEffectContext,
  type GPEffectResult,
  type EffectResources,
  TargetType,
} from './GPEffect';

/**
 * Abstract base for all GPEffects.
 * Provides common functionality and helper methods.
 */
export abstract class BaseGPEffect implements GPEffect {
  readonly def: GPEffectDef;
  resources: EffectResources | null = null;

  constructor(def: GPEffectDef) {
    this.def = def;
  }

  get targetType(): TargetType {
    return (this.def.target ?? TargetType.Self) as TargetType;
  }

  abstract canExecute(context: GPEffectContext): boolean;
  abstract execute(context: GPEffectContext): GPEffectResult;

  /** Helper: create a success result */
  protected success(messages: string[], extra?: Partial<GPEffectResult>): GPEffectResult {
    return {
      success: true,
      messages,
      turnConsumed: true,
      ...extra,
    };
  }

  /** Helper: create a failure result (no turn consumed) */
  protected fail(message: string): GPEffectResult {
    return {
      success: false,
      messages: [message],
      turnConsumed: false,
    };
  }

  /** Helper: create a "nothing happened" result (turn consumed but no effect) */
  protected noEffect(message: string = 'Nothing happens.'): GPEffectResult {
    return {
      success: true,
      messages: [message],
      turnConsumed: true,
    };
  }

  /** Helper: get a string param from def */
  protected getString(key: string, defaultValue: string = ''): string {
    const value = this.def[key];
    return typeof value === 'string' ? value : defaultValue;
  }

  /** Helper: get a number param from def */
  protected getNumber(key: string, defaultValue: number = 0): number {
    const value = this.def[key];
    return typeof value === 'number' ? value : defaultValue;
  }

  /** Helper: get a boolean param from def */
  protected getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = this.def[key];
    return typeof value === 'boolean' ? value : defaultValue;
  }
}
