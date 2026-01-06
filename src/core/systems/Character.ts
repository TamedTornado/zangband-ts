/**
 * Character System
 *
 * Handles character creation, stat calculation, leveling, and derived values.
 * Extracted from Zangband's birth.c, xtra1.c, and tables.c
 */

import { RNG } from 'rot-js';
import type { RaceDef } from '@/core/data/races';
import type { ClassDef } from '@/core/data/classes';
import tables from '@/data/meta/tables.json';

/** Maximum character level */
const MAX_LEVEL = 50;

/** Minimum stat value */
const MIN_STAT = 3;

/** Maximum stat value (18/220 = 18 + 220 = 238, but we use index 118 internally) */
const MAX_STAT = 118;

/**
 * Configuration for creating a new character
 */
export interface CharacterConfig {
  name: string;
  race: RaceDef;
  class_: ClassDef;
  gender: 'male' | 'female';
  baseStats: Stats;
  rng?: typeof RNG;
}

/**
 * The six primary stats
 */
export interface Stats {
  str: number;
  int: number;
  wis: number;
  dex: number;
  con: number;
  chr: number;
}

/**
 * Skill values derived from race, class, and level
 */
export interface Skills {
  disarm: number;
  device: number;
  save: number;
  stealth: number;
  search: number;
  searchFreq: number;
  melee: number;
  ranged: number;
}

/**
 * Character class - represents a player character with all stats and progression
 */
export class Character {
  readonly name: string;
  readonly race: RaceDef;
  readonly class_: ClassDef;
  readonly gender: 'male' | 'female';

  private _baseStats: Stats;
  private _level: number = 1;
  private _experience: number = 0;
  private _currentHp: number;
  private _currentMp: number = 0;
  private _gold: number = 0;
  private _playerHp: number[] = []; // Pre-rolled HP per level
  private rng: typeof RNG;

  constructor(config: CharacterConfig) {
    this.name = config.name;
    this.race = config.race;
    this.class_ = config.class_;
    this.gender = config.gender;
    this._baseStats = { ...config.baseStats };
    this.rng = config.rng ?? RNG;

    // Pre-roll HP for all levels (Zangband does this at character creation)
    this.rollPlayerHp();

    // Initialize HP/MP
    this._currentHp = this.maxHp;
    this._currentMp = this.maxMp;
  }

  /**
   * Pre-roll HP gains for each level (from birth.c)
   * Each level: roll race hitDie + class hitDie
   */
  private rollPlayerHp(): void {
    this._playerHp = [];
    let total = 0;

    for (let i = 0; i < MAX_LEVEL; i++) {
      // Roll race hit die
      let hp = this.rng.getUniformInt(1, this.race.hitDie);

      // Roll class hit die (if any)
      if (this.class_.hitDie > 0) {
        hp += this.rng.getUniformInt(1, this.class_.hitDie);
      }

      total += hp;
      this._playerHp.push(total);
    }
  }

  // === Stat Accessors ===

  get level(): number {
    return this._level;
  }

  get experience(): number {
    return this._experience;
  }

  get gold(): number {
    return this._gold;
  }

  get currentHp(): number {
    return this._currentHp;
  }

  get currentMp(): number {
    return this._currentMp;
  }

  get isDead(): boolean {
    return this._currentHp <= 0;
  }

  /**
   * Calculate final stats (base + race + class bonuses)
   */
  get stats(): Stats {
    const calc = (base: number, raceMod: number, classMod: number): number => {
      const total = base + raceMod + classMod;
      return Math.max(MIN_STAT, Math.min(MAX_STAT, total));
    };

    return {
      str: calc(this._baseStats.str, this.race.stats.str, this.class_.stats.str),
      int: calc(this._baseStats.int, this.race.stats.int, this.class_.stats.int),
      wis: calc(this._baseStats.wis, this.race.stats.wis, this.class_.stats.wis),
      dex: calc(this._baseStats.dex, this.race.stats.dex, this.class_.stats.dex),
      con: calc(this._baseStats.con, this.race.stats.con, this.class_.stats.con),
      chr: calc(this._baseStats.chr, this.race.stats.chr, this.class_.stats.chr),
    };
  }

  /**
   * Calculate max HP from pre-rolled values + CON bonus
   * Formula: player_hp[level-1] + (con_bonus * level / 2)
   * Minimum: level + 1
   */
  get maxHp(): number {
    const baseHp = this._playerHp[this._level - 1] ?? this.race.hitDie;
    const conBonus = this.getConHpBonus();
    let mhp = baseHp + Math.floor((conBonus * this._level) / 2);

    // Minimum HP is level + 1
    if (mhp < this._level + 1) {
      mhp = this._level + 1;
    }

    return mhp;
  }

  /**
   * Calculate max MP for spellcasters
   * Formula: adj_mag_mana[stat_index] * effective_levels / 25
   * Non-casters (no spell_stat) get 0
   */
  get maxMp(): number {
    // Warriors and other non-casters have no mana
    // This is determined by whether the class has a spell book
    // For now, check if class has any spell-related properties
    // Mages use INT, Priests use WIS
    const spellStat = this.getSpellStat();
    if (spellStat === null) {
      return 0;
    }

    const statValue = this.stats[spellStat];
    const statIndex = this.getStatIndex(statValue);
    const manaBase = tables.magMana[statIndex] ?? 0;

    // Effective levels = (level - spell_first) + 1
    // spell_first is typically 1 for most casters
    const spellFirst = 1;
    const effectiveLevels = Math.max(0, (this._level - spellFirst) + 1);

    let msp = Math.floor((manaBase * effectiveLevels) / 25);

    // Usually add one mana if any
    if (msp > 0) {
      msp++;
    }

    return msp;
  }

  /**
   * Get the spell stat for this class (INT for mages, WIS for priests, null for warriors)
   */
  private getSpellStat(): keyof Stats | null {
    // Based on class index - warriors (0) have no spell stat
    // This would normally come from magic_info but we'll use a simple check
    const className = this.class_.name.toLowerCase();
    if (className.includes('mage') || className.includes('rogue') || className.includes('ranger')) {
      return 'int';
    }
    if (className.includes('priest') || className.includes('paladin') || className.includes('monk')) {
      return 'wis';
    }
    if (className === 'warrior') {
      return null;
    }
    // Default to INT for other casters
    return 'int';
  }

  /**
   * Calculate skills from race + class base + (level * xSkills)
   */
  get skills(): Skills {
    const level = this._level;
    return {
      disarm: this.race.skills.disarm + this.class_.skills.disarm + Math.floor(this.class_.xSkills.disarm * level / 10),
      device: this.race.skills.device + this.class_.skills.device + Math.floor(this.class_.xSkills.device * level / 10),
      save: this.race.skills.save + this.class_.skills.save + Math.floor(this.class_.xSkills.save * level / 10),
      stealth: this.race.skills.stealth + this.class_.skills.stealth + Math.floor(this.class_.xSkills.stealth * level / 10),
      search: this.race.skills.search + this.class_.skills.search + Math.floor(this.class_.xSkills.search * level / 10),
      searchFreq: this.race.skills.searchFreq + this.class_.skills.searchFreq + Math.floor(this.class_.xSkills.searchFreq * level / 10),
      melee: this.race.skills.melee + this.class_.skills.melee + Math.floor(this.class_.xSkills.melee * level / 10),
      ranged: this.race.skills.ranged + this.class_.skills.ranged + Math.floor(this.class_.xSkills.ranged * level / 10),
    };
  }

  /**
   * Experience needed to reach next level
   * Formula: player_exp[level-1] * (race_exp + class_exp) / 100
   */
  get experienceToNextLevel(): number {
    if (this._level >= MAX_LEVEL) {
      return Infinity;
    }
    const baseExp = tables.experience[this._level - 1] ?? 0;
    const expFactor = this.race.expMod + this.class_.expMod;
    return Math.floor((baseExp * expFactor) / 100);
  }

  /**
   * STR bonus to hit
   */
  get toHitBonus(): number {
    const idx = this.getStatIndex(this.stats.str);
    return tables.strDamageBonus[idx] ?? 0; // Using damage table as approximation
  }

  /**
   * STR bonus to damage
   */
  get damageBonus(): number {
    const idx = this.getStatIndex(this.stats.str);
    return tables.strDamageBonus[idx] ?? 0;
  }

  /**
   * DEX bonus to AC
   */
  get acBonus(): number {
    const idx = this.getStatIndex(this.stats.dex);
    return tables.dexAcBonus[idx] ?? 0;
  }

  // === Actions ===

  /**
   * Gain experience, potentially leveling up
   */
  gainExperience(amount: number): void {
    this._experience += amount;

    // Check for level ups
    while (this._level < MAX_LEVEL && this._experience >= this.experienceToNextLevel) {
      this._level++;
      // HP increases automatically via maxHp recalculation
      // Optionally heal on level up
    }
  }

  /**
   * Take damage
   */
  takeDamage(amount: number): void {
    this._currentHp = Math.max(0, this._currentHp - amount);
  }

  /**
   * Heal HP
   */
  heal(amount: number): void {
    this._currentHp = Math.min(this.maxHp, this._currentHp + amount);
  }

  /**
   * Restore MP
   */
  restoreMp(amount: number): void {
    this._currentMp = Math.min(this.maxMp, this._currentMp + amount);
  }

  /**
   * Spend MP
   */
  spendMp(amount: number): boolean {
    if (this._currentMp < amount) {
      return false;
    }
    this._currentMp -= amount;
    return true;
  }

  /**
   * Gain gold
   */
  gainGold(amount: number): void {
    this._gold += amount;
  }

  /**
   * Spend gold
   */
  spendGold(amount: number): boolean {
    if (this._gold < amount) {
      return false;
    }
    this._gold -= amount;
    return true;
  }

  // === Helpers ===

  /**
   * Convert stat value to table index (0-36)
   * Stats 3-18 map to indices 0-15
   * Stats 18/10 through 18/220 map to indices 16-36
   */
  private getStatIndex(stat: number): number {
    if (stat <= 18) {
      return Math.max(0, stat - 3);
    }
    // Stats above 18 use 18/XX notation
    // stat 19 = 18/10, stat 28 = 18/100, etc.
    const bonus = stat - 18;
    const idx = 15 + Math.floor(bonus / 10);
    return Math.min(36, idx);
  }

  /**
   * Get CON bonus to HP per level (from adj_con_mhp table)
   */
  private getConHpBonus(): number {
    const idx = this.getStatIndex(this.stats.con);
    return tables.conHpBonus[idx] ?? 0;
  }
}
