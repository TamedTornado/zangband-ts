/**
 * EffectManager - Central manager for GPEffect creation and execution
 *
 * Holds references to shared resources (MonsterDataManager, etc.) and
 * provides them to effects without explicit injection in every context.
 */

import type { GPEffect, GPEffectDef, GPEffectContext, GPEffectResult, GPEffectConstructor, EffectResources } from './GPEffect';
import { combineGPEffectResults, TargetType } from './GPEffect';
import type { MonsterDataManager } from '@/core/data/MonsterDataManager';

// Effect class imports
import { HealEffect } from './HealEffect';
import { ApplyStatusEffect } from './ApplyStatusEffect';
import { CureEffect } from './CureEffect';
import { ReduceEffect } from './ReduceEffect';
import { TeleportSelfEffect } from './TeleportSelfEffect';
import { IdentifyEffect } from './IdentifyEffect';
import { EnchantWeaponEffect, EnchantArmorEffect } from './EnchantEffect';
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
import { PolymorphEffect } from './PolymorphEffect';
import { RecallEffect } from './RecallEffect';
import { HealMonsterEffect } from './HealMonsterEffect';
import { HasteMonsterEffect } from './HasteMonsterEffect';
import { CloneMonsterEffect } from './CloneMonsterEffect';
import { TameMonsterEffect } from './TameMonsterEffect';
import { SummonEffect } from './SummonEffect';
import { WonderEffect } from './WonderEffect';
import { HavocEffect } from './HavocEffect';
import { RemoveCurseEffect } from './RemoveCurseEffect';
import { GlyphEffect } from './GlyphEffect';
import { MappingEffect } from './MappingEffect';
import { BrandWeaponEffect } from './BrandWeaponEffect';
import { TeleportLevelEffect } from './TeleportLevelEffect';
import { WizLiteEffect } from './WizLiteEffect';
import { RestoreLevelEffect } from './RestoreLevelEffect';
import { FetchEffect } from './FetchEffect';
import { RechargeEffect } from './RechargeEffect';
import { BeamEffect } from './BeamEffect';
import { RestoreStatsEffect } from './RestoreStatsEffect';
import { SatisfyHungerEffect } from './SatisfyHungerEffect';
import { TeleportEffect } from './TeleportEffect';
import { DimensionDoorEffect } from './DimensionDoorEffect';
import { MassGenocideEffect } from './MassGenocideEffect';
import { DeathRayEffect } from './DeathRayEffect';
import { WordOfDeathEffect } from './WordOfDeathEffect';
import { OmnicideEffect } from './OmnicideEffect';
import { BanishEvilEffect } from './BanishEvilEffect';
import { PhlogistonEffect } from './PhlogistonEffect';
import { CharmMonstersEffect } from './CharmMonstersEffect';
import { CharmAnimalsEffect } from './CharmAnimalsEffect';
import { StasisEffect } from './StasisEffect';
import { MassTeleportEffect } from './MassTeleportEffect';
import { SelfKnowledgeEffect } from './SelfKnowledgeEffect';
import { WhirlwindAttackEffect } from './WhirlwindAttackEffect';
import { AlterRealityEffect } from './AlterRealityEffect';
import { LivingTrumpEffect } from './LivingTrumpEffect';
import { EsoteriaEffect } from './EsoteriaEffect';
import { GlyphAreaEffect } from './GlyphAreaEffect';
import { ExplosiveRuneEffect } from './ExplosiveRuneEffect';
import { CreateDoorEffect } from './CreateDoorEffect';
import { CreateStairsEffect } from './CreateStairsEffect';
import { CreateWallsEffect } from './CreateWallsEffect';
import { AlchemyEffect } from './AlchemyEffect';
import { BlessWeaponEffect } from './BlessWeaponEffect';
import { ChainLightningEffect } from './ChainLightningEffect';
import { PolymorphSelfEffect } from './PolymorphSelfEffect';

/**
 * Default effect registry
 */
const defaultRegistry: Record<string, GPEffectConstructor> = {
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
  enchantWeapon: EnchantWeaponEffect,
  enchantArmor: EnchantArmorEffect,
  // Symbol targeted
  genocide: GenocideEffect,
  // Mass genocide (kills all nearby non-unique monsters)
  massGenocide: MassGenocideEffect,
  // Death ray (instant death bolt with special resistance)
  deathRay: DeathRayEffect,
  // Word of Death (dispel living monsters)
  wordOfDeath: WordOfDeathEffect,
  // Death Dealing (same as wordOfDeath - dispel living)
  deathDealing: WordOfDeathEffect,
  // Omnicide (kill all non-unique monsters on level)
  omnicide: OmnicideEffect,
  // Banish Evil (teleport evil monsters away)
  banishEvil: BanishEvilEffect,
  // Phlogiston (refuel torch/lantern)
  phlogiston: PhlogistonEffect,
  // Charm Monsters (charm all in sight)
  charmMonsters: CharmMonstersEffect,
  // Charm Animals (charm animals in sight)
  charmAnimals: CharmAnimalsEffect,
  // Stasis (put all monsters in sight into deep sleep)
  stasis: StasisEffect,
  // Mass Teleport (teleport all monsters away)
  massTeleport: MassTeleportEffect,
  // Self Knowledge (display player information)
  selfKnowledge: SelfKnowledgeEffect,
  // Whirlwind Attack (attack all adjacent monsters)
  whirlwindAttack: WhirlwindAttackEffect,
  // Alter Reality (regenerate dungeon level)
  alterReality: AlterRealityEffect,
  // Living Trump (grant trump mutation)
  livingTrump: LivingTrumpEffect,
  // Esoteria (death realm identify with level-based full identify chance)
  esoteria: EsoteriaEffect,
  // Glyph Area (Warding True - place glyphs in 3x3 area)
  glyphArea: GlyphAreaEffect,
  // Explosive Rune (place exploding trap)
  explosiveRune: ExplosiveRuneEffect,
  // Terrain creation effects
  createDoor: CreateDoorEffect,
  createStairs: CreateStairsEffect,
  createWalls: CreateWallsEffect,
  // Alchemy (convert item to gold)
  alchemy: AlchemyEffect,
  // Bless weapon (remove curse, add blessed flag)
  blessWeapon: BlessWeaponEffect,
  // Chain Lightning (beams in all 8 directions)
  chainLightning: ChainLightningEffect,
  // Polymorph Self (random transformation)
  polymorphSelf: PolymorphSelfEffect,
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
  // Transformation effects
  polymorph: PolymorphEffect,
  polymorphMonster: PolymorphEffect, // alias for spell data
  // Special effects
  recall: RecallEffect,
  // Cursed monster effects
  healMonster: HealMonsterEffect,
  hasteMonster: HasteMonsterEffect,
  cloneMonster: CloneMonsterEffect,
  // Monster charm effects
  tameMonster: TameMonsterEffect,
  // Summoning effects
  summon: SummonEffect,
  // Random effects
  wonder: WonderEffect,
  // Chaos effects
  havoc: HavocEffect,
  // Curse/protection effects
  removeCurse: RemoveCurseEffect,
  glyph: GlyphEffect,
  // Detection/utility effects
  mapping: MappingEffect,
  // Weapon branding effects
  brandWeapon: BrandWeaponEffect,
  // Level transition effects
  teleportLevel: TeleportLevelEffect,
  // Enlightenment effects
  wizLite: WizLiteEffect,
  // Experience restoration
  restoreLevel: RestoreLevelEffect,
  // Telekinesis
  fetch: FetchEffect,
  // Device recharging
  recharge: RechargeEffect,
  // Beam effects (pierce through targets)
  beam: BeamEffect,
  // Restore all stats at once
  restoreStats: RestoreStatsEffect,
  // Satisfy hunger (fill stomach)
  satisfyHunger: SatisfyHungerEffect,
  // Teleport self with formula-based distance
  teleport: TeleportEffect,
  // Dimension door - controlled teleport to chosen position
  dimensionDoor: DimensionDoorEffect,
};

export class EffectManager {
  private registry: Record<string, GPEffectConstructor>;
  private _monsterDataManager: MonsterDataManager | null = null;

  constructor() {
    // Copy default registry
    this.registry = { ...defaultRegistry };
  }

  /**
   * Set the monster data manager (called during game initialization)
   */
  setMonsterDataManager(manager: MonsterDataManager): void {
    this._monsterDataManager = manager;
  }

  /**
   * Get the monster data manager (for effects that need it)
   */
  get monsterDataManager(): MonsterDataManager | null {
    return this._monsterDataManager;
  }

  /**
   * Get the resources object for effects
   */
  get resources(): EffectResources {
    return {
      monsterDataManager: this._monsterDataManager,
    };
  }

  /**
   * Register a custom effect class
   */
  registerEffect(type: string, ctor: GPEffectConstructor): void {
    this.registry[type] = ctor;
  }

  /**
   * Create a GPEffect instance from a definition
   */
  createEffect(def: GPEffectDef): GPEffect {
    const EffectClass = this.registry[def.type];
    if (!EffectClass) {
      throw new Error(`Unknown GPEffect type: ${def.type}`);
    }
    const effect = new EffectClass(def);
    effect.resources = this.resources;
    return effect;
  }

  /**
   * Check if any effect in the list requires targeting
   */
  getRequiredTargetType(defs: GPEffectDef[]): TargetType | null {
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
  executeEffects(defs: GPEffectDef[], context: GPEffectContext): GPEffectResult {
    const results: GPEffectResult[] = [];

    // Inject createEffect into context for compound effects (Wonder, Havoc)
    const contextWithFactory: GPEffectContext = {
      ...context,
      createEffect: (def: GPEffectDef) => this.createEffect(def),
    };

    for (const def of defs) {
      const effect = this.createEffect(def);

      if (!effect.canExecute(contextWithFactory)) {
        results.push({
          success: false,
          messages: [`Effect ${def.type} cannot execute - missing target`],
          turnConsumed: false,
        });
        continue;
      }

      results.push(effect.execute(contextWithFactory));
    }

    return combineGPEffectResults(results);
  }
}

// Singleton instance for global access
let globalEffectManager: EffectManager | null = null;

/**
 * Get the global effect manager instance
 */
export function getEffectManager(): EffectManager {
  if (!globalEffectManager) {
    globalEffectManager = new EffectManager();
  }
  return globalEffectManager;
}

/**
 * Set a custom effect manager (for testing)
 */
export function setEffectManager(manager: EffectManager | null): void {
  globalEffectManager = manager;
}
