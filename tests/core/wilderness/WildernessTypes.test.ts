import { describe, it, expect } from 'vitest';
import {
  // Constants
  WILD_BLOCK_SIZE,
  SEA_FRACTION,
  LAKE_NUM,
  RIVER_NUM,
  ROAD_DIST,
  MIN_DIST_TOWN,
  MIN_DIST_DUNGEON,
  NUM_TOWNS,
  NUM_DUNGEON,
  // Info flags
  WILD_INFO_WATER,
  WILD_INFO_ROAD,
  WILD_INFO_TRACK,
  WILD_INFO_LAVA,
  WILD_INFO_ACID,
  // Decision tree flags
  DT_HGT,
  DT_POP,
  DT_LAW,
  DT_LEFT,
  DT_RIGHT,
  // Types
  type WildChoiceTreeNode,
  type WildGenData,
  type WildBoundBox,
  type WildBlock,
  type WildPlace,
} from '@/core/data/WildernessTypes';

describe('Wilderness Types and Constants', () => {
  describe('Generation constants (from wild.h)', () => {
    it('should have correct WILD_BLOCK_SIZE', () => {
      // Each wilderness block is 16x16 tiles
      expect(WILD_BLOCK_SIZE).toBe(16);
    });

    it('should have correct SEA_FRACTION', () => {
      // 1/4 of the wilderness is sea
      expect(SEA_FRACTION).toBe(4);
    });

    it('should have correct LAKE_NUM', () => {
      // Number of lakes to try and make
      expect(LAKE_NUM).toBe(4);
    });

    it('should have correct RIVER_NUM', () => {
      // Constant^2 that determines number of rivers (4*4=16 river starts)
      expect(RIVER_NUM).toBe(4);
    });

    it('should have correct ROAD_DIST', () => {
      // Maximum distance a road can connect
      expect(ROAD_DIST).toBe(30);
    });

    it('should have correct MIN_DIST_TOWN', () => {
      // Minimum separation between towns
      expect(MIN_DIST_TOWN).toBe(10);
    });

    it('should have correct MIN_DIST_DUNGEON', () => {
      // Minimum separation between dungeons
      expect(MIN_DIST_DUNGEON).toBe(8);
    });

    it('should have correct NUM_TOWNS', () => {
      // Number of wilderness towns
      expect(NUM_TOWNS).toBe(20);
    });

    it('should have correct NUM_DUNGEON', () => {
      // Number of wilderness dungeons
      expect(NUM_DUNGEON).toBe(20);
    });
  });

  describe('Info flags (from wild.h)', () => {
    it('should have correct WILD_INFO_WATER flag', () => {
      expect(WILD_INFO_WATER).toBe(0x01);
    });

    it('should have correct WILD_INFO_ROAD flag', () => {
      expect(WILD_INFO_ROAD).toBe(0x02);
    });

    it('should have correct WILD_INFO_TRACK flag', () => {
      expect(WILD_INFO_TRACK).toBe(0x04);
    });

    it('should have correct WILD_INFO_LAVA flag', () => {
      expect(WILD_INFO_LAVA).toBe(0x08);
    });

    it('should have correct WILD_INFO_ACID flag', () => {
      expect(WILD_INFO_ACID).toBe(0x10);
    });

    it('should have non-overlapping info flags', () => {
      const flags = [
        WILD_INFO_WATER,
        WILD_INFO_ROAD,
        WILD_INFO_TRACK,
        WILD_INFO_LAVA,
        WILD_INFO_ACID,
      ];
      // Each flag should be a distinct power of 2
      for (let i = 0; i < flags.length; i++) {
        for (let j = i + 1; j < flags.length; j++) {
          expect(flags[i] & flags[j]).toBe(0);
        }
      }
    });
  });

  describe('Decision tree flags (from wild.h)', () => {
    it('should have correct DT_HGT flag', () => {
      // Lower two bits describe cut axis
      expect(DT_HGT).toBe(0x01);
    });

    it('should have correct DT_POP flag', () => {
      expect(DT_POP).toBe(0x02);
    });

    it('should have correct DT_LAW flag', () => {
      expect(DT_LAW).toBe(0x03);
    });

    it('should have correct DT_LEFT flag', () => {
      // These two bits describe the direction to branch
      expect(DT_LEFT).toBe(0x04);
    });

    it('should have correct DT_RIGHT flag', () => {
      expect(DT_RIGHT).toBe(0x08);
    });

    it('should allow axis flags to be extracted with mask', () => {
      // Lower 2 bits should be usable as axis selector
      const axisMask = 0x03;
      expect(DT_HGT & axisMask).toBe(DT_HGT);
      expect(DT_POP & axisMask).toBe(DT_POP);
      expect(DT_LAW & axisMask).toBe(DT_LAW);
    });

    it('should have DT_LEFT and DT_RIGHT as separate bits', () => {
      expect(DT_LEFT & DT_RIGHT).toBe(0);
    });
  });

  describe('WildBoundBox interface', () => {
    it('should support valid 3D parameter space bounds', () => {
      const bounds: WildBoundBox = {
        hgtmin: 0,
        hgtmax: 255,
        popmin: 0,
        popmax: 255,
        lawmin: 0,
        lawmax: 255,
      };
      expect(bounds.hgtmin).toBeLessThanOrEqual(bounds.hgtmax);
      expect(bounds.popmin).toBeLessThanOrEqual(bounds.popmax);
      expect(bounds.lawmin).toBeLessThanOrEqual(bounds.lawmax);
    });

    it('should support mudflats bounds from w_info.txt N:1', () => {
      // First entry: W:0:43:0:43:0:43
      const mudflats: WildBoundBox = {
        hgtmin: 0,
        hgtmax: 43,
        popmin: 0,
        popmax: 43,
        lawmin: 0,
        lawmax: 43,
      };
      expect(mudflats.hgtmax).toBe(43);
      expect(mudflats.popmax).toBe(43);
      expect(mudflats.lawmax).toBe(43);
    });
  });

  describe('WildChoiceTreeNode interface', () => {
    it('should support leaf node (cutoff = 0)', () => {
      const leafNode: WildChoiceTreeNode = {
        info: DT_LEFT | DT_RIGHT, // Both branches are leaves
        cutoff: 0, // Leaf indicator
        chance1: 100,
        chance2: 50,
        ptrnode1: 1, // Gen type 1
        ptrnode2: 2, // Gen type 2
      };
      expect(leafNode.cutoff).toBe(0);
      expect(leafNode.chance1 + leafNode.chance2).toBe(150);
    });

    it('should support internal node with height split', () => {
      const internalNode: WildChoiceTreeNode = {
        info: DT_HGT, // Split on height axis
        cutoff: 128, // Split at height 128
        chance1: 0, // Not used for internal nodes
        chance2: 0,
        ptrnode1: 10, // Left child node index
        ptrnode2: 20, // Right child node index
      };
      expect(internalNode.info & 0x03).toBe(DT_HGT);
      expect(internalNode.cutoff).toBe(128);
    });
  });

  describe('WildGenData interface', () => {
    it('should support gen routine types 1-4', () => {
      const plasmaFractal: WildGenData = {
        id: 8,
        mapFeature: 95,
        bounds: { hgtmin: 0, hgtmax: 43, popmin: 43, popmax: 85, lawmin: 43, lawmax: 85 },
        genRoutine: 1, // Plasma fractal
        chance: 100,
        roughType: ['SWAMP1', 'WASTE1', 'FOREST1'],
        data: [10, 50, 96, 100, 84, 150, 95, 255],
      };
      expect(plasmaFractal.genRoutine).toBe(1);
      expect(plasmaFractal.data).toHaveLength(8);
    });

    it('should support flat probability type (gen routine 2)', () => {
      const mudflats: WildGenData = {
        id: 1,
        mapFeature: 10,
        bounds: { hgtmin: 0, hgtmax: 43, popmin: 0, popmax: 43, lawmin: 0, lawmax: 43 },
        genRoutine: 2, // Flat probability
        chance: 100,
        roughType: ['SWAMP1', 'WASTE1'],
        data: [10, 1, 11, 1, 84, 0, 0, 0],
      };
      expect(mudflats.genRoutine).toBe(2);
    });

    it('should support overlay circle type (gen routine 3)', () => {
      const pond: WildGenData = {
        id: 37,
        mapFeature: 84,
        bounds: { hgtmin: 0, hgtmax: 43, popmin: 128, popmax: 171, lawmin: 128, lawmax: 171 },
        genRoutine: 3, // Overlay circle
        chance: 1,
        roughType: [],
        data: [22, 84, 84, 83, 0, 0, 0, 0],
      };
      expect(pond.genRoutine).toBe(3);
    });

    it('should support farm type (gen routine 4)', () => {
      const farm: WildGenData = {
        id: 36,
        mapFeature: 88,
        bounds: { hgtmin: 0, hgtmax: 43, popmin: 213, popmax: 255, lawmin: 213, lawmax: 255 },
        genRoutine: 4, // Farm
        chance: 100,
        roughType: [],
        data: [0, 0, 0, 0, 0, 0, 0, 0],
      };
      expect(farm.genRoutine).toBe(4);
    });
  });

  describe('WildBlock interface', () => {
    it('should support wilderness block with all flags', () => {
      const block: WildBlock = {
        wild: 42, // Gen type index
        place: 0, // No place
        info: WILD_INFO_ROAD | WILD_INFO_WATER,
        monGen: 20,
        monProb: 8,
      };
      expect(block.info & WILD_INFO_ROAD).toBeTruthy();
      expect(block.info & WILD_INFO_WATER).toBeTruthy();
      expect(block.info & WILD_INFO_LAVA).toBeFalsy();
    });

    it('should support block with town reference', () => {
      const townBlock: WildBlock = {
        wild: 100,
        place: 1, // Town number 1
        info: WILD_INFO_ROAD,
        monGen: 5,
        monProb: 2,
      };
      expect(townBlock.place).toBeGreaterThan(0);
    });
  });

  describe('WildPlace interface', () => {
    it('should support town place', () => {
      const town: WildPlace = {
        key: 'starting_town',
        type: 'town',
        name: 'The Town',
        x: 32,
        y: 32,
        xsize: 3,
        ysize: 2,
        seed: 12345,
        data: 150, // Population
        monstType: 1, // TOWN_MONST_VILLAGER
      };
      expect(town.type).toBe('town');
      expect(town.xsize * town.ysize).toBeGreaterThan(0);
    });

    it('should support dungeon place', () => {
      const dungeon: WildPlace = {
        key: 'angband',
        type: 'dungeon',
        name: 'The Dungeon',
        x: 33,
        y: 32,
        xsize: 1,
        ysize: 1,
        seed: 67890,
        data: 0,
        monstType: 0,
      };
      expect(dungeon.type).toBe('dungeon');
    });

    it('should support quest place', () => {
      const quest: WildPlace = {
        key: 'thieves_hideout',
        type: 'quest',
        name: "Thieves' Hideout",
        x: 40,
        y: 50,
        xsize: 2,
        ysize: 2,
        seed: 11111,
        data: 0,
        monstType: 5, // TOWN_MONST_MONST
      };
      expect(quest.type).toBe('quest');
    });
  });
});
