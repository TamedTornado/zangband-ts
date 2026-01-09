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
