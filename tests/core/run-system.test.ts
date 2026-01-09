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
