/**
 * Wilderness level generation
 *
 * Creates a WildernessLevel with the full wilderness map.
 * The wilderness is depth 0 and uses tile-by-tile movement.
 */

import { RNG } from 'rot-js';
import { WildernessLevel } from '@/core/world/WildernessLevel';
import { WildernessGenerator } from './WildernessGenerator';
import { ZangbandTownGenerator } from './TownGen';
import { Scheduler } from '@/core/systems/Scheduler';
import type { Player } from '@/core/entities/Player';
import type { GeneratedLevelData, StoreEntrance } from '@/core/world/Level';
import type { Position } from '@/core/types';
import type { WildernessMap } from './WildernessGenerator';
import type { WildGenData, WildPlace } from '@/core/data/WildernessTypes';
import { WILD_BLOCK_SIZE } from '@/core/data/WildernessTypes';
import type { MonsterDataManager } from '@/core/data/MonsterDataManager';
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
  monsterDataManager?: MonsterDataManager,
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
  const wildernessLevel = new WildernessLevel(wildernessMap, genData, RNG, monsterDataManager);

  // Collect store entrances from all towns
  const storeEntrances: StoreEntrance[] = [];
  const townGenerator = new ZangbandTownGenerator(RNG);

  // Track starting position for player placement
  let startTileX: number | undefined;
  let startTileY: number | undefined;

  // Generate all towns and collect their store entrances
  for (const place of wildernessMap.places) {
    if (place.type === 'town') {
      const townData = townGenerator.generate(place);

      // Convert town's store positions to wilderness tile coordinates
      for (const store of townData.storePositions) {
        const worldX = place.x * WILD_BLOCK_SIZE + store.x;
        const worldY = place.y * WILD_BLOCK_SIZE + store.y;
        storeEntrances.push({
          storeKey: store.storeKey,
          position: { x: worldX, y: worldY },
        });
      }

      // If this is the starting town, get player start position
      if (place.key === 'starting_town') {
        startTileX = place.x * WILD_BLOCK_SIZE + townData.playerStart.x;
        startTileY = place.y * WILD_BLOCK_SIZE + townData.playerStart.y;
      }
    }
  }

  if (startTileX === undefined || startTileY === undefined) {
    // Fallback: center of wilderness
    const startBlock = wildernessMap.getStartingPosition();
    startTileX = startBlock.x * WILD_BLOCK_SIZE + Math.floor(WILD_BLOCK_SIZE / 2);
    startTileY = startBlock.y * WILD_BLOCK_SIZE + Math.floor(WILD_BLOCK_SIZE / 2);
  }

  // Set player on level BEFORE initializeAt so it can set player.position
  wildernessLevel.player = player;

  // Initialize the level at starting position
  // This sets player.position to world coordinates (startTileX, startTileY)
  wildernessLevel.initializeAt(startTileX, startTileY);

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
    storeEntrances,
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
  wildernessY: number,
  monsterDataManager?: MonsterDataManager
): WildernessLevelData {
  const genData = wInfoData as WildGenData[];
  const wildernessLevel = new WildernessLevel(wildernessMap, genData, RNG, monsterDataManager);

  // Set player on level BEFORE initializeAt so it can set player.position
  wildernessLevel.player = player;

  // Initialize at the saved position
  // This sets player.position to world coordinates (wildernessX, wildernessY)
  wildernessLevel.initializeAt(wildernessX, wildernessY);

  // Create scheduler with player
  const scheduler = new Scheduler();
  scheduler.add(player);

  // Collect store entrances from all towns
  const storeEntrances: StoreEntrance[] = [];
  const townGenerator = new ZangbandTownGenerator(RNG);

  // Find dungeon entrances and collect stores
  const dungeonEntrances: Array<{ place: WildPlace; position: Position }> = [];
  for (const place of wildernessMap.places) {
    if (place.type === 'dungeon') {
      const entranceX = place.x * WILD_BLOCK_SIZE + Math.floor(WILD_BLOCK_SIZE / 2);
      const entranceY = place.y * WILD_BLOCK_SIZE + Math.floor(WILD_BLOCK_SIZE / 2);
      dungeonEntrances.push({
        place,
        position: { x: entranceX, y: entranceY },
      });
    } else if (place.type === 'town') {
      const townData = townGenerator.generate(place);
      for (const store of townData.storePositions) {
        const worldX = place.x * WILD_BLOCK_SIZE + store.x;
        const worldY = place.y * WILD_BLOCK_SIZE + store.y;
        storeEntrances.push({
          storeKey: store.storeKey,
          position: { x: worldX, y: worldY },
        });
      }
    }
  }

  return {
    level: wildernessLevel,
    scheduler,
    upStairs: [],
    downStairs: dungeonEntrances.map((e) => e.position),
    storeEntrances,
    isWilderness: true,
    wildernessMap,
    dungeonEntrances,
  };
}
