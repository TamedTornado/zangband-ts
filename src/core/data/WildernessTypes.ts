/**
 * Wilderness Types and Constants
 *
 * Ported from Zangband wild.h and types.h
 * These define the data structures and constants used for wilderness generation.
 */

// =============================================================================
// GENERATION CONSTANTS (from wild.h)
// =============================================================================

/** Each wilderness block is 16x16 tiles */
export const WILD_BLOCK_SIZE = 16;

/** Number of blocks visible in each direction (9x9 = 144x144 tiles) */
export const WILD_VIEW = 9;

/** Town size in blocks (all fractal cities are 8x8 blocks = 128x128 tiles) */
export const WILD_TOWN_SIZE = 8;

/** 1/4 of the wilderness is sea */
export const SEA_FRACTION = 4;

/** Number of lakes to try and make */
export const LAKE_NUM = 4;

/** Constant^2 that determines number of rivers (4*4=16 river starts) */
export const RIVER_NUM = 4;

/** Maximum distance a road can connect */
export const ROAD_DIST = 30;

/** Minimum separation between towns */
export const MIN_DIST_TOWN = 10;

/** Minimum separation between dungeons */
export const MIN_DIST_DUNGEON = 8;

/** Number of wilderness towns */
export const NUM_TOWNS = 20;

/** Number of wilderness dungeons */
export const NUM_DUNGEON = 20;

/** Size of wilderness map in blocks (256x256 = 4096x4096 tiles) */
export const MAX_WILD = 256;

// =============================================================================
// INFO FLAGS (from wild.h / defines.h)
// =============================================================================

/** Block has water */
export const WILD_INFO_WATER = 0x01;

/** Block has road */
export const WILD_INFO_ROAD = 0x02;

/** Block has track (unpaved road) */
export const WILD_INFO_TRACK = 0x04;

/** Block has lava */
export const WILD_INFO_LAVA = 0x08;

/** Block has acid */
export const WILD_INFO_ACID = 0x10;

// =============================================================================
// DECISION TREE FLAGS (from wild.h)
// =============================================================================

/**
 * Lower two bits describe which axis to cut on:
 * - DT_HGT (0x01) = height axis
 * - DT_POP (0x02) = population axis
 * - DT_LAW (0x03) = law axis
 */
export const DT_HGT = 0x01;
export const DT_POP = 0x02;
export const DT_LAW = 0x03;

/**
 * These two bits describe whether branches are leaf nodes:
 * - DT_LEFT (0x04) = left branch is a leaf (gen type index)
 * - DT_RIGHT (0x08) = right branch is a leaf (gen type index)
 */
export const DT_LEFT = 0x04;
export const DT_RIGHT = 0x08;

// =============================================================================
// TYPE DEFINITIONS (from types.h)
// =============================================================================

/**
 * 3D axis-aligned bounding box in parameter space.
 * From wild_bound_box_type in types.h.
 *
 * Each axis ranges 0-255:
 * - hgt: terrain height/elevation
 * - pop: population density
 * - law: lawfulness/civilization level
 */
export interface WildBoundBox {
  hgtmin: number;
  hgtmax: number;
  popmin: number;
  popmax: number;
  lawmin: number;
  lawmax: number;
}

/**
 * Decision tree node for terrain type lookup.
 * From wild_choice_tree_type in types.h.
 *
 * The tree uses binary space partitioning to efficiently map
 * (hgt, pop, law) tuples to wilderness generation types.
 */
export interface WildChoiceTreeNode {
  /**
   * Lower 2 bits: axis to split on (DT_HGT, DT_POP, DT_LAW)
   * Bit 2 (DT_LEFT): set if left branch points to a gen type (leaf)
   * Bit 3 (DT_RIGHT): set if right branch points to a gen type (leaf)
   */
  info: number;

  /**
   * Split threshold value for the axis.
   * If 0, this is a leaf node that uses chance-based selection.
   */
  cutoff: number;

  /** Probability weight for left branch (used when cutoff = 0) */
  chance1: number;

  /** Probability weight for right branch (used when cutoff = 0) */
  chance2: number;

  /** Left child: node index if internal, gen type index if leaf */
  ptrnode1: number;

  /** Right child: node index if internal, gen type index if leaf */
  ptrnode2: number;
}

/**
 * Wilderness terrain generation definition.
 * From wild_gen_data_type in types.h.
 * Parsed from w_info.txt.
 */
export interface WildGenData {
  /** N: field - unique identifier */
  id: number;

  /** Optional comment/description for debugging */
  comment?: string;

  /** M: field - overhead map feature index */
  mapFeature: number;

  /** W: field - 3D parameter space bounds */
  bounds: WildBoundBox;

  /**
   * T: field (first value) - generation routine type:
   * 1 = plasma fractal (make_wild_01)
   * 2 = flat probability (make_wild_02)
   * 3 = overlay circle (make_wild_03)
   * 4 = farm pattern (make_wild_04)
   */
  genRoutine: 1 | 2 | 3 | 4;

  /** T: field (second value) - relative probability weight */
  chance: number;

  /** F: field - monster terrain type flags */
  roughType: string[];

  /** E: field - 8 extra parameters passed to generation routine */
  data: number[];
}

/**
 * Per-block wilderness data after generation.
 * From wild_done_type in types.h.
 */
export interface WildBlock {
  /** Index into wild_gen_data array (which generation type) */
  wild: number;

  /** Town/dungeon number at this location (0 = none) */
  place: number;

  /** Info flags (WILD_INFO_ROAD, WILD_INFO_WATER, etc) */
  info: number;

  /** Monster difficulty level for this block (0-64) */
  monGen: number;

  /** Monster probability/rarity for this block (0-16) */
  monProb: number;
}

/**
 * Place definition (town, dungeon, or quest).
 * From place_type in types.h.
 */
export interface WildPlace {
  /** Unique identifier for this place */
  key: string;

  /** Type of place */
  type: 'town' | 'dungeon' | 'quest';

  /** Display name */
  name: string;

  /** X position in wilderness blocks */
  x: number;

  /** Y position in wilderness blocks */
  y: number;

  /** Width in wilderness blocks */
  xsize: number;

  /** Height in wilderness blocks */
  ysize: number;

  /** RNG seed for reproducible generation */
  seed: number;

  /** Population for towns, 0 for others */
  data: number;

  /**
   * Type of monster population:
   * 0 = none
   * 1 = TOWN_MONST_VILLAGER
   * 2 = TOWN_MONST_ELVES
   * 3 = TOWN_MONST_DWARF
   * 4 = TOWN_MONST_LIZARD
   * 5 = TOWN_MONST_MONST
   * 6 = TOWN_MONST_ABANDONED
   */
  monstType: number;
}

/**
 * Town type constants from wild.h
 */
export const TownType = {
  /** Vanilla Angband-style town */
  OLD: 'old',
  /** Fractal city generation */
  FRACT: 'fract',
  /** Quest location */
  QUEST: 'quest',
  /** Dungeon entrance */
  DUNGEON: 'dungeon',
} as const;
export type TownType = (typeof TownType)[keyof typeof TownType];

/**
 * Town monster type constants from wild.h
 */
export const TownMonstType = {
  NONE: 0,
  VILLAGER: 1,
  ELVES: 2,
  DWARF: 3,
  LIZARD: 4,
  MONST: 5,
  ABANDONED: 6,
} as const;
export type TownMonstType = (typeof TownMonstType)[keyof typeof TownMonstType];

/**
 * Road level constants used to define width of the path.
 * From wild.h.
 */
export const ROAD_LEVEL = WILD_BLOCK_SIZE * 150;
export const TRACK_LEVEL = WILD_BLOCK_SIZE * 140;
export const ROAD_BORDER = WILD_BLOCK_SIZE * 120;
export const GROUND_LEVEL = WILD_BLOCK_SIZE * 100;

/**
 * Sentinel value used in plasma fractal algorithm.
 * MAX_SHORT from C (65535).
 */
export const MAX_SHORT = 65535;
