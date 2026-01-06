import { describe, it, expect } from 'vitest';
import { type ClassDef, type ClassRecord, loadClasses } from '@/core/data/classes';
import classesJson from '@/data/classes/classes.json';

const classes: ClassRecord = loadClasses(classesJson as ClassRecord);

describe('classes data', () => {
  it('should have all 11 classes', () => {
    expect(Object.keys(classes).length).toBe(11);
  });

  it('should have classes keyed by slug', () => {
    expect(classes['warrior']).toBeDefined();
    expect(classes['mage']).toBeDefined();
    expect(classes['monk']).toBeDefined();
    expect(classes['high_mage']).toBeDefined();
  });

  // Spot-checks against tables.c to verify extraction is correct
  // Reference: ../zangband/src/tables.c

  it('should match Warrior from tables.c:2137-2143', () => {
    const c = classes['warrior'];
    expect(c?.index).toBe(0);
    expect(c?.name).toBe('Warrior');
    expect(c?.stats).toEqual({ str: 5, int: -2, wis: -2, dex: 2, con: 2, chr: -1 });
    expect(c?.skills).toEqual({
      disarm: 25, device: 18, save: 18, stealth: 1,
      search: 14, searchFreq: 2, melee: 25, ranged: 17
    });
    expect(c?.xSkills).toEqual({
      disarm: 12, device: 7, save: 14, stealth: 0,
      search: 0, searchFreq: 0, melee: 100, ranged: 55
    });
    expect(c?.hitDie).toBe(9);
    expect(c?.expMod).toBe(0);
    expect(c?.petUpkeepDiv).toBe(20);
    expect(c?.heavySense).toBe(true);
  });

  it('should match Mage from tables.c:2145-2151', () => {
    const c = classes['mage'];
    expect(c?.index).toBe(1);
    expect(c?.name).toBe('Mage');
    expect(c?.stats).toEqual({ str: -5, int: 3, wis: 0, dex: 1, con: -2, chr: 1 });
    expect(c?.skills).toEqual({
      disarm: 30, device: 36, save: 30, stealth: 2,
      search: 16, searchFreq: 20, melee: 10, ranged: 10
    });
    expect(c?.xSkills).toEqual({
      disarm: 7, device: 13, save: 12, stealth: 0,
      search: 0, searchFreq: 0, melee: 25, ranged: 14
    });
    expect(c?.hitDie).toBe(0);
    expect(c?.expMod).toBe(30);
    expect(c?.petUpkeepDiv).toBe(15);
    expect(c?.heavySense).toBe(false);
  });

  it('should match Monk from tables.c:2201-2207', () => {
    const c = classes['monk'];
    expect(c?.index).toBe(8);
    expect(c?.name).toBe('Monk');
    expect(c?.stats).toEqual({ str: 2, int: -1, wis: 1, dex: 3, con: 2, chr: 1 });
    expect(c?.skills).toEqual({
      disarm: 45, device: 32, save: 28, stealth: 5,
      search: 16, searchFreq: 24, melee: 12, ranged: 14
    });
    expect(c?.xSkills).toEqual({
      disarm: 15, device: 11, save: 15, stealth: 0,
      search: 0, searchFreq: 0, melee: 30, ranged: 25
    });
    expect(c?.hitDie).toBe(6);
    expect(c?.expMod).toBe(40);
    expect(c?.petUpkeepDiv).toBe(20);
    expect(c?.heavySense).toBe(false);
  });

  it('should match High-Mage (last class) from tables.c:2217-2223', () => {
    const c = classes['high_mage'];
    expect(c?.index).toBe(10); // 0-indexed, last of 11
    expect(c?.name).toBe('High-Mage');
    expect(c?.stats).toEqual({ str: -5, int: 4, wis: 0, dex: 0, con: -2, chr: 1 });
    expect(c?.skills).toEqual({
      disarm: 30, device: 36, save: 30, stealth: 2,
      search: 16, searchFreq: 20, melee: 10, ranged: 10
    });
    expect(c?.xSkills).toEqual({
      disarm: 7, device: 13, save: 12, stealth: 0,
      search: 0, searchFreq: 0, melee: 15, ranged: 10
    });
    expect(c?.hitDie).toBe(0);
    expect(c?.expMod).toBe(30);
    expect(c?.petUpkeepDiv).toBe(12);
    expect(c?.heavySense).toBe(false);
  });
});
