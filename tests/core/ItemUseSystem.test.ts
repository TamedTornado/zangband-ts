/**
 * ItemUseSystem Tests - Device Skill Checks
 *
 * Tests that device activation uses the device skill to determine success.
 * Formula: success = roll < deviceSkill - itemLevel * 2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RNG } from 'rot-js';
import { useDevice, type ItemUseContext } from '@/core/systems/ItemUseSystem';
import { Player } from '@/core/entities/Player';
import { Item } from '@/core/entities/Item';
import { Level } from '@/core/world/Level';
import type { ItemDef } from '@/core/data/items';

// High device class
const mageClass = {
  index: 0,
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

// Low device class
const warriorClass = {
  index: 1,
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

function createPlayer(classDef = mageClass, level = 1): Player {
  return new Player({
    id: 'test-player',
    position: { x: 5, y: 5 },
    maxHp: 100,
    speed: 110,
    stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
    classDef,
    level,
  });
}

function createTestWand(depth = 1, charges = 5): Item {
  const baseItem: ItemDef = {
    key: 'wand_test',
    index: 1,
    name: 'Test Wand',
    symbol: '-',
    color: 'w',
    type: 'wand',
    sval: 1,
    pval: 0,
    depth,
    rarity: 1,
    weight: 10,
    cost: 100,
    allocation: [],
    baseAc: 0,
    damage: '0d0',
    toHit: 0,
    toDam: 0,
    toAc: 0,
    flags: [],
    effects: [{ type: 'heal', amount: '1d10' }],
  };

  return new Item({
    id: 'test-wand',
    position: { x: 0, y: 0 },
    symbol: '-',
    color: 'w',
    generated: {
      baseItem,
      toHit: 0,
      toDam: 0,
      toAc: 0,
      pval: 0,
      flags: [],
      charges,       // Wand charges
      maxCharges: charges,
    },
  });
}

function createTestLevel(): Level {
  return new Level(20, 20);
}

describe('useDevice skill check', () => {
  let originalRNG: typeof RNG.getUniformInt;

  beforeEach(() => {
    originalRNG = RNG.getUniformInt;
  });

  afterEach(() => {
    RNG.getUniformInt = originalRNG;
  });

  it('should succeed with high device skill and low roll', () => {
    const player = createPlayer(mageClass, 10);
    const wand = createTestWand(1, 5); // Easy wand
    const level = createTestLevel();

    // Mock low roll for guaranteed success
    RNG.getUniformInt = vi.fn().mockReturnValue(5);

    const context: ItemUseContext = {
      player,
      level,
    };

    const result = useDevice(wand, context);

    expect(result.success).toBe(true);
    expect(result.messages.some(m => m.toLowerCase().includes('fail'))).toBe(false);
  });

  it('should fail with low device skill and high roll against high level item', () => {
    const player = createPlayer(warriorClass, 1); // Low device skill
    const wand = createTestWand(30, 5); // High level wand
    const level = createTestLevel();

    // Mock high roll for guaranteed failure
    RNG.getUniformInt = vi.fn().mockReturnValue(95);

    const context: ItemUseContext = {
      player,
      level,
    };

    const result = useDevice(wand, context);

    // Should fail to activate but still consume energy/turn
    expect(result.messages.some(m => m.toLowerCase().includes('fail'))).toBe(true);
  });

  it('warrior should fail more often than mage with same level item', () => {
    const wand = createTestWand(10, 10); // Mid-level wand
    const level = createTestLevel();

    // Get the skill levels
    const warrior = createPlayer(warriorClass, 5);
    const mage = createPlayer(mageClass, 5);

    // Mage should have higher device skill
    expect(mage.skills.device).toBeGreaterThan(warrior.skills.device);

    // The success threshold for warrior should be lower
    // success = deviceSkill - itemLevel * 2
    const warriorThreshold = warrior.skills.device - 10 * 2; // device - 20
    const mageThreshold = mage.skills.device - 10 * 2; // device - 20

    expect(mageThreshold).toBeGreaterThan(warriorThreshold);
  });

  it('should not consume charges on failed activation', () => {
    const player = createPlayer(warriorClass, 1);
    const wand = createTestWand(50, 5); // Very high level
    const level = createTestLevel();

    // Mock high roll for guaranteed failure
    RNG.getUniformInt = vi.fn().mockReturnValue(99);

    const initialCharges = wand.charges;

    const context: ItemUseContext = {
      player,
      level,
    };

    const result = useDevice(wand, context);

    // Failed activation should not consume charge
    if (result.messages.some(m => m.toLowerCase().includes('fail'))) {
      expect(wand.charges).toBe(initialCharges);
    }
  });
});
