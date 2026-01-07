/**
 * PotionEffects - Load and lookup potion effects by sval
 */

import type { Effect } from './EffectExecutor';
import potionsData from '@/data/potions.json';

interface PotionDef {
  name: string;
  effects: Effect[];
}

const potionRegistry: Record<string, PotionDef> = {};

/**
 * Load potion definitions from JSON.
 * Called once at startup.
 */
export function loadPotionDefs(data: Record<string, PotionDef>): void {
  Object.keys(potionRegistry).forEach(key => delete potionRegistry[key]);
  Object.assign(potionRegistry, data);
}

/**
 * Get potion effects by sval.
 * Returns undefined if no effects defined for this sval.
 */
export function getPotionEffects(sval: number): Effect[] | undefined {
  const def = potionRegistry[String(sval)];
  return def?.effects;
}

/**
 * Get potion definition by sval.
 */
export function getPotionDef(sval: number): PotionDef | undefined {
  return potionRegistry[String(sval)];
}

/**
 * Check if potion has defined effects.
 */
export function hasPotionEffects(sval: number): boolean {
  return String(sval) in potionRegistry;
}

// Auto-load on import
loadPotionDefs(potionsData as Record<string, PotionDef>);
