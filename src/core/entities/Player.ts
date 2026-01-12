import { Actor } from './Actor';
import type { Item } from './Item';
import type { ILevel } from '../world/Level';
import type { ItemGeneration } from '../systems/ItemGeneration';
import { type Position, type Direction, type Element, movePosition } from '../types';
import type { ClassDef } from '../data/classes';
import type { RaceDef } from '../data/races';
import type { CharacterCreationData } from '../data/characterCreation';
import { calculateStartingHP } from '../systems/StatRoller';
import racesData from '@/data/races/races.json';
import classesData from '@/data/classes/classes.json';
import {
  adjIntDev,
  adjWisSav,
  adjDexDis,
  adjIntDis,
  adjStrDig,
} from '../systems/StatTables';
import { getPlayerResistLevel, applyPlayerResistance } from '../systems/Damage';
import type { RNG } from 'rot-js';
import tables from '@/data/meta/tables.json';
import type { MutationSystem } from '../systems/MutationSystem';

export interface Stats {
  str: number;
  int: number;
  wis: number;
  dex: number;
  con: number;
  chr: number;
}

/** Food/hunger thresholds from Zangband */
export const FoodLevel = {
  MAX: 15000,    // Gorged/Bloated
  FULL: 10000,   // Full
  ALERT: 2000,   // Hungry
  WEAK: 1000,    // Weak
  FAINT: 500,    // Fainting
  STARVE: 100,   // Starving
} as const;

/** Hunger status levels */
export const HungerStatus = {
  Gorged: 'gorged',
  Full: 'full',
  Normal: 'normal',
  Hungry: 'hungry',
  Weak: 'weak',
  Faint: 'faint',
} as const;
export type HungerStatus = (typeof HungerStatus)[keyof typeof HungerStatus];

/**
 * Player skills - derived from class, race, level, and stats.
 * These affect various game mechanics like combat and magic device use.
 */
export interface Skills {
  disarming: number;   // Disarming traps
  device: number;      // Using magic devices (wands/rods/staves)
  saving: number;      // Saving throws vs magic
  stealth: number;     // Avoiding monster detection
  searching: number;   // Finding hidden things (frequency)
  perception: number;  // Sensing/awareness ability
  melee: number;       // Melee combat (to-hit)
  ranged: number;      // Ranged combat (to-hit with bows)
  throwing: number;    // Throwing items (to-hit)
  digging: number;     // Digging through walls
}

/** Equipment slot names */
export type EquipmentSlot =
  | 'weapon'
  | 'bow'
  | 'armor'
  | 'cloak'
  | 'shield'
  | 'helmet'
  | 'gloves'
  | 'boots'
  | 'ring1'
  | 'ring2'
  | 'amulet'
  | 'light';

/** Item types for equipment slots */
const SLOT_TYPES: Record<EquipmentSlot, string[]> = {
  weapon: ['digging', 'hafted', 'polearm', 'sword'],
  bow: ['bow'],
  armor: ['soft_armor', 'hard_armor', 'dragon_armor'],
  cloak: ['cloak'],
  shield: ['shield'],
  helmet: ['helm', 'crown'],
  gloves: ['gloves'],
  boots: ['boots'],
  ring1: ['ring'],
  ring2: ['ring'],
  amulet: ['amulet'],
  light: ['light'],
};

export interface PlayerConfig {
  id: string;
  position: Position;
  maxHp: number;
  speed: number;
  stats: Stats;
  className?: string;
  classDef?: ClassDef;
  level?: number;
  primaryRealm?: string;
  secondaryRealm?: string;
}

export class Player extends Actor {
  readonly stats: Stats;
  private _name: string = 'Unknown';
  private _raceKey: string = 'human';
  private _className: string;
  private _classDef: ClassDef | undefined;
  private _inventory: Item[] = [];
  private _knownSpells: Map<string, Set<string>> = new Map(); // realm -> spell keys
  private _equipment: Partial<Record<EquipmentSlot, Item>> = {};

  // Character progression
  private _level: number = 1;
  private _experience: number = 0;
  private _maxExperience: number = 0;

  // Race (for experience factor calculation)
  private _raceDef: RaceDef | undefined;

  // Mana pool
  private _currentMana: number = 0;
  private _maxMana: number = 0;

  // Magic realms (chosen at character creation)
  private _primaryRealm: string | null = null;
  private _secondaryRealm: string | null = null;

  // Skills (derived from class, race, level, stats)
  private _skills: Skills;

  // Intrinsic abilities (from equipment, mutations, etc.)
  private _hasTelepathy: boolean = false;

  // Mutations (permanent modifications from chaos exposure, polymorph, etc.)
  private _mutations: Set<string> = new Set();
  private _mutationSystem: MutationSystem | null = null;

  // Gold (currency)
  private _gold: number = 0;

  // Stat drain tracking (how much each stat has been reduced)
  private _drainedStats: Stats = { str: 0, int: 0, wis: 0, dex: 0, con: 0, chr: 0 };

  // Food/hunger level (starts full)
  private _food: number = FoodLevel.FULL - 1;

  constructor(config: PlayerConfig) {
    super({
      id: config.id,
      position: config.position,
      symbol: '@',
      color: '#fff',
      maxHp: config.maxHp,
      speed: config.speed,
    });
    this.stats = { ...config.stats };
    this._className = config.className ?? 'Warrior';
    this._classDef = config.classDef;
    this._level = config.level ?? 1;
    this._primaryRealm = config.primaryRealm ?? null;
    this._secondaryRealm = config.secondaryRealm ?? null;

    // Initialize mana pool
    this._maxMana = this.calculateMaxMana();
    this._currentMana = this._maxMana;

    // Initialize skills
    this._skills = this.calculateSkills();
  }

  /**
   * Create a Player from character creation data
   */
  static fromCreation(creation: CharacterCreationData, itemGen: ItemGeneration): Player {
    if (!creation.raceKey || !creation.classKey || !creation.finalStats || !creation.sex) {
      throw new Error('Incomplete character creation data');
    }

    const raceDef = racesData[creation.raceKey as keyof typeof racesData] as RaceDef;
    const classDef = classesData[creation.classKey as keyof typeof classesData] as ClassDef;
    const startingHP = calculateStartingHP(raceDef, classDef);

    const config: PlayerConfig = {
      id: 'player',
      position: { x: 0, y: 0 },
      maxHp: startingHP,
      speed: 110,
      stats: creation.finalStats,
      className: classDef.name,
      classDef: classDef,
    };
    if (creation.primaryRealm) config.primaryRealm = creation.primaryRealm;
    if (creation.secondaryRealm) config.secondaryRealm = creation.secondaryRealm;

    const player = new Player(config);

    // Set character identity
    player._name = creation.name;
    player._raceKey = creation.raceKey;
    player.setRace(raceDef);

    // Starting equipment by class
    const STARTING_EQUIPMENT: Record<string, string[]> = {
      warrior: ['broad_sword', 'chain_mail'],
      mage: ['dagger'],
      priest: ['mace'],
      rogue: ['dagger', 'soft_leather_armour'],
      ranger: ['dagger'],
      paladin: ['broad_sword'],
      warrior_mage: ['short_sword'],
      chaos_warrior: ['broad_sword', 'metal_scale_mail'],
      monk: ['soft_leather_armour'],
      mindcrafter: ['dagger', 'soft_leather_armour'],
      high_mage: ['dagger'],
    };

    const classItems = STARTING_EQUIPMENT[creation.classKey] ?? [];
    const commonItems = ['food_rations', 'wooden_torch'];

    for (const itemKey of [...classItems, ...commonItems]) {
      const item = itemGen.createItemByKey(itemKey);
      if (item) {
        player.addItem(item);
        player.equip(item);
      }
    }

    // Give spellbooks if class uses magic
    if (creation.primaryRealm) {
      const book = itemGen.createItemByKey(`${creation.primaryRealm}_book_1`);
      if (book) player.addItem(book);
    }
    if (creation.secondaryRealm) {
      const book = itemGen.createItemByKey(`${creation.secondaryRealm}_book_1`);
      if (book) player.addItem(book);
    }

    return player;
  }

  // Character identity accessors
  get name(): string {
    return this._name;
  }

  get raceKey(): string {
    return this._raceKey;
  }

  get raceName(): string {
    return this._raceDef?.name ?? 'Unknown';
  }

  // Class accessors
  get className(): string {
    return this._className;
  }

  get classDef(): ClassDef | undefined {
    return this._classDef;
  }

  /**
   * Get player skills (derived from class, race, level, stats)
   */
  get skills(): Skills {
    return this._skills;
  }

  /**
   * Get current stats (base stats minus drain plus mutation modifiers)
   */
  get currentStats(): Stats {
    // Get mutation modifiers if system is available
    const mutMods = this._mutationSystem?.getStatModifiers(this) ?? {};

    return {
      str: Math.max(3, this.stats.str - this._drainedStats.str + (mutMods.str ?? 0)),
      int: Math.max(3, this.stats.int - this._drainedStats.int + (mutMods.int ?? 0)),
      wis: Math.max(3, this.stats.wis - this._drainedStats.wis + (mutMods.wis ?? 0)),
      dex: Math.max(3, this.stats.dex - this._drainedStats.dex + (mutMods.dex ?? 0)),
      con: Math.max(3, this.stats.con - this._drainedStats.con + (mutMods.con ?? 0)),
      chr: Math.max(3, this.stats.chr - this._drainedStats.chr + (mutMods.chr ?? 0)),
    };
  }

  /**
   * Drain a stat by the specified amount
   */
  drainStat(stat: keyof Stats, amount: number): void {
    this._drainedStats[stat] = Math.min(
      this.stats[stat] - 3, // Can't drain below 3
      this._drainedStats[stat] + amount
    );
  }

  /**
   * Restore a specific drained stat
   * @returns true if stat was actually restored
   */
  restoreStat(stat: keyof Stats): boolean {
    if (this._drainedStats[stat] > 0) {
      this._drainedStats[stat] = 0;
      return true;
    }
    return false;
  }

  /**
   * Restore all drained stats
   * @returns array of stat names that were restored
   */
  restoreAllStats(): (keyof Stats)[] {
    const restored: (keyof Stats)[] = [];
    const statKeys: (keyof Stats)[] = ['str', 'int', 'wis', 'dex', 'con', 'chr'];

    for (const stat of statKeys) {
      if (this._drainedStats[stat] > 0) {
        this._drainedStats[stat] = 0;
        restored.push(stat);
      }
    }

    return restored;
  }

  /**
   * Calculate player noise level for monster detection.
   * Formula from Zangband: noise = 2^(30 - stealth)
   * Higher stealth = lower noise = harder for monsters to detect
   */
  get noise(): number {
    const stealth = Math.min(30, this._skills.stealth);
    return Math.pow(2, 30 - stealth);
  }

  /** Whether player has telepathy (sees all monsters) */
  get hasTelepathy(): boolean {
    return this._hasTelepathy;
  }

  set hasTelepathy(value: boolean) {
    this._hasTelepathy = value;
  }

  /**
   * Recalculate skills (call when level or stats change)
   */
  recalculateSkills(): void {
    this._skills = this.calculateSkills();
  }

  /**
   * Set the player's class (for character creation or debug)
   */
  setClass(classDef: ClassDef): void {
    this._classDef = classDef;
    this._className = classDef.name;
    this.recalculateMana();
    this.recalculateSkills();
  }

  /**
   * Set the player's race (for character creation or debug)
   */
  setRace(raceDef: RaceDef): void {
    this._raceDef = raceDef;
  }

  /**
   * Set the player's level (recalculates mana)
   */
  setLevel(level: number): void {
    this._level = level;
    this.recalculateMana();
    this.recalculateSkills();
  }

  // Experience accessors
  get experience(): number {
    return this._experience;
  }

  get maxExperience(): number {
    return this._maxExperience;
  }

  /**
   * Experience factor from race + class.
   * Higher values mean more XP needed to level.
   * Human = 100, Elf = 120, etc.
   */
  get expFactor(): number {
    const raceExpMod = this._raceDef?.expMod ?? 100;
    const classExpMod = this._classDef?.expMod ?? 0;
    return raceExpMod + classExpMod;
  }

  /**
   * Total experience required to reach next level.
   * Uses experience table from Zangband, scaled by expFactor.
   */
  get experienceToNextLevel(): number {
    if (this._level >= 50) return Infinity;
    const baseExp = (tables as { experience: number[] }).experience[this._level - 1] ?? Infinity;
    return Math.floor((baseExp * this.expFactor) / 100);
  }

  /**
   * Gain experience points, potentially leveling up.
   *
   * @param amount - Amount of XP to gain
   * @returns Object with leveledUp flag and new level
   */
  gainExperience(amount: number): { leveledUp: boolean; newLevel: number } {
    const oldLevel = this._level;

    this._experience += amount;
    if (this._experience > this._maxExperience) {
      this._maxExperience = this._experience;
    }

    // Check for level ups
    while (this._level < 50 && this._experience >= this.experienceToNextLevel) {
      this._level++;
      // Recalculate mana max (but don't restore - Zangband behavior)
      this._maxMana = this.calculateMaxMana();
      if (this._currentMana > this._maxMana) {
        this._currentMana = this._maxMana;
      }
      // Recalculate skills
      this.recalculateSkills();
    }

    return { leveledUp: this._level > oldLevel, newLevel: this._level };
  }

  /**
   * Drain experience (from level drain attacks, etc.)
   * This lowers current experience but not max experience.
   */
  drainExperience(amount: number): void {
    this._experience = Math.max(0, this._experience - amount);
    // Recalculate level based on new experience
    this.recalculateLevel();
  }

  /**
   * Restore experience to max (from Restore Life Level spell)
   * Returns true if experience was restored, false if already at max.
   */
  restoreLevel(): boolean {
    if (this._experience >= this._maxExperience) {
      return false;
    }
    this._experience = this._maxExperience;
    this.recalculateLevel();
    return true;
  }

  /**
   * Recalculate level based on current experience.
   * Used after experience drain or restoration.
   */
  private recalculateLevel(): void {
    // Start from level 1 and work up
    let newLevel = 1;
    while (newLevel < 50) {
      const baseExp = (tables as { experience: number[] }).experience[newLevel - 1] ?? Infinity;
      const expNeeded = Math.floor((baseExp * this.expFactor) / 100);
      if (this._experience < expNeeded) break;
      newLevel++;
    }
    this._level = newLevel;
    // Recalculate mana max
    this._maxMana = this.calculateMaxMana();
    if (this._currentMana > this._maxMana) {
      this._currentMana = this._maxMana;
    }
    // Recalculate skills
    this.recalculateSkills();
  }

  /**
   * Set primary magic realm
   */
  setPrimaryRealm(realm: string): void {
    this._primaryRealm = realm;
  }

  /**
   * Set secondary magic realm
   */
  setSecondaryRealm(realm: string): void {
    this._secondaryRealm = realm;
  }

  // Character level
  get level(): number {
    return this._level;
  }

  set level(value: number) {
    this._level = value;
    // Recalculate max mana - do NOT restore mana (Zangband behavior)
    this._maxMana = this.calculateMaxMana();
    // Only cap if current exceeds new max (e.g., if max decreased)
    if (this._currentMana > this._maxMana) {
      this._currentMana = this._maxMana;
    }
    // Also recalculate skills
    this.recalculateSkills();
  }

  // Mana pool accessors
  get maxMana(): number {
    return this._maxMana;
  }

  get currentMana(): number {
    return this._currentMana;
  }

  // Magic realm accessors
  get primaryRealm(): string | null {
    return this._primaryRealm;
  }

  get secondaryRealm(): string | null {
    return this._secondaryRealm;
  }

  /**
   * Calculate maximum mana based on class, level, and casting stat
   * Formula: (base from level) * stat_modifier * class_bonus
   */
  calculateMaxMana(): number {
    if (!this.classDef || !this.classDef.spellStat) {
      return 0; // Non-caster class
    }

    const spellStat = this.classDef.spellStat;
    const statValue = this.stats[spellStat];

    // Stat modifier: (stat - 10) / 2, similar to D&D
    // But we'll use Zangband-style: higher stats give more mana
    const statMod = Math.floor((statValue - 8) / 2);

    // Base mana from level: roughly level * 2-3 depending on class
    // Mages get more base mana than hybrid classes
    const levelMana = this._level * 3;

    // Stat contribution: stat_mod * level / 2
    const statMana = Math.max(0, statMod * this._level / 2);

    // Total before class bonus
    let totalMana = Math.floor(levelMana + statMana);

    // Apply class mana bonus (e.g., high_mage gets 1.25x)
    if (this.classDef.manaBonus) {
      totalMana = Math.floor(totalMana * this.classDef.manaBonus);
    }

    // Minimum 1 mana for casters
    return Math.max(1, totalMana);
  }

  /**
   * Calculate player skills based on class, race, level, and stats.
   *
   * Formula from Zangband xtra1.c:
   * skill = race_base + class_base + stat_adjustment + (class_xskill * level / 10)
   *
   * Since we don't have races yet, we use 0 for race base values.
   * Class data provides skills (base) and xSkills (level multiplier).
   */
  private calculateSkills(): Skills {
    const { str, int, wis, dex } = this.stats;
    const level = this._level;
    const classDef = this._classDef;

    // Default base skills if no class defined (warrior-like defaults)
    const defaultSkills = {
      disarm: 25, device: 18, save: 18, stealth: 1,
      search: 14, searchFreq: 2, melee: 70, ranged: 55,
    };
    const defaultXSkills = {
      disarm: 12, device: 7, save: 10, stealth: 0,
      search: 0, searchFreq: 0, melee: 45, ranged: 45,
    };

    // Get class skills or use defaults
    const baseSkills = classDef?.skills ?? defaultSkills;
    const xSkills = classDef?.xSkills ?? defaultXSkills;

    // Race base skills (0 until we implement races)
    const raceDisarm = 0;
    const raceDevice = 0;
    const raceSave = 0;
    const raceStealth = 0;
    const raceSearch = 0;
    const raceSearchFreq = 0;
    const raceMelee = 0;
    const raceRanged = 0;

    // Calculate each skill using Zangband's formula:
    // skill = race_base + class_base + stat_adj + (class_xskill * level / 10)

    // Disarming: DEX adjustment + INT adjustment + level scaling
    const disarming = raceDisarm + baseSkills.disarm
      + adjDexDis(dex) + adjIntDis(int)
      + Math.floor(xSkills.disarm * level / 10);

    // Device: INT adjustment + level scaling
    const device = raceDevice + baseSkills.device
      + adjIntDev(int)
      + Math.floor(xSkills.device * level / 10);

    // Saving throw: WIS adjustment + level scaling
    const saving = raceSave + baseSkills.save
      + adjWisSav(wis)
      + Math.floor(xSkills.save * level / 10);

    // Stealth: just base + level scaling (no stat adjustment in Zangband)
    const stealth = raceStealth + baseSkills.stealth
      + Math.floor(xSkills.stealth * level / 10);

    // Search frequency (how often you search)
    const searching = raceSearchFreq + baseSkills.searchFreq
      + Math.floor(xSkills.searchFreq * level / 10);

    // Perception/sensing (used for detection)
    const perception = raceSearch + baseSkills.search
      + Math.floor(xSkills.search * level / 10);

    // Melee: level scaling (stat bonuses applied elsewhere in combat)
    const melee = raceMelee + baseSkills.melee
      + Math.floor(xSkills.melee * level / 10);

    // Ranged: level scaling
    const ranged = raceRanged + baseSkills.ranged
      + Math.floor(xSkills.ranged * level / 10);

    // Throwing: uses ranged base + level scaling (at 1/5 rate per Zangband)
    // Zangband: SKILL_THT = race_thb + class_thb + (class_xthb * level / 50)
    const throwing = raceRanged + baseSkills.ranged
      + Math.floor(xSkills.ranged * level / 50);

    // Digging: STR adjustment only (equipment bonuses applied separately)
    const digging = Math.max(1, adjStrDig(str));

    return {
      disarming,
      device,
      saving,
      stealth,
      searching,
      perception,
      melee,
      ranged,
      throwing,
      digging,
    };
  }

  /**
   * Spend mana for casting a spell
   * @returns true if mana was spent, false if not enough mana
   */
  spendMana(amount: number): boolean {
    if (this._currentMana < amount) {
      return false;
    }
    this._currentMana -= amount;
    return true;
  }

  /**
   * Restore mana (from regeneration, potions, etc.)
   */
  restoreMana(amount: number): void {
    this._currentMana = Math.min(this._currentMana + amount, this._maxMana);
  }

  /**
   * Regenerate mana (called each turn)
   * Rate: maxMana / 100 per turn (roughly 100 turns to full)
   */
  regenerateMana(): void {
    if (this._maxMana <= 0) return;
    const regenRate = Math.max(1, Math.floor(this._maxMana / 100));
    this.restoreMana(regenRate);
  }

  /**
   * Recalculate max mana (call after stat changes)
   */
  recalculateMana(): void {
    this._maxMana = this.calculateMaxMana();
    this._currentMana = Math.min(this._currentMana, this._maxMana);
  }

  // Gold accessors and methods

  /** Get current gold amount */
  get gold(): number {
    return this._gold;
  }

  /**
   * Add gold to player's purse
   * @param amount Amount to add (ignored if negative)
   */
  addGold(amount: number): void {
    if (amount > 0) {
      this._gold += amount;
    }
  }

  /**
   * Spend gold from player's purse
   * @param amount Amount to spend (ignored if negative)
   * @returns true if gold was spent, false if insufficient funds
   */
  spendGold(amount: number): boolean {
    if (amount <= 0) {
      return false;
    }
    if (this._gold >= amount) {
      this._gold -= amount;
      return true;
    }
    return false;
  }

  // Mutation accessors and methods

  /** Get all mutation keys */
  get mutations(): string[] {
    return [...this._mutations];
  }

  /** Check if player has a specific mutation */
  hasMutation(key: string): boolean {
    return this._mutations.has(key);
  }

  /** Add a mutation (internal - use MutationSystem.gainMutation) */
  addMutation(key: string): void {
    this._mutations.add(key);
  }

  /** Remove a mutation (internal - use MutationSystem.loseMutation) */
  removeMutation(key: string): void {
    this._mutations.delete(key);
  }

  /** Set the mutation system reference for stat calculations */
  setMutationSystem(system: MutationSystem): void {
    this._mutationSystem = system;
  }

  /** Get mutation system reference */
  get mutationSystem(): MutationSystem | null {
    return this._mutationSystem;
  }

  /** Check if player has a mutation flag (fearless, regen, telepathy, etc.) */
  hasMutationFlag(flag: string): boolean {
    return this._mutationSystem?.hasFlag(this, flag) ?? false;
  }

  /** Current food level (0-15000) */
  get food(): number {
    return this._food;
  }

  /** Current hunger status */
  get hungerStatus(): HungerStatus {
    if (this._food >= FoodLevel.MAX) return HungerStatus.Gorged;
    if (this._food >= FoodLevel.FULL) return HungerStatus.Full;
    if (this._food >= FoodLevel.ALERT) return HungerStatus.Normal;
    if (this._food >= FoodLevel.WEAK) return HungerStatus.Hungry;
    if (this._food >= FoodLevel.FAINT) return HungerStatus.Weak;
    return HungerStatus.Faint;
  }

  /**
   * Set food level directly
   * @returns message describing the food state change, or null if no change
   */
  setFood(value: number): string | null {
    const oldStatus = this.hungerStatus;
    // Clamp to valid range
    this._food = Math.max(0, Math.min(20000, value));
    const newStatus = this.hungerStatus;

    if (newStatus === oldStatus) {
      return null;
    }

    // Return appropriate message based on state transition
    const statusOrder: HungerStatus[] = [
      HungerStatus.Faint,
      HungerStatus.Weak,
      HungerStatus.Hungry,
      HungerStatus.Normal,
      HungerStatus.Full,
      HungerStatus.Gorged,
    ];
    const oldIndex = statusOrder.indexOf(oldStatus);
    const newIndex = statusOrder.indexOf(newStatus);

    if (newIndex > oldIndex) {
      // Getting more fed
      switch (newStatus) {
        case HungerStatus.Weak: return 'You are still weak.';
        case HungerStatus.Hungry: return 'You are still hungry.';
        case HungerStatus.Normal: return 'You are no longer hungry.';
        case HungerStatus.Full: return 'You are full!';
        case HungerStatus.Gorged: return 'You have gorged yourself!';
        default: return null;
      }
    } else {
      // Getting hungrier
      switch (newStatus) {
        case HungerStatus.Faint: return 'You are getting faint from hunger!';
        case HungerStatus.Weak: return 'You are getting weak from hunger!';
        case HungerStatus.Hungry: return 'You are getting hungry.';
        case HungerStatus.Normal: return 'You are no longer full.';
        case HungerStatus.Full: return 'You are no longer gorged.';
        default: return null;
      }
    }
  }

  /**
   * Reduce food by amount (called each turn)
   */
  consumeFood(amount: number): string | null {
    return this.setFood(this._food - amount);
  }

  get inventory(): Item[] {
    return [...this._inventory];
  }

  /**
   * Get all known spell keys across all realms
   */
  get knownSpells(): string[] {
    const allSpells: string[] = [];
    for (const spells of this._knownSpells.values()) {
      allSpells.push(...spells);
    }
    return allSpells;
  }

  /**
   * Get known spells for a specific realm
   */
  getKnownSpellsInRealm(realm: string): string[] {
    const spells = this._knownSpells.get(realm);
    return spells ? [...spells] : [];
  }

  /**
   * Check if a spell is known
   */
  knowsSpell(realm: string, spellKey: string): boolean {
    const spells = this._knownSpells.get(realm);
    return spells?.has(spellKey) ?? false;
  }

  /**
   * Add an item to inventory, attempting to stack with existing items first.
   * @returns true if the item was stacked, false if added as a new slot
   */
  addItem(item: Item): boolean {
    // Try to stack with existing items
    for (const existing of this._inventory) {
      if (existing.canStack(item)) {
        existing.absorb(item);
        return true;
      }
    }
    // No stackable item found, add as new
    this._inventory.push(item);
    return false;
  }

  removeItem(itemId: string): Item | undefined {
    const idx = this._inventory.findIndex(i => i.id === itemId);
    if (idx >= 0) {
      return this._inventory.splice(idx, 1)[0];
    }
    return undefined;
  }

  /**
   * Learn a spell in a specific realm
   */
  learnSpell(realm: string, spellKey: string): void {
    let realmSpells = this._knownSpells.get(realm);
    if (!realmSpells) {
      realmSpells = new Set();
      this._knownSpells.set(realm, realmSpells);
    }
    realmSpells.add(spellKey);
  }

  /**
   * Get count of known spells (for spell slot tracking)
   */
  get knownSpellCount(): number {
    let count = 0;
    for (const spells of this._knownSpells.values()) {
      count += spells.size;
    }
    return count;
  }

  // Equipment methods

  /** Get equipped item in a slot */
  getEquipped(slot: EquipmentSlot): Item | undefined {
    return this._equipment[slot];
  }

  /** Get all equipped items */
  getAllEquipment(): Partial<Record<EquipmentSlot, Item>> {
    return { ...this._equipment };
  }

  /** Check if an item can be equipped in a slot */
  canEquip(item: Item, slot: EquipmentSlot): boolean {
    const type = item.generated?.baseItem.type;
    if (type === undefined) return false;
    return SLOT_TYPES[slot].includes(type);
  }

  /** Find the appropriate slot for an item */
  findSlotForItem(item: Item): EquipmentSlot | null {
    const type = item.generated?.baseItem.type;
    if (type === undefined) return null;

    for (const [slot, types] of Object.entries(SLOT_TYPES)) {
      if (types.includes(type)) {
        // For rings, use ring1 if empty, else ring2
        if (slot === 'ring1' || slot === 'ring2') {
          if (!this._equipment.ring1) return 'ring1';
          if (!this._equipment.ring2) return 'ring2';
          return 'ring1'; // Default to replacing ring1
        }
        return slot as EquipmentSlot;
      }
    }
    return null;
  }

  /** Equip an item in the appropriate slot */
  equip(item: Item): { equipped: boolean; unequipped: Item | undefined; slot: EquipmentSlot | undefined } {
    const slot = this.findSlotForItem(item);
    if (!slot) return { equipped: false, unequipped: undefined, slot: undefined };

    // Remove from inventory if present
    this.removeItem(item.id);

    // Unequip current item if any
    const current = this._equipment[slot];
    if (current) {
      this._inventory.push(current);
    }

    this._equipment[slot] = item;
    return { equipped: true, unequipped: current, slot };
  }

  /** Unequip an item from a slot */
  unequip(slot: EquipmentSlot): Item | undefined {
    const item = this._equipment[slot];
    if (item) {
      delete this._equipment[slot];
      this._inventory.push(item);
    }
    return item;
  }

  /** Calculate total AC from equipment and mutations */
  get totalAc(): number {
    let ac = 0;
    for (const item of Object.values(this._equipment)) {
      if (item) {
        ac += item.baseAc + item.toAc;
      }
    }
    // Add mutation AC bonus
    const mutAc = this._mutationSystem?.getAcModifier(this) ?? 0;
    return ac + mutAc;
  }

  /** Override speed to include mutation modifiers */
  override get speed(): number {
    const baseSpeed = super.speed; // Includes status modifiers
    const mutSpeed = this._mutationSystem?.getSpeedModifier(this) ?? 0;
    return baseSpeed + mutSpeed;
  }

  /** Get the weapon's damage dice string */
  get weaponDamage(): string {
    const weapon = this._equipment.weapon;
    return weapon?.damage ?? '1d1'; // Bare hands
  }

  /** Get weapon to-hit bonus */
  get weaponToHit(): number {
    return this._equipment.weapon?.toHit ?? 0;
  }

  /** Get weapon to-damage bonus */
  get weaponToDam(): number {
    return this._equipment.weapon?.toDam ?? 0;
  }

  tryMove(direction: Direction, level: ILevel): boolean {
    const newPos = movePosition(this.position, direction);
    if (!level.isWalkable(newPos)) {
      return false;
    }
    this.position = newPos;
    return true;
  }

  /**
   * Equip starting items from a list of item keys
   */
  equipStartingItems(itemGen: ItemGeneration, itemKeys: string[]): void {
    for (const key of itemKeys) {
      const item = itemGen.createItemByKey(key);
      if (item) {
        this.equip(item);
      }
    }
  }

  /**
   * Apply resistance to elemental damage using player's equipment and statuses.
   * Uses level-based resistance formula from Zangband.
   */
  override resistDamage(
    element: Element,
    damage: number,
    _rng: typeof RNG
  ): { damage: number; status: string } {
    const level = getPlayerResistLevel(this, element);

    if (level <= 0) {
      return { damage: 0, status: 'immune' };
    }

    const finalDamage = applyPlayerResistance(damage, level);

    // Determine status message
    if (level < 9) {
      return { damage: finalDamage, status: 'resists' };
    }

    return { damage: finalDamage, status: 'normal' };
  }
}
