/**
 * Dice utilities for effect calculations
 */

import { RNG } from 'rot-js';
import { Combat } from '@/core/systems/Combat';

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
