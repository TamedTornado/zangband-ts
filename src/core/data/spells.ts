/**
 * Spell and Magic System Data
 *
 * ANALYSIS NOTES (for future formula derivation):
 * The magic_info table stores [level, mana, fail, exp] per class per realm per spell.
 * Partial patterns discovered:
 *
 * 1. MANA vs LEVEL:
 *    - Books 1-2 (spells 0-15): mana ≈ level
 *    - Book 3 (spells 16-23): mana ≈ level + 8
 *    - Book 4 (spells 24-31): mana ≈ level + 20
 *    - ~47% of spells fit this pattern within 5 points
 *    - High-power "ultimate" spells are outliers (100 mana cost)
 *
 * 2. FAIL values cluster around multiples of 5 (20, 25, 30... 95)
 *
 * 3. CLASS MODIFIERS (approximate, for Sorcery realm):
 *    - High-Mage: base (lowest levels)
 *    - Mage: +3 levels avg
 *    - Warrior-Mage: +5 levels avg
 *    - Priest: +6 levels avg
 *    - Ranger: +11 levels avg
 *    - Rogue: +10 levels avg
 *
 * The data appears to have started from formulas but ~50% was hand-tuned
 * for balance. Future work could derive formulas + override table.
 */

export interface SpellDef {
  index: number;
  name: string;
}

export type RealmSpells = SpellDef[];

export interface SpellRecord {
  life: RealmSpells;
  sorcery: RealmSpells;
  nature: RealmSpells;
  chaos: RealmSpells;
  death: RealmSpells;
  trump: RealmSpells;
  arcane: RealmSpells;
}

/** [level, mana, fail, exp] per spell */
export type SpellStats = [number, number, number, number];

export interface ClassMagic {
  spellStat: string;
  spellFirst: number;
  spellWeight: number;
  realms: {
    life: SpellStats[];
    sorcery: SpellStats[];
    nature: SpellStats[];
    chaos: SpellStats[];
    death: SpellStats[];
    trump: SpellStats[];
    arcane: SpellStats[];
  };
}

export type MagicRecord = Record<string, ClassMagic>;
