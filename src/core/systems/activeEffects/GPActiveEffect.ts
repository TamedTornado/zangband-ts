/**
 * GPActiveEffect System
 *
 * Persistent effects that exist in the game world over multiple turns.
 * Examples: poison clouds, slow projectiles, delayed explosions, reactive shields.
 *
 * "GP" prefix distinguishes from visual/sound effects.
 */

import type { RNG } from 'rot-js';
import type { Position } from '@/core/types';
import type { Actor } from '@/core/entities/Actor';
import type { Level } from '@/core/world/Level';
import type { GPEffectDef } from '@/core/systems/effects';

/**
 * Definition for creating an active effect (from JSON)
 */
export interface GPActiveEffectDef {
  type: string;
  [key: string]: unknown;
}

/**
 * Context passed to active effects during tick/trigger
 */
export interface GPActiveEffectContext {
  level: Level;
  rng: typeof RNG;
}

/**
 * Result of ticking an active effect
 */
export interface GPActiveEffectTickResult {
  messages: string[];
  expired?: boolean;
  spawnEffects?: GPEffectDef[];
}

/**
 * Game events that can trigger reactive effects
 */
export interface GameEvent {
  type: string;
  actor?: Actor;
  source?: Actor;
  damage?: number;
  element?: string;
  position?: Position;
  [key: string]: unknown;
}

/**
 * Result of a reactive effect trigger
 */
export interface GPActiveEffectTriggerResult {
  messages: string[];
  prevented?: boolean;
  damageModifier?: number;
}

/**
 * Interface for persistent world effects
 */
export interface GPActiveEffect {
  readonly id: string;
  readonly type: string;
  readonly def: GPActiveEffectDef;

  /** World position for positional effects */
  position?: Position;

  /** Actor this effect is attached to (for reactive effects) */
  attachedTo?: Actor;

  /** Called each game tick */
  tick(context: GPActiveEffectContext): GPActiveEffectTickResult;

  /** Should this effect be removed? */
  isExpired(): boolean;

  /** For reactive effects - check if this event triggers us */
  shouldTrigger?(event: GameEvent): boolean;

  /** Execute reactive effect */
  onTrigger?(event: GameEvent, context: GPActiveEffectContext): GPActiveEffectTriggerResult;
}

/**
 * Constructor type for active effect classes
 */
export type GPActiveEffectConstructor = new (def: GPActiveEffectDef, id: string) => GPActiveEffect;

/**
 * Combine multiple tick results into one
 */
export function combineGPActiveEffectTickResults(
  results: GPActiveEffectTickResult[]
): GPActiveEffectTickResult {
  const combined: GPActiveEffectTickResult = {
    messages: [],
  };

  for (const result of results) {
    combined.messages.push(...result.messages);
    if (result.expired) {
      combined.expired = true;
    }
    if (result.spawnEffects) {
      combined.spawnEffects = [...(combined.spawnEffects ?? []), ...result.spawnEffects];
    }
  }

  return combined;
}
