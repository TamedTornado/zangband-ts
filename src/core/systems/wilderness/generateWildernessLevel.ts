/**
 * Wilderness level generation
 *
 * Creates a WildernessLevel with the full wilderness map.
 * The wilderness is depth 0 and uses tile-by-tile movement.
 */

import { RNG } from 'rot-js';
import { WildernessLevel } from '@/core/world/WildernessLevel';
import { WildernessGenerator } from './WildernessGenerator';
import { Scheduler } from '@/core/systems/Scheduler';
import type { Player } from '@/core/entities/Player';
import type { GeneratedLevelData } from '@/core/world/Level';
import type { Position } from '@/core/types';
import type { WildernessMap } from './WildernessGenerator';
import type { WildGenData, WildPlace } from '@/core/data/WildernessTypes';
import { WILD_BLOCK_SIZE } from '@/core/data/WildernessTypes';
import wInfoData from '@/data/wilderness/w_info.json';

/**
 * Result of wilderness generation with additional wilderness-specific data
 */
export interface WildernessLevelData extends GeneratedLevelData {
  wildernessMap: WildernessMap;
  dungeonEntrances: Array<{ place: WildPlace; position: Position }>;
}

/**
 * Generate a new wilderness level.
 *
 * Creates the full wilderness map and a WildernessLevel viewing it.
 * The player starts at the center of the starting town.
 */
export function generateWildernessLevel(
  player: Player,
  seed?: number
): WildernessLevelData {
  // Use provided seed or generate one
  if (seed !== undefined) {
    RNG.setSeed(seed);
  }

  // Generate the wilderness map
  const genData = wInfoData as WildGenData[];
  const generator = new WildernessGenerator(RNG, genData, 64); // 64x64 blocks
  const wildernessMap = generator.generate();

  // Create the wilderness level
  const wildernessLevel = new WildernessLevel(wildernessMap, genData, RNG);

  // Get starting position (center of starting town in tile coordinates)
  const startBlock = wildernessMap.getStartingPosition();
  const startTileX = startBlock.x * WILD_BLOCK_SIZE + Math.floor(WILD_BLOCK_SIZE / 2);
  const startTileY = startBlock.y * WILD_BLOCK_SIZE + Math.floor(WILD_BLOCK_SIZE / 2);

  // Initialize the level at starting position
  wildernessLevel.initializeAt(startTileX, startTileY);

  // Get player's screen position
  const screenPos = wildernessLevel.getPlayerScreenPosition();
  if (screenPos) {
    player.position = { x: screenPos.x, y: screenPos.y };
  } else {
    // Fallback to center of viewport
    player.position = { x: Math.floor(wildernessLevel.width / 2), y: Math.floor(wildernessLevel.height / 2) };
  }

  // Set player on level
  wildernessLevel.player = player;

  // Create scheduler with player
  const scheduler = new Scheduler();
  scheduler.add(player);

  // Find dungeon entrances and their tile positions
  const dungeonEntrances: Array<{ place: WildPlace; position: Position }> = [];
  for (const place of wildernessMap.places) {
    if (place.type === 'dungeon') {
      // Dungeon entrance is at center of the place
      const entranceX = place.x * WILD_BLOCK_SIZE + Math.floor(WILD_BLOCK_SIZE / 2);
      const entranceY = place.y * WILD_BLOCK_SIZE + Math.floor(WILD_BLOCK_SIZE / 2);
      dungeonEntrances.push({
        place,
        position: { x: entranceX, y: entranceY },
      });
    }
  }

  return {
    level: wildernessLevel,
    scheduler,
    upStairs: [], // Wilderness has no up stairs
    downStairs: dungeonEntrances.map((e) => e.position), // Dungeon entrances are "down stairs"
    isWilderness: true,
    wildernessMap,
    dungeonEntrances,
  };
}

/**
 * Restore a wilderness level from saved state.
 *
 * Used when returning from a dungeon to the wilderness.
 */
export function restoreWildernessLevel(
  player: Player,
  wildernessMap: WildernessMap,
  wildernessX: number,
  wildernessY: number
): WildernessLevelData {
  const genData = wInfoData as WildGenData[];
  const wildernessLevel = new WildernessLevel(wildernessMap, genData, RNG);

  // Initialize at the saved position
  wildernessLevel.initializeAt(wildernessX, wildernessY);

  // Get player's screen position
  const screenPos = wildernessLevel.getPlayerScreenPosition();
  if (screenPos) {
    player.position = { x: screenPos.x, y: screenPos.y };
  }

  // Set player on level
  wildernessLevel.player = player;

  // Create scheduler with player
  const scheduler = new Scheduler();
  scheduler.add(player);

  // Find dungeon entrances
  const dungeonEntrances: Array<{ place: WildPlace; position: Position }> = [];
  for (const place of wildernessMap.places) {
    if (place.type === 'dungeon') {
      const entranceX = place.x * WILD_BLOCK_SIZE + Math.floor(WILD_BLOCK_SIZE / 2);
      const entranceY = place.y * WILD_BLOCK_SIZE + Math.floor(WILD_BLOCK_SIZE / 2);
      dungeonEntrances.push({
        place,
        position: { x: entranceX, y: entranceY },
      });
    }
  }

  return {
    level: wildernessLevel,
    scheduler,
    upStairs: [],
    downStairs: dungeonEntrances.map((e) => e.position),
    isWilderness: true,
    wildernessMap,
    dungeonEntrances,
  };
}
