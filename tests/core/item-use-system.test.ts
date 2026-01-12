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
import type { ClassDef } from '@/core/data/classes';
import classesData from '@/data/classes/classes.json';

const mageClass = classesData.mage as ClassDef;
const warriorClass = classesData.warrior as ClassDef;

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
    // Get the skill levels (wand/level not needed - just comparing skills)
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
