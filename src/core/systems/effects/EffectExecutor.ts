/**
 * EffectExecutor - Data-driven effect system
 *
 * Parses and executes effects from JSON data (potions, scrolls, wands, etc.).
 * Effect types: heal, applyStatus, reduce, cure
 */

import { RNG } from 'rot-js';
import type { Actor } from '@/core/entities/Actor';
import { createStatus } from '@/core/systems/status';
import { Combat } from '@/core/systems/Combat';

/** Effect definition from JSON */
export interface Effect {
  type: string;
  // heal
  amount?: number;
  dice?: string;
  // applyStatus
  status?: string;
  duration?: string | number;
  intensity?: string;
  damage?: number | string;
  // reduce
  // (uses status, amount)
  // GPEffect extensions
  target?: string;
  element?: string;
  radius?: number;
  targetFlag?: string;
  distance?: number;
  [key: string]: unknown;
}

/** Result of executing effects */
export interface EffectResult {
  messages: string[];
  healed?: number;
  statusesApplied?: string[];
  statusesCured?: string[];
  statusesReduced?: string[];
}

/**
 * Parse a dice expression like "15+1d25" or "2d8" into a rolled value.
 * Supports: "N" (constant), "XdY" (dice only), "N+XdY" (base + dice)
 */
export function rollDiceExpression(expr: string, rng: typeof RNG): number {
  // Handle constant
  if (!expr.includes('d')) {
    return parseInt(expr, 10);
  }

  // Handle base + dice: "15+1d25"
  if (expr.includes('+') && expr.indexOf('+') < expr.indexOf('d')) {
    const parts = expr.split('+');
    const base = parseInt(parts[0], 10);
    const dice = Combat.parseDice(parts[1]);
    let total = base;
    for (let i = 0; i < dice.dice; i++) {
      total += rng.getUniformInt(1, dice.sides);
    }
    return total;
  }

  // Handle just dice: "2d8"
  const dice = Combat.parseDice(expr);
  let total = dice.bonus;
  for (let i = 0; i < dice.dice; i++) {
    total += rng.getUniformInt(1, dice.sides);
  }
  return total;
}

/**
 * Execute a list of effects on an actor.
 * Returns messages and summary of what happened.
 */
export function executeEffects(
  effects: Effect[],
  actor: Actor,
  rng: typeof RNG
): EffectResult {
  const result: EffectResult = {
    messages: [],
    statusesApplied: [],
    statusesCured: [],
    statusesReduced: [],
  };

  for (const effect of effects) {
    switch (effect.type) {
      case 'heal':
        executeHeal(effect, actor, rng, result);
        break;
      case 'applyStatus':
        executeApplyStatus(effect, actor, rng, result);
        break;
      case 'reduce':
        executeReduce(effect, actor, result);
        break;
      case 'cure':
        executeCure(effect, actor, result);
        break;
      default:
        result.messages.push(`Unknown effect type: ${effect.type}`);
    }
  }

  return result;
}

function executeHeal(
  effect: Effect,
  actor: Actor,
  rng: typeof RNG,
  result: EffectResult
): void {
  let amount = 0;

  if (effect.amount !== undefined) {
    amount = effect.amount;
  } else if (effect.dice) {
    amount = rollDiceExpression(effect.dice, rng);
  }

  if (amount > 0) {
    const before = actor.hp;
    actor.heal(amount);
    const healed = actor.hp - before;
    result.healed = (result.healed ?? 0) + healed;
    if (healed > 0) {
      result.messages.push(`You feel better. (+${healed} HP)`);
    }
  }
}

function executeApplyStatus(
  effect: Effect,
  actor: Actor,
  rng: typeof RNG,
  result: EffectResult
): void {
  if (!effect.status) return;

  const params: Record<string, number> = {};

  // Parse duration expression (can be string dice expr or number)
  if (effect.duration !== undefined) {
    params['duration'] = typeof effect.duration === 'string'
      ? rollDiceExpression(effect.duration, rng)
      : effect.duration;
  }

  // Parse intensity expression
  if (effect.intensity) {
    params['intensity'] = rollDiceExpression(effect.intensity, rng);
  }

  // Direct damage for poison
  if (effect.damage !== undefined) {
    params['damage'] = typeof effect.damage === 'string'
      ? rollDiceExpression(effect.damage, rng)
      : effect.damage;
  }

  const status = createStatus(effect.status, params);
  const messages = actor.statuses.add(status, actor);
  result.messages.push(...messages);
  result.statusesApplied!.push(effect.status);
}

function executeReduce(
  effect: Effect,
  actor: Actor,
  result: EffectResult
): void {
  if (!effect.status || effect.amount === undefined) return;

  const messages = actor.statuses.reduce(effect.status, effect.amount, actor);
  result.messages.push(...messages);
  result.statusesReduced!.push(effect.status);
}

function executeCure(
  effect: Effect,
  actor: Actor,
  result: EffectResult
): void {
  if (!effect.status) return;

  if (actor.statuses.has(effect.status)) {
    const messages = actor.statuses.cure(effect.status, actor);
    result.messages.push(...messages);
    result.statusesCured!.push(effect.status);
  }
}
