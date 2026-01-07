/**
 * Status System - OO-encapsulated status effects
 *
 * Each status is an object with private internal state (duration, intensity, etc.)
 * Messages and stat modifiers come from JSON (StatusDef)
 */

import { RNG } from 'rot-js';
import type { Actor } from '@/core/entities/Actor';

/**
 * Known modifier keys for intellisense (but Record allows any key)
 */
export const StatModifierKey = {
  ToHit: 'toHit',
  ToDam: 'toDam',
  MaxHp: 'maxHp',
  Speed: 'speed',
  Ac: 'ac',
} as const;

/**
 * Known flag names for behavioral effects (stored as booleans in status data).
 * Use StatusManager.hasFlag() to check if actor has any status with a flag.
 * Resistances use grantsResist in data and StatusManager.hasResist().
 */
export const StatusFlag = {
  CantSee: 'cantSee',           // Blind - affects FOV
  RandomMovement: 'randomMove', // Confused - random direction
  CantAttack: 'cantAttack',     // Afraid - prevents melee
  CantAct: 'cantAct',           // Paralyzed/Knocked out
  ScrambleDisplay: 'scramble',  // Hallucinating - display effects
  Invulnerable: 'invuln',       // Immune to damage
  ProtectEvil: 'protEvil',      // Deflects evil creatures
  SeeInvisible: 'seeInvis',
  Infravision: 'infra',
} as const;

/** Primitive values allowed in status data */
type StatusDataValue = string | number | boolean;

/** Severity level for accumulating statuses (cut, stun) */
export interface SeverityLevel {
  message: string;
  damage?: number;
  toHit?: number;
  toDam?: number;
  cantAct?: boolean;
}

/** Status data can contain primitives or severity thresholds */
export type StatusData = Record<string, StatusDataValue | Record<string, SeverityLevel>>;

/**
 * JSON definition for a status effect
 */
export interface StatusDef {
  /** Status class to instantiate (looked up in registry) */
  type: string;
  name: string;
  messages: {
    apply: string;
    expire: string;
    refresh?: string;
  };
  /** All status-specific data - modifiers, flags, thresholds, etc. */
  data?: StatusData;
}

/**
 * Parameters passed when creating a status (from the source: spell, item, attack)
 */
export type StatusParams = Record<string, number>;

/**
 * Constructor signature for status classes
 */
export interface StatusConstructor {
  new (id: string, def: StatusDef, params: StatusParams): Status;
}

/**
 * Result of a status tick
 */
export interface TickResult {
  /** Messages to display (damage taken, severity change, etc.) */
  messages: string[];
}

/**
 * Core status interface - each status type implements this
 */
export interface Status {
  /** Status identifier, e.g. 'cut', 'heroism', 'poisoned' */
  readonly id: string;

  /**
   * Called when status is first applied to an actor.
   * Use for one-time effects like granting temporary HP.
   * @param actor The actor this status is being applied to
   * @returns Messages to display
   */
  onApply(actor: Actor): string[];

  /**
   * Called when status expires or is dispelled.
   * Use for cleanup like removing temporary HP.
   * @param actor The actor this status is being removed from
   * @returns Messages to display
   */
  onExpire(actor: Actor): string[];

  /**
   * Called each turn. Status handles its own expiration internally.
   * @param actor The actor this status is on
   * @param rng Random number generator for any chance-based effects
   * @returns Messages to display
   */
  tick(actor: Actor, rng: typeof RNG): TickResult;

  /**
   * Called when same status type is applied again.
   * StatusManager guarantees incoming.id === this.id, so implementations can safely cast.
   * @param incoming The new status being applied
   * @returns true if absorbed (merged), false to keep both as separate instances
   */
  merge(incoming: Status): boolean;

  /**
   * Returns true when status should be removed
   */
  isExpired(): boolean;

  /**
   * Get the JSON definition for messages/modifiers
   */
  getDef(): StatusDef;

  /**
   * Reduce this status by amount (for healing/curing effects).
   * Optional - not all statuses support reduction.
   * @param amount Amount to reduce by
   * @returns Amount actually consumed (may be less if status is weaker)
   */
  reduce?(amount: number): number;
}

/**
 * Registry of status definitions loaded from JSON
 */
let statusDefs: Record<string, StatusDef> = {};

/**
 * Load status definitions from JSON data
 */
export function loadStatusDefs(defs: Record<string, StatusDef>): void {
  statusDefs = defs;
}

/**
 * Get a status definition by id
 */
export function getStatusDef(id: string): StatusDef {
  const def = statusDefs[id];
  if (!def) {
    throw new Error(`Unknown status: ${id}`);
  }
  return def;
}

/**
 * Check if a status definition exists
 */
export function hasStatusDef(id: string): boolean {
  return id in statusDefs;
}
