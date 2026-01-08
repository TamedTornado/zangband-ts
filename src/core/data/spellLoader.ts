/**
 * Spell Data Loader
 *
 * Provides access to spell definitions from the JSON data.
 */

import type { SpellDef, SpellRecord } from './spells';
import spellsData from '@/data/spells/spells.json';

// Type assertion for loaded data
const spells = spellsData as unknown as SpellRecord;

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
