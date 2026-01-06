import { Direction, movePosition, type Position } from '../types';
import type { Level } from '../world/Level';

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
  direction: Direction;
  openArea: boolean;
  breakLeft: boolean;
  breakRight: boolean;
}

export interface RunStepResult {
  canContinue: boolean;
  newDirection: Direction;
  stopReason?: string;
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

    let breakLeft = false;
    let breakRight = false;

    // Check for nearby walls on left side (short and deep)
    if (seeWall(startPos, getLeft(dir))) {
      breakLeft = true;
    } else if (seeWall(destPos, getLeft(dir))) {
      breakLeft = true;
    }

    // Check for nearby walls on right side (short and deep)
    if (seeWall(startPos, getRight(dir))) {
      breakRight = true;
    } else if (seeWall(destPos, getRight(dir))) {
      breakRight = true;
    }

    // If walls on both sides, we're in a corridor (not open area)
    const openArea = !(breakLeft && breakRight);

    return { direction: dir, openArea, breakLeft, breakRight };
  }

  /**
   * Test if running should continue after moving to newPos
   */
  static testRun(level: Level, newPos: Position, state: RunState): RunStepResult {
    const { direction: runDir, openArea } = state;
    let { breakLeft, breakRight } = state;

    const seeWall = (pos: Position, d: Direction): boolean => {
      return !level.isWalkable(movePosition(pos, d));
    };

    const dirIndex = CYCLE.indexOf(runDir);
    const isDiagonal = DIAGONALS.includes(runDir);
    const range = isDiagonal ? 2 : 1;

    let option: Direction | null = null;
    let option2: Direction | null = null;

    for (let i = -range; i <= range; i++) {
      const checkDir = CYCLE[(dirIndex + i + 8) % 8];
      const checkPos = movePosition(newPos, checkDir);

      // Stop if we see a monster
      const monster = level.getMonsterAt(checkPos);
      if (monster) {
        return { canContinue: false, newDirection: runDir, stopReason: 'A monster comes into view!' };
      }

      const isOpen = level.isWalkable(checkPos);

      if (isOpen) {
        if (openArea) {
          // In open area, just continue
        } else if (!option) {
          option = checkDir;
        } else if (option2) {
          // Three directions - stop
          return { canContinue: false, newDirection: runDir };
        } else {
          // Check if adjacent to previous option
          const optIdx = CYCLE.indexOf(option);
          const chkIdx = CYCLE.indexOf(checkDir);
          if (Math.abs(optIdx - chkIdx) !== 1 && Math.abs(optIdx - chkIdx) !== 7) {
            // Non-adjacent open squares - stop
            return { canContinue: false, newDirection: runDir };
          }
          option2 = checkDir;
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
      if (breakRight && !seeWall(newPos, getLeft(runDir))) {
        return { canContinue: false, newDirection: runDir }; // Wall opened up on left
      }
      if (breakLeft && !seeWall(newPos, getRight(runDir))) {
        return { canContinue: false, newDirection: runDir }; // Wall opened up on right
      }
      // Update state
      state.breakLeft = breakLeft;
      state.breakRight = breakRight;
      return { canContinue: true, newDirection: runDir };
    } else {
      // In corridor
      if (option && !option2) {
        // Single path - follow it (corner)
        state.direction = option;
        return { canContinue: true, newDirection: option };
      } else if (option && option2) {
        // Potential corner - stop
        return { canContinue: false, newDirection: runDir };
      } else if (!option) {
        // Dead end
        return { canContinue: false, newDirection: runDir };
      }
      return { canContinue: true, newDirection: runDir };
    }
  }
}
