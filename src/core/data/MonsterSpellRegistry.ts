/**
 * MonsterSpellRegistry - Maps monster spell flags to effect definitions
 *
 * This registry translates Zangband spell flags (BR_FIRE, BA_COLD, HEAL, etc.)
 * into effect definitions that can be executed by the GPEffect system.
 *
 * ## Damage Formulas (from C reference mspells1.c)
 *
 * - **Breaths**: damage = hp / divisor (capped)
 *   - Fire/Cold/Acid/Elec: hp/2, cap 1200
 *   - Poison: hp/2, cap 600
 *   - Nether/Light/Dark: hp/4, cap 450
 *   - Chaos/Sound/Shards: hp/4, cap 300
 *   - Others: hp/6, cap 200
 *
 * - **Balls**: damage = level * multiplier + bonus
 *   - Fire ball: level * 3.5 + 10
 *   - Cold ball: level * 1.5 + 10
 *   - etc.
 *
 * - **Bolts**: damage = dice roll, sometimes with level bonus
 *   - Fire bolt: 9d8 + level/3
 *   - etc.
 *
 * ## Spell Categories (for AI selection)
 *
 * - attack: Direct damage spells
 * - escape: Teleport, blink
 * - heal: Self-healing
 * - summon: Summon allies
 * - annoy: Status effects on player
 * - tactical: Buffs, positioning
 */

/**
 * Damage formula types
 */
export type DamageFormula =
  | { type: 'hp_divisor'; divisor: number; cap: number }
  | { type: 'level_mult'; mult: number; bonus: number }
  | { type: 'dice'; dice: string; levelBonus?: number }
  | { type: 'fixed'; value: number };

/**
 * Spell category for AI decision making
 */
export type SpellCategory = 'attack' | 'escape' | 'heal' | 'summon' | 'annoy' | 'tactical';

/**
 * Definition of a monster spell
 */
export interface MonsterSpellDef {
  /** Effect type to execute (breath, ball, bolt, etc.) */
  effectType: string;
  /** Element for damage spells */
  element?: string;
  /** Radius for area effects */
  radius?: number;
  /** How to calculate damage */
  damageFormula: DamageFormula;
  /** Category for AI spell selection */
  category: SpellCategory;
  /** Whether spell requires line of sight */
  requiresLOS: boolean;
  /** Whether spell is blocked by monsters in path (bolts) */
  isBolt: boolean;
  /** Optional message when cast */
  message?: string;
}

/**
 * Registry of all monster spells, keyed by spell flag
 */
export const MONSTER_SPELLS: Record<string, MonsterSpellDef> = {
  // ============================================
  // BREATH ATTACKS - damage = hp / divisor, capped
  // ============================================

  // Basic elemental breaths (hp/2, cap 1200)
  BR_FIRE: {
    effectType: 'breath',
    element: 'fire',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 2, cap: 1200 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes fire',
  },
  BR_COLD: {
    effectType: 'breath',
    element: 'cold',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 2, cap: 1200 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes frost',
  },
  BR_ACID: {
    effectType: 'breath',
    element: 'acid',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 2, cap: 1200 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes acid',
  },
  BR_ELEC: {
    effectType: 'breath',
    element: 'lightning',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 2, cap: 1200 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes lightning',
  },

  // Poison breath (hp/2, cap 600)
  BR_POIS: {
    effectType: 'breath',
    element: 'poison',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 2, cap: 600 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes poison',
  },

  // Exotic breaths (hp/4, cap 450)
  BR_NETH: {
    effectType: 'breath',
    element: 'nether',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 4, cap: 450 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes nether',
  },
  BR_LITE: {
    effectType: 'breath',
    element: 'light',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 4, cap: 450 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes light',
  },
  BR_DARK: {
    effectType: 'breath',
    element: 'dark',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 4, cap: 450 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes darkness',
  },

  // Chaos/Sound/Shards breaths (hp/4, cap 300)
  BR_CHAO: {
    effectType: 'breath',
    element: 'chaos',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 4, cap: 300 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes chaos',
  },
  BR_SOUN: {
    effectType: 'breath',
    element: 'sound',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 4, cap: 300 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes sound',
  },
  BR_SHAR: {
    effectType: 'breath',
    element: 'shards',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 4, cap: 300 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes shards',
  },

  // Weaker breaths (hp/6, cap 200)
  BR_CONF: {
    effectType: 'breath',
    element: 'confusion',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 6, cap: 200 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes confusion',
  },
  BR_DISE: {
    effectType: 'breath',
    element: 'disenchant',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 6, cap: 200 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes disenchantment',
  },
  BR_NEXU: {
    effectType: 'breath',
    element: 'nexus',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 6, cap: 200 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes nexus',
  },
  BR_TIME: {
    effectType: 'breath',
    element: 'time',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 6, cap: 200 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes time',
  },
  BR_INER: {
    effectType: 'breath',
    element: 'inertia',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 6, cap: 200 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes inertia',
  },
  BR_GRAV: {
    effectType: 'breath',
    element: 'gravity',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 6, cap: 200 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes gravity',
  },
  BR_PLAS: {
    effectType: 'breath',
    element: 'plasma',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 6, cap: 200 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes plasma',
  },
  BR_FORC: {
    effectType: 'breath',
    element: 'force',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 6, cap: 200 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes force',
  },
  BR_MANA: {
    effectType: 'breath',
    element: 'mana',
    radius: 2,
    damageFormula: { type: 'hp_divisor', divisor: 6, cap: 200 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'breathes mana',
  },

  // ============================================
  // BALL SPELLS - damage = level * mult + bonus
  // ============================================

  BA_FIRE: {
    effectType: 'ball',
    element: 'fire',
    radius: 2,
    damageFormula: { type: 'level_mult', mult: 3.5, bonus: 10 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'casts a fireball',
  },
  BA_COLD: {
    effectType: 'ball',
    element: 'cold',
    radius: 2,
    damageFormula: { type: 'level_mult', mult: 1.5, bonus: 10 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'casts a frost ball',
  },
  BA_ACID: {
    effectType: 'ball',
    element: 'acid',
    radius: 2,
    damageFormula: { type: 'level_mult', mult: 1.5, bonus: 10 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'casts an acid ball',
  },
  BA_ELEC: {
    effectType: 'ball',
    element: 'lightning',
    radius: 2,
    damageFormula: { type: 'level_mult', mult: 1.5, bonus: 10 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'casts a lightning ball',
  },
  BA_POIS: {
    effectType: 'ball',
    element: 'poison',
    radius: 2,
    damageFormula: { type: 'dice', dice: '12d2' },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'casts a stinking cloud',
  },
  BA_NETH: {
    effectType: 'ball',
    element: 'nether',
    radius: 2,
    damageFormula: { type: 'level_mult', mult: 2.5, bonus: 50 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'casts a nether ball',
  },
  BA_WATE: {
    effectType: 'ball',
    element: 'water',
    radius: 2,
    damageFormula: { type: 'dice', dice: '50d1', levelBonus: 1 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'casts a water ball',
  },
  BA_MANA: {
    effectType: 'ball',
    element: 'mana',
    radius: 2,
    damageFormula: { type: 'level_mult', mult: 5, bonus: 0 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'casts a mana storm',
  },
  BA_DARK: {
    effectType: 'ball',
    element: 'dark',
    radius: 2,
    damageFormula: { type: 'level_mult', mult: 5, bonus: 0 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'casts a darkness storm',
  },
  BA_CHAO: {
    effectType: 'ball',
    element: 'chaos',
    radius: 4,
    damageFormula: { type: 'level_mult', mult: 4, bonus: 0 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'invokes raw chaos',
  },

  // ============================================
  // BOLT SPELLS - blocked by monsters in path
  // ============================================

  BO_FIRE: {
    effectType: 'bolt',
    element: 'fire',
    damageFormula: { type: 'dice', dice: '9d8', levelBonus: 3 },
    category: 'attack',
    requiresLOS: true,
    isBolt: true,
    message: 'casts a fire bolt',
  },
  BO_COLD: {
    effectType: 'bolt',
    element: 'cold',
    damageFormula: { type: 'dice', dice: '6d8', levelBonus: 3 },
    category: 'attack',
    requiresLOS: true,
    isBolt: true,
    message: 'casts a frost bolt',
  },
  BO_ACID: {
    effectType: 'bolt',
    element: 'acid',
    damageFormula: { type: 'dice', dice: '7d8', levelBonus: 3 },
    category: 'attack',
    requiresLOS: true,
    isBolt: true,
    message: 'casts an acid bolt',
  },
  BO_ELEC: {
    effectType: 'bolt',
    element: 'lightning',
    damageFormula: { type: 'dice', dice: '4d8', levelBonus: 3 },
    category: 'attack',
    requiresLOS: true,
    isBolt: true,
    message: 'casts a lightning bolt',
  },
  BO_POIS: {
    effectType: 'bolt',
    element: 'poison',
    damageFormula: { type: 'dice', dice: '9d8', levelBonus: 3 },
    category: 'attack',
    requiresLOS: true,
    isBolt: true,
    message: 'casts a poison bolt',
  },
  BO_NETH: {
    effectType: 'bolt',
    element: 'nether',
    damageFormula: { type: 'dice', dice: '5d5', levelBonus: 3 },
    category: 'attack',
    requiresLOS: true,
    isBolt: true,
    message: 'casts a nether bolt',
  },
  BO_WATE: {
    effectType: 'bolt',
    element: 'water',
    damageFormula: { type: 'dice', dice: '10d10', levelBonus: 3 },
    category: 'attack',
    requiresLOS: true,
    isBolt: true,
    message: 'casts a water bolt',
  },
  BO_MANA: {
    effectType: 'bolt',
    element: 'mana',
    damageFormula: { type: 'dice', dice: '3d3', levelBonus: 1 },
    category: 'attack',
    requiresLOS: true,
    isBolt: true,
    message: 'casts a mana bolt',
  },
  BO_PLAS: {
    effectType: 'bolt',
    element: 'plasma',
    damageFormula: { type: 'level_mult', mult: 1.5, bonus: 10 },
    category: 'attack',
    requiresLOS: true,
    isBolt: true,
    message: 'casts a plasma bolt',
  },
  BO_ICEE: {
    effectType: 'bolt',
    element: 'cold',
    damageFormula: { type: 'dice', dice: '6d6', levelBonus: 3 },
    category: 'attack',
    requiresLOS: true,
    isBolt: true,
    message: 'casts an ice bolt',
  },
  MISSILE: {
    effectType: 'bolt',
    element: 'magic',
    damageFormula: { type: 'dice', dice: '2d6', levelBonus: 3 },
    category: 'attack',
    requiresLOS: true,
    isBolt: true,
    message: 'casts a magic missile',
  },

  // Arrows
  ARROW_1: {
    effectType: 'bolt',
    element: 'arrow',
    damageFormula: { type: 'dice', dice: '1d6', levelBonus: 3 },
    category: 'attack',
    requiresLOS: true,
    isBolt: true,
    message: 'fires an arrow',
  },
  ARROW_2: {
    effectType: 'bolt',
    element: 'arrow',
    damageFormula: { type: 'dice', dice: '3d6', levelBonus: 3 },
    category: 'attack',
    requiresLOS: true,
    isBolt: true,
    message: 'fires arrows',
  },
  ARROW_3: {
    effectType: 'bolt',
    element: 'arrow',
    damageFormula: { type: 'dice', dice: '5d6', levelBonus: 3 },
    category: 'attack',
    requiresLOS: true,
    isBolt: true,
    message: 'fires a volley of arrows',
  },
  ARROW_4: {
    effectType: 'bolt',
    element: 'arrow',
    damageFormula: { type: 'dice', dice: '7d6', levelBonus: 3 },
    category: 'attack',
    requiresLOS: true,
    isBolt: true,
    message: 'fires a storm of arrows',
  },

  // ============================================
  // CAUSE WOUNDS - player damage
  // ============================================

  CAUSE_1: {
    effectType: 'monsterCause',
    damageFormula: { type: 'dice', dice: '3d8' },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'points at you and curses',
  },
  CAUSE_2: {
    effectType: 'monsterCause',
    damageFormula: { type: 'dice', dice: '8d8' },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'points at you and curses horribly',
  },
  CAUSE_3: {
    effectType: 'monsterCause',
    damageFormula: { type: 'dice', dice: '10d15' },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'points at you, incanting terribly',
  },
  CAUSE_4: {
    effectType: 'monsterCause',
    damageFormula: { type: 'dice', dice: '15d15' },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'points at you, screaming words of power',
  },

  // ============================================
  // ESCAPE SPELLS
  // ============================================

  BLINK: {
    effectType: 'monsterBlink',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'escape',
    requiresLOS: false,
    isBolt: false,
    message: 'blinks away',
  },
  TPORT: {
    effectType: 'monsterTeleport',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'escape',
    requiresLOS: false,
    isBolt: false,
    message: 'teleports away',
  },
  TELE_AWAY: {
    effectType: 'monsterTeleportAway',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'tactical',
    requiresLOS: true,
    isBolt: false,
    message: 'teleports you away',
  },
  TELE_TO: {
    effectType: 'monsterTeleportTo',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'tactical',
    requiresLOS: true,
    isBolt: false,
    message: 'commands you to come hither',
  },
  TELE_LEVEL: {
    effectType: 'monsterTeleportLevel',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'tactical',
    requiresLOS: true,
    isBolt: false,
    message: 'teleports you away',
  },

  // ============================================
  // HEALING SPELLS
  // ============================================

  HEAL: {
    effectType: 'monsterHeal',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'heal',
    requiresLOS: false,
    isBolt: false,
    message: 'concentrates on its wounds',
  },

  // ============================================
  // BUFF/TACTICAL SPELLS
  // ============================================

  HASTE: {
    effectType: 'monsterHaste',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'tactical',
    requiresLOS: false,
    isBolt: false,
    message: 'concentrates on its body',
  },
  INVULNER: {
    effectType: 'monsterInvulner',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'tactical',
    requiresLOS: false,
    isBolt: false,
    message: 'casts a globe of invulnerability',
  },

  // ============================================
  // STATUS EFFECTS ON PLAYER (ANNOY)
  // ============================================

  BLIND: {
    effectType: 'monsterBlind',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'annoy',
    requiresLOS: true,
    isBolt: false,
    message: 'casts a spell, burning your eyes',
  },
  CONF: {
    effectType: 'monsterConfuse',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'annoy',
    requiresLOS: true,
    isBolt: false,
    message: 'creates a mesmerising illusion',
  },
  SCARE: {
    effectType: 'monsterScare',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'annoy',
    requiresLOS: true,
    isBolt: false,
    message: 'casts a fearful illusion',
  },
  SLOW: {
    effectType: 'monsterSlow',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'annoy',
    requiresLOS: true,
    isBolt: false,
    message: 'drains power from your muscles',
  },
  HOLD: {
    effectType: 'monsterHold',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'annoy',
    requiresLOS: true,
    isBolt: false,
    message: 'stares deep into your eyes',
  },
  FORGET: {
    effectType: 'monsterForget',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'annoy',
    requiresLOS: true,
    isBolt: false,
    message: 'tries to blank your mind',
  },
  DRAIN_MANA: {
    effectType: 'monsterDrainMana',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'annoy',
    requiresLOS: true,
    isBolt: false,
    message: 'draws psychic energy from you',
  },
  MIND_BLAST: {
    effectType: 'monsterMindBlast',
    damageFormula: { type: 'dice', dice: '8d8' },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'gazes at you with psionic energy',
  },
  BRAIN_SMASH: {
    effectType: 'monsterBrainSmash',
    damageFormula: { type: 'dice', dice: '12d15' },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'gazes at you with crushing force',
  },

  // ============================================
  // SUMMON SPELLS
  // ============================================

  S_MONSTER: {
    effectType: 'monsterSummon',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons help',
  },
  S_MONSTERS: {
    effectType: 'monsterSummonMany',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons monsters',
  },
  S_KIN: {
    effectType: 'monsterSummonKin',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons kin',
  },
  S_ANT: {
    effectType: 'monsterSummon',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons ants',
  },
  S_SPIDER: {
    effectType: 'monsterSummon',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons spiders',
  },
  S_HOUND: {
    effectType: 'monsterSummon',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons hounds',
  },
  S_HYDRA: {
    effectType: 'monsterSummon',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons hydras',
  },
  S_ANGEL: {
    effectType: 'monsterSummon',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons an angel',
  },
  S_DEMON: {
    effectType: 'monsterSummon',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons a demon',
  },
  S_UNDEAD: {
    effectType: 'monsterSummon',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons undead',
  },
  S_DRAGON: {
    effectType: 'monsterSummon',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons a dragon',
  },
  S_HI_UNDEAD: {
    effectType: 'monsterSummon',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons greater undead',
  },
  S_HI_DRAGON: {
    effectType: 'monsterSummon',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons ancient dragons',
  },
  S_WRAITH: {
    effectType: 'monsterSummon',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons ringwraiths',
  },
  S_UNIQUE: {
    effectType: 'monsterSummon',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons special opponents',
  },
  S_CYBER: {
    effectType: 'monsterSummon',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons cyberdemons',
  },
  S_HI_DEMON: {
    effectType: 'monsterSummon',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons greater demons',
  },
  S_AINU: {
    effectType: 'monsterSummon',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons ainu',
  },
  S_REAVER: {
    effectType: 'monsterSummon',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'magically summons black reavers',
  },

  // ============================================
  // MISCELLANEOUS
  // ============================================

  SHRIEK: {
    effectType: 'monsterShriek',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'tactical',
    requiresLOS: false,
    isBolt: false,
    message: 'shrieks in pain',
  },
  DARKNESS: {
    effectType: 'monsterDarkness',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'tactical',
    requiresLOS: false,
    isBolt: false,
    message: 'gestures in shadow',
  },
  TRAPS: {
    effectType: 'monsterTraps',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'tactical',
    requiresLOS: false,
    isBolt: false,
    message: 'casts a spell and cackles evilly',
  },
  ANIM_DEAD: {
    effectType: 'monsterAnimateDead',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'animates the dead',
  },
  RAISE_DEAD: {
    effectType: 'monsterRaiseDead',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'summon',
    requiresLOS: false,
    isBolt: false,
    message: 'raises the dead',
  },
  HAND_DOOM: {
    effectType: 'monsterHandDoom',
    damageFormula: { type: 'fixed', value: 0 },
    category: 'attack',
    requiresLOS: true,
    isBolt: false,
    message: 'invokes the hand of doom',
  },
};

/**
 * Get spell definition by flag name
 */
export function getMonsterSpell(flag: string): MonsterSpellDef | undefined {
  return MONSTER_SPELLS[flag];
}

/**
 * Check if a spell flag is known
 */
export function isKnownSpell(flag: string): boolean {
  return flag in MONSTER_SPELLS;
}

/**
 * Get all spells in a given category
 */
export function getSpellsByCategory(category: SpellCategory): string[] {
  return Object.entries(MONSTER_SPELLS)
    .filter(([_, def]) => def.category === category)
    .map(([flag, _]) => flag);
}
