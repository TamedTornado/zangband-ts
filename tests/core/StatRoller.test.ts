import { describe, it, expect } from 'vitest';
import {
  rollBaseStats,
  applyStatBonuses,
  meetsMinimums,
  canSelectClass,
  getValidClasses,
  generatePhysicalAttributes,
  calculateStartingHP,
} from '@/core/systems/StatRoller';
import type { Stats } from '@/core/entities/Player';
import type { RaceDef } from '@/core/data/races';
import type { ClassDef } from '@/core/data/classes';
import racesData from '@/data/races/races.json';
import classesData from '@/data/classes/classes.json';
import { RNG } from 'rot-js';

describe('StatRoller', () => {
  describe('rollBaseStats', () => {
    it('produces stats in valid range (8-17 per stat)', () => {
      // Roll many times to verify range
      for (let i = 0; i < 100; i++) {
        const stats = rollBaseStats(RNG);

        expect(stats.str).toBeGreaterThanOrEqual(8);
        expect(stats.str).toBeLessThanOrEqual(17);
        expect(stats.int).toBeGreaterThanOrEqual(8);
        expect(stats.int).toBeLessThanOrEqual(17);
        expect(stats.wis).toBeGreaterThanOrEqual(8);
        expect(stats.wis).toBeLessThanOrEqual(17);
        expect(stats.dex).toBeGreaterThanOrEqual(8);
        expect(stats.dex).toBeLessThanOrEqual(17);
        expect(stats.con).toBeGreaterThanOrEqual(8);
        expect(stats.con).toBeLessThanOrEqual(17);
        expect(stats.chr).toBeGreaterThanOrEqual(8);
        expect(stats.chr).toBeLessThanOrEqual(17);
      }
    });

    it('produces total of base stats in reasonable range (48-102)', () => {
      for (let i = 0; i < 100; i++) {
        const stats = rollBaseStats(RNG);
        const total = stats.str + stats.int + stats.wis + stats.dex + stats.con + stats.chr;

        // 6 stats * 8 min = 48, 6 stats * 17 max = 102
        expect(total).toBeGreaterThanOrEqual(48);
        expect(total).toBeLessThanOrEqual(102);
      }
    });

    it('produces varied results (not deterministic)', () => {
      const results: Stats[] = [];
      for (let i = 0; i < 10; i++) {
        results.push(rollBaseStats(RNG));
      }

      // Check that not all STR values are identical
      const strValues = results.map((s) => s.str);
      const uniqueStr = new Set(strValues);
      expect(uniqueStr.size).toBeGreaterThan(1);
    });
  });

  describe('applyStatBonuses', () => {
    it('correctly adds race + class modifiers', () => {
      const baseStats: Stats = { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 };

      // Warrior: str+5, int-2, wis-2, dex+2, con+2, chr-1
      const warrior = classesData.warrior as ClassDef;
      // Human: all zeros
      const human = racesData.human as RaceDef;

      const result = applyStatBonuses(baseStats, human, warrior);

      expect(result.str).toBe(15); // 10 + 0 + 5
      expect(result.int).toBe(8); // 10 + 0 - 2
      expect(result.wis).toBe(8); // 10 + 0 - 2
      expect(result.dex).toBe(12); // 10 + 0 + 2
      expect(result.con).toBe(12); // 10 + 0 + 2
      expect(result.chr).toBe(9); // 10 + 0 - 1
    });

    it('stacks race and class bonuses', () => {
      const baseStats: Stats = { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 };

      // Mage: str-5, int+3, wis+0, dex+1, con-2, chr+1
      const mage = classesData.mage as ClassDef;
      // Elf: str-1, int+2, wis+2, dex+1, con-2, chr+2
      const elf = racesData.elf as RaceDef;

      const result = applyStatBonuses(baseStats, elf, mage);

      expect(result.str).toBe(4); // 10 - 1 - 5
      expect(result.int).toBe(15); // 10 + 2 + 3
      expect(result.wis).toBe(12); // 10 + 2 + 0
      expect(result.dex).toBe(12); // 10 + 1 + 1
      expect(result.con).toBe(6); // 10 - 2 - 2
      expect(result.chr).toBe(13); // 10 + 2 + 1
    });

    it('does not modify the original baseStats object', () => {
      const baseStats: Stats = { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 };
      const warrior = classesData.warrior as ClassDef;
      const human = racesData.human as RaceDef;

      applyStatBonuses(baseStats, human, warrior);

      expect(baseStats.str).toBe(10);
      expect(baseStats.int).toBe(10);
    });
  });

  describe('meetsMinimums', () => {
    it('returns true when all stats >= minimums', () => {
      const stats: Stats = { str: 15, int: 12, wis: 10, dex: 14, con: 13, chr: 11 };
      const minimums = { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 };

      expect(meetsMinimums(stats, minimums)).toBe(true);
    });

    it('returns true when stats exactly equal minimums', () => {
      const stats: Stats = { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 };
      const minimums = { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 };

      expect(meetsMinimums(stats, minimums)).toBe(true);
    });

    it('returns false when any stat < minimum', () => {
      const stats: Stats = { str: 15, int: 12, wis: 9, dex: 14, con: 13, chr: 11 };
      const minimums = { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 };

      expect(meetsMinimums(stats, minimums)).toBe(false);
    });

    it('returns false when multiple stats < minimum', () => {
      const stats: Stats = { str: 8, int: 8, wis: 8, dex: 8, con: 8, chr: 8 };
      const minimums = { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 };

      expect(meetsMinimums(stats, minimums)).toBe(false);
    });
  });

  describe('canSelectClass', () => {
    it('Human can be all classes (classChoice 2047 = 0b11111111111)', () => {
      const human = racesData.human as RaceDef;

      // Test all 11 classes
      expect(canSelectClass(human, classesData.warrior as ClassDef)).toBe(true);
      expect(canSelectClass(human, classesData.mage as ClassDef)).toBe(true);
      expect(canSelectClass(human, classesData.priest as ClassDef)).toBe(true);
      expect(canSelectClass(human, classesData.rogue as ClassDef)).toBe(true);
      expect(canSelectClass(human, classesData.ranger as ClassDef)).toBe(true);
      expect(canSelectClass(human, classesData.paladin as ClassDef)).toBe(true);
      expect(canSelectClass(human, classesData.warrior_mage as ClassDef)).toBe(true);
      expect(canSelectClass(human, classesData.chaos_warrior as ClassDef)).toBe(true);
      expect(canSelectClass(human, classesData.monk as ClassDef)).toBe(true);
      expect(canSelectClass(human, classesData.mindcrafter as ClassDef)).toBe(true);
      expect(canSelectClass(human, classesData.high_mage as ClassDef)).toBe(true);
    });

    it('Half-Troll cannot be Mage (classChoice 5 = 0b101)', () => {
      const halfTroll = racesData.half_troll as RaceDef;

      // classChoice 5 = binary 101 = index 0 (Warrior) and index 2 (Priest)
      expect(canSelectClass(halfTroll, classesData.warrior as ClassDef)).toBe(true); // index 0
      expect(canSelectClass(halfTroll, classesData.mage as ClassDef)).toBe(false); // index 1
      expect(canSelectClass(halfTroll, classesData.priest as ClassDef)).toBe(true); // index 2
      expect(canSelectClass(halfTroll, classesData.rogue as ClassDef)).toBe(false); // index 3
    });

    it('Dwarf has limited class options (classChoice 5)', () => {
      const dwarf = racesData.dwarf as RaceDef;

      expect(canSelectClass(dwarf, classesData.warrior as ClassDef)).toBe(true);
      expect(canSelectClass(dwarf, classesData.mage as ClassDef)).toBe(false);
      expect(canSelectClass(dwarf, classesData.priest as ClassDef)).toBe(true);
    });
  });

  describe('getValidClasses', () => {
    it('returns all classes for Human', () => {
      const human = racesData.human as RaceDef;
      const validClasses = getValidClasses(human, classesData as Record<string, ClassDef>);

      expect(validClasses.length).toBe(11);
    });

    it('returns filtered list for Half-Troll', () => {
      const halfTroll = racesData.half_troll as RaceDef;
      const validClasses = getValidClasses(halfTroll, classesData as Record<string, ClassDef>);

      // classChoice 5 = Warrior (0) and Priest (2)
      expect(validClasses.length).toBe(2);
      expect(validClasses.some((c) => c.name === 'Warrior')).toBe(true);
      expect(validClasses.some((c) => c.name === 'Priest')).toBe(true);
      expect(validClasses.some((c) => c.name === 'Mage')).toBe(false);
    });

    it('returns classes in consistent order', () => {
      const human = racesData.human as RaceDef;
      const validClasses1 = getValidClasses(human, classesData as Record<string, ClassDef>);
      const validClasses2 = getValidClasses(human, classesData as Record<string, ClassDef>);

      expect(validClasses1.map((c) => c.name)).toEqual(validClasses2.map((c) => c.name));
    });
  });

  describe('generatePhysicalAttributes', () => {
    it('produces age in valid range', () => {
      const human = racesData.human as RaceDef;
      // Human age: base 14, mod 6 -> range 14-20

      for (let i = 0; i < 50; i++) {
        const attrs = generatePhysicalAttributes(RNG, human, 'male');
        expect(attrs.age).toBeGreaterThanOrEqual(14);
        expect(attrs.age).toBeLessThanOrEqual(20);
      }
    });

    it('produces height around race base (male)', () => {
      const human = racesData.human as RaceDef;
      // Human male height: base 72, mod 6

      const heights: number[] = [];
      for (let i = 0; i < 100; i++) {
        const attrs = generatePhysicalAttributes(RNG, human, 'male');
        heights.push(attrs.height);
      }

      const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
      // Average should be close to base
      expect(avgHeight).toBeGreaterThan(68);
      expect(avgHeight).toBeLessThan(76);
    });

    it('produces height around race base (female)', () => {
      const human = racesData.human as RaceDef;
      // Human female height: base 66, mod 4

      const heights: number[] = [];
      for (let i = 0; i < 100; i++) {
        const attrs = generatePhysicalAttributes(RNG, human, 'female');
        heights.push(attrs.height);
      }

      const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
      // Average should be close to base
      expect(avgHeight).toBeGreaterThan(62);
      expect(avgHeight).toBeLessThan(70);
    });

    it('produces weight around race base', () => {
      const human = racesData.human as RaceDef;
      // Human male weight: base 180, mod 25

      const weights: number[] = [];
      for (let i = 0; i < 100; i++) {
        const attrs = generatePhysicalAttributes(RNG, human, 'male');
        weights.push(attrs.weight);
      }

      const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
      // Average should be close to base
      expect(avgWeight).toBeGreaterThan(150);
      expect(avgWeight).toBeLessThan(210);
    });

    it('male and female have different height/weight distributions', () => {
      const human = racesData.human as RaceDef;

      const maleHeights: number[] = [];
      const femaleHeights: number[] = [];

      for (let i = 0; i < 50; i++) {
        maleHeights.push(generatePhysicalAttributes(RNG, human, 'male').height);
        femaleHeights.push(generatePhysicalAttributes(RNG, human, 'female').height);
      }

      const avgMale = maleHeights.reduce((a, b) => a + b, 0) / maleHeights.length;
      const avgFemale = femaleHeights.reduce((a, b) => a + b, 0) / femaleHeights.length;

      // Males should be taller on average for humans
      expect(avgMale).toBeGreaterThan(avgFemale);
    });
  });

  describe('calculateStartingHP', () => {
    it('correctly combines race + class hit dice', () => {
      // Human hitDie: 10, Warrior hitDie: 9
      const human = racesData.human as RaceDef;
      const warrior = classesData.warrior as ClassDef;

      const hp = calculateStartingHP(human, warrior);
      expect(hp).toBe(19); // 10 + 9
    });

    it('calculates correctly for different race/class combinations', () => {
      // Elf hitDie: 8, Mage hitDie: 0
      const elf = racesData.elf as RaceDef;
      const mage = classesData.mage as ClassDef;

      const hp = calculateStartingHP(elf, mage);
      expect(hp).toBe(8); // 8 + 0
    });

    it('calculates correctly for high HP race/class', () => {
      // Half-Troll hitDie: 12, Warrior hitDie: 9
      const halfTroll = racesData.half_troll as RaceDef;
      const warrior = classesData.warrior as ClassDef;

      const hp = calculateStartingHP(halfTroll, warrior);
      expect(hp).toBe(21); // 12 + 9
    });
  });
});
