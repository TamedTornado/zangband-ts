/**
 * GPEffect System
 *
 * Data-driven gameplay effect execution for potions, scrolls, wands, etc.
 * Effects are defined on item data in items.json.
 *
 * "GP" prefix distinguishes from visual/sound effects.
 */

// Types and interfaces
export {
  type GPEffect,
  type GPEffectDef,
  type GPEffectContext,
  type GPEffectResult,
  type GPEffectConstructor,
  type EffectResources,
  TargetType,
  combineGPEffectResults,
} from './GPEffect';

// Base classes
export { BaseGPEffect } from './BaseGPEffect';
export { SelfGPEffect } from './SelfGPEffect';
export { ItemTargetGPEffect } from './ItemTargetGPEffect';
export { SymbolTargetGPEffect } from './SymbolTargetGPEffect';
export { DirectionGPEffect } from './DirectionGPEffect';
export { PositionGPEffect } from './PositionGPEffect';

// Concrete effects - Self targeted
export { HealEffect } from './HealEffect';
export { ApplyStatusEffect } from './ApplyStatusEffect';
export { CureEffect } from './CureEffect';
export { ReduceEffect } from './ReduceEffect';
export { TeleportSelfEffect } from './TeleportSelfEffect';

// Concrete effects - Item targeted
export { IdentifyEffect } from './IdentifyEffect';

// Concrete effects - Symbol targeted
export { GenocideEffect } from './GenocideEffect';

// Concrete effects - Area/Detection
export { LightAreaEffect } from './LightAreaEffect';
export { DetectEffect } from './DetectEffect';
export { RestoreStatEffect } from './RestoreStatEffect';

// Concrete effects - Position targeted (bolts, balls, breaths)
export { BoltEffect } from './BoltEffect';
export { BallEffect } from './BallEffect';
export { BreathEffect } from './BreathEffect';
export { DrainLifeEffect } from './DrainLifeEffect';
export { TeleportOtherEffect } from './TeleportOtherEffect';
export { AreaStatusEffect } from './AreaStatusEffect';
export { DispelEffect } from './DispelEffect';
export { StoneToMudEffect } from './StoneToMudEffect';
export { TrapDoorDestructionEffect } from './TrapDoorDestructionEffect';
export { DisarmEffect } from './DisarmEffect';
export { EarthquakeEffect } from './EarthquakeEffect';
export { PolymorphEffect } from './PolymorphEffect';
export { RecallEffect } from './RecallEffect';
export { HealMonsterEffect } from './HealMonsterEffect';
export { HasteMonsterEffect } from './HasteMonsterEffect';
export { CloneMonsterEffect } from './CloneMonsterEffect';
export { TameMonsterEffect } from './TameMonsterEffect';
export { SummonEffect } from './SummonEffect';
export { WonderEffect } from './WonderEffect';
export { HavocEffect } from './HavocEffect';

// Legacy exports for backward compatibility
export {
  type Effect,
  type EffectResult,
  rollDiceExpression,
  executeEffects,
} from './EffectExecutor';

// Effect Manager - central registry and resource provider
export { EffectManager, getEffectManager, setEffectManager } from './EffectManager';

// Import manager for standalone function delegates
import type { GPEffectDef, GPEffectContext, GPEffectResult, GPEffectConstructor, GPEffect } from './GPEffect';
import { TargetType } from './GPEffect';
import { getEffectManager } from './EffectManager';

/**
 * Register a custom effect class
 * @deprecated Use getEffectManager().registerEffect() instead
 */
export function registerGPEffect(type: string, ctor: GPEffectConstructor): void {
  getEffectManager().registerEffect(type, ctor);
}

/**
 * Create a GPEffect instance from a definition
 * @deprecated Use getEffectManager().createEffect() instead
 */
export function createGPEffect(def: GPEffectDef): GPEffect {
  return getEffectManager().createEffect(def);
}

/**
 * Check if any effect in the list requires targeting
 * @deprecated Use getEffectManager().getRequiredTargetType() instead
 */
export function getRequiredTargetType(defs: GPEffectDef[]): TargetType | null {
  return getEffectManager().getRequiredTargetType(defs);
}

/**
 * Execute a list of GPEffects.
 * All effects must be self-targeted or have their targets already set in context.
 * @deprecated Use getEffectManager().executeEffects() instead
 */
export function executeGPEffects(
  defs: GPEffectDef[],
  context: GPEffectContext
): GPEffectResult {
  return getEffectManager().executeEffects(defs, context);
}
