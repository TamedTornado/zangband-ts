/**
 * GPActiveEffect System
 *
 * Persistent effects that exist in the game world over multiple turns.
 * Examples: poison clouds, slow projectiles, delayed explosions, reactive shields.
 *
 * "GP" prefix distinguishes from visual/sound effects.
 */

// Types and interfaces
export {
  type GPActiveEffect,
  type GPActiveEffectDef,
  type GPActiveEffectContext,
  type GPActiveEffectTickResult,
  type GPActiveEffectTriggerResult,
  type GPActiveEffectConstructor,
  type GameEvent,
  combineGPActiveEffectTickResults,
} from './GPActiveEffect';

// Base classes
export { BaseGPActiveEffect } from './BaseGPActiveEffect';
export { AreaGPActiveEffect } from './AreaGPActiveEffect';
export { ProjectileGPActiveEffect } from './ProjectileGPActiveEffect';
export { DelayedGPActiveEffect } from './DelayedGPActiveEffect';
export { ReactiveGPActiveEffect } from './ReactiveGPActiveEffect';

// Registry and factory
import type {
  GPActiveEffect,
  GPActiveEffectDef,
  GPActiveEffectConstructor,
  GPActiveEffectContext,
  GPActiveEffectTickResult,
} from './GPActiveEffect';
import type { Position } from '@/core/types';
import type { Actor } from '@/core/entities/Actor';

/**
 * Registry mapping active effect type names to constructors
 */
const gpActiveEffectRegistry: Record<string, GPActiveEffectConstructor> = {
  // Concrete implementations will be registered here
};

/**
 * Register a custom active effect class
 */
export function registerGPActiveEffect(type: string, ctor: GPActiveEffectConstructor): void {
  gpActiveEffectRegistry[type] = ctor;
}

/**
 * Generate a unique ID for an active effect
 */
let activeEffectIdCounter = 0;
export function generateActiveEffectId(): string {
  return `ae_${++activeEffectIdCounter}_${Date.now().toString(36)}`;
}

/**
 * Create a GPActiveEffect instance from a definition
 */
export function createGPActiveEffect(
  def: GPActiveEffectDef,
  options: { position?: Position; attachedTo?: Actor } = {}
): GPActiveEffect {
  const EffectClass = gpActiveEffectRegistry[def.type];
  if (!EffectClass) {
    throw new Error(`Unknown GPActiveEffect type: ${def.type}`);
  }

  const id = generateActiveEffectId();
  const effect = new EffectClass(def, id);

  if (options.position) {
    effect.position = options.position;
  }
  if (options.attachedTo) {
    effect.attachedTo = options.attachedTo;
  }

  return effect;
}

/**
 * Tick all active effects and return combined results
 */
export function tickGPActiveEffects(
  effects: GPActiveEffect[],
  context: GPActiveEffectContext
): GPActiveEffectTickResult[] {
  return effects.map((effect) => effect.tick(context));
}

/**
 * Filter out expired effects
 */
export function removeExpiredGPActiveEffects(effects: GPActiveEffect[]): GPActiveEffect[] {
  return effects.filter((effect) => !effect.isExpired());
}
