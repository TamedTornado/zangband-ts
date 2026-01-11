/**
 * Dungeon Generation Types and Constants
 *
 * Type definitions and constants for dungeon generation,
 * ported from Zangband's defines.h, generate.h
 */

import type { RNG as ROTRng } from 'rot-js';

// ============================================================================
// Feature Types
// ============================================================================

/** Feature types matching Zangband's FEAT_* constants */
export type FeatureType =
  | 'floor'
  | 'wall_extra'      // Basic granite
  | 'wall_inner'      // Inner room wall
  | 'wall_outer'      // Outer room wall
  | 'wall_solid'      // Solid/permanent wall
  | 'permanent_wall'  // Dungeon boundary
  | 'secret_door'
  | 'open_door'
  | 'closed_door'
  | 'broken_door'
  | 'up_staircase'
  | 'down_staircase'
  | 'pillar'
  | 'rubble'
  | 'magma'
  | 'quartz'
  | 'shallow_water'
  | 'deep_water'
  | 'shallow_lava'
  | 'deep_lava';

// ============================================================================
// Tiles
// ============================================================================

/** A single tile in the dungeon grid */
export interface DungeonTile {
  feat: FeatureType;
  info: number; // Bitflags: CAVE_ROOM, CAVE_GLOW, CAVE_ICKY, etc.
}

// ============================================================================
// Cave Info Flags (from defines.h)
// ============================================================================

export const CAVE_ROOM = 0x0001;  // Part of a room
export const CAVE_GLOW = 0x0002;  // Self-illuminating
export const CAVE_ICKY = 0x0004;  // Part of a vault (no teleport)
export const CAVE_MARK = 0x0008;  // Memorized feature

// ============================================================================
// Room Type Flags
// ============================================================================

export const RT_SIMPLE   = 0x0001;
export const RT_FANCY    = 0x0002;
export const RT_COMPLEX  = 0x0004;
export const RT_STRANGE  = 0x0008;
export const RT_NATURAL  = 0x0010;
export const RT_BUILDING = 0x0020;
export const RT_RUIN     = 0x0040;
export const RT_CRYPT    = 0x0080;
export const RT_DENSE    = 0x0100;  // Vault-like (many monsters/objects)
export const RT_RVAULT   = 0x0200;  // Random vault
export const RT_ANIMAL   = 0x0400;  // Animal nest allowed
export const RT_TAG_CROWDED = 0x8000; // Counts as crowded (nest/pit)

// ============================================================================
// Coordinates and Bounds
// ============================================================================

/** Room center coordinate */
export interface Coord {
  x: number;
  y: number;
}

/** Room boundary */
export interface RoomBounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** A room definition for generation tracking */
export interface Room extends RoomBounds {
  centerX: number;
  centerY: number;
  lit: boolean;
  type: number;  // Room type index
}

// ============================================================================
// Configuration
// ============================================================================

/** Configuration for dungeon generation */
export interface DungeonConfig {
  width: number;
  height: number;
  depth: number;
  roomTypes?: number; // Bitmask of allowed room types
  floorFeat?: FeatureType;
  shallowLiquid?: FeatureType;
  deepLiquid?: FeatureType;
}

/** Result of dungeon generation */
export interface GeneratedDungeon {
  width: number;
  height: number;
  depth: number;
  tiles: DungeonTile[][];
  rooms: Room[];
  upStairs: Coord[];
  downStairs: Coord[];
  rating: number;  // Dungeon danger rating
}

// ============================================================================
// Internal State (mirrors dun_data struct from generate.c)
// ============================================================================

/** Dungeon generation state */
export interface DunData {
  // Room centers
  centN: number;
  cent: Coord[];

  // Door locations
  doorN: number;
  door: Coord[];

  // Wall piercing locations
  wallN: number;
  wall: Coord[];

  // Tunnel grids
  tunnN: number;
  tunn: Coord[];

  // Block allocation
  rowRooms: number;
  colRooms: number;
  roomMap: boolean[][];

  // Crowded room count (nests/pits)
  crowded: number;

  // Room types allowed
  roomTypes: number;

  // Features
  featFloor: FeatureType;
  featShalLiquid: FeatureType;
  featDeepLiquid: FeatureType;
}

// ============================================================================
// Room Builder Types
// ============================================================================

/** Forward declaration for room builder functions */
export interface RoomBuilderContext {
  tiles: DungeonTile[][];
  width: number;
  height: number;
  depth: number;
  dun: DunData;
  rng: typeof ROTRng;
  rating: number;

  // Grid helpers
  setFeat(x: number, y: number, feat: FeatureType): void;
  getFeat(x: number, y: number): FeatureType | null;
  inBounds(x: number, y: number): boolean;
  generateRoom(x1: number, y1: number, x2: number, y2: number, light: boolean): void;
  generateVault(x1: number, y1: number, x2: number, y2: number): void;
  generateFill(x1: number, y1: number, x2: number, y2: number, feat: FeatureType): void;
  generateDraw(x1: number, y1: number, x2: number, y2: number, feat: FeatureType): void;
  generateLine(x1: number, y1: number, x2: number, y2: number, feat: FeatureType): void;
  generatePlus(x1: number, y1: number, x2: number, y2: number, feat: FeatureType): void;
  generateDoor(x1: number, y1: number, x2: number, y2: number, secret: boolean): void;
  placeRandomDoor(x: number, y: number): void;

  // Room allocation
  roomAlloc(xSize: number, ySize: number, crowded: boolean, bx0: number, by0: number): { x: number; y: number } | null;

  // Random helpers
  randint0(max: number): number;
  randint1(max: number): number;
  randRange(min: number, max: number): number;
  oneIn(n: number): boolean;

  // Rating
  incRating(delta: number): void;
}

/** Room type definition */
export interface RoomType {
  depth: number;      // Minimum depth
  chance: number;     // Relative probability
  buildFunc: (ctx: RoomBuilderContext, bx0: number, by0: number) => void;
  flags: number;
}

// ============================================================================
// Constants from generate.h
// ============================================================================

export const BLOCK_HGT = 11;
export const BLOCK_WID = 11;

export const CENT_MAX = 100;
export const DOOR_MAX = 200;
export const WALL_MAX = 500;
export const TUNN_MAX = 900;

// Tunnel generation parameters
export const DUN_TUN_RND_MIN = 5;
export const DUN_TUN_RND_MAX = 20;
export const DUN_TUN_CHG_MIN = 20;
export const DUN_TUN_CHG_MAX = 60;
export const DUN_TUN_CON_MIN = 10;
export const DUN_TUN_CON_MAX = 40;
export const DUN_TUN_PEN_MIN = 30;
export const DUN_TUN_PEN_MAX = 70;
export const DUN_TUN_JCT_MIN = 60;
export const DUN_TUN_JCT_MAX = 90;

// Room count
export const DUN_ROOMS_MIN = 10;
export const DUN_ROOMS_MAX = 100;
