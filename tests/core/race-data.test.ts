import { describe, it, expect } from 'vitest';
import { type RaceRecord } from '@/core/data/races';
import racesJson from '@/data/races/races.json';

const races = racesJson as RaceRecord;

describe('races data', () => {
  it('should have all 31 races', () => {
    expect(Object.keys(races).length).toBe(31);
  });

  it('should have races keyed by slug', () => {
    expect(races['human']).toBeDefined();
    expect(races['half_elf']).toBeDefined();
    expect(races['half_troll']).toBeDefined();
    expect(races['vampire']).toBeDefined();
  });

  // Spot-checks against tables.c to verify extraction is correct
  // Reference: ../zangband/src/tables.c

  it('should match Human from tables.c:1782-1792', () => {
    const r = races['human'];
    expect(r?.name).toBe('Human');
    expect(r?.stats).toEqual({ str: 0, int: 0, wis: 0, dex: 0, con: 0, chr: 0 });
    expect(r?.skills.searchFreq).toBe(10); // only non-zero skill
    expect(r?.hitDie).toBe(10);
    expect(r?.expMod).toBe(100);
    expect(r?.age).toEqual({ base: 14, mod: 6 });
    expect(r?.male.height).toEqual({ base: 72, mod: 6 });
    expect(r?.male.weight).toEqual({ base: 180, mod: 25 });
    expect(r?.female.height).toEqual({ base: 66, mod: 4 });
    expect(r?.female.weight).toEqual({ base: 150, mod: 20 });
    expect(r?.infravision).toBe(0);
    expect(r?.classChoice).toBe(0x7FF); // 2047
  });

  it('should match Half-Troll from tables.c:1859-1869', () => {
    const r = races['half_troll'];
    expect(r?.name).toBe('Half-Troll');
    expect(r?.stats).toEqual({ str: 4, int: -4, wis: -2, dex: -4, con: 3, chr: -6 });
    expect(r?.skills).toEqual({
      disarm: -5, device: -8, save: -8, stealth: -2,
      search: -1, searchFreq: 5, melee: 10, ranged: -5
    });
    expect(r?.hitDie).toBe(12);
    expect(r?.expMod).toBe(137);
    expect(r?.age).toEqual({ base: 20, mod: 10 });
    expect(r?.male.height).toEqual({ base: 96, mod: 10 });
    expect(r?.male.weight).toEqual({ base: 250, mod: 50 });
    expect(r?.female.height).toEqual({ base: 84, mod: 8 });
    expect(r?.female.weight).toEqual({ base: 225, mod: 40 });
    expect(r?.infravision).toBe(3);
    expect(r?.classChoice).toBe(0x005); // 5
  });

  it('should match Vampire from tables.c:2068-2078', () => {
    const r = races['vampire'];
    expect(r?.name).toBe('Vampire');
    expect(r?.stats).toEqual({ str: 3, int: 3, wis: -1, dex: -1, con: 1, chr: 2 });
    expect(r?.skills).toEqual({
      disarm: 4, device: 10, save: 10, stealth: 4,
      search: 1, searchFreq: 8, melee: 5, ranged: 0
    });
    expect(r?.hitDie).toBe(11);
    expect(r?.expMod).toBe(200);
    expect(r?.age).toEqual({ base: 100, mod: 30 });
    expect(r?.infravision).toBe(5);
    expect(r?.classChoice).toBe(0x7FF); // 2047
  });

  it('should match Elf from tables.c:1804-1814', () => {
    const r = races['elf'];
    expect(r?.name).toBe('Elf');
    expect(r?.stats).toEqual({ str: -1, int: 2, wis: 2, dex: 1, con: -2, chr: 2 });
    expect(r?.hitDie).toBe(8);
    expect(r?.expMod).toBe(120);
    expect(r?.age).toEqual({ base: 75, mod: 75 });
    expect(r?.infravision).toBe(3);
    expect(r?.classChoice).toBe(0x75F); // 1887
  });

  it('should match Ghoul (last race) from tables.c:2112-2122', () => {
    const r = races['ghoul'];
    expect(r?.index).toBe(30); // 0-indexed, last of 31
    expect(r?.name).toBe('Ghoul');
    expect(r?.stats).toEqual({ str: 0, int: -1, wis: -1, dex: -1, con: 1, chr: -5 });
    expect(r?.hitDie).toBe(9);
    expect(r?.expMod).toBe(125);
    expect(r?.classChoice).toBe(0x70F); // 1807
  });
});
