import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '@/core/entities/Player';
import { Level } from '@/core/world/Level';
import { ItemGeneration } from '@/core/systems/ItemGeneration';
import { usePotion, useScroll, useFood, useDevice, getItemEnergyCost } from '@/core/systems/ItemUseSystem';
import { calculateDeviceEnergyCost } from '@/core/systems/Energy';
import { ENERGY_PER_TURN } from '@/core/constants';

import itemsData from '@/data/items/items.json';
import egoItemsData from '@/data/items/ego-items.json';
import artifactsData from '@/data/items/artifacts.json';
import type { ItemDef } from '@/core/data/items';
import type { EgoItemDef } from '@/core/data/ego-items';
import type { ArtifactDef } from '@/core/data/artifacts';

/**
 * Tests for energy consumption when using items.
 *
 * Energy costs:
 * - Potions, scrolls, food: 100 energy (ENERGY_PER_TURN)
 * - Devices (wands/rods/staves): Variable based on device skill
 *   Formula: MAX(75, 200 - 5 * skill / 8)
 */

describe('Item Use Energy Costs', () => {
  let itemGen: ItemGeneration;

  beforeEach(() => {
    itemGen = new ItemGeneration({
      items: itemsData as unknown as Record<string, ItemDef>,
      egoItems: egoItemsData as unknown as Record<string, EgoItemDef>,
      artifacts: artifactsData as unknown as Record<string, ArtifactDef>,
    });
  });

  function createPlayer(overrides: Partial<ConstructorParameters<typeof Player>[0]> = {}): Player {
    return new Player({
      id: 'player',
      position: { x: 5, y: 5 },
      maxHp: 100,
      speed: 110,
      stats: { str: 14, int: 14, wis: 14, dex: 14, con: 14, chr: 14 },
      ...overrides,
    });
  }

  function createLevel(): Level {
    return new Level(20, 20, { depth: 1 });
  }

  describe('usePotion', () => {
    it('should return 100 energy cost', () => {
      const player = createPlayer();
      const level = createLevel();
      const potion = itemGen.createItemByKey('potion_of_cure_light_wounds');

      expect(potion).not.toBeNull();
      const result = usePotion(potion!, { player, level });

      expect(result.success).toBe(true);
      expect(result.energyCost).toBe(ENERGY_PER_TURN);
      expect(result.itemConsumed).toBe(true);
    });
  });

  describe('useScroll', () => {
    it('should return 100 energy cost', () => {
      const player = createPlayer();
      const level = createLevel();
      const scroll = itemGen.createItemByKey('scroll_of_light');

      expect(scroll).not.toBeNull();
      const result = useScroll(scroll!, { player, level });

      expect(result.success).toBe(true);
      expect(result.energyCost).toBe(ENERGY_PER_TURN);
      expect(result.itemConsumed).toBe(true);
    });
  });

  describe('useFood', () => {
    it('should return 100 energy cost', () => {
      const player = createPlayer();
      const level = createLevel();
      const food = itemGen.createItemByKey('ration_of_food');

      expect(food).not.toBeNull();
      const result = useFood(food!, { player, level });

      expect(result.success).toBe(true);
      expect(result.energyCost).toBe(ENERGY_PER_TURN);
      expect(result.itemConsumed).toBe(true);
    });
  });

  describe('useDevice', () => {
    it('should return variable energy cost based on device skill', () => {
      const player = createPlayer();
      const level = createLevel();
      const wand = itemGen.createItemByKey('wand_of_light');

      expect(wand).not.toBeNull();
      const result = useDevice(wand!, { player, level });
      const expectedCost = calculateDeviceEnergyCost(player.skills.device);

      expect(result.success).toBe(true);
      expect(result.energyCost).toBe(expectedCost);
      expect(result.itemConsumed).toBe(false);
    });

    it('should cost less energy for high-INT mage', () => {
      const mage = createPlayer({
        id: 'mage',
        stats: { str: 8, int: 18, wis: 16, dex: 12, con: 10, chr: 12 },
      });
      const level = createLevel();
      const wand = itemGen.createItemByKey('wand_of_light');

      expect(wand).not.toBeNull();
      const result = useDevice(wand!, { player: mage, level });

      // Mage should pay less than 200 (max) due to high INT
      expect(result.energyCost).toBeLessThan(200);
    });

    it('should cost more energy for low-INT warrior', () => {
      const warrior = createPlayer({
        id: 'warrior',
        stats: { str: 18, int: 8, wis: 8, dex: 14, con: 16, chr: 10 },
      });
      const level = createLevel();
      const wand = itemGen.createItemByKey('wand_of_light');

      expect(wand).not.toBeNull();
      const result = useDevice(wand!, { player: warrior, level });

      // Warrior should pay more than base 100 due to low INT
      expect(result.energyCost).toBeGreaterThan(ENERGY_PER_TURN);
    });

    it('should fail if wand has no charges', () => {
      const player = createPlayer();
      const level = createLevel();
      const wand = itemGen.createItemByKey('wand_of_light');

      expect(wand).not.toBeNull();
      // Drain all charges
      while (wand!.charges > 0) {
        wand!.useCharge();
      }

      const result = useDevice(wand!, { player, level });

      expect(result.success).toBe(false);
      expect(result.energyCost).toBe(0);
      expect(result.messages[0]).toContain('no charges');
    });

    it('should fail if staff has no charges', () => {
      const player = createPlayer();
      const level = createLevel();
      const staff = itemGen.createItemByKey('staff_of_light');

      expect(staff).not.toBeNull();
      // Drain all charges
      while (staff!.charges > 0) {
        staff!.useCharge();
      }

      const result = useDevice(staff!, { player, level });

      expect(result.success).toBe(false);
      expect(result.energyCost).toBe(0);
      expect(result.messages[0]).toContain('no charges');
    });

    it('should use charge when wand is zapped', () => {
      const player = createPlayer();
      const level = createLevel();
      const wand = itemGen.createItemByKey('wand_of_light');

      expect(wand).not.toBeNull();
      const initialCharges = wand!.charges;
      expect(initialCharges).toBeGreaterThan(0);

      useDevice(wand!, { player, level });
      expect(wand!.charges).toBe(initialCharges - 1);
    });

    it('should use charge when staff is used', () => {
      const player = createPlayer();
      const level = createLevel();
      const staff = itemGen.createItemByKey('staff_of_light');

      expect(staff).not.toBeNull();
      const initialCharges = staff!.charges;
      expect(initialCharges).toBeGreaterThan(0);

      useDevice(staff!, { player, level });
      expect(staff!.charges).toBe(initialCharges - 1);
    });
  });

  describe('getItemEnergyCost', () => {
    it('should return 100 for potions', () => {
      const player = createPlayer();
      const potion = itemGen.createItemByKey('potion_of_cure_light_wounds');

      expect(potion).not.toBeNull();
      expect(getItemEnergyCost(potion!, player)).toBe(ENERGY_PER_TURN);
    });

    it('should return 100 for scrolls', () => {
      const player = createPlayer();
      const scroll = itemGen.createItemByKey('scroll_of_light');

      expect(scroll).not.toBeNull();
      expect(getItemEnergyCost(scroll!, player)).toBe(ENERGY_PER_TURN);
    });

    it('should return 100 for food', () => {
      const player = createPlayer();
      const food = itemGen.createItemByKey('ration_of_food');

      expect(food).not.toBeNull();
      expect(getItemEnergyCost(food!, player)).toBe(ENERGY_PER_TURN);
    });

    it('should return variable cost for wands based on skill', () => {
      const player = createPlayer();
      const wand = itemGen.createItemByKey('wand_of_light');

      expect(wand).not.toBeNull();
      const cost = getItemEnergyCost(wand!, player);
      const expected = calculateDeviceEnergyCost(player.skills.device);

      expect(cost).toBe(expected);
    });

    it('should return variable cost for rods based on skill', () => {
      const player = createPlayer();
      const rod = itemGen.createItemByKey('rod_of_light');

      expect(rod).not.toBeNull();
      const cost = getItemEnergyCost(rod!, player);
      const expected = calculateDeviceEnergyCost(player.skills.device);

      expect(cost).toBe(expected);
    });

    it('should return variable cost for staves based on skill', () => {
      const player = createPlayer();
      const staff = itemGen.createItemByKey('staff_of_light');

      expect(staff).not.toBeNull();
      const cost = getItemEnergyCost(staff!, player);
      const expected = calculateDeviceEnergyCost(player.skills.device);

      expect(cost).toBe(expected);
    });
  });

  /**
   * TDD Tests: ItemUseSystem should NOT spend energy directly
   *
   * These tests verify the refactored behavior where:
   * - ItemUseSystem only executes effects and returns energyCost
   * - Energy spending is handled by fsm.completeTurn() in the FSM states
   */
  describe('ItemUseSystem does NOT spend energy', () => {
    it('usePotion should NOT modify player energy', () => {
      const player = createPlayer();
      const level = createLevel();
      const potion = itemGen.createItemByKey('potion_of_cure_light_wounds');
      const initialEnergy = player.energy;

      usePotion(potion!, { player, level });

      expect(player.energy).toBe(initialEnergy);
    });

    it('useScroll should NOT modify player energy', () => {
      const player = createPlayer();
      const level = createLevel();
      const scroll = itemGen.createItemByKey('scroll_of_light');
      const initialEnergy = player.energy;

      useScroll(scroll!, { player, level });

      expect(player.energy).toBe(initialEnergy);
    });

    it('useFood should NOT modify player energy', () => {
      const player = createPlayer();
      const level = createLevel();
      const food = itemGen.createItemByKey('ration_of_food');
      const initialEnergy = player.energy;

      useFood(food!, { player, level });

      expect(player.energy).toBe(initialEnergy);
    });

    it('useDevice should NOT modify player energy', () => {
      const player = createPlayer();
      const level = createLevel();
      const wand = itemGen.createItemByKey('wand_of_light');
      const initialEnergy = player.energy;

      useDevice(wand!, { player, level });

      expect(player.energy).toBe(initialEnergy);
    });
  });

  describe('Device energy cost formula', () => {
    it('should cost 200 energy with 0 device skill', () => {
      expect(calculateDeviceEnergyCost(0)).toBe(200);
    });

    it('should cost 150 energy with 80 device skill', () => {
      // 200 - 5 * 80 / 8 = 200 - 50 = 150
      expect(calculateDeviceEnergyCost(80)).toBe(150);
    });

    it('should cost 100 energy with 160 device skill', () => {
      // 200 - 5 * 160 / 8 = 200 - 100 = 100
      expect(calculateDeviceEnergyCost(160)).toBe(100);
    });

    it('should cost minimum 75 energy with high skill', () => {
      expect(calculateDeviceEnergyCost(200)).toBe(75);
      expect(calculateDeviceEnergyCost(300)).toBe(75);
      expect(calculateDeviceEnergyCost(1000)).toBe(75);
    });

    it('should range from 75 (min) to 200 (max)', () => {
      for (let skill = 0; skill <= 300; skill += 20) {
        const cost = calculateDeviceEnergyCost(skill);
        expect(cost).toBeGreaterThanOrEqual(75);
        expect(cost).toBeLessThanOrEqual(200);
      }
    });
  });
});
