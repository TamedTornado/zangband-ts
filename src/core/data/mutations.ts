/**
 * Mutation type definitions
 *
 * Mutations are permanent (until removed) modifications to the player.
 * Three categories:
 * - Activatable: Powers the player can trigger manually
 * - Random: Effects that trigger randomly each turn
 * - Passive: Constant stat/ability modifiers
 */

import type { DiceRoll } from '@/core/systems/Combat';
import type { GPEffectDef } from '@/core/systems/effects/GPEffect';

export const MutationCategory = {
  Activatable: 'activatable',
  Random: 'random',
  Passive: 'passive',
} as const;
export type MutationCategory = (typeof MutationCategory)[keyof typeof MutationCategory];

/**
 * Base mutation definition shared by all types
 */
export interface BaseMutationDef {
  category: MutationCategory;
  description: string;
  gainMessage: string;
  loseMessage: string;
  opposites?: string[]; // Keys of mutations that cancel each other
}

/**
 * Activatable mutations - powers the player can trigger manually
 * Uses existing GPEffect system for execution
 */
export interface ActivatableMutationDef extends BaseMutationDef {
  category: 'activatable';
  activeName: string; // Short name for activation menu
  level: number; // Minimum level to use
  cost: number; // Mana cost
  stat: string; // Stat for success check (str, int, wis, dex, con, chr)
  difficulty: number; // Difficulty rating
  effect: GPEffectDef; // The effect to execute
}

/**
 * Random mutations - effects that trigger randomly each turn
 * Processed by MutationSystem.tickRandomMutations()
 */
export interface RandomMutationDef extends BaseMutationDef {
  category: 'random';
  chance: number; // % chance per turn (0-100)
  randomEffect: string; // Effect key or special handler name
  extraAttack?: {
    // For mutations that add attacks (horns, beak, etc.)
    damage: DiceRoll;
    element?: string;
  };
}

/**
 * Passive mutations - constant stat/ability modifiers
 * Applied through MutationSystem.getStatModifiers() etc.
 */
export interface PassiveMutationDef extends BaseMutationDef {
  category: 'passive';
  modifiers?: Record<string, number>; // stat -> bonus
  speedMod?: number;
  acMod?: number;
  stealthMod?: number;
  searchMod?: number;
  infravisionMod?: number;
  flags?: string[]; // Special flags: 'fearless', 'regen', 'telepathy', etc.
}

/**
 * Union type for all mutation definitions
 */
export type MutationDef = ActivatableMutationDef | RandomMutationDef | PassiveMutationDef;

/**
 * Record of mutation key -> definition
 */
export type MutationRecord = Record<string, MutationDef>;

/**
 * Result from gaining a mutation
 */
export interface GainMutationResult {
  gained: boolean;
  key?: string;
  message?: string;
  cancelled?: string[]; // Opposite mutations that were removed
}

/**
 * Result from losing a mutation
 */
export interface LoseMutationResult {
  lost: boolean;
  key?: string;
  message?: string;
}

/**
 * Result from tick processing random mutations
 */
export interface MutationTickResult {
  messages: string[];
  effectsTriggered: string[];
}

/**
 * Result from checking if a mutation can be activated
 */
export interface CanActivateResult {
  canActivate: boolean;
  reason?: string;
}

/**
 * Result from trying to activate a mutation
 */
export interface ActivateMutationResult {
  /** Whether activation was attempted (requirements met) */
  activated: boolean;
  /** Whether the stat check succeeded */
  succeeded?: boolean;
  /** The effect to execute (if activation succeeded) */
  effect?: GPEffectDef;
  /** Message if activation was not attempted */
  reason?: string;
  /** Message if stat check failed */
  failMessage?: string;
}

/**
 * Type guards for mutation categories
 */
export function isActivatable(def: MutationDef): def is ActivatableMutationDef {
  return def.category === 'activatable';
}

export function isRandom(def: MutationDef): def is RandomMutationDef {
  return def.category === 'random';
}

export function isPassive(def: MutationDef): def is PassiveMutationDef {
  return def.category === 'passive';
}
