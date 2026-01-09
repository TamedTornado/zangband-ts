import { describe, it, expect } from 'vitest';
import { Player } from '@/core/entities/Player';
import type { ClassDef } from '@/core/data/classes';

// Test fixtures
const mageClass: ClassDef = {
  index: 1,
  name: 'Mage',
  stats: { str: -5, int: 3, wis: 0, dex: 1, con: -2, chr: 1 },
  skills: { disarm: 30, device: 36, save: 30, stealth: 2, search: 16, searchFreq: 20, melee: 10, ranged: 10 },
  xSkills: { disarm: 7, device: 13, save: 12, stealth: 0, search: 0, searchFreq: 0, melee: 25, ranged: 14 },
  hitDie: 0,
  expMod: 30,
  petUpkeepDiv: 15,
  heavySense: false,
  spellStat: 'int',
  spellFirst: 1,
  spellWeight: 300,
  realms: ['life', 'sorcery', 'nature', 'chaos', 'death', 'trump', 'arcane'],
  secondaryRealm: true,
};

const warriorClass: ClassDef = {
  index: 0,
  name: 'Warrior',
  stats: { str: 5, int: -2, wis: -2, dex: 2, con: 2, chr: -1 },
  skills: { disarm: 25, device: 18, save: 18, stealth: 1, search: 14, searchFreq: 2, melee: 25, ranged: 17 },
  xSkills: { disarm: 12, device: 7, save: 14, stealth: 0, search: 0, searchFreq: 0, melee: 100, ranged: 55 },
  hitDie: 9,
  expMod: 0,
  petUpkeepDiv: 20,
  heavySense: true,
  spellStat: null,
  spellFirst: null,
  spellWeight: null,
  realms: [],
  secondaryRealm: false,
};

const highMageClass: ClassDef = {
  index: 10,
  name: 'High-Mage',
  stats: { str: -5, int: 4, wis: 0, dex: 0, con: -2, chr: 1 },
  skills: { disarm: 30, device: 36, save: 30, stealth: 2, search: 16, searchFreq: 20, melee: 10, ranged: 10 },
  xSkills: { disarm: 7, device: 13, save: 12, stealth: 0, search: 0, searchFreq: 0, melee: 15, ranged: 10 },
  hitDie: 0,
  expMod: 30,
  petUpkeepDiv: 12,
  heavySense: false,
  spellStat: 'int',
  spellFirst: 1,
  spellWeight: 300,
  realms: ['life', 'sorcery', 'nature', 'chaos', 'death', 'trump', 'arcane'],
  secondaryRealm: false,
  manaBonus: 1.25,
};

function createMage(overrides: Partial<{ int: number; level: number }> = {}) {
  return new Player({
    id: 'test-mage',
    position: { x: 0, y: 0 },
    maxHp: 50,
    speed: 110,
    stats: { str: 10, int: overrides.int ?? 16, wis: 10, dex: 10, con: 10, chr: 10 },
    classDef: mageClass,
    level: overrides.level ?? 1,
    primaryRealm: 'sorcery',
  });
}

function createWarrior() {
  return new Player({
    id: 'test-warrior',
    position: { x: 0, y: 0 },
    maxHp: 100,
    speed: 110,
    stats: { str: 16, int: 10, wis: 10, dex: 14, con: 15, chr: 10 },
    classDef: warriorClass,
  });
}

function createHighMage(overrides: Partial<{ int: number; level: number }> = {}) {
  return new Player({
    id: 'test-high-mage',
    position: { x: 0, y: 0 },
    maxHp: 40,
    speed: 110,
    stats: { str: 10, int: overrides.int ?? 18, wis: 10, dex: 10, con: 10, chr: 10 },
    classDef: highMageClass,
    level: overrides.level ?? 1,
    primaryRealm: 'sorcery',
  });
}

describe('Player Mana Pool', () => {
  describe('mana calculation', () => {
    it('should have 0 mana for non-caster classes', () => {
      const warrior = createWarrior();
      expect(warrior.maxMana).toBe(0);
      expect(warrior.currentMana).toBe(0);
    });

    it('should have positive mana for caster classes', () => {
      const mage = createMage();
      expect(mage.maxMana).toBeGreaterThan(0);
      expect(mage.currentMana).toBe(mage.maxMana);
    });

    it('should scale mana with level', () => {
      const mageLevel1 = createMage({ level: 1 });
      const mageLevel10 = createMage({ level: 10 });
      expect(mageLevel10.maxMana).toBeGreaterThan(mageLevel1.maxMana);
    });

    it('should scale mana with INT for INT-based casters', () => {
      const lowInt = createMage({ int: 10 });
      const highInt = createMage({ int: 18 });
      expect(highInt.maxMana).toBeGreaterThan(lowInt.maxMana);
    });

    it('should apply mana bonus for high-mage', () => {
      const mage = createMage({ int: 16, level: 10 });
      const highMage = createHighMage({ int: 16, level: 10 });
      // High mage has 1.25x mana bonus
      expect(highMage.maxMana).toBeGreaterThan(mage.maxMana);
    });
  });

  describe('spendMana', () => {
    it('should reduce current mana when spending', () => {
      const mage = createMage({ level: 10 }); // Higher level for more mana
      const startMana = mage.currentMana;
      const success = mage.spendMana(5);
      expect(success).toBe(true);
      expect(mage.currentMana).toBe(startMana - 5);
    });

    it('should return false when not enough mana', () => {
      const mage = createMage();
      const success = mage.spendMana(mage.maxMana + 10);
      expect(success).toBe(false);
      expect(mage.currentMana).toBe(mage.maxMana); // Unchanged
    });

    it('should allow spending exactly all mana', () => {
      const mage = createMage();
      const success = mage.spendMana(mage.maxMana);
      expect(success).toBe(true);
      expect(mage.currentMana).toBe(0);
    });
  });

  describe('restoreMana', () => {
    it('should restore mana up to max', () => {
      const mage = createMage({ level: 10 });
      mage.spendMana(10);
      const afterSpend = mage.currentMana;
      mage.restoreMana(5);
      expect(mage.currentMana).toBe(afterSpend + 5);
    });

    it('should not exceed max mana', () => {
      const mage = createMage();
      mage.restoreMana(1000);
      expect(mage.currentMana).toBe(mage.maxMana);
    });
  });

  describe('regenerateMana', () => {
    it('should regenerate mana each call', () => {
      const mage = createMage({ level: 10 });
      mage.spendMana(mage.maxMana); // Deplete
      expect(mage.currentMana).toBe(0);
      mage.regenerateMana();
      expect(mage.currentMana).toBeGreaterThan(0);
    });

    it('should not regenerate past max', () => {
      const mage = createMage();
      for (let i = 0; i < 200; i++) {
        mage.regenerateMana();
      }
      expect(mage.currentMana).toBe(mage.maxMana);
    });

    it('should do nothing for non-casters', () => {
      const warrior = createWarrior();
      warrior.regenerateMana();
      expect(warrior.currentMana).toBe(0);
    });
  });

  describe('level changes', () => {
    it('should recalculate max mana when level increases', () => {
      const mage = createMage({ level: 1 });
      const manaAtLevel1 = mage.maxMana;
      mage.level = 5;
      expect(mage.maxMana).toBeGreaterThan(manaAtLevel1);
    });

    it('should NOT restore mana on level up (Zangband behavior)', () => {
      const mage = createMage({ level: 1 });
      mage.spendMana(Math.floor(mage.maxMana / 2)); // Spend half
      const manaBeforeLevelUp = mage.currentMana;
      mage.level = 5;
      // In Zangband, leveling up doesn't restore mana - max increases but current stays same
      expect(mage.currentMana).toBe(manaBeforeLevelUp);
      expect(mage.maxMana).toBeGreaterThan(manaBeforeLevelUp); // Max did increase
    });
  });
});

describe('Player Realm and Spell Tracking', () => {
  describe('realm assignment', () => {
    it('should track primary realm', () => {
      const mage = new Player({
        id: 'test',
        position: { x: 0, y: 0 },
        maxHp: 50,
        speed: 110,
        stats: { str: 10, int: 16, wis: 10, dex: 10, con: 10, chr: 10 },
        classDef: mageClass,
        primaryRealm: 'sorcery',
      });
      expect(mage.primaryRealm).toBe('sorcery');
    });

    it('should track secondary realm', () => {
      const mage = new Player({
        id: 'test',
        position: { x: 0, y: 0 },
        maxHp: 50,
        speed: 110,
        stats: { str: 10, int: 16, wis: 10, dex: 10, con: 10, chr: 10 },
        classDef: mageClass,
        primaryRealm: 'sorcery',
        secondaryRealm: 'chaos',
      });
      expect(mage.secondaryRealm).toBe('chaos');
    });

    it('should have null realms for non-casters', () => {
      const warrior = createWarrior();
      expect(warrior.primaryRealm).toBeNull();
      expect(warrior.secondaryRealm).toBeNull();
    });
  });

  describe('spell learning', () => {
    it('should start with no known spells', () => {
      const mage = createMage();
      expect(mage.knownSpells).toHaveLength(0);
      expect(mage.knownSpellCount).toBe(0);
    });

    it('should learn spells in a realm', () => {
      const mage = createMage();
      mage.learnSpell('sorcery', 'detect_monsters');
      expect(mage.knowsSpell('sorcery', 'detect_monsters')).toBe(true);
      expect(mage.knownSpellCount).toBe(1);
    });

    it('should not double-learn spells', () => {
      const mage = createMage();
      mage.learnSpell('sorcery', 'detect_monsters');
      mage.learnSpell('sorcery', 'detect_monsters');
      expect(mage.knownSpellCount).toBe(1);
    });

    it('should track spells per realm', () => {
      const mage = createMage();
      mage.learnSpell('sorcery', 'detect_monsters');
      mage.learnSpell('sorcery', 'phase_door');
      mage.learnSpell('chaos', 'magic_missile');

      expect(mage.getKnownSpellsInRealm('sorcery')).toHaveLength(2);
      expect(mage.getKnownSpellsInRealm('chaos')).toHaveLength(1);
      expect(mage.knownSpellCount).toBe(3);
    });

    it('should return empty array for unknown realm', () => {
      const mage = createMage();
      expect(mage.getKnownSpellsInRealm('trump')).toHaveLength(0);
    });

    it('should aggregate all known spells', () => {
      const mage = createMage();
      mage.learnSpell('sorcery', 'detect_monsters');
      mage.learnSpell('chaos', 'magic_missile');

      const allSpells = mage.knownSpells;
      expect(allSpells).toContain('detect_monsters');
      expect(allSpells).toContain('magic_missile');
    });
  });
});
