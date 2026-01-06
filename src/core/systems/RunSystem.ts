import { Direction, movePosition, type Position } from '../types';
import type { Level } from '../world/Level';
import type { Monster } from '../entities/Monster';

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

function getLeft(d: Direction, offset: number = 1): Direction {
  const i = CYCLE.indexOf(d);
  return CYCLE[(i - offset + 8) % 8];
}

function getRight(d: Direction, offset: number = 1): Direction {
  const i = CYCLE.indexOf(d);
  return CYCLE[(i + offset) % 8];
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

export class RunSystem {
  /**
   * Initialize run state for a new run
   */
  static initRun(level: Level, startPos: Position, dir: Direction): RunState {
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
        if (deepLeft && !deepRight) {
          oldDirection = getLeft(dir);
        } else if (deepRight && !deepLeft) {
          oldDirection = getRight(dir);
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
  static testRun(level: Level, newPos: Position, state: RunState): RunStepResult {
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

      // Stop if we see a monster
      const monster = level.getMonsterAt(checkPos);
      if (monster) {
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

    // Check for wall breaks (doorways)
    if (openArea) {
      if (breakRight && !seeWall(newPos, getLeft(prevDir))) {
        return { canContinue: false, newDirection: prevDir }; // Wall opened up on left
      }
      if (breakLeft && !seeWall(newPos, getRight(prevDir))) {
        return { canContinue: false, newDirection: prevDir }; // Wall opened up on right
      }
      // Update state
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
