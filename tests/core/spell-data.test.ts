import { describe, it, expect } from 'vitest';
import { type SpellRecord, type MagicRecord } from '@/core/data/spells';
import spellsJson from '@/data/spells/spells.json';
import magicJson from '@/data/spells/magic.json';

const spells = spellsJson as SpellRecord;
const magic = magicJson as unknown as MagicRecord;

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

  // Spot-checks against tables.c:5450-5743 to verify extraction
  // Reference: ../zangband/src/tables.c

  it('should match Life spells from tables.c:5452-5491', () => {
    expect(spells.life[0].name).toBe('Detect Evil');
    expect(spells.life[1].name).toBe('Cure Light Wounds');
    expect(spells.life[14].name).toBe('Healing');
    expect(spells.life[15].name).toBe('Glyph of Warding');
    expect(spells.life[31].name).toBe('Holy Invulnerability');
  });

  it('should match Sorcery spells from tables.c:5493-5533', () => {
    expect(spells.sorcery[0].name).toBe('Detect Monsters');
    expect(spells.sorcery[1].name).toBe('Phase Door');
    expect(spells.sorcery[9].name).toBe('Identify');
    expect(spells.sorcery[31].name).toBe('Globe of Invulnerability');
  });

  it('should match Nature spells from tables.c:5535-5575', () => {
    expect(spells.nature[0].name).toBe('Detect Creatures');
    expect(spells.nature[8].name).toBe('Stone to Mud');
    expect(spells.nature[31].name).toBe("Nature's Wrath");
  });

  it('should match Chaos spells from tables.c:5577-5617', () => {
    expect(spells.chaos[0].name).toBe('Magic Missile');
    expect(spells.chaos[5].name).toBe('Fire Bolt');
    expect(spells.chaos[31].name).toBe('Call the Void');
  });

  it('should match Death spells from tables.c:5619-5659', () => {
    expect(spells.death[0].name).toBe('Detect Unlife');
    expect(spells.death[11].name).toBe('Vampiric Drain');
    expect(spells.death[31].name).toBe('Wraithform');
  });

  it('should match Trump spells from tables.c:5661-5702', () => {
    expect(spells.trump[0].name).toBe('Phase Door');
    expect(spells.trump[1].name).toBe('Mind Blast');
    expect(spells.trump[31].name).toBe('Trump Greater Undead');
  });

  it('should match Arcane spells from tables.c:5704-5742', () => {
    expect(spells.arcane[0].name).toBe('Zap');
    expect(spells.arcane[1].name).toBe('Wizard Lock');
    expect(spells.arcane[26].name).toBe('Identify');
    expect(spells.arcane[31].name).toBe('Clairvoyance');
  });
});

describe('magic data (class spell requirements)', () => {
  it('should have all 11 classes', () => {
    expect(Object.keys(magic).length).toBe(11);
  });

  it('should have class magic properties', () => {
    expect(magic['mage'].spellStat).toBe('int');
    expect(magic['mage'].spellFirst).toBe(1);
    expect(magic['priest'].spellStat).toBe('wis');
    expect(magic['warrior'].spellFirst).toBe(99); // Warriors can't cast
  });

  it('should have 7 realms per class with 32 spells each', () => {
    expect(magic['mage'].realms.life.length).toBe(32);
    expect(magic['mage'].realms.sorcery.length).toBe(32);
    expect(magic['priest'].realms.death.length).toBe(32);
  });

  // Spot-checks against tables.c:2245+ to verify extraction
  it('should match Mage Life spell 0 from tables.c:2539', () => {
    // { 1, 1, 30, 4 } = [level, mana, fail, exp]
    expect(magic['mage'].realms.life[0]).toEqual([1, 1, 30, 4]);
  });

  it('should match Mage Sorcery spell 0 from tables.c:2579', () => {
    // { 1, 1, 23, 4 }
    expect(magic['mage'].realms.sorcery[0]).toEqual([1, 1, 23, 4]);
  });

  it('should match Priest Life spell 0 (native realm)', () => {
    // Priest gets Life spells at level 1
    expect(magic['priest'].realms.life[0][0]).toBe(1); // level
  });

  it('should show Warrior cannot cast (level 99)', () => {
    expect(magic['warrior'].realms.life[0][0]).toBe(99);
    expect(magic['warrior'].realms.sorcery[0][0]).toBe(99);
  });
});
