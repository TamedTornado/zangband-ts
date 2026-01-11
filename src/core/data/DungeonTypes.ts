/**
 * Dungeon Type Definitions
 *
 * Ported from Zangband wild2.c dungeons[] array.
 *
 * Zangband has two dungeon systems:
 * 1. MAIN_DUNGEON - Special infinite dungeon at starting town (levels 1-128)
 * 2. 12 wilderness dungeon types - Themed, level-capped dungeons scattered across wilderness
 *
 * Each wilderness dungeon type has:
 * - Level range (minLevel to maxLevel)
 * - Terrain preferences (height, population) for placement scoring
 * - Road connection flags (DF_ROAD, DF_TRACK)
 * - Room type restrictions
 * - Floor terrain and liquid types
 */

// =============================================================================
// DUNGEON FLAGS (from wild.h)
// =============================================================================

/** No road connection */
export const DF_NONE = 0x00;

/** Has road connection to wilderness */
export const DF_ROAD = 0x01;

/** Has track/path connection to wilderness */
export const DF_TRACK = 0x02;

// =============================================================================
// ROOM TYPE FLAGS (from defines.h)
// =============================================================================

export const RT_SIMPLE = 0x0040;
export const RT_NATURAL = 0x0002;
export const RT_ANIMAL = 0x0004;
export const RT_COMPLEX = 0x0008;
export const RT_DENSE = 0x0010;
export const RT_RUIN = 0x0020;
export const RT_BUILDING = 0x0080;
export const RT_CRYPT = 0x0100;
export const RT_RVAULT = 0x0200;
export const RT_STRANGE = 0x0400;
export const RT_FANCY = 0x0800;

// =============================================================================
// LIQUID FLAGS (from defines.h)
// =============================================================================

export const LQ_NONE = 0x00;
export const LQ_WATER = 0x01;
export const LQ_LAVA = 0x02;
export const LQ_ACID = 0x04;
export const LQ_SWAMP = 0x08;

// =============================================================================
// DUNGEON TYPE DEFINITION
// =============================================================================

/**
 * Dungeon type definition.
 * From dun_gen_type in types.h.
 */
export interface DungeonTypeDef {
  /** Unique identifier (-1 for MAIN_DUNGEON, 0-11 for wilderness types) */
  id: number;

  /** Display name */
  name: string;

  /** Minimum dungeon depth */
  minLevel: number;

  /** Maximum dungeon depth */
  maxLevel: number;

  /** Population preference for placement scoring (0-255, higher = more civilized) */
  popPref: number;

  /** Height preference for placement scoring (0-255, higher = mountainous) */
  heightPref: number;

  /** Room type flags (RT_* constants) */
  roomFlags: number;

  /** Floor terrain key */
  floorTerrain: string;

  /** Liquid type flags (LQ_* constants) */
  liquidFlags: number;

  /** Road connection flags (DF_ROAD, DF_TRACK) */
  roadFlags: number;

  /** Object theme: percentage weights [treasure, combat, magic, tools] */
  objTheme: [number, number, number, number];
}

// =============================================================================
// MAIN DUNGEON (Starting Town)
// =============================================================================

/**
 * Special infinite dungeon attached to the starting town.
 * This is the classic Angband-style progression dungeon.
 * Unthemed - no special rooms, floor, or monster habitat.
 */
export const MAIN_DUNGEON: DungeonTypeDef = {
  id: -1,
  name: 'the Dungeon',
  minLevel: 1,
  maxLevel: 128,
  popPref: 128,
  heightPref: 128,
  roomFlags: 0,
  floorTerrain: 'floor',
  liquidFlags: LQ_NONE,
  roadFlags: DF_NONE,
  objTheme: [25, 25, 25, 25], // Balanced
};

// =============================================================================
// 12 WILDERNESS DUNGEON TYPES (from wild2.c dungeons[] array)
// =============================================================================

/**
 * The 12 wilderness dungeon types.
 * Indices match the C code exactly.
 */
export const DUNGEON_TYPES: DungeonTypeDef[] = [
  // 0: Darkwater (Sewers) - levels 1-15
  {
    id: 0,
    name: 'the Darkwater Sewers',
    minLevel: 1,
    maxLevel: 15,
    popPref: 100,
    heightPref: 50, // Low areas, swampy
    roomFlags: RT_SIMPLE | RT_NATURAL | RT_ANIMAL | RT_STRANGE,
    floorTerrain: 'dry_mud',
    liquidFlags: LQ_WATER | LQ_SWAMP,
    roadFlags: DF_TRACK | DF_ROAD,
    objTheme: [0, 10, 0, 40], // 40% tools
  },

  // 1: Lair - levels 10-50
  {
    id: 1,
    name: 'a Monster Lair',
    minLevel: 10,
    maxLevel: 50,
    popPref: 100,
    heightPref: 100,
    roomFlags: RT_NATURAL | RT_COMPLEX | RT_RUIN,
    floorTerrain: 'dirt',
    liquidFlags: LQ_WATER | LQ_ACID | LQ_SWAMP,
    roadFlags: DF_NONE, // No roads to lairs
    objTheme: [50, 10, 10, 0], // 50% treasure
  },

  // 2: Temple - levels 20-60
  {
    id: 2,
    name: 'a Ruined Temple',
    minLevel: 20,
    maxLevel: 60,
    popPref: 250, // High civilization
    heightPref: 250,
    roomFlags: RT_SIMPLE | RT_COMPLEX | RT_DENSE | RT_FANCY | RT_BUILDING | RT_CRYPT,
    floorTerrain: 'floor_tile',
    liquidFlags: LQ_WATER | LQ_LAVA,
    roadFlags: DF_ROAD,
    objTheme: [10, 30, 30, 30], // Balanced
  },

  // 3: Tower - levels 20-60
  {
    id: 3,
    name: 'a Wizard\'s Tower',
    minLevel: 20,
    maxLevel: 60,
    popPref: 150,
    heightPref: 200,
    roomFlags: RT_SIMPLE | RT_COMPLEX | RT_BUILDING | RT_RVAULT,
    floorTerrain: 'floor_wood',
    liquidFlags: LQ_ACID | LQ_LAVA,
    roadFlags: DF_TRACK,
    objTheme: [20, 0, 80, 0], // 80% magic
  },

  // 4: Ruin - levels 20-80
  {
    id: 4,
    name: 'the Ancient Ruins',
    minLevel: 20,
    maxLevel: 80,
    popPref: 100,
    heightPref: 100,
    roomFlags: RT_RUIN,
    floorTerrain: 'pebbles',
    liquidFlags: LQ_WATER | LQ_LAVA | LQ_SWAMP,
    roadFlags: DF_TRACK | DF_ROAD,
    objTheme: [0, 50, 50, 0], // Combat/magic
  },

  // 5: Grave - levels 30-100
  {
    id: 5,
    name: 'the Graveyard',
    minLevel: 30,
    maxLevel: 100,
    popPref: 150,
    heightPref: 100,
    roomFlags: RT_COMPLEX | RT_FANCY | RT_CRYPT,
    floorTerrain: 'floor_tile',
    liquidFlags: LQ_WATER | LQ_SWAMP,
    roadFlags: DF_TRACK | DF_ROAD,
    objTheme: [50, 20, 20, 0], // 50% treasure
  },

  // 6: Cavern - levels 40-80
  {
    id: 6,
    name: 'a Deep Cavern',
    minLevel: 40,
    maxLevel: 80,
    popPref: 50,
    heightPref: 50,
    roomFlags: RT_SIMPLE | RT_ANIMAL | RT_DENSE | RT_RUIN | RT_RVAULT,
    floorTerrain: 'dirt',
    liquidFlags: LQ_WATER | LQ_ACID | LQ_LAVA,
    roadFlags: DF_TRACK,
    objTheme: [30, 30, 30, 10], // Balanced
  },

  // 7: Planar - levels 40-127
  {
    id: 7,
    name: 'a Planar Gate',
    minLevel: 40,
    maxLevel: 127,
    popPref: 50,
    heightPref: 100,
    roomFlags: RT_COMPLEX | RT_DENSE | RT_FANCY | RT_RVAULT,
    floorTerrain: 'sand',
    liquidFlags: LQ_ACID | LQ_LAVA,
    roadFlags: DF_TRACK,
    objTheme: [20, 30, 50, 0], // 50% magic
  },

  // 8: Hell - levels 60-127
  {
    id: 8,
    name: 'the Pit of Hell',
    minLevel: 60,
    maxLevel: 127,
    popPref: 0, // Chaotic wasteland
    heightPref: 0,
    roomFlags: RT_SIMPLE | RT_NATURAL | RT_ANIMAL | RT_DENSE | RT_RUIN | RT_FANCY | RT_RVAULT | RT_STRANGE,
    floorTerrain: 'solid_lava',
    liquidFlags: LQ_LAVA,
    roadFlags: DF_TRACK,
    objTheme: [20, 40, 40, 0], // Combat/magic
  },

  // 9: Horror - levels 80-127
  {
    id: 9,
    name: 'the Halls of Horror',
    minLevel: 80,
    maxLevel: 127,
    popPref: 0,
    heightPref: 50,
    roomFlags: RT_SIMPLE | RT_NATURAL | RT_ANIMAL | RT_DENSE | RT_RUIN | RT_STRANGE,
    floorTerrain: 'salt',
    liquidFlags: LQ_ACID,
    roadFlags: DF_TRACK,
    objTheme: [10, 40, 40, 10], // Combat/magic
  },

  // 10: Mine - levels 1-40
  {
    id: 10,
    name: 'an Abandoned Mine',
    minLevel: 1,
    maxLevel: 40,
    popPref: 200, // Near civilization
    heightPref: 200, // Mountains
    roomFlags: RT_SIMPLE | RT_NATURAL | RT_ANIMAL | RT_RUIN | RT_STRANGE,
    floorTerrain: 'dirt',
    liquidFlags: LQ_WATER | LQ_LAVA,
    roadFlags: DF_ROAD,
    objTheme: [10, 20, 10, 40], // 40% tools
  },

  // 11: City - levels 20-60
  {
    id: 11,
    name: 'a Ruined City',
    minLevel: 20,
    maxLevel: 60,
    popPref: 200,
    heightPref: 150,
    roomFlags: RT_SIMPLE | RT_COMPLEX | RT_DENSE | RT_FANCY | RT_BUILDING | RT_CRYPT | RT_RVAULT | RT_STRANGE,
    floorTerrain: 'floor_tile',
    liquidFlags: LQ_WATER,
    roadFlags: DF_TRACK | DF_ROAD,
    objTheme: [30, 30, 10, 10], // Balanced
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get a dungeon type by ID.
 * Returns MAIN_DUNGEON for id -1, wilderness type for 0-11, undefined otherwise.
 */
export function getDungeonType(id: number): DungeonTypeDef | undefined {
  if (id === -1) {
    return MAIN_DUNGEON;
  }
  if (id >= 0 && id < DUNGEON_TYPES.length) {
    return DUNGEON_TYPES[id];
  }
  return undefined;
}

/**
 * Get a dungeon type by name (case-insensitive).
 */
export function getDungeonTypeByName(name: string): DungeonTypeDef | undefined {
  const lowerName = name.toLowerCase();
  if (lowerName === 'the dungeon') {
    return MAIN_DUNGEON;
  }
  return DUNGEON_TYPES.find((d) => d.name.toLowerCase() === lowerName);
}

/**
 * Options for dungeon generation based on dungeon type.
 * Used to pass to DungeonGenerator's DungeonConfig.
 */
export interface DungeonTypeConfigOptions {
  /** Room type flags (RT_* constants) */
  roomTypes: number;
  /** Floor terrain key */
  floorTerrain: string;
  /** Shallow liquid terrain key (if any) */
  shallowLiquid?: string | undefined;
  /** Deep liquid terrain key (if any) */
  deepLiquid?: string | undefined;
  /** Minimum dungeon level for this type */
  minLevel: number;
  /** Maximum dungeon level for this type */
  maxLevel: number;
}

/**
 * Convert liquid flags to terrain feature keys.
 *
 * @param liquidFlags - LQ_* flags from dungeon type
 * @returns Object with shallow and deep liquid terrain keys
 */
export function liquidFlagsToTerrain(liquidFlags: number): {
  shallowLiquid?: string;
  deepLiquid?: string;
} {
  // Priority: Lava > Acid > Swamp > Water (most dangerous first)
  if (liquidFlags & LQ_LAVA) {
    return { shallowLiquid: 'shallow_lava', deepLiquid: 'deep_lava' };
  }
  if (liquidFlags & LQ_ACID) {
    return { shallowLiquid: 'shallow_acid', deepLiquid: 'deep_acid' };
  }
  if (liquidFlags & LQ_SWAMP) {
    return { shallowLiquid: 'shallow_swamp', deepLiquid: 'deep_swamp' };
  }
  if (liquidFlags & LQ_WATER) {
    return { shallowLiquid: 'shallow_water', deepLiquid: 'deep_water' };
  }
  return {};
}

/**
 * Convert a DungeonTypeDef to generation config options.
 *
 * This can be used when generating a dungeon level to apply
 * the dungeon type's theming (floor terrain, liquids, room types).
 *
 * @param dungeonType - The dungeon type definition
 * @returns Config options suitable for DungeonGenerator
 */
export function dungeonTypeToConfig(dungeonType: DungeonTypeDef): DungeonTypeConfigOptions {
  const liquids = liquidFlagsToTerrain(dungeonType.liquidFlags);

  return {
    roomTypes: dungeonType.roomFlags,
    floorTerrain: dungeonType.floorTerrain,
    shallowLiquid: liquids.shallowLiquid,
    deepLiquid: liquids.deepLiquid,
    minLevel: dungeonType.minLevel,
    maxLevel: dungeonType.maxLevel,
  };
}
