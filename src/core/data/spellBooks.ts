/**
 * Spell Book Utilities
 *
 * Maps book item types to realms and spell ranges.
 * In Zangband, each realm has 4 books containing 8 spells each:
 * - Book 1 (sval 0): spells 0-7
 * - Book 2 (sval 1): spells 8-15
 * - Book 3 (sval 2): spells 16-23
 * - Book 4 (sval 3): spells 24-31
 */

/** Book type to realm mapping */
const BOOK_TYPE_TO_REALM: Record<string, string> = {
  life_book: 'life',
  sorcery_book: 'sorcery',
  nature_book: 'nature',
  chaos_book: 'chaos',
  death_book: 'death',
  trump_book: 'trump',
  arcane_book: 'arcane',
};

/** All spell book item types */
export const SPELL_BOOK_TYPES = Object.keys(BOOK_TYPE_TO_REALM);

/**
 * Check if an item type is a spell book
 */
export function isSpellBookType(type: string): boolean {
  return type in BOOK_TYPE_TO_REALM;
}

/**
 * Get the realm for a book type
 * @returns realm name or null if not a book type
 */
export function getBookRealm(bookType: string): string | null {
  return BOOK_TYPE_TO_REALM[bookType] ?? null;
}

/**
 * Get the spell index range for a book (by sval)
 * @param sval Book number (0-3)
 * @returns Array of spell indices [start, end] inclusive
 */
export function getBookSpellRange(sval: number): [number, number] {
  const start = sval * 8;
  const end = start + 7;
  return [start, end];
}

/**
 * Get all spell indices contained in a book
 * @param sval Book number (0-3)
 * @returns Array of 8 spell indices
 */
export function getBookSpellIndices(sval: number): number[] {
  const [start, end] = getBookSpellRange(sval);
  const indices: number[] = [];
  for (let i = start; i <= end; i++) {
    indices.push(i);
  }
  return indices;
}

/**
 * Get book info from an item
 * @returns Object with realm and spellIndices, or null if not a book
 */
export function getBookInfo(item: { type: string; sval: number }): {
  realm: string;
  bookNumber: number;
  spellIndices: number[];
} | null {
  const realm = getBookRealm(item.type);
  if (!realm) return null;

  return {
    realm,
    bookNumber: item.sval + 1, // 1-indexed for display
    spellIndices: getBookSpellIndices(item.sval),
  };
}
