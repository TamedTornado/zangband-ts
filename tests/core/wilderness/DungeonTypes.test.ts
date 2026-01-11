/**
 * Tests for Dungeon Type Definitions
 *
 * Zangband has two dungeon systems:
 * 1. MAIN_DUNGEON - Infinite dungeon at starting town (levels 1-128)
 * 2. 12 wilderness dungeon types - Themed, level-capped dungeons
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  DUNGEON_TYPES,
  MAIN_DUNGEON,
  getDungeonType,
  getDungeonTypeByName,
  dungeonTypeToConfig,
  liquidFlagsToTerrain,
  DF_NONE,
  DF_ROAD,
  DF_TRACK,
  LQ_NONE,
  LQ_WATER,
  LQ_LAVA,
  LQ_ACID,
  LQ_SWAMP,
  type DungeonTypeDef,
} from '@/core/data/DungeonTypes';

describe('DungeonTypes', () => {
  describe('constants', () => {
    it('should have DF_NONE = 0', () => {
      expect(DF_NONE).toBe(0);
    });

    it('should have DF_ROAD = 0x01', () => {
      expect(DF_ROAD).toBe(0x01);
    });

    it('should have DF_TRACK = 0x02', () => {
      expect(DF_TRACK).toBe(0x02);
    });
  });

  describe('MAIN_DUNGEON', () => {
    it('should have id -1 (special identifier)', () => {
      expect(MAIN_DUNGEON.id).toBe(-1);
    });

    it('should be named "the Dungeon"', () => {
      expect(MAIN_DUNGEON.name).toBe('the Dungeon');
    });

    it('should have levels 1-128 (infinite)', () => {
      expect(MAIN_DUNGEON.minLevel).toBe(1);
      expect(MAIN_DUNGEON.maxLevel).toBe(128);
    });

    it('should have no road flags (not in wilderness)', () => {
      expect(MAIN_DUNGEON.roadFlags).toBe(DF_NONE);
    });

    it('should be unthemed (no special room/floor/liquid)', () => {
      expect(MAIN_DUNGEON.roomFlags).toBe(0);
      expect(MAIN_DUNGEON.liquidFlags).toBe(0);
    });
  });

  describe('wilderness dungeon types', () => {
    it('should have exactly 12 wilderness dungeon types', () => {
      expect(DUNGEON_TYPES.length).toBe(12);
    });

    it('should have unique IDs from 0-11', () => {
      const ids = DUNGEON_TYPES.map((d) => d.id);
      expect(ids).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    });

    it('should have unique names', () => {
      const names = DUNGEON_TYPES.map((d) => d.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(12);
    });
  });

  describe('Darkwater (id 0)', () => {
    let darkwater: DungeonTypeDef;

    beforeAll(() => {
      darkwater = getDungeonType(0)!;
    });

    it('should exist', () => {
      expect(darkwater).toBeDefined();
    });

    it('should be named "the Darkwater Sewers"', () => {
      expect(darkwater.name).toBe('the Darkwater Sewers');
    });

    it('should have levels 1-15', () => {
      expect(darkwater.minLevel).toBe(1);
      expect(darkwater.maxLevel).toBe(15);
    });

    it('should have both ROAD and TRACK flags', () => {
      expect(darkwater.roadFlags & DF_ROAD).toBeTruthy();
      expect(darkwater.roadFlags & DF_TRACK).toBeTruthy();
    });
  });

  describe('Lair (id 1)', () => {
    let lair: DungeonTypeDef;

    beforeAll(() => {
      lair = getDungeonType(1)!;
    });

    it('should exist', () => {
      expect(lair).toBeDefined();
    });

    it('should be named "a Monster Lair"', () => {
      expect(lair.name).toBe('a Monster Lair');
    });

    it('should have levels 10-50', () => {
      expect(lair.minLevel).toBe(10);
      expect(lair.maxLevel).toBe(50);
    });

    it('should have NO road flags (DF_NONE)', () => {
      expect(lair.roadFlags).toBe(DF_NONE);
    });
  });

  describe('Temple (id 2)', () => {
    let temple: DungeonTypeDef;

    beforeAll(() => {
      temple = getDungeonType(2)!;
    });

    it('should have levels 20-60', () => {
      expect(temple.minLevel).toBe(20);
      expect(temple.maxLevel).toBe(60);
    });

    it('should have ROAD flag only', () => {
      expect(temple.roadFlags & DF_ROAD).toBeTruthy();
      expect(temple.roadFlags & DF_TRACK).toBeFalsy();
    });
  });

  describe('Mine (id 10)', () => {
    let mine: DungeonTypeDef;

    beforeAll(() => {
      mine = getDungeonType(10)!;
    });

    it('should be named "an Abandoned Mine"', () => {
      expect(mine.name).toBe('an Abandoned Mine');
    });

    it('should have levels 1-40 (early game)', () => {
      expect(mine.minLevel).toBe(1);
      expect(mine.maxLevel).toBe(40);
    });

    it('should have ROAD flag', () => {
      expect(mine.roadFlags & DF_ROAD).toBeTruthy();
    });

    it('should prefer high elevation (mountains)', () => {
      expect(mine.heightPref).toBeGreaterThan(150);
    });
  });

  describe('Hell (id 8)', () => {
    let hell: DungeonTypeDef;

    beforeAll(() => {
      hell = getDungeonType(8)!;
    });

    it('should be named "the Pit of Hell"', () => {
      expect(hell.name).toBe('the Pit of Hell');
    });

    it('should have levels 60-127 (endgame)', () => {
      expect(hell.minLevel).toBe(60);
      expect(hell.maxLevel).toBe(127);
    });

    it('should have TRACK flag only', () => {
      expect(hell.roadFlags & DF_TRACK).toBeTruthy();
      expect(hell.roadFlags & DF_ROAD).toBeFalsy();
    });

    it('should prefer low population (chaotic wasteland)', () => {
      expect(hell.popPref).toBeLessThan(50);
    });
  });

  describe('Horror (id 9)', () => {
    let horror: DungeonTypeDef;

    beforeAll(() => {
      horror = getDungeonType(9)!;
    });

    it('should have levels 80-127 (very endgame)', () => {
      expect(horror.minLevel).toBe(80);
      expect(horror.maxLevel).toBe(127);
    });
  });

  describe('getDungeonType', () => {
    it('should return MAIN_DUNGEON for id -1', () => {
      expect(getDungeonType(-1)).toBe(MAIN_DUNGEON);
    });

    it('should return correct dungeon for valid ids 0-11', () => {
      for (let i = 0; i < 12; i++) {
        const dungeon = getDungeonType(i);
        expect(dungeon).toBeDefined();
        expect(dungeon!.id).toBe(i);
      }
    });

    it('should return undefined for invalid ids', () => {
      expect(getDungeonType(12)).toBeUndefined();
      expect(getDungeonType(100)).toBeUndefined();
      expect(getDungeonType(-2)).toBeUndefined();
    });
  });

  describe('level ranges', () => {
    it('early game dungeons should have low minLevel', () => {
      const darkwater = getDungeonType(0)!;
      const mine = getDungeonType(10)!;
      expect(darkwater.minLevel).toBeLessThanOrEqual(5);
      expect(mine.minLevel).toBeLessThanOrEqual(5);
    });

    it('endgame dungeons should have high minLevel', () => {
      const hell = getDungeonType(8)!;
      const horror = getDungeonType(9)!;
      expect(hell.minLevel).toBeGreaterThanOrEqual(60);
      expect(horror.minLevel).toBeGreaterThanOrEqual(80);
    });

    it('all dungeons should have minLevel <= maxLevel', () => {
      for (const dungeon of DUNGEON_TYPES) {
        expect(dungeon.minLevel).toBeLessThanOrEqual(dungeon.maxLevel);
      }
    });
  });

  describe('getDungeonTypeByName', () => {
    it('should return MAIN_DUNGEON for "the Dungeon"', () => {
      expect(getDungeonTypeByName('the Dungeon')).toBe(MAIN_DUNGEON);
      expect(getDungeonTypeByName('the dungeon')).toBe(MAIN_DUNGEON);
      expect(getDungeonTypeByName('THE DUNGEON')).toBe(MAIN_DUNGEON);
    });

    it('should return wilderness types by full name (case-insensitive)', () => {
      expect(getDungeonTypeByName('the Darkwater Sewers')?.id).toBe(0);
      expect(getDungeonTypeByName('THE DARKWATER SEWERS')?.id).toBe(0);
      expect(getDungeonTypeByName('the Pit of Hell')?.id).toBe(8);
      expect(getDungeonTypeByName('an Abandoned Mine')?.id).toBe(10);
    });

    it('should return undefined for unknown names', () => {
      expect(getDungeonTypeByName('Unknown')).toBeUndefined();
      expect(getDungeonTypeByName('')).toBeUndefined();
    });
  });

  describe('liquidFlagsToTerrain', () => {
    it('should return empty for LQ_NONE', () => {
      const result = liquidFlagsToTerrain(LQ_NONE);
      expect(result.shallowLiquid).toBeUndefined();
      expect(result.deepLiquid).toBeUndefined();
    });

    it('should return water terrain for LQ_WATER', () => {
      const result = liquidFlagsToTerrain(LQ_WATER);
      expect(result.shallowLiquid).toBe('shallow_water');
      expect(result.deepLiquid).toBe('deep_water');
    });

    it('should return lava terrain for LQ_LAVA', () => {
      const result = liquidFlagsToTerrain(LQ_LAVA);
      expect(result.shallowLiquid).toBe('shallow_lava');
      expect(result.deepLiquid).toBe('deep_lava');
    });

    it('should return acid terrain for LQ_ACID', () => {
      const result = liquidFlagsToTerrain(LQ_ACID);
      expect(result.shallowLiquid).toBe('shallow_acid');
      expect(result.deepLiquid).toBe('deep_acid');
    });

    it('should return swamp terrain for LQ_SWAMP', () => {
      const result = liquidFlagsToTerrain(LQ_SWAMP);
      expect(result.shallowLiquid).toBe('shallow_swamp');
      expect(result.deepLiquid).toBe('deep_swamp');
    });

    it('should prioritize lava over other liquids', () => {
      // Lava takes priority
      const result = liquidFlagsToTerrain(LQ_LAVA | LQ_WATER | LQ_SWAMP);
      expect(result.shallowLiquid).toBe('shallow_lava');
      expect(result.deepLiquid).toBe('deep_lava');
    });

    it('should prioritize acid over swamp and water', () => {
      const result = liquidFlagsToTerrain(LQ_ACID | LQ_WATER | LQ_SWAMP);
      expect(result.shallowLiquid).toBe('shallow_acid');
      expect(result.deepLiquid).toBe('deep_acid');
    });
  });

  describe('dungeonTypeToConfig', () => {
    it('MAIN_DUNGEON should have no liquids (unthemed)', () => {
      const config = dungeonTypeToConfig(MAIN_DUNGEON);
      expect(config.roomTypes).toBe(0);
      expect(config.floorTerrain).toBe('floor');
      expect(config.shallowLiquid).toBeUndefined();
      expect(config.deepLiquid).toBeUndefined();
      expect(config.minLevel).toBe(1);
      expect(config.maxLevel).toBe(128);
    });

    it('Darkwater should have swamp/water terrain', () => {
      const darkwater = getDungeonType(0)!;
      const config = dungeonTypeToConfig(darkwater);
      expect(config.floorTerrain).toBe('dry_mud');
      // Darkwater has LQ_WATER | LQ_SWAMP, swamp has lower priority so we get water
      // Actually, let's check what Darkwater's liquidFlags are
      expect(darkwater.liquidFlags).toBe(LQ_WATER | LQ_SWAMP);
      // Swamp has lower priority than water, so we get swamp
      expect(config.shallowLiquid).toBe('shallow_swamp');
      expect(config.deepLiquid).toBe('deep_swamp');
    });

    it('Hell should have lava terrain', () => {
      const hell = getDungeonType(8)!;
      const config = dungeonTypeToConfig(hell);
      expect(config.floorTerrain).toBe('solid_lava');
      expect(config.shallowLiquid).toBe('shallow_lava');
      expect(config.deepLiquid).toBe('deep_lava');
      expect(config.minLevel).toBe(60);
      expect(config.maxLevel).toBe(127);
    });

    it('Tower should have acid/lava terrain (lava wins)', () => {
      const tower = getDungeonType(3)!;
      const config = dungeonTypeToConfig(tower);
      expect(config.floorTerrain).toBe('floor_wood');
      // Tower has LQ_ACID | LQ_LAVA, lava wins
      expect(config.shallowLiquid).toBe('shallow_lava');
      expect(config.deepLiquid).toBe('deep_lava');
    });

    it('should preserve room type flags', () => {
      const temple = getDungeonType(2)!;
      const config = dungeonTypeToConfig(temple);
      expect(config.roomTypes).toBe(temple.roomFlags);
      expect(config.roomTypes).toBeGreaterThan(0);
    });

    it('should preserve level ranges', () => {
      for (const dungeon of DUNGEON_TYPES) {
        const config = dungeonTypeToConfig(dungeon);
        expect(config.minLevel).toBe(dungeon.minLevel);
        expect(config.maxLevel).toBe(dungeon.maxLevel);
      }
    });
  });
});
