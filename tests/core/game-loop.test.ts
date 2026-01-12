import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RNG } from 'rot-js';
import { GameLoop } from '@/core/systems/GameLoop';
import { Combat } from '@/core/systems/Combat';
import { Player, type PlayerConfig } from '@/core/entities/Player';
import { Monster } from '@/core/entities/Monster';
import { MonsterDataManager } from '@/core/data/MonsterDataManager';
import type { MonsterDef } from '@/core/data/monsters';
import type { ClassDef } from '@/core/data/classes';
import classesData from '@/data/classes/classes.json';

const warriorClass = classesData.warrior as ClassDef;
const mageClass = classesData.mage as ClassDef;

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

function createTestPlayer(overrides: Partial<PlayerConfig> = {}) {
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
    symbol: testMonsterDef.symbol,
    color: testMonsterDef.color,
    maxHp: 20,
    speed: 110,
    def: testMonsterDef,
  });
}

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

    // Hit chance = melee skill + weaponToHit
    // weaponToHit = 0 (unarmed)
    const expectedHitChance = player.skills.melee + player.weaponToHit;

    // Warrior should have good melee skill at level 10
    expect(expectedHitChance).toBeGreaterThan(100);

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
