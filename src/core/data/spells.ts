/**
 * Spell and Magic System Data
 *
 * Each spell has per-class requirements (level, mana, fail, exp) embedded.
 * Classes with level=99 cannot learn that spell.
 *
 * ANALYSIS NOTES (for future formula derivation):
 * Partial patterns discovered in the per-class requirements:
 *
 * 1. MANA vs LEVEL:
 *    - Books 1-2 (spells 0-15): mana ≈ level
 *    - Book 3 (spells 16-23): mana ≈ level + 8
 *    - Book 4 (spells 24-31): mana ≈ level + 20
 *    - ~47% of spells fit this pattern within 5 points
 *
 * 2. CLASS MODIFIERS (approximate, for Sorcery realm):
 *    - High-Mage: base (lowest levels)
 *    - Mage: +3 levels avg
 *    - Warrior-Mage: +5 levels avg
 *
 * The data appears to have started from formulas but ~50% was hand-tuned
 * for balance. Future work could derive formulas + override table.
 */

import type { GPEffectDef } from '../systems/effects/GPEffect';

export interface ClassSpellReq {
  level: number;
  mana: number;
  fail: number;
  exp: number;
}

export interface SpellDef {
  key: string;        // Unique slug identifier (e.g., "detect_evil")
  index: number;      // Position within realm (0-31)
  name: string;       // Display name
  classes: Record<string, ClassSpellReq>;
  effects?: GPEffectDef[];  // Spell effects (same format as item effects)
  target?: string;    // Target type: 'self', 'position', 'direction'
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
