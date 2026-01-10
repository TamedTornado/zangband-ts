import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RNG } from 'rot-js';
import { GameLoop } from '@/core/systems/GameLoop';
import { Combat } from '@/core/systems/Combat';
import { Player } from '@/core/entities/Player';
import { Monster } from '@/core/entities/Monster';
import { MonsterDataManager } from '@/core/data/MonsterDataManager';
import type { MonsterDef } from '@/core/data/monsters';

// Test monster definition with 0 AC so hit chance is purely skill based
const testMonsterDef: MonsterDef = {
  key: 'test_monster',
  index: 1,
  name: 'Test Monster',
  symbol: 'm',
  color: 'w',
  speed: 110,
  hp: '2d8',
  vision: 20,
  ac: 0, // 0 AC so we can test pure hit chance
  alertness: 50,
  depth: 1,
  rarity: 1,
  exp: 10,
  attacks: [{ method: 'HIT', effect: 'HURT', damage: '1d4' }],
  flags: [],
  description: 'A test monster',
  spellFrequency: 0,
  spellFlags: [],
};

function createTestPlayer(overrides: Partial<Parameters<typeof Player['prototype']['constructor']>[0]> = {}) {
  return new Player({
    id: 'test-player',
    position: { x: 5, y: 5 },
    maxHp: 100,
    speed: 110,
    stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
    ...overrides,
  });
}

function createTestMonster() {
  return new Monster({
    id: 'test-monster',
    position: { x: 6, y: 5 },
    maxHp: 20,
    speed: 110,
    def: testMonsterDef,
  });
}

// Warrior class - high melee
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

// Mage class - low melee
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

describe('GameLoop.playerAttack', () => {
  let monsterData: MonsterDataManager;

  beforeEach(() => {
    monsterData = new MonsterDataManager({ test_monster: testMonsterDef });
  });

  it('should calculate hit chance based on melee skill + weapon toHit', () => {
    // Spy on Combat.testHit to capture the hitChance passed
    const testHitSpy = vi.spyOn(Combat.prototype, 'testHit');

    const player = createTestPlayer({ classDef: warriorClass, level: 10 });
    const monster = createTestMonster();

    // Warrior at level 10: melee = 70 + 45*10/10 = 115
    // weaponToHit = 0 (unarmed)
    // Expected hitChance = melee + weaponToHit = 115 + 0 = 115
    const expectedHitChance = player.skills.melee + player.weaponToHit;
    expect(expectedHitChance).toBe(115);

    const gameLoop = new GameLoop(RNG, monsterData);
    gameLoop.playerAttack(player, monster);

    // Verify testHit was called with the correct hit chance
    expect(testHitSpy).toHaveBeenCalledWith(expectedHitChance, 0, true);

    testHitSpy.mockRestore();
  });

  it('should use higher hit chance for warrior than mage at same level', () => {
    const testHitSpy = vi.spyOn(Combat.prototype, 'testHit');

    const warrior = createTestPlayer({ id: 'warrior', classDef: warriorClass, level: 10 });
    const mage = createTestPlayer({ id: 'mage', classDef: mageClass, level: 10 });
    const monster = createTestMonster();

    const gameLoop = new GameLoop(RNG, monsterData);

    // Attack with warrior
    gameLoop.playerAttack(warrior, monster);
    const warriorHitChance = testHitSpy.mock.calls[0][0];

    // Attack with mage
    gameLoop.playerAttack(mage, monster);
    const mageHitChance = testHitSpy.mock.calls[1][0];

    // Warrior should have higher hit chance due to higher melee skill
    expect(warriorHitChance).toBeGreaterThan(mageHitChance);

    // The difference should reflect the skill difference
    // Warrior melee: 115, Mage melee: 34 + 15 = 49
    // Difference should be about 66
    expect(warriorHitChance - mageHitChance).toBeGreaterThan(50);

    testHitSpy.mockRestore();
  });

  it('higher melee skill should give better hit chance', () => {
    const warrior = createTestPlayer({ id: 'warrior', classDef: warriorClass, level: 10 });
    const mage = createTestPlayer({ id: 'mage', classDef: mageClass, level: 10 });

    // Warrior should have significantly higher melee skill
    expect(warrior.skills.melee).toBeGreaterThan(mage.skills.melee);

    // The difference should be meaningful (at least 30 points)
    const difference = warrior.skills.melee - mage.skills.melee;
    expect(difference).toBeGreaterThan(30);
  });
});
