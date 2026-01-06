import { describe, it, expect } from 'vitest';
import { RNG } from 'rot-js';
import { Character, type CharacterConfig } from '@/core/systems/Character';
import type { RaceDef } from '@/core/data/races';
import type { ClassDef } from '@/core/data/classes';

// Test fixtures
const humanRace: RaceDef = {
  index: 0,
  name: 'Human',
  stats: { str: 0, int: 0, wis: 0, dex: 0, con: 0, chr: 0 },
  skills: { disarm: 0, device: 0, save: 0, stealth: 0, search: 0, searchFreq: 10, melee: 0, ranged: 0 },
  hitDie: 10,
  expMod: 100,
  age: { base: 14, mod: 6 },
  male: { height: { base: 72, mod: 6 }, weight: { base: 180, mod: 25 } },
  female: { height: { base: 66, mod: 4 }, weight: { base: 150, mod: 20 } },
  infravision: 0,
  classChoice: 2047,
};

const elfRace: RaceDef = {
  index: 2,
  name: 'Elf',
  stats: { str: -1, int: 2, wis: 2, dex: 1, con: -2, chr: 2 },
  skills: { disarm: 5, device: 6, save: 6, stealth: 2, search: 8, searchFreq: 12, melee: -6, ranged: 6 },
  hitDie: 8,
  expMod: 120,
  age: { base: 75, mod: 75 },
  male: { height: { base: 60, mod: 4 }, weight: { base: 100, mod: 6 } },
  female: { height: { base: 54, mod: 4 }, weight: { base: 80, mod: 6 } },
  infravision: 3,
  classChoice: 1887,
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
};

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
};

function createTestConfig(overrides: Partial<CharacterConfig> = {}): CharacterConfig {
  // Use seeded RNG for deterministic tests
  RNG.setSeed(12345);
  return {
    name: 'Test Hero',
    race: humanRace,
    class_: warriorClass,
    gender: 'male',
    baseStats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
    rng: RNG,
    ...overrides,
  };
}

describe('Character', () => {
  describe('creation', () => {
    it('should create a character with name, race, and class', () => {
      const char = new Character(createTestConfig());
      expect(char.name).toBe('Test Hero');
      expect(char.race.name).toBe('Human');
      expect(char.class_.name).toBe('Warrior');
    });

    it('should start at level 1 with 0 experience', () => {
      const char = new Character(createTestConfig());
      expect(char.level).toBe(1);
      expect(char.experience).toBe(0);
    });

    it('should start with 0 gold', () => {
      const char = new Character(createTestConfig());
      expect(char.gold).toBe(0);
    });
  });

  describe('stat calculation', () => {
    it('should combine base stats with race and class bonuses', () => {
      // Human Warrior: base 10 + race 0 + class bonuses
      const char = new Character(createTestConfig());
      const stats = char.stats;

      // STR: 10 + 0 (human) + 5 (warrior) = 15
      expect(stats.str).toBe(15);
      // INT: 10 + 0 (human) + -2 (warrior) = 8
      expect(stats.int).toBe(8);
      // CON: 10 + 0 (human) + 2 (warrior) = 12
      expect(stats.con).toBe(12);
    });

    it('should apply elf race bonuses correctly', () => {
      // Elf Mage
      const char = new Character(createTestConfig({
        race: elfRace,
        class_: mageClass,
      }));
      const stats = char.stats;

      // STR: 10 + -1 (elf) + -5 (mage) = 4
      expect(stats.str).toBe(4);
      // INT: 10 + 2 (elf) + 3 (mage) = 15
      expect(stats.int).toBe(15);
      // DEX: 10 + 1 (elf) + 1 (mage) = 12
      expect(stats.dex).toBe(12);
    });

    it('should cap stats at minimum 3', () => {
      // Very low base stat
      const char = new Character(createTestConfig({
        race: elfRace,
        class_: mageClass,
        baseStats: { str: 3, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      }));
      // STR: 3 + -1 (elf) + -5 (mage) = -3, capped at 3
      expect(char.stats.str).toBe(3);
    });

    it('should cap stats at maximum 18+100 (118)', () => {
      const char = new Character(createTestConfig({
        baseStats: { str: 18, int: 18, wis: 18, dex: 18, con: 18, chr: 18 },
      }));
      // Even with bonuses, stats shouldn't exceed 118
      expect(char.stats.str).toBeLessThanOrEqual(118);
    });
  });

  describe('HP calculation', () => {
    it('should calculate starting HP from race hitDie + class hitDie + CON bonus', () => {
      const char = new Character(createTestConfig());
      // At level 1, HP should be positive and reasonable
      expect(char.maxHp).toBeGreaterThan(0);
      expect(char.currentHp).toBe(char.maxHp);
    });

    it('should give more HP to high-CON characters', () => {
      // Use same seed for both to get same base HP rolls
      RNG.setSeed(99999);
      const lowCon = new Character({
        name: 'Low CON',
        race: humanRace,
        class_: warriorClass,
        gender: 'male',
        baseStats: { str: 10, int: 10, wis: 10, dex: 10, con: 8, chr: 10 },
        rng: RNG,
      });

      RNG.setSeed(99999); // Reset to same seed
      const highCon = new Character({
        name: 'High CON',
        race: humanRace,
        class_: warriorClass,
        gender: 'male',
        baseStats: { str: 10, int: 10, wis: 10, dex: 10, con: 18, chr: 10 },
        rng: RNG,
      });

      // With same HP rolls, high CON should have more HP due to CON bonus
      expect(highCon.maxHp).toBeGreaterThan(lowCon.maxHp);
    });

    it('should give more HP to warriors than mages', () => {
      const warrior = new Character(createTestConfig({ class_: warriorClass }));
      const mage = new Character(createTestConfig({ class_: mageClass }));
      expect(warrior.maxHp).toBeGreaterThan(mage.maxHp);
    });
  });

  describe('MP calculation', () => {
    it('should calculate MP for spellcasters', () => {
      const mage = new Character(createTestConfig({
        class_: mageClass,
        baseStats: { str: 10, int: 16, wis: 10, dex: 10, con: 10, chr: 10 },
      }));
      // Mages should have mana
      expect(mage.maxMp).toBeGreaterThan(0);
    });

    it('should give 0 MP to warriors', () => {
      const warrior = new Character(createTestConfig({ class_: warriorClass }));
      expect(warrior.maxMp).toBe(0);
    });
  });

  describe('experience and leveling', () => {
    it('should gain experience', () => {
      const char = new Character(createTestConfig());
      char.gainExperience(100);
      expect(char.experience).toBe(100);
    });

    it('should level up when reaching threshold', () => {
      const char = new Character(createTestConfig());
      // Level 2 threshold for human warrior is around 10 XP (low for testing)
      char.gainExperience(50);
      expect(char.level).toBeGreaterThanOrEqual(2);
    });

    it('should increase max HP on level up', () => {
      const char = new Character(createTestConfig());
      const hpAtLevel1 = char.maxHp;
      char.gainExperience(10000);
      expect(char.maxHp).toBeGreaterThan(hpAtLevel1);
    });

    it('should apply race expMod to experience requirements', () => {
      // Elves need 120% experience
      const human = new Character(createTestConfig({ race: humanRace }));
      const elf = new Character(createTestConfig({ race: elfRace }));

      expect(elf.experienceToNextLevel).toBeGreaterThan(human.experienceToNextLevel);
    });

    it('should cap level at 50', () => {
      const char = new Character(createTestConfig());
      char.gainExperience(999999999);
      expect(char.level).toBeLessThanOrEqual(50);
    });
  });

  describe('skill calculation', () => {
    it('should combine race and class base skills with level bonus', () => {
      const char = new Character(createTestConfig());
      const skills = char.skills;

      // At level 1: race + class base + floor(xSkill * 1 / 10)
      // disarm: 0 (human) + 25 (warrior) + floor(12 * 1 / 10) = 25 + 1 = 26
      expect(skills.disarm).toBe(26);
      // melee: 0 (human) + 25 (warrior) + floor(100 * 1 / 10) = 25 + 10 = 35
      expect(skills.melee).toBe(35);
    });

    it('should add level-based skill bonuses (xSkills)', () => {
      const char = new Character(createTestConfig());
      const skillsLevel1 = char.skills.melee;

      char.gainExperience(10000);
      // xSkills.melee for warrior is 100 per level
      expect(char.skills.melee).toBeGreaterThan(skillsLevel1);
    });
  });

  describe('damage and healing', () => {
    it('should take damage', () => {
      const char = new Character(createTestConfig());
      const startHp = char.currentHp;
      char.takeDamage(5);
      expect(char.currentHp).toBe(startHp - 5);
    });

    it('should not go below 0 HP', () => {
      const char = new Character(createTestConfig());
      char.takeDamage(9999);
      expect(char.currentHp).toBe(0);
    });

    it('should report isDead when HP reaches 0', () => {
      const char = new Character(createTestConfig());
      expect(char.isDead).toBe(false);
      char.takeDamage(9999);
      expect(char.isDead).toBe(true);
    });

    it('should heal', () => {
      const char = new Character(createTestConfig());
      const startHp = char.currentHp;
      char.takeDamage(6);
      char.heal(3);
      expect(char.currentHp).toBe(startHp - 3); // Took 6, healed 3, net -3
    });

    it('should not heal above max HP', () => {
      const char = new Character(createTestConfig());
      char.takeDamage(10);
      char.heal(9999);
      expect(char.currentHp).toBe(char.maxHp);
    });
  });

  describe('gold', () => {
    it('should gain gold', () => {
      const char = new Character(createTestConfig());
      char.gainGold(100);
      expect(char.gold).toBe(100);
    });

    it('should spend gold', () => {
      const char = new Character(createTestConfig());
      char.gainGold(100);
      const success = char.spendGold(30);
      expect(success).toBe(true);
      expect(char.gold).toBe(70);
    });

    it('should fail to spend more gold than available', () => {
      const char = new Character(createTestConfig());
      char.gainGold(50);
      const success = char.spendGold(100);
      expect(success).toBe(false);
      expect(char.gold).toBe(50);
    });
  });

  describe('stat modifiers', () => {
    it('should calculate STR to-hit bonus', () => {
      const weakChar = new Character(createTestConfig({
        baseStats: { str: 8, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      }));
      const strongChar = new Character(createTestConfig({
        baseStats: { str: 18, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      }));

      expect(strongChar.toHitBonus).toBeGreaterThan(weakChar.toHitBonus);
    });

    it('should calculate STR damage bonus', () => {
      const weakChar = new Character(createTestConfig({
        baseStats: { str: 8, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      }));
      const strongChar = new Character(createTestConfig({
        baseStats: { str: 18, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      }));

      expect(strongChar.damageBonus).toBeGreaterThan(weakChar.damageBonus);
    });

    it('should calculate DEX AC bonus', () => {
      const slowChar = new Character(createTestConfig({
        baseStats: { str: 10, int: 10, wis: 10, dex: 8, con: 10, chr: 10 },
      }));
      const fastChar = new Character(createTestConfig({
        baseStats: { str: 10, int: 10, wis: 10, dex: 18, con: 10, chr: 10 },
      }));

      expect(fastChar.acBonus).toBeGreaterThan(slowChar.acBonus);
    });
  });
});
