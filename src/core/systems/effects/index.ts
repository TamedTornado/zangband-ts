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

// Legacy exports for backward compatibility
export {
  type Effect,
  type EffectResult,
  rollDiceExpression,
  executeEffects,
} from './EffectExecutor';

// Registry and factory
import type { GPEffect, GPEffectDef, GPEffectConstructor, GPEffectContext, GPEffectResult } from './GPEffect';
import { TargetType, combineGPEffectResults } from './GPEffect';
import { HealEffect } from './HealEffect';
import { ApplyStatusEffect } from './ApplyStatusEffect';
import { CureEffect } from './CureEffect';
import { ReduceEffect } from './ReduceEffect';
import { TeleportSelfEffect } from './TeleportSelfEffect';
import { IdentifyEffect } from './IdentifyEffect';
import { GenocideEffect } from './GenocideEffect';
import { LightAreaEffect } from './LightAreaEffect';
import { DetectEffect } from './DetectEffect';
import { RestoreStatEffect } from './RestoreStatEffect';
import { BoltEffect } from './BoltEffect';
import { BallEffect } from './BallEffect';
import { BreathEffect } from './BreathEffect';
import { DrainLifeEffect } from './DrainLifeEffect';
import { TeleportOtherEffect } from './TeleportOtherEffect';
import { AreaStatusEffect } from './AreaStatusEffect';
import { DispelEffect } from './DispelEffect';
import { StoneToMudEffect } from './StoneToMudEffect';
import { TrapDoorDestructionEffect } from './TrapDoorDestructionEffect';
import { DisarmEffect } from './DisarmEffect';
import { EarthquakeEffect } from './EarthquakeEffect';

/**
 * Registry mapping effect type names to constructors
 */
const gpEffectRegistry: Record<string, GPEffectConstructor> = {
  // Self targeted
  heal: HealEffect,
  applyStatus: ApplyStatusEffect,
  cure: CureEffect,
  reduce: ReduceEffect,
  teleportSelf: TeleportSelfEffect,
  restoreStat: RestoreStatEffect,
  // Area effects
  lightArea: LightAreaEffect,
  detect: DetectEffect,
  // Item targeted
  identify: IdentifyEffect,
  // Symbol targeted
  genocide: GenocideEffect,
  // Position targeted
  bolt: BoltEffect,
  ball: BallEffect,
  breath: BreathEffect,
  drainLife: DrainLifeEffect,
  teleportOther: TeleportOtherEffect,
  // Area effects
  areaStatus: AreaStatusEffect,
  dispel: DispelEffect,
  // Terrain effects
  stoneToMud: StoneToMudEffect,
  trapDoorDestruction: TrapDoorDestructionEffect,
  disarm: DisarmEffect,
  earthquake: EarthquakeEffect,
};

/**
 * Register a custom effect class
 */
export function registerGPEffect(type: string, ctor: GPEffectConstructor): void {
  gpEffectRegistry[type] = ctor;
}

/**
 * Create a GPEffect instance from a definition
 */
export function createGPEffect(def: GPEffectDef): GPEffect {
  const EffectClass = gpEffectRegistry[def.type];
  if (!EffectClass) {
    throw new Error(`Unknown GPEffect type: ${def.type}`);
  }
  return new EffectClass(def);
}

/**
 * Check if any effect in the list requires targeting
 */
export function getRequiredTargetType(defs: GPEffectDef[]): TargetType | null {
  for (const def of defs) {
    const target = (def.target ?? TargetType.Self) as TargetType;
    if (target !== TargetType.Self) {
      return target;
    }
  }
  return null;
}

/**
 * Execute a list of GPEffects.
 * All effects must be self-targeted or have their targets already set in context.
 */
export function executeGPEffects(
  defs: GPEffectDef[],
  context: GPEffectContext
): GPEffectResult {
  const results: GPEffectResult[] = [];

  for (const def of defs) {
    const effect = createGPEffect(def);

    if (!effect.canExecute(context)) {
      // Effect requires targeting that isn't set
      results.push({
        success: false,
        messages: [`Effect ${def.type} cannot execute - missing target`],
        turnConsumed: false,
      });
      continue;
    }

    results.push(effect.execute(context));
  }

  return combineGPEffectResults(results);
}
