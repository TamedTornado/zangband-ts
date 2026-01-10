import { describe, it, expect } from 'vitest';
import { Player } from '@/core/entities/Player';
import { Item } from '@/core/entities/Item';
import { Level } from '@/core/world/Level';
import { Direction } from '@/core/types';
import type { ItemDef } from '@/core/data/items';

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
  });
}

describe('Player movement', () => {
  it('should be created at a given position', () => {
    const player = createTestPlayer(10, 5);
    expect(player.position).toEqual({ x: 10, y: 5 });
  });

  it('should move in a direction on an empty level', () => {
    const player = createTestPlayer(5, 5);
    const level = new Level(80, 25);

    const moved = player.tryMove(Direction.North, level);

    expect(moved).toBe(true);
    expect(player.position).toEqual({ x: 5, y: 4 });
  });

  it('should not move into a blocked tile', () => {
    const player = createTestPlayer(5, 5);
    const level = new Level(80, 25);
    level.setWalkable({ x: 5, y: 4 }, false);

    const moved = player.tryMove(Direction.North, level);

    expect(moved).toBe(false);
    expect(player.position).toEqual({ x: 5, y: 5 });
  });

  it('should not move out of bounds', () => {
    const player = createTestPlayer(0, 0);
    const level = new Level(80, 25);

    const movedNorth = player.tryMove(Direction.North, level);
    expect(movedNorth).toBe(false);
    expect(player.position).toEqual({ x: 0, y: 0 });

    const movedWest = player.tryMove(Direction.West, level);
    expect(movedWest).toBe(false);
    expect(player.position).toEqual({ x: 0, y: 0 });
  });

  it('should move diagonally', () => {
    const player = createTestPlayer(5, 5);
    const level = new Level(80, 25);

    player.tryMove(Direction.NorthEast, level);
    expect(player.position).toEqual({ x: 6, y: 4 });
  });
});

// Test fixtures for equipment
function createTestWeapon(): Item {
  const baseItem: ItemDef = {
    key: 'test_sword',
    index: 1,
    name: 'Test Sword',
    symbol: '|',
    color: 'w',
    type: 'sword',
    sval: 1,
    pval: 0,
    depth: 1,
    rarity: 1,
    weight: 80,
    cost: 100,
    allocation: [],
    baseAc: 0,
    damage: '2d5',
    toHit: 3,
    toDam: 2,
    toAc: 0,
    flags: [],
  };
  return new Item({
    id: 'test_weapon',
    position: { x: 0, y: 0 },
    symbol: '|',
    color: 'w',
    generated: {
      baseItem,
      toHit: 3,
      toDam: 2,
      toAc: 0,
      pval: 0,
      flags: [],
    },
  });
}

function createTestArmor(): Item {
  const baseItem: ItemDef = {
    key: 'test_armor',
    index: 2,
    name: 'Test Armor',
    symbol: '[',
    color: 's',
    type: 'soft_armor',
    sval: 1,
    pval: 0,
    depth: 1,
    rarity: 1,
    weight: 100,
    cost: 200,
    allocation: [],
    baseAc: 5,
    damage: '0d0',
    toHit: 0,
    toDam: 0,
    toAc: 2,
    flags: [],
  };
  return new Item({
    id: 'test_armor',
    position: { x: 0, y: 0 },
    symbol: '[',
    color: 's',
    generated: {
      baseItem,
      toHit: 0,
      toDam: 0,
      toAc: 2,
      pval: 0,
      flags: [],
    },
  });
}

describe('Player equipment', () => {
  it('should equip a weapon in the weapon slot', () => {
    const player = createTestPlayer(5, 5);
    const weapon = createTestWeapon();

    const result = player.equip(weapon);

    expect(result.equipped).toBe(true);
    expect(result.slot).toBe('weapon');
    expect(player.getEquipped('weapon')).toBe(weapon);
  });

  it('should equip armor in the armor slot', () => {
    const player = createTestPlayer(5, 5);
    const armor = createTestArmor();

    const result = player.equip(armor);

    expect(result.equipped).toBe(true);
    expect(result.slot).toBe('armor');
    expect(player.getEquipped('armor')).toBe(armor);
  });

  it('should calculate total AC from equipment', () => {
    const player = createTestPlayer(5, 5);
    const armor = createTestArmor();

    player.equip(armor);

    // baseAc (5) + toAc (2) = 7
    expect(player.totalAc).toBe(7);
  });

  it('should return weapon damage stats', () => {
    const player = createTestPlayer(5, 5);
    const weapon = createTestWeapon();

    player.equip(weapon);

    expect(player.weaponDamage).toBe('2d5');
    expect(player.weaponToHit).toBe(3);
    expect(player.weaponToDam).toBe(2);
  });

  it('should return default damage when unarmed', () => {
    const player = createTestPlayer(5, 5);

    expect(player.weaponDamage).toBe('1d1');
    expect(player.weaponToHit).toBe(0);
    expect(player.weaponToDam).toBe(0);
  });

  it('should unequip and return item to inventory', () => {
    const player = createTestPlayer(5, 5);
    const weapon = createTestWeapon();

    player.equip(weapon);
    const unequipped = player.unequip('weapon');

    expect(unequipped).toBe(weapon);
    expect(player.getEquipped('weapon')).toBeUndefined();
    expect(player.inventory).toContain(weapon);
  });

  it('should swap equipment when equipping to occupied slot', () => {
    const player = createTestPlayer(5, 5);
    const weapon1 = createTestWeapon();
    const weapon2 = new Item({
      id: 'weapon2',
      position: { x: 0, y: 0 },
      symbol: '|',
      color: 'w',
      generated: {
        baseItem: {
          ...weapon1.generated!.baseItem,
          name: 'Better Sword',
        },
        toHit: 5,
        toDam: 4,
        toAc: 0,
        pval: 0,
        flags: [],
      },
    });

    player.equip(weapon1);
    const result = player.equip(weapon2);

    expect(result.equipped).toBe(true);
    expect(result.unequipped).toBe(weapon1);
    expect(player.getEquipped('weapon')).toBe(weapon2);
    expect(player.inventory).toContain(weapon1);
  });
});

describe('Player noise', () => {
  function createPlayerWithStealth(stealth: number): Player {
    return new Player({
      id: 'test-player',
      position: { x: 5, y: 5 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      classDef: {
        index: 0,
        name: 'Test Class',
        stats: { str: 0, int: 0, wis: 0, dex: 0, con: 0, chr: 0 },
        skills: {
          disarm: 0, device: 0, save: 0, stealth,
          search: 0, searchFreq: 0, melee: 0, ranged: 0,
        },
        xSkills: {
          disarm: 0, device: 0, save: 0, stealth: 0,
          search: 0, searchFreq: 0, melee: 0, ranged: 0,
        },
        hitDie: 0,
        expMod: 0,
        petUpkeepDiv: 1,
        heavySense: false,
        spellStat: null,
        spellFirst: null,
        spellWeight: null,
        realms: [],
        secondaryRealm: false,
      },
      level: 1,
    });
  }

  it('calculates noise from stealth skill', () => {
    const player = createPlayerWithStealth(0);
    expect(player.noise).toBe(Math.pow(2, 30)); // Very loud
  });

  it('higher stealth = lower noise', () => {
    const loud = createPlayerWithStealth(5);
    const quiet = createPlayerWithStealth(20);
    expect(quiet.noise).toBeLessThan(loud.noise);
  });

  it('stealth 30 = minimum noise of 1', () => {
    const player = createPlayerWithStealth(30);
    expect(player.noise).toBe(1);
  });

  it('caps stealth at 30', () => {
    const player = createPlayerWithStealth(50);
    expect(player.noise).toBe(1);
  });

  it('intermediate stealth values produce expected noise', () => {
    const player = createPlayerWithStealth(15);
    expect(player.noise).toBe(Math.pow(2, 30 - 15)); // 2^15 = 32768
  });
});

// Experience system tests
describe('Player experience', () => {
  it('starts with 0 experience', () => {
    const player = createTestPlayer(0, 0);
    expect(player.experience).toBe(0);
    expect(player.maxExperience).toBe(0);
  });

  it('tracks experience gained via gainExperience', () => {
    const player = createTestPlayer(0, 0);
    player.gainExperience(50);
    expect(player.experience).toBe(50);
    expect(player.maxExperience).toBe(50);
  });

  it('maxExperience tracks highest reached', () => {
    const player = createTestPlayer(0, 0);
    player.gainExperience(100);
    expect(player.maxExperience).toBe(100);
    // After XP drain, max should stay at 100
    // We'll need a way to drain XP for this test to be complete
  });
});

describe('Player expFactor', () => {
  it('defaults to 100 (Human) with no race set', () => {
    const player = createTestPlayer(0, 0);
    expect(player.expFactor).toBe(100);
  });

  it('uses race expMod when set', () => {
    const player = createTestPlayer(0, 0);
    player.setRace({ expMod: 120 } as Parameters<typeof player.setRace>[0]);
    expect(player.expFactor).toBe(120);
  });

  it('adds class expMod to race', () => {
    const player = createTestPlayer(0, 0);
    player.setRace({ expMod: 120 } as Parameters<typeof player.setRace>[0]);
    player.setClass({
      index: 0,
      name: 'Mage',
      stats: { str: 0, int: 0, wis: 0, dex: 0, con: 0, chr: 0 },
      skills: { disarm: 0, device: 0, save: 0, stealth: 0, search: 0, searchFreq: 0, melee: 0, ranged: 0 },
      xSkills: { disarm: 0, device: 0, save: 0, stealth: 0, search: 0, searchFreq: 0, melee: 0, ranged: 0 },
      hitDie: 0,
      expMod: 30,
      petUpkeepDiv: 1,
      heavySense: false,
      spellStat: 'int',
      spellFirst: 1,
      spellWeight: 300,
      realms: [],
      secondaryRealm: false,
    });
    expect(player.expFactor).toBe(150); // 120 + 30
  });
});

describe('Player experienceToNextLevel', () => {
  it('requires 10 XP for level 1 with 100% expFactor', () => {
    const player = new Player({
      id: 'test',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      level: 1,
    });
    expect(player.experienceToNextLevel).toBe(10);
  });

  it('requires 25 XP for level 2 with 100% expFactor', () => {
    const player = new Player({
      id: 'test',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      level: 2,
    });
    expect(player.experienceToNextLevel).toBe(25);
  });

  it('scales with expFactor (150% = 50% more XP needed)', () => {
    const player = new Player({
      id: 'test',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      level: 1,
    });
    player.setRace({ expMod: 150 } as Parameters<typeof player.setRace>[0]);
    // 10 * 150 / 100 = 15
    expect(player.experienceToNextLevel).toBe(15);
  });

  it('returns Infinity at max level 50', () => {
    const player = new Player({
      id: 'test',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      level: 50,
    });
    expect(player.experienceToNextLevel).toBe(Infinity);
  });
});

describe('Player gainExperience and level up', () => {
  it('adds experience to current total', () => {
    const player = new Player({
      id: 'test',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      level: 1,
    });
    player.gainExperience(5);
    expect(player.experience).toBe(5);
  });

  it('levels up when reaching threshold', () => {
    const player = new Player({
      id: 'test',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      level: 1,
    });
    // Level 1 needs 10 XP to level up
    const result = player.gainExperience(10);
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(2);
    expect(player.level).toBe(2);
  });

  it('can level up multiple times from single XP gain', () => {
    const player = new Player({
      id: 'test',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      level: 1,
    });
    // Level 1: 10, Level 2: 25, Level 3: 45, Level 4: 70
    // Gaining 50 XP should level to 4 (50 >= 45 but < 70)
    const result = player.gainExperience(50);
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(4);
    expect(player.level).toBe(4);
  });

  it('does not level past 50', () => {
    const player = new Player({
      id: 'test',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      level: 50,
    });
    const result = player.gainExperience(1_000_000);
    expect(player.level).toBe(50);
    expect(result.leveledUp).toBe(false);
  });

  it('returns leveledUp false when no level change', () => {
    const player = new Player({
      id: 'test',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      level: 1,
    });
    const result = player.gainExperience(5); // Not enough for level 2
    expect(result.leveledUp).toBe(false);
    expect(result.newLevel).toBe(1);
  });
});

describe('Skill advancement', () => {
  it('should increase skills when level increases', () => {
    const player = new Player({
      id: 'test',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      level: 1,
      classDef: {
        index: 0,
        name: 'Warrior',
        stats: { str: 5, int: -2, wis: -2, dex: 2, con: 2, chr: -1 },
        skills: { disarm: 25, device: 18, save: 18, stealth: 1, search: 14, searchFreq: 2, melee: 70, ranged: 55 },
        xSkills: { disarm: 12, device: 7, save: 10, stealth: 0, search: 0, searchFreq: 0, melee: 45, ranged: 45 },
        hitDie: 9,
        expMod: 0,
        petUpkeepDiv: 1,
        heavySense: false,
        spellStat: null,
        spellFirst: null,
        spellWeight: null,
        realms: [],
        secondaryRealm: false,
      },
    });
    const meleeAtLevel1 = player.skills.melee;

    player.level = 10;

    // xSkills.melee = 45, so at level 10: 45 * 10 / 10 = 45 more skill
    expect(player.skills.melee).toBeGreaterThan(meleeAtLevel1);
  });

  it('should have different skill growth rates per class', () => {
    const warriorClass = {
      index: 0,
      name: 'Warrior',
      stats: { str: 5, int: -2, wis: -2, dex: 2, con: 2, chr: -1 },
      skills: { disarm: 25, device: 18, save: 18, stealth: 1, search: 14, searchFreq: 2, melee: 70, ranged: 55 },
      xSkills: { disarm: 12, device: 7, save: 10, stealth: 0, search: 0, searchFreq: 0, melee: 45, ranged: 45 },
      hitDie: 9,
      expMod: 0,
      petUpkeepDiv: 1,
      heavySense: false,
      spellStat: null,
      spellFirst: null,
      spellWeight: null,
      realms: [],
      secondaryRealm: false,
    };

    const mageClass = {
      index: 1,
      name: 'Mage',
      stats: { str: -5, int: 3, wis: 0, dex: 1, con: -2, chr: 1 },
      skills: { disarm: 30, device: 36, save: 30, stealth: 2, search: 16, searchFreq: 20, melee: 34, ranged: 20 },
      xSkills: { disarm: 7, device: 13, save: 9, stealth: 0, search: 0, searchFreq: 0, melee: 15, ranged: 15 },
      hitDie: 0,
      expMod: 30,
      petUpkeepDiv: 1,
      heavySense: false,
      spellStat: 'int' as const,
      spellFirst: 1,
      spellWeight: 300,
      realms: [],
      secondaryRealm: false,
    };

    const warrior = new Player({
      id: 'warrior',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      level: 10,
      classDef: warriorClass,
    });

    const mage = new Player({
      id: 'mage',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      level: 10,
      classDef: mageClass,
    });

    // Warriors should have higher melee skill
    expect(warrior.skills.melee).toBeGreaterThan(mage.skills.melee);
    // Mages should have higher device skill
    expect(mage.skills.device).toBeGreaterThan(warrior.skills.device);
  });

  it('should recalculate skills when class changes', () => {
    const warriorClass = {
      index: 0,
      name: 'Warrior',
      stats: { str: 5, int: -2, wis: -2, dex: 2, con: 2, chr: -1 },
      skills: { disarm: 25, device: 18, save: 18, stealth: 1, search: 14, searchFreq: 2, melee: 70, ranged: 55 },
      xSkills: { disarm: 12, device: 7, save: 10, stealth: 0, search: 0, searchFreq: 0, melee: 45, ranged: 45 },
      hitDie: 9,
      expMod: 0,
      petUpkeepDiv: 1,
      heavySense: false,
      spellStat: null,
      spellFirst: null,
      spellWeight: null,
      realms: [],
      secondaryRealm: false,
    };

    const mageClass = {
      index: 1,
      name: 'Mage',
      stats: { str: -5, int: 3, wis: 0, dex: 1, con: -2, chr: 1 },
      skills: { disarm: 30, device: 36, save: 30, stealth: 2, search: 16, searchFreq: 20, melee: 34, ranged: 20 },
      xSkills: { disarm: 7, device: 13, save: 9, stealth: 0, search: 0, searchFreq: 0, melee: 15, ranged: 15 },
      hitDie: 0,
      expMod: 30,
      petUpkeepDiv: 1,
      heavySense: false,
      spellStat: 'int' as const,
      spellFirst: 1,
      spellWeight: 300,
      realms: [],
      secondaryRealm: false,
    };

    const player = new Player({
      id: 'test',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      level: 5,
      classDef: warriorClass,
    });

    const warriorMelee = player.skills.melee;

    player.setClass(mageClass);

    // Melee should be different after class change
    expect(player.skills.melee).not.toBe(warriorMelee);
    // Mage should have lower melee skill
    expect(player.skills.melee).toBeLessThan(warriorMelee);
  });

  it('should calculate skill based on level with class affinity formula', () => {
    const testClass = {
      index: 0,
      name: 'Test',
      stats: { str: 0, int: 0, wis: 0, dex: 0, con: 0, chr: 0 },
      skills: { disarm: 10, device: 10, save: 10, stealth: 10, search: 10, searchFreq: 10, melee: 50, ranged: 50 },
      xSkills: { disarm: 10, device: 10, save: 10, stealth: 10, search: 10, searchFreq: 10, melee: 30, ranged: 30 },
      hitDie: 5,
      expMod: 0,
      petUpkeepDiv: 1,
      heavySense: false,
      spellStat: null,
      spellFirst: null,
      spellWeight: null,
      realms: [],
      secondaryRealm: false,
    };

    const player = new Player({
      id: 'test',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      level: 20,
      classDef: testClass,
    });

    // melee = baseSkills.melee + (xSkills.melee * level / 10)
    // = 50 + (30 * 20 / 10) = 50 + 60 = 110
    // Plus any stat adjustments and race bonuses (default race has 0)
    expect(player.skills.melee).toBeGreaterThanOrEqual(110);
  });
});

describe('Level up HP/mana handling', () => {
  it('does not restore mana on level up', () => {
    const player = new Player({
      id: 'test',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 16, wis: 10, dex: 10, con: 10, chr: 10 },
      level: 1,
      classDef: {
        index: 0,
        name: 'Mage',
        stats: { str: 0, int: 0, wis: 0, dex: 0, con: 0, chr: 0 },
        skills: { disarm: 0, device: 0, save: 0, stealth: 0, search: 0, searchFreq: 0, melee: 0, ranged: 0 },
        xSkills: { disarm: 0, device: 0, save: 0, stealth: 0, search: 0, searchFreq: 0, melee: 0, ranged: 0 },
        hitDie: 0,
        expMod: 30,
        petUpkeepDiv: 1,
        heavySense: false,
        spellStat: 'int',
        spellFirst: 1,
        spellWeight: 300,
        realms: [],
        secondaryRealm: false,
      },
    });
    // Use some mana
    player.spendMana(player.maxMana - 5);
    const manaBeforeLevelUp = player.currentMana;
    expect(manaBeforeLevelUp).toBe(5);

    // Level up (max mana will increase)
    player.level = 2;

    // Current mana should NOT be restored (Zangband behavior)
    expect(player.currentMana).toBe(5);
    expect(player.maxMana).toBeGreaterThan(5); // Max increased
  });

  it('caps mana if max decreases', () => {
    const player = new Player({
      id: 'test',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 16, wis: 10, dex: 10, con: 10, chr: 10 },
      level: 10,
      classDef: {
        index: 0,
        name: 'Mage',
        stats: { str: 0, int: 0, wis: 0, dex: 0, con: 0, chr: 0 },
        skills: { disarm: 0, device: 0, save: 0, stealth: 0, search: 0, searchFreq: 0, melee: 0, ranged: 0 },
        xSkills: { disarm: 0, device: 0, save: 0, stealth: 0, search: 0, searchFreq: 0, melee: 0, ranged: 0 },
        hitDie: 0,
        expMod: 30,
        petUpkeepDiv: 1,
        heavySense: false,
        spellStat: 'int',
        spellFirst: 1,
        spellWeight: 300,
        realms: [],
        secondaryRealm: false,
      },
    });
    const fullMana = player.maxMana;
    // Current mana should be at max after construction
    expect(player.currentMana).toBe(fullMana);

    // Simulate going down to level 1 (decreasing max mana)
    player.level = 1;

    // Current mana should be capped at new max
    expect(player.currentMana).toBeLessThanOrEqual(player.maxMana);
  });
});
