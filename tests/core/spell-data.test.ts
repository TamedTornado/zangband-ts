import { describe, it, expect } from 'vitest';
import { type SpellRecord } from '@/core/data/spells';
import spellsJson from '@/data/spells/spells.json';
import {
  isSpellBookType,
  getBookRealm,
  getBookSpellRange,
  getBookSpellIndices,
  getBookInfo,
} from '@/core/data/spellBooks';
import {
  getRealmSpells,
  getSpellByIndex,
  getSpellByKey,
  getBookSpells,
  canClassLearnSpell,
} from '@/core/data/spellLoader';

const spells = spellsJson as SpellRecord;

describe('spells data', () => {
  it('should have all 7 realms', () => {
    expect(Object.keys(spells).length).toBe(7);
    expect(spells.life).toBeDefined();
    expect(spells.sorcery).toBeDefined();
    expect(spells.nature).toBeDefined();
    expect(spells.chaos).toBeDefined();
    expect(spells.death).toBeDefined();
    expect(spells.trump).toBeDefined();
    expect(spells.arcane).toBeDefined();
  });

  it('should have 32 spells per realm', () => {
    expect(spells.life.length).toBe(32);
    expect(spells.sorcery.length).toBe(32);
    expect(spells.nature.length).toBe(32);
    expect(spells.chaos.length).toBe(32);
    expect(spells.death.length).toBe(32);
    expect(spells.trump.length).toBe(32);
    expect(spells.arcane.length).toBe(32);
  });


});

describe('spell class requirements (merged from magic_info)', () => {
  it('should have 11 classes per spell', () => {
    expect(Object.keys(spells.life[0].classes).length).toBe(11);
  });

  it('should have all class keys', () => {
    const classKeys = Object.keys(spells.life[0].classes);
    expect(classKeys).toContain('warrior');
    expect(classKeys).toContain('mage');
    expect(classKeys).toContain('priest');
    expect(classKeys).toContain('high_mage');
  });

  // Spot-checks against tables.c:2245+ to verify extraction
  it('should match Mage Life spell 0 from tables.c:2539', () => {
    // { 1, 1, 30, 4 } = level, mana, fail, exp
    expect(spells.life[0].classes['mage']).toEqual({ level: 1, mana: 1, fail: 30, exp: 4 });
  });

  it('should match Mage Sorcery spell 0 from tables.c:2579', () => {
    // { 1, 1, 23, 4 }
    expect(spells.sorcery[0].classes['mage']).toEqual({ level: 1, mana: 1, fail: 23, exp: 4 });
  });

  it('should match Priest Life spell 0 (native realm)', () => {
    // Priest gets Life spells at level 1
    expect(spells.life[0].classes['priest'].level).toBe(1);
  });

  it('should show Warrior cannot cast (level 99)', () => {
    expect(spells.life[0].classes['warrior'].level).toBe(99);
    expect(spells.sorcery[0].classes['warrior'].level).toBe(99);
  });

  it('should show High-Mage has lower requirements than Mage', () => {
    // High-Mage typically has lower fail rates
    expect(spells.life[0].classes['high_mage'].fail).toBeLessThan(spells.life[0].classes['mage'].fail);
  });
});

describe('spell book utilities', () => {
  it('isSpellBookType returns true for book types', () => {
    expect(isSpellBookType('life_book')).toBe(true);
    expect(isSpellBookType('sorcery_book')).toBe(true);
  });

  it('isSpellBookType returns false for non-book types', () => {
    expect(isSpellBookType('potion')).toBe(false);
    expect(isSpellBookType('sword')).toBe(false);
  });

  it('getBookRealm extracts realm from book type', () => {
    expect(getBookRealm('life_book')).toBe('life');
    expect(getBookRealm('chaos_book')).toBe('chaos');
    expect(getBookRealm('potion')).toBeNull();
  });

  it('getBookSpellRange returns correct indices for each sval', () => {
    expect(getBookSpellRange(0)).toEqual([0, 7]);
    expect(getBookSpellRange(1)).toEqual([8, 15]);
    expect(getBookSpellRange(2)).toEqual([16, 23]);
    expect(getBookSpellRange(3)).toEqual([24, 31]);
  });

  it('getBookSpellIndices returns 8 consecutive indices', () => {
    expect(getBookSpellIndices(0)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(getBookSpellIndices(2)).toEqual([16, 17, 18, 19, 20, 21, 22, 23]);
  });

  it('getBookInfo combines realm and spell indices', () => {
    const info = getBookInfo({ type: 'sorcery_book', sval: 1 });
    expect(info?.realm).toBe('sorcery');
    expect(info?.bookNumber).toBe(2);
    expect(info?.spellIndices).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
  });

  it('getBookInfo returns null for non-books', () => {
    expect(getBookInfo({ type: 'potion', sval: 0 })).toBeNull();
  });
});

describe('spell loader', () => {
  it('getRealmSpells returns all spells for a realm', () => {
    expect(getRealmSpells('life')).toHaveLength(32);
    expect(getRealmSpells('invalid')).toHaveLength(0);
  });

  it('getSpellByIndex finds spell by realm and index', () => {
    const spell = getSpellByIndex('life', 0);
    expect(spell?.key).toBe('detect_evil');
    expect(getSpellByIndex('life', 99)).toBeNull();
  });

  it('getSpellByKey finds spell by realm and key', () => {
    const spell = getSpellByKey('life', 'cure_light_wounds');
    expect(spell?.index).toBe(1);
    expect(getSpellByKey('life', 'nonexistent')).toBeNull();
  });

  it('getBookSpells returns 8 spells for book sval', () => {
    const book1Spells = getBookSpells('sorcery', 0);
    expect(book1Spells).toHaveLength(8);
    expect(book1Spells.every(s => s.index >= 0 && s.index <= 7)).toBe(true);
  });

  it('canClassLearnSpell checks level requirement', () => {
    const detectEvil = getSpellByKey('life', 'detect_evil')!;
    expect(canClassLearnSpell(detectEvil, 'priest')).toBe(true);
    expect(canClassLearnSpell(detectEvil, 'warrior')).toBe(false);
  });
});

describe('spell effects (book 1)', () => {
  it('life book 1 spells have effects', () => {
    const detectEvil = getSpellByKey('life', 'detect_evil')!;
    expect(detectEvil.effects).toBeDefined();
    expect(detectEvil.effects![0].type).toBe('detect');
  });

  it('chaos book 1 has offensive spells with position target', () => {
    const magicMissile = getSpellByKey('chaos', 'magic_missile')!;
    expect(magicMissile.target).toBe('position');
    expect(magicMissile.effects![0].type).toBe('bolt');
  });

  it('self-targeted spells have self target', () => {
    const cureLightWounds = getSpellByKey('life', 'cure_light_wounds')!;
    expect(cureLightWounds.target).toBe('self');
    expect(cureLightWounds.effects![0].type).toBe('heal');
  });
});
