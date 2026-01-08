/**
 * GPEffect - GamePlay Effect System
 *
 * One-shot effects triggered by items, spells, abilities.
 * "GP" prefix distinguishes from visual/sound effects.
 */

import type { RNG } from 'rot-js';
import type { Actor } from '@/core/entities/Actor';
import type { Item } from '@/core/entities/Item';
import type { Monster } from '@/core/entities/Monster';
import type { Level } from '@/core/world/Level';
import type { Position, Direction } from '@/core/types';

/**
 * Info about a monster for damage/effect purposes
 */
export interface MonsterInfo {
  name: string;
  flags: string[];
}

/**
 * Targeting modes for effects
 */
export const TargetType = {
  Self: 'self',
  Item: 'item',
  Symbol: 'symbol',
  Direction: 'direction',
  Position: 'position',
} as const;
export type TargetType = (typeof TargetType)[keyof typeof TargetType];

/**
 * Effect definition from JSON (inline on items)
 */
export interface GPEffectDef {
  /** Effect class to instantiate (registry key) */
  type: string;
  /** Targeting mode - default 'self' */
  target?: TargetType;
  /** Effect-specific parameters */
  [key: string]: unknown;
}

/**
 * Constructor signature for effect classes
 */
export interface GPEffectConstructor {
  new (def: GPEffectDef): GPEffect;
}

/**
 * Context passed to effect execution
 */
export interface GPEffectContext {
  /** The actor using the effect */
  actor: Actor;
  /** Current level for area effects */
  level: Level;
  /** RNG for dice rolls */
  rng: typeof RNG;

  // Targeting results (populated after targeting phase)
  /** Selected inventory item (for target: 'item') */
  targetItem?: Item;
  /** Selected symbol/character (for target: 'symbol') */
  targetSymbol?: string;
  /** Selected direction (for target: 'direction') */
  targetDirection?: Direction;
  /** Selected position (for target: 'position') */
  targetPosition?: Position;
  /** Target actor for effects (resolved from position, defaults to actor for self) */
  targetActor?: Actor;

  // Helper functions (injected by caller)
  /** Get monster info (name, flags) for damage calculations */
  getMonsterInfo?: (monster: Monster) => MonsterInfo;
}

/**
 * Result of effect execution
 */
export interface GPEffectResult {
  /** Whether effect was successfully executed */
  success: boolean;
  /** Messages to display */
  messages: string[];
  /** Whether a game turn was consumed */
  turnConsumed: boolean;

  // Optional detailed results for aggregation
  healed?: number;
  damageDealt?: number;
  statusesApplied?: string[];
  statusesCured?: string[];
  statusesReduced?: string[];
  itemsAffected?: string[];
}

/**
 * Core GPEffect interface - each effect type implements this
 */
export interface GPEffect {
  /** Effect definition from JSON */
  readonly def: GPEffectDef;

  /** What targeting mode this effect requires */
  readonly targetType: TargetType;

  /**
   * Validate if effect can be executed with given context.
   * For targeting effects, checks if required target is present.
   */
  canExecute(context: GPEffectContext): boolean;

  /**
   * Execute the effect. Returns result with messages.
   */
  execute(context: GPEffectContext): GPEffectResult;
}

/**
 * Combine multiple effect results into one
 */
export function combineGPEffectResults(results: GPEffectResult[]): GPEffectResult {
  const healed = results.reduce((sum, r) => sum + (r.healed ?? 0), 0);
  const damageDealt = results.reduce((sum, r) => sum + (r.damageDealt ?? 0), 0);
  const statusesApplied = results.flatMap((r) => r.statusesApplied ?? []);
  const statusesCured = results.flatMap((r) => r.statusesCured ?? []);
  const statusesReduced = results.flatMap((r) => r.statusesReduced ?? []);
  const itemsAffected = results.flatMap((r) => r.itemsAffected ?? []);

  const result: GPEffectResult = {
    success: results.some((r) => r.success),
    messages: results.flatMap((r) => r.messages),
    turnConsumed: results.some((r) => r.turnConsumed),
  };

  if (healed > 0) result.healed = healed;
  if (damageDealt > 0) result.damageDealt = damageDealt;
  if (statusesApplied.length > 0) result.statusesApplied = statusesApplied;
  if (statusesCured.length > 0) result.statusesCured = statusesCured;
  if (statusesReduced.length > 0) result.statusesReduced = statusesReduced;
  if (itemsAffected.length > 0) result.itemsAffected = itemsAffected;

  return result;
}
