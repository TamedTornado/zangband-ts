import { describe, it, expect } from 'vitest';
import { RunSystem } from '@/core/systems/RunSystem';
import { Direction } from '@/core/types';
import { Level } from '@/core/world/Level';

/**
 * Tests for the running algorithm.
 *
 * The running algorithm has two modes:
 * 1. Open area: Run straight, stop if walls appear/disappear on sides
 * 2. Corridor: Follow the corridor, stop at intersections
 */

function createTestLevel(width: number, height: number, walls: { x: number; y: number }[]): Level {
  // Level constructor initializes all tiles to floor by default
  const level = new Level(width, height);
  // Add walls
  for (const wall of walls) {
    level.setTerrain(wall, 'granite_wall');
  }
  return level;
}

describe('RunSystem', () => {
  describe('open area running', () => {
    it('should continue running across middle of open room', () => {
      // 5x5 open room, player at center running east
      const level = createTestLevel(7, 7, []);
      const startPos = { x: 3, y: 3 };

      const state = RunSystem.initRun(level, startPos, Direction.East);

      // Should be in open area mode (no walls on either side)
      expect(state.openArea).toBe(true);
      expect(state.breakLeft).toBe(false);
      expect(state.breakRight).toBe(false);

      // After moving east to (4,3), should continue
      const result = RunSystem.testRun(level, { x: 4, y: 3 }, state);
      expect(result.canContinue).toBe(true);
      expect(result.newDirection).toBe(Direction.East);
    });

    it('should continue running along room edge with wall on north', () => {
      // Room with wall along top edge
      // #######
      // .......  <- player runs east along this row
      // .......
      const walls = [];
      for (let x = 0; x < 7; x++) {
        walls.push({ x, y: 0 });
      }
      const level = createTestLevel(7, 5, walls);
      const startPos = { x: 1, y: 1 }; // Just below the wall

      const state = RunSystem.initRun(level, startPos, Direction.East);

      // Should be in open area mode with wall detected
      // Algorithm: NE direction (i < 0) sets breakRight
      expect(state.openArea).toBe(true);
      expect(state.breakRight).toBe(true); // Wall detected in NE direction

      // After moving east to (2,1), wall still there, should continue
      const result = RunSystem.testRun(level, { x: 2, y: 1 }, state);
      expect(result.canContinue).toBe(true);
    });

    it('should continue running along room edge with wall on south', () => {
      // Room with wall along bottom edge
      // .......
      // .......  <- player runs east along this row
      // #######
      const walls = [];
      for (let x = 0; x < 7; x++) {
        walls.push({ x, y: 4 });
      }
      const level = createTestLevel(7, 5, walls);
      const startPos = { x: 1, y: 3 }; // Just above the wall

      const state = RunSystem.initRun(level, startPos, Direction.East);

      // Should be in open area mode with wall detected
      // Algorithm: SE direction (i > 0) sets breakLeft
      expect(state.openArea).toBe(true);
      expect(state.breakLeft).toBe(true); // Wall detected in SE direction

      // After moving east to (2,3), wall still there, should continue
      const result = RunSystem.testRun(level, { x: 2, y: 3 }, state);
      expect(result.canContinue).toBe(true);
    });

    it('should stop when wall on north disappears (doorway)', () => {
      // Wall with gap (doorway) to the north
      // ###.###
      // .......  <- player runs east, stops before doorway
      const walls = [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
        // gap at x=3
        { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 },
      ];
      const level = createTestLevel(7, 3, walls);
      const startPos = { x: 1, y: 1 };

      // Verify terrain setup
      expect(level.isWalkable({ x: 2, y: 0 })).toBe(false); // Wall
      expect(level.isWalkable({ x: 3, y: 0 })).toBe(true);  // Gap

      const state = RunSystem.initRun(level, startPos, Direction.East);
      expect(state.openArea).toBe(true);
      // Wall to north is detected in NE direction, sets breakRight
      expect(state.breakRight).toBe(true);
      expect(state.breakLeft).toBe(false);

      // At (2,1), NE direction points to (3,0) which is the gap!
      // Algorithm sees the gap coming and stops here
      const result = RunSystem.testRun(level, { x: 2, y: 1 }, state);
      expect(result.canContinue).toBe(false);
    });

    it('should stop when wall on south disappears (doorway)', () => {
      // Wall with gap (doorway) to the south
      // .......  <- player runs east, stops before doorway
      // ###.###
      const walls = [
        { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
        // gap at x=3
        { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 },
      ];
      const level = createTestLevel(7, 3, walls);
      const startPos = { x: 1, y: 1 };

      const state = RunSystem.initRun(level, startPos, Direction.East);
      expect(state.openArea).toBe(true);
      // Wall to south is detected in SE direction, sets breakLeft
      expect(state.breakLeft).toBe(true);
      expect(state.breakRight).toBe(false);

      // At (2,1), SE direction points to (3,2) which is the gap!
      // Algorithm sees the gap coming and stops here
      const result = RunSystem.testRun(level, { x: 2, y: 1 }, state);
      expect(result.canContinue).toBe(false);
    });

    it('should continue in open area when wall appears on one side', () => {
      // Open area leading into potential corridor
      // .......
      // ...####  <- wall starts at x=3
      // .......  <- player runs east at y=2
      // .......
      const walls = [
        { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 },
      ];
      const level = createTestLevel(7, 4, walls);
      const startPos = { x: 1, y: 2 };

      const state = RunSystem.initRun(level, startPos, Direction.East);
      // destPos is (2,2), checking NE direction finds wall at (3,1)
      expect(state.openArea).toBe(true);
      expect(state.breakLeft).toBe(false);
      expect(state.breakRight).toBe(true); // Wall at (3,1) in NE direction from dest

      // Move to (2,2) - wall in NE direction still there at (3,1)
      let result = RunSystem.testRun(level, { x: 2, y: 2 }, state);
      expect(result.canContinue).toBe(true);

      // Move to (3,2) - wall in NE direction still there at (4,1)
      result = RunSystem.testRun(level, { x: 3, y: 2 }, state);
      expect(result.canContinue).toBe(true);
    });
  });

  describe('corridor running', () => {
    it('should detect corridor when walls on both sides', () => {
      // Corridor: walls on both sides
      // #######
      // ....... <- player runs east in corridor
      // #######
      const walls = [];
      for (let x = 0; x < 7; x++) {
        walls.push({ x, y: 0 });
        walls.push({ x, y: 2 });
      }
      const level = createTestLevel(7, 3, walls);
      const startPos = { x: 1, y: 1 };

      const state = RunSystem.initRun(level, startPos, Direction.East);

      // Should NOT be in open area mode (walls on both sides)
      expect(state.openArea).toBe(false);
    });

    it('should follow corridor and continue running', () => {
      // Straight corridor
      // #######
      // ....... <- player runs east
      // #######
      const walls = [];
      for (let x = 0; x < 7; x++) {
        walls.push({ x, y: 0 });
        walls.push({ x, y: 2 });
      }
      const level = createTestLevel(7, 3, walls);
      const startPos = { x: 1, y: 1 };

      const state = RunSystem.initRun(level, startPos, Direction.East);

      // After moving east to (2,1), should continue
      const result = RunSystem.testRun(level, { x: 2, y: 1 }, state);
      expect(result.canContinue).toBe(true);
      expect(result.newDirection).toBe(Direction.East);
    });

    it('should stop at dead end', () => {
      // Corridor with dead end
      // #######
      // ....#   <- dead end
      // #######
      const walls = [];
      for (let x = 0; x < 7; x++) {
        walls.push({ x, y: 0 });
        walls.push({ x, y: 2 });
      }
      walls.push({ x: 4, y: 1 }); // Dead end
      const level = createTestLevel(7, 3, walls);
      const startPos = { x: 1, y: 1 };

      const state = RunSystem.initRun(level, startPos, Direction.East);

      // Move to (2,1), (3,1) - should continue
      let result = RunSystem.testRun(level, { x: 2, y: 1 }, state);
      expect(result.canContinue).toBe(true);

      result = RunSystem.testRun(level, { x: 3, y: 1 }, state);
      // At (3,1), facing east, wall at (4,1) - dead end
      expect(result.canContinue).toBe(false);
    });

    it('should stop at intersection', () => {
      // Corridor with T-intersection
      // ###.###
      // ....... <- player runs east, stops before intersection
      // #######
      const walls = [];
      for (let x = 0; x < 7; x++) {
        if (x !== 3) walls.push({ x, y: 0 }); // Gap at x=3
        walls.push({ x, y: 2 });
      }
      const level = createTestLevel(7, 3, walls);
      const startPos = { x: 1, y: 1 };

      const state = RunSystem.initRun(level, startPos, Direction.East);

      // At (2,1), NE direction sees the gap at (3,0) - intersection detected early
      // The algorithm sees multiple open directions (NE gap + E forward) and stops
      const result = RunSystem.testRun(level, { x: 2, y: 1 }, state);
      expect(result.canContinue).toBe(false);
    });
  });

  describe('diagonal running', () => {
    it('should run diagonally in open area', () => {
      const level = createTestLevel(7, 7, []);
      const startPos = { x: 3, y: 3 };

      const state = RunSystem.initRun(level, startPos, Direction.NorthEast);

      expect(state.openArea).toBe(true);

      // After moving northeast to (4,2), should continue
      const result = RunSystem.testRun(level, { x: 4, y: 2 }, state);
      expect(result.canContinue).toBe(true);
      expect(result.newDirection).toBe(Direction.NorthEast);
    });

    it('should continue running when entering East corridor diagonally from SW', () => {
      // Player enters a true corridor diagonally
      // Corridor has walls on BOTH north and south at dest position
      // #####
      // #...#  <- East corridor at y=1, walls at y=0 and y=2
      // ##@.#  <- Player at (2,2), runs NE to (3,1)
      // #####
      const walls: { x: number; y: number }[] = [];
      // Corridor walls (north and south of corridor)
      for (let x = 0; x < 5; x++) {
        walls.push({ x, y: 0 });  // North wall
        walls.push({ x, y: 3 });  // Far south wall
      }
      // Make y=2 mostly wall except player start area
      walls.push({ x: 0, y: 2 });
      walls.push({ x: 1, y: 2 });
      // (2,2) is player start - floor
      // (3,2) is wall to create corridor at y=1
      walls.push({ x: 3, y: 2 });
      walls.push({ x: 4, y: 2 });
      // Side walls
      walls.push({ x: 0, y: 1 });
      walls.push({ x: 4, y: 1 });

      const level = createTestLevel(5, 4, walls);
      const startPos = { x: 2, y: 2 };

      // Verify setup: dest (3,1) should have walls to N and S
      expect(level.isWalkable({ x: 3, y: 0 })).toBe(false); // N is wall
      expect(level.isWalkable({ x: 3, y: 2 })).toBe(false); // S is wall
      expect(level.isWalkable({ x: 4, y: 1 })).toBe(false); // E is wall (end of corridor)
      expect(level.isWalkable({ x: 2, y: 1 })).toBe(true);  // W is open (corridor)

      // Run NE to enter the corridor
      const state = RunSystem.initRun(level, startPos, Direction.NorthEast);

      // Should detect corridor (walls on both sides at dest)
      expect(state.openArea).toBe(false);
    });

    it('should set correct oldDirection for diagonal entry - wall on right, open on left', () => {
      // When entering diagonally with wall on N (right of NE), corridor goes E (left of NE)
      // oldDirection should be set to E so testRun scans toward the corridor
      // Need walls on BOTH sides at dest for corridor mode
      // ######
      // #....#  <- Corridor at y=1 (walls N and S)
      // ##@###  <- Player at (2,2), walls around except entry point
      // ######
      const walls: { x: number; y: number }[] = [];
      for (let x = 0; x < 6; x++) {
        walls.push({ x, y: 0 });  // Top wall
        walls.push({ x, y: 3 });  // Bottom wall
      }
      walls.push({ x: 0, y: 1 }); walls.push({ x: 5, y: 1 });  // Side walls of corridor
      // y=2 row: walls except player start
      walls.push({ x: 0, y: 2 }); walls.push({ x: 1, y: 2 });
      walls.push({ x: 3, y: 2 }); walls.push({ x: 4, y: 2 }); walls.push({ x: 5, y: 2 });

      const level = createTestLevel(6, 4, walls);
      const startPos = { x: 2, y: 2 };

      // Verify: from dest (3,1), N is wall, S is wall, E is open
      expect(level.isWalkable({ x: 3, y: 0 })).toBe(false); // N (getRight of NE) is wall
      expect(level.isWalkable({ x: 3, y: 2 })).toBe(false); // S is wall (for corridor detection)
      expect(level.isWalkable({ x: 4, y: 1 })).toBe(true);  // E (getLeft of NE) is open

      const state = RunSystem.initRun(level, startPos, Direction.NorthEast);

      // Should be in corridor mode (walls detected on both sides at dest)
      expect(state.openArea).toBe(false);

      // deepRight = wall at N = true
      // deepLeft = wall at E = false
      // So deepRight && !deepLeft triggers oldDirection = getLeft(NE) = E
      expect(state.oldDirection).toBe(Direction.East);
    });

    it('should set correct oldDirection for diagonal entry - wall on left, open on right', () => {
      // When entering diagonally with wall on E (left of NE), corridor goes N (right of NE)
      // oldDirection should be set to N so testRun scans toward the corridor
      // ##.###
      // ##.###  <- Corridor at x=2
      // ##.@##  <- Player at (3,2), dest (3,1) has wall to E, open to N
      // ######
      const walls: { x: number; y: number }[] = [];
      // Create vertical corridor at x=2
      for (let x = 0; x < 6; x++) {
        if (x !== 2) {
          walls.push({ x, y: 0 });
          walls.push({ x, y: 1 });
        }
      }
      for (let x = 0; x < 6; x++) {
        if (x !== 2 && x !== 3) {
          walls.push({ x, y: 2 });
        }
      }
      for (let x = 0; x < 6; x++) {
        walls.push({ x, y: 3 });
      }

      const level = createTestLevel(6, 4, walls);
      const startPos = { x: 3, y: 2 };

      // Run NW to enter corridor at (2,1)
      // From dest (2,1): W is wall, N is open (corridor continues)
      expect(level.isWalkable({ x: 1, y: 1 })).toBe(false); // W is wall
      expect(level.isWalkable({ x: 2, y: 0 })).toBe(true);  // N is open

      const state = RunSystem.initRun(level, startPos, Direction.NorthWest);

      // getLeft(NW) = N, getRight(NW) = W
      // deepLeft = wall at N = false (open)
      // deepRight = wall at W = true
      // So deepRight && !deepLeft triggers oldDirection = getLeft(NW) = N
      expect(state.oldDirection).toBe(Direction.North);
    });
  });

  describe('monster detection', () => {
    it('should stop when hostile monster is visible', () => {
      const level = createTestLevel(7, 7, []);
      const startPos = { x: 3, y: 3 };

      // Add a monster ahead
      const monster = {
        position: { x: 5, y: 3 },
        isDead: false,
        isTamed: false,
      };
      level.addMonster(monster as any);

      const state = RunSystem.initRun(level, startPos, Direction.East);

      // Move east - should stop when monster is in scan range
      const result = RunSystem.testRun(level, { x: 4, y: 3 }, state);
      expect(result.canContinue).toBe(false);
      expect(result.spottedMonster).toBe(monster);
    });

    it('should not stop for dead monsters', () => {
      const level = createTestLevel(7, 7, []);
      const startPos = { x: 3, y: 3 };

      // Add a dead monster ahead
      const monster = {
        position: { x: 5, y: 3 },
        isDead: true,
        isTamed: false,
      };
      level.addMonster(monster as any);

      const state = RunSystem.initRun(level, startPos, Direction.East);

      // Move east - should continue (monster is dead)
      const result = RunSystem.testRun(level, { x: 4, y: 3 }, state);
      expect(result.canContinue).toBe(true);
    });

    it('should not stop for tamed monsters', () => {
      const level = createTestLevel(7, 7, []);
      const startPos = { x: 3, y: 3 };

      // Add a tamed monster ahead
      const monster = {
        position: { x: 5, y: 3 },
        isDead: false,
        isTamed: true,
      };
      level.addMonster(monster as any);

      const state = RunSystem.initRun(level, startPos, Direction.East);

      // Move east - should continue (monster is tamed)
      const result = RunSystem.testRun(level, { x: 4, y: 3 }, state);
      expect(result.canContinue).toBe(true);
    });
  });
});
