/**
 * Spell Data Loader
 *
 * Provides access to spell definitions from the JSON data.
 * Spells are split into 28 files (7 realms × 4 books) for maintainability.
 */

import type { SpellDef, SpellRecord } from './spells';

// Import all spell book files
import lifeBook1 from '@/data/spells/life_book_1.json';
import lifeBook2 from '@/data/spells/life_book_2.json';
import lifeBook3 from '@/data/spells/life_book_3.json';
import lifeBook4 from '@/data/spells/life_book_4.json';
import sorceryBook1 from '@/data/spells/sorcery_book_1.json';
import sorceryBook2 from '@/data/spells/sorcery_book_2.json';
import sorceryBook3 from '@/data/spells/sorcery_book_3.json';
import sorceryBook4 from '@/data/spells/sorcery_book_4.json';
import natureBook1 from '@/data/spells/nature_book_1.json';
import natureBook2 from '@/data/spells/nature_book_2.json';
import natureBook3 from '@/data/spells/nature_book_3.json';
import natureBook4 from '@/data/spells/nature_book_4.json';
import chaosBook1 from '@/data/spells/chaos_book_1.json';
import chaosBook2 from '@/data/spells/chaos_book_2.json';
import chaosBook3 from '@/data/spells/chaos_book_3.json';
import chaosBook4 from '@/data/spells/chaos_book_4.json';
import deathBook1 from '@/data/spells/death_book_1.json';
import deathBook2 from '@/data/spells/death_book_2.json';
import deathBook3 from '@/data/spells/death_book_3.json';
import deathBook4 from '@/data/spells/death_book_4.json';
import trumpBook1 from '@/data/spells/trump_book_1.json';
import trumpBook2 from '@/data/spells/trump_book_2.json';
import trumpBook3 from '@/data/spells/trump_book_3.json';
import trumpBook4 from '@/data/spells/trump_book_4.json';
import arcaneBook1 from '@/data/spells/arcane_book_1.json';
import arcaneBook2 from '@/data/spells/arcane_book_2.json';
import arcaneBook3 from '@/data/spells/arcane_book_3.json';
import arcaneBook4 from '@/data/spells/arcane_book_4.json';

// Merge books into realms
const spells: SpellRecord = {
  life: [...lifeBook1, ...lifeBook2, ...lifeBook3, ...lifeBook4] as SpellDef[],
  sorcery: [...sorceryBook1, ...sorceryBook2, ...sorceryBook3, ...sorceryBook4] as SpellDef[],
  nature: [...natureBook1, ...natureBook2, ...natureBook3, ...natureBook4] as SpellDef[],
  chaos: [...chaosBook1, ...chaosBook2, ...chaosBook3, ...chaosBook4] as SpellDef[],
  death: [...deathBook1, ...deathBook2, ...deathBook3, ...deathBook4] as SpellDef[],
  trump: [...trumpBook1, ...trumpBook2, ...trumpBook3, ...trumpBook4] as SpellDef[],
  arcane: [...arcaneBook1, ...arcaneBook2, ...arcaneBook3, ...arcaneBook4] as SpellDef[],
};

/**
 * Get all spells in a realm
 */
export function getRealmSpells(realm: string): SpellDef[] {
  return spells[realm as keyof SpellRecord] ?? [];
}

/**
 * Get a spell by realm and index
 */
export function getSpellByIndex(realm: string, index: number): SpellDef | null {
  const realmSpells = getRealmSpells(realm);
  return realmSpells.find(s => s.index === index) ?? null;
}

/**
 * Get a spell by realm and key
 */
export function getSpellByKey(realm: string, key: string): SpellDef | null {
  const realmSpells = getRealmSpells(realm);
  return realmSpells.find(s => s.key === key) ?? null;
}

/**
 * Get spells for a specific book (by sval)
 * @param realm The magic realm
 * @param sval Book number (0-3)
 * @returns Array of 8 spells for that book
 */
export function getBookSpells(realm: string, sval: number): SpellDef[] {
  const realmSpells = getRealmSpells(realm);
  const startIndex = sval * 8;
  const endIndex = startIndex + 7;
  return realmSpells.filter(s => s.index >= startIndex && s.index <= endIndex);
}

/**
 * Get all available realms
 */
export function getAllRealms(): string[] {
  return Object.keys(spells);
}

/**
 * Check if a class can learn a spell
 * @returns true if the class has a non-99 level requirement
 */
export function canClassLearnSpell(spell: SpellDef, classKey: string): boolean {
  const req = spell.classes[classKey];
  return req && req.level < 99;
}

/**
 * Get the spell requirement for a class
 */
export function getSpellRequirement(spell: SpellDef, classKey: string) {
  return spell.classes[classKey] ?? null;
}
