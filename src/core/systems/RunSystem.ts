import { RNG } from 'rot-js';
import { Direction, movePosition, type Position } from '../types';
import type { ILevel } from '../world/Level';
import type { Monster } from '../entities/Monster';
import type { Actor } from '../entities/Actor';
import type { Player } from '../entities/Player';
import type { StoreManager } from './StoreManager';
import type { WildernessMap } from './wilderness/WildernessGenerator';
import type { FOVSystem } from './FOV';
import { triggerTrap, type TrapTriggerContext, type TrapTriggerResult } from './TrapTrigger';
import { isWildernessLevel, type WildernessLevel } from '../world/WildernessLevel';
import { WILD_BLOCK_SIZE } from '../data/WildernessTypes';
import { getDungeonType } from '../data/DungeonTypes';

/**
 * Running algorithm ported from Zangband src/cmd1.c line 2708
 * "The running algorithm" -CJS-
 *
 * Tracks wall breaks on left/right to detect doorways and corridors.
 */

// Direction cycling for checking left/right sides
const CYCLE: Direction[] = [
  Direction.North, Direction.NorthEast, Direction.East, Direction.SouthEast,
  Direction.South, Direction.SouthWest, Direction.West, Direction.NorthWest,
];

const DIAGONALS: Direction[] = [
  Direction.NorthEast, Direction.NorthWest, Direction.SouthEast, Direction.SouthWest,
];

// In the scan loop, i > 0 (clockwise) sets breakLeft, i < 0 (counter-clockwise) sets breakRight
// So "left" = clockwise direction, "right" = counter-clockwise direction
function getLeft(d: Direction, offset: number = 1): Direction {
  const i = CYCLE.indexOf(d);
  return CYCLE[(i + offset) % 8]; // clockwise
}

function getRight(d: Direction, offset: number = 1): Direction {
  const i = CYCLE.indexOf(d);
  return CYCLE[(i - offset + 8) % 8]; // counter-clockwise
}

export interface RunState {
  direction: Direction;    // Current move direction
  oldDirection: Direction; // Direction for scanning (where we "came from")
  openArea: boolean;
  breakLeft: boolean;
  breakRight: boolean;
}

export interface RunStepResult {
  canContinue: boolean;
  newDirection: Direction;
  stopReason?: string;
  spottedMonster?: Monster;
}

// =============================================================================
// POI Tracking for Wilderness
// =============================================================================

export interface POI {
  type: 'store' | 'dungeon' | 'town' | 'stair';
  key: string;
  name: string;
  posKey: string;
}

function getVisiblePOIs(
  visibleTiles: Set<string>,
  storeManager: StoreManager,
  wildernessMap: WildernessMap | null,
  level: ILevel
): POI[] {
  const pois: POI[] = [];

  // Check store entrances
  const visibleStores = storeManager.getVisibleStores(visibleTiles);
  for (const { storeKey, posKey } of visibleStores) {
    const store = storeManager.getStore(storeKey);
    if (store) {
      pois.push({
        type: 'store',
        key: storeKey,
        name: store.definition.name,
        posKey,
      });
    }
  }

  // Check dungeon entrances from wilderness map
  if (wildernessMap) {
    for (const place of wildernessMap.places) {
      if (place.type === 'dungeon') {
        const dungeonX = place.x * WILD_BLOCK_SIZE + Math.floor(WILD_BLOCK_SIZE / 2);
        const dungeonY = place.y * WILD_BLOCK_SIZE + Math.floor(WILD_BLOCK_SIZE / 2);
        const posKey = `${dungeonX},${dungeonY}`;

        if (visibleTiles.has(posKey)) {
          pois.push({
            type: 'dungeon',
            key: place.key,
            name: place.name,
            posKey,
          });
        }
      }
    }
  }

  // Check for stairs in visible tiles
  for (const posKey of visibleTiles) {
    const [xStr, yStr] = posKey.split(',');
    const x = parseInt(xStr, 10);
    const y = parseInt(yStr, 10);
    const tile = level.getTile({ x, y });

    if (tile) {
      if (tile.terrain.key === 'down_staircase') {
        // Look up the dungeon name for this stair
        let dungeonName = 'somewhere';
        if (wildernessMap) {
          const blockX = Math.floor(x / WILD_BLOCK_SIZE);
          const blockY = Math.floor(y / WILD_BLOCK_SIZE);

          // Check if we're in a place with a dungeon
          for (const place of wildernessMap.places) {
            // Check if within this place's bounds
            if (
              blockX >= place.x &&
              blockX < place.x + place.xsize &&
              blockY >= place.y &&
              blockY < place.y + place.ysize &&
              place.dungeonTypeId !== undefined
            ) {
              const dungeonType = getDungeonType(place.dungeonTypeId);
              if (dungeonType) {
                dungeonName = dungeonType.name;
              }
              break;
            }

            // Check if at a dungeon entrance
            if (place.type === 'dungeon') {
              const entranceX = place.x * WILD_BLOCK_SIZE + Math.floor(WILD_BLOCK_SIZE / 2);
              const entranceY = place.y * WILD_BLOCK_SIZE + Math.floor(WILD_BLOCK_SIZE / 2);
              if (x === entranceX && y === entranceY && place.dungeonTypeId !== undefined) {
                const dungeonType = getDungeonType(place.dungeonTypeId);
                if (dungeonType) {
                  dungeonName = dungeonType.name;
                }
                break;
              }
            }
          }
        }

        pois.push({
          type: 'stair',
          key: `down_stair_${posKey}`,
          name: `the entrance to ${dungeonName}`,
          posKey,
        });
      } else if (tile.terrain.key === 'up_staircase') {
        pois.push({
          type: 'stair',
          key: `up_stair_${posKey}`,
          name: 'an up staircase',
          posKey,
        });
      }
    }
  }

  return pois;
}

function getPOISpotMessage(poi: POI): string {
  switch (poi.type) {
    case 'store':
      return `You spot the entrance to ${poi.name}.`;
    case 'dungeon':
      return `You spot the entrance to ${poi.name}.`;
    case 'town':
      return `You spot ${poi.name} in the distance.`;
    case 'stair':
      return `You spot ${poi.name}.`;
    default:
      return `You spot something interesting.`;
  }
}

// =============================================================================
// Run Result and Context
// =============================================================================

export interface RunResult {
  stepsRun: number;
  messages: { text: string; type: 'info' | 'danger' }[];
  playerDied: boolean;
  trapTriggered?: TrapTriggerResult;
}

export interface RunContext {
  level: ILevel;
  player: Actor;
  fovSystem: FOVSystem;
  storeManager: StoreManager;
  wildernessMap: WildernessMap | null;
  visionRadius: number;
  viewRadius: number;
  onMoved: () => void; // Called after move, before FOV (incrementTurn, setWildernessPosition)
  onStepComplete: () => void; // Called after FOV (completeTurn)
  getMonsterName: (monster: Monster) => string;
}

export class RunSystem {
  /**
   * Execute a run in the given direction.
   * Handles both dungeon (corridor-following) and wilderness (open-area) running.
   */
  static run(ctx: RunContext, dir: Direction): RunResult {
    if (isWildernessLevel(ctx.level)) {
      return this.runWilderness(ctx, dir, ctx.level);
    } else {
      return this.runDungeon(ctx, dir);
    }
  }

  /**
   * Wilderness running - open area with POI detection.
   * Stops when stores or dungeon entrances come into view.
   */
  private static runWilderness(
    ctx: RunContext,
    dir: Direction,
    level: WildernessLevel
  ): RunResult {
    const { player, fovSystem, storeManager, wildernessMap, visionRadius, viewRadius } = ctx;
    const messages: { text: string; type: 'info' | 'danger' }[] = [];
    let stepsRun = 0;
    const startHp = player.hp;
    const MAX_RUN_STEPS = 100;

    // Track POIs we've already seen (including at start)
    // Use viewRadius (not visionRadius) to match what we use during steps
    const initialFov = fovSystem.compute(level, player.position, viewRadius);
    const initialPOIs = getVisiblePOIs(initialFov, storeManager, wildernessMap, level);
    const seenPOIs = new Set(initialPOIs.map(p => p.posKey));

    while (stepsRun < MAX_RUN_STEPS) {
      const newPos = movePosition(player.position, dir);

      // Check for obstacles
      if (!level.isWalkable(newPos)) {
        if (stepsRun === 0) {
          messages.push({ text: 'Something blocks your path.', type: 'danger' });
        }
        break;
      }

      if (level.getMonsterAt(newPos)) {
        if (stepsRun === 0) {
          messages.push({ text: 'Something blocks your path.', type: 'danger' });
        }
        break;
      }

      const tile = level.getTile(newPos);
      if (tile?.terrain.flags.includes('DOOR')) break;

      // Move
      stepsRun++;
      level.movePlayer(newPos.x, newPos.y);
      ctx.onMoved();

      // Compute FOV at new position
      const visibleTiles = fovSystem.computeAndMark(level, player.position, viewRadius);

      ctx.onStepComplete();

      if (player.isDead) break;

      // Check for damage (being attacked)
      if (player.hp < startHp) {
        messages.push({ text: 'You are being attacked!', type: 'danger' });
        break;
      }

      // Check for visible monsters
      const visibleMonster = fovSystem.getVisibleMonster(level, player.position, visionRadius);
      if (visibleMonster) {
        messages.push({ text: `You see a ${ctx.getMonsterName(visibleMonster)}.`, type: 'danger' });
        break;
      }

      // Check for newly visible POIs
      const visiblePOIs = getVisiblePOIs(visibleTiles, storeManager, wildernessMap, level);
      let firstNewPOI: POI | null = null;
      for (const poi of visiblePOIs) {
        if (!seenPOIs.has(poi.posKey)) {
          seenPOIs.add(poi.posKey);  // Add ALL new POIs to seen set
          if (!firstNewPOI) {
            firstNewPOI = poi;  // But only announce the first
          }
        }
      }
      if (firstNewPOI) {
        messages.push({ text: getPOISpotMessage(firstNewPOI), type: 'info' });
        break;
      }
    }

    return { stepsRun, messages, playerDied: player.isDead };
  }

  /**
   * Dungeon running - corridor following algorithm.
   */
  private static runDungeon(ctx: RunContext, dir: Direction): RunResult {
    const { level, player, fovSystem, visionRadius, viewRadius } = ctx;
    const messages: { text: string; type: 'info' | 'danger' }[] = [];
    let stepsRun = 0;
    const startHp = player.hp;
    const MAX_RUN_STEPS = 100;

    const runState = this.initRun(level, player.position, dir);
    let runDir = runState.direction;

    while (stepsRun < MAX_RUN_STEPS) {
      const newPos = movePosition(player.position, runDir);

      if (!level.isWalkable(newPos)) {
        if (stepsRun === 0) {
          messages.push({ text: 'Something blocks your path.', type: 'danger' });
        }
        break;
      }

      const tile = level.getTile(newPos);
      if (tile?.terrain.flags.includes('DOOR')) break;

      // Move
      stepsRun++;
      player.position = newPos;
      ctx.onMoved();

      // Check for traps
      const trap = level.getTrapAt(player.position);
      if (trap && trap.isActive) {
        const trapContext: TrapTriggerContext = {
          player: player as Player,
          level,
          rng: RNG,
        };
        const trapResult = triggerTrap(trapContext, trap);
        for (const msg of trapResult.messages) {
          messages.push({ text: msg.text, type: msg.type === 'danger' ? 'danger' : 'info' });
        }
        // Handle aggravation
        if (trapResult.aggravated) {
          for (const monster of level.getMonsters()) {
            monster.wake();
          }
        }
        // Stop running on trap trigger
        return {
          stepsRun,
          messages,
          playerDied: player.isDead,
          trapTriggered: trapResult,
        };
      }

      // Mark tiles as explored
      fovSystem.computeAndMark(level, player.position, viewRadius);

      ctx.onStepComplete();

      if (player.isDead) break;

      // Check for damage
      if (player.hp < startHp) {
        messages.push({ text: 'You are being attacked!', type: 'danger' });
        break;
      }

      // Check for visible monsters
      const visibleMonster = fovSystem.getVisibleMonster(level, player.position, visionRadius);
      if (visibleMonster) {
        messages.push({ text: `You see a ${ctx.getMonsterName(visibleMonster)}.`, type: 'danger' });
        break;
      }

      // Check for items
      const itemsHere = level.getItemsAt(newPos);
      if (itemsHere.length > 0) {
        const text = itemsHere.length === 1
          ? `You see an item here.`
          : `You see ${itemsHere.length} items here.`;
        messages.push({ text, type: 'info' });
        break;
      }

      // Run corridor-following test
      const result = this.testRun(level, newPos, runState);
      if (result.spottedMonster) {
        messages.push({ text: `You see a ${ctx.getMonsterName(result.spottedMonster)}.`, type: 'danger' });
      }
      if (!result.canContinue) break;
      runDir = result.newDirection;
    }

    return { stepsRun, messages, playerDied: player.isDead };
  }

  /**
   * Initialize run state for a new run
   */
  static initRun(level: ILevel, startPos: Position, dir: Direction): RunState {
    const seeWall = (pos: Position, d: Direction): boolean => {
      return !level.isWalkable(movePosition(pos, d));
    };

    const destPos = movePosition(startPos, dir);
    const isDiagonal = DIAGONALS.includes(dir);

    // Track short (from start) and deep (from dest) walls
    let shortLeft = false;
    let shortRight = false;
    let deepLeft = false;
    let deepRight = false;

    // Check for nearby walls on left side
    if (seeWall(startPos, getLeft(dir))) {
      shortLeft = true;
    }
    if (seeWall(destPos, getLeft(dir))) {
      deepLeft = true;
    }

    // Check for nearby walls on right side
    if (seeWall(startPos, getRight(dir))) {
      shortRight = true;
    }
    if (seeWall(destPos, getRight(dir))) {
      deepRight = true;
    }

    const breakLeft = shortLeft || deepLeft;
    const breakRight = shortRight || deepRight;

    // If walls on both sides, we're in a corridor (not open area)
    const openArea = !(breakLeft && breakRight);

    // Default: scan direction matches move direction
    let oldDirection = dir;

    // In corridor, handle special entry cases
    if (!openArea) {
      if (isDiagonal) {
        // Angled corridor entry: adjust scan direction to follow corridor
        // Point oldDirection toward the OPEN side (where corridor continues)
        if (deepLeft && !deepRight) {
          oldDirection = getRight(dir);  // Wall on left, open on right -> scan right
        } else if (deepRight && !deepLeft) {
          oldDirection = getLeft(dir);   // Wall on right, open on left -> scan left
        }
      } else {
        // Blunt corridor entry: if wall ahead, turn into the corridor
        if (seeWall(destPos, dir)) {
          if (shortLeft && !shortRight) {
            oldDirection = getLeft(dir, 2);
          } else if (shortRight && !shortLeft) {
            oldDirection = getRight(dir, 2);
          }
        }
      }
    }

    return { direction: dir, oldDirection, openArea, breakLeft, breakRight };
  }

  /**
   * Test if running should continue after moving to newPos
   */
  static testRun(level: ILevel, newPos: Position, state: RunState): RunStepResult {
    const { openArea, oldDirection } = state;
    let { breakLeft, breakRight } = state;

    const seeWall = (pos: Position, d: Direction): boolean => {
      return !level.isWalkable(movePosition(pos, d));
    };

    // Use oldDirection (where we "came from") for scanning, not current direction
    const prevDir = oldDirection;
    const dirIndex = CYCLE.indexOf(prevDir);
    const isDiagonal = DIAGONALS.includes(prevDir);
    // Range based on previous direction: diagonal scans wider
    const range = isDiagonal ? 2 : 1;

    let option: Direction | null = null;
    let option2: Direction | null = null;
    let checkDir: Direction | null = null;

    for (let i = -range; i <= range; i++) {
      const dir = CYCLE[(dirIndex + i + 8) % 8];
      const checkPos = movePosition(newPos, dir);

      // Stop if we see a living hostile monster
      const monster = level.getMonsterAt(checkPos);
      if (monster && !monster.isDead && !monster.isTamed) {
        return { canContinue: false, newDirection: prevDir, spottedMonster: monster };
      }

      const isOpen = level.isWalkable(checkPos);

      if (isOpen) {
        if (openArea) {
          // In open area, just continue
        } else if (!option) {
          option = dir;
        } else if (option2) {
          // Three directions - stop (intersection)
          return { canContinue: false, newDirection: prevDir };
        } else {
          // Check if adjacent to previous option
          const optIdx = CYCLE.indexOf(option);
          const chkIdx = CYCLE.indexOf(dir);
          const diff = Math.abs(optIdx - chkIdx);
          if (diff !== 1 && diff !== 7) {
            // Non-adjacent open squares - stop
            return { canContinue: false, newDirection: prevDir };
          }
          // Two adjacent directions - potential corner
          // Track check_dir for corner detection (per original algorithm)
          const isDirDiagonal = DIAGONALS.includes(dir);
          if (isDirDiagonal) {
            checkDir = CYCLE[(dirIndex + i - 2 + 8) % 8];
            option2 = dir;
          } else {
            checkDir = CYCLE[(dirIndex + i + 1 + 8) % 8];
            option2 = option;
            option = dir;
          }
        }
      } else {
        // Wall/obstacle
        if (openArea) {
          if (i < 0) {
            breakRight = true;
          } else if (i > 0) {
            breakLeft = true;
          }
        }
      }
    }

    // Check for wall breaks (doorways) - in open areas, stop if walls appear/disappear
    if (openArea) {
      // Check if walls that existed have disappeared (doorway/opening)
      const wallOnRight = seeWall(newPos, getRight(prevDir));
      const wallOnLeft = seeWall(newPos, getLeft(prevDir));

      // state.breakRight means we initially had a wall on the right
      if (state.breakRight && !wallOnRight) {
        return { canContinue: false, newDirection: prevDir };
      }
      // state.breakLeft means we initially had a wall on the left
      if (state.breakLeft && !wallOnLeft) {
        return { canContinue: false, newDirection: prevDir };
      }

      // Check if walls appeared where there were none (entering corridor)
      if (!state.breakRight && wallOnRight && state.breakLeft) {
        return { canContinue: false, newDirection: prevDir };
      }
      if (!state.breakLeft && wallOnLeft && state.breakRight) {
        return { canContinue: false, newDirection: prevDir };
      }

      // Update state with current wall presence
      state.breakLeft = breakLeft;
      state.breakRight = breakRight;
      return { canContinue: true, newDirection: prevDir };
    } else {
      // In corridor
      if (!option) {
        // Dead end
        return { canContinue: false, newDirection: prevDir };
      }

      if (!option2) {
        // Single path - follow it
        state.direction = option;
        state.oldDirection = option;
        return { canContinue: true, newDirection: option };
      }

      // Two adjacent options - check if it's an enclosed corner or intersection
      // Look ahead from the next position to see if the corner is enclosed
      const nextPos = movePosition(newPos, option);
      const aheadBlocked = seeWall(nextPos, option);
      const sideBlocked = checkDir ? seeWall(nextPos, checkDir) : true;

      if (aheadBlocked && sideBlocked) {
        // Enclosed corner - follow it (go straight, which is option)
        // Set oldDirection to option2 for proper scanning at next step
        state.direction = option;
        state.oldDirection = option2;
        return { canContinue: true, newDirection: option };
      }

      // Not clearly enclosed - could be intersection or room entrance, stop
      return { canContinue: false, newDirection: prevDir };
    }
  }
}
