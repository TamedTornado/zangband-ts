import { describe, it, expect } from 'vitest';
import { type SpellRecord } from '@/core/data/spells';
import spellsJson from '@/data/spells/spells.json';

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
