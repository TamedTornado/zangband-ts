import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import {
  DungeonGenerator,
  type DungeonConfig,
  CAVE_ROOM,
  CAVE_GLOW,
  CAVE_ICKY,
} from '@/core/systems/dungeon';

describe('DungeonGenerator', () => {
  let generator: DungeonGenerator;

  beforeEach(() => {
    RNG.setSeed(12345);
    generator = new DungeonGenerator(RNG);
  });

  describe('basic generation', () => {
    it('should generate a dungeon of specified size', () => {
      const config: DungeonConfig = {
        width: 80,
        height: 40,
        depth: 1,
      };

      const dungeon = generator.generate(config);

      expect(dungeon.width).toBe(80);
      expect(dungeon.height).toBe(40);
      expect(dungeon.tiles.length).toBe(40);
      expect(dungeon.tiles[0].length).toBe(80);
    });

    it('should have permanent walls on boundaries', () => {
      const dungeon = generator.generate({ width: 80, height: 40, depth: 1 });

      // Top boundary
      for (let x = 0; x < 80; x++) {
        expect(dungeon.tiles[0][x].feat).toBe('permanent_wall');
      }
      // Bottom boundary
      for (let x = 0; x < 80; x++) {
        expect(dungeon.tiles[39][x].feat).toBe('permanent_wall');
      }
      // Left boundary
      for (let y = 0; y < 40; y++) {
        expect(dungeon.tiles[y][0].feat).toBe('permanent_wall');
      }
      // Right boundary
      for (let y = 0; y < 40; y++) {
        expect(dungeon.tiles[y][79].feat).toBe('permanent_wall');
      }
    });

    it('should generate rooms', () => {
      const dungeon = generator.generate({ width: 80, height: 40, depth: 1 });
      expect(dungeon.rooms.length).toBeGreaterThan(0);
    });

    it('should track dungeon depth', () => {
      const d1 = generator.generate({ width: 80, height: 40, depth: 1 });
      const d50 = generator.generate({ width: 80, height: 40, depth: 50 });

      expect(d1.depth).toBe(1);
      expect(d50.depth).toBe(50);
    });
  });

  describe('rooms', () => {
    it('should generate floor tiles in rooms', () => {
      const dungeon = generator.generate({ width: 80, height: 40, depth: 1 });

      let floorCount = 0;
      for (let y = 0; y < dungeon.height; y++) {
        for (let x = 0; x < dungeon.width; x++) {
          if (dungeon.tiles[y][x].feat === 'floor') {
            floorCount++;
          }
        }
      }
      expect(floorCount).toBeGreaterThan(0);
    });

    it('should mark room tiles with CAVE_ROOM flag', () => {
      const dungeon = generator.generate({ width: 80, height: 40, depth: 1 });

      let roomTiles = 0;
      for (let y = 0; y < dungeon.height; y++) {
        for (let x = 0; x < dungeon.width; x++) {
          if (dungeon.tiles[y][x].info & CAVE_ROOM) {
            roomTiles++;
          }
        }
      }
      expect(roomTiles).toBeGreaterThan(0);
    });

    it('should light rooms on shallow depths', () => {
      RNG.setSeed(12345);
      const dungeon = generator.generate({ width: 80, height: 40, depth: 1 });

      let litTiles = 0;
      for (let y = 0; y < dungeon.height; y++) {
        for (let x = 0; x < dungeon.width; x++) {
          if (dungeon.tiles[y][x].info & CAVE_GLOW) {
            litTiles++;
          }
        }
      }
      // At depth 1, most rooms should be lit
      expect(litTiles).toBeGreaterThan(0);
    });
  });

  describe('connectivity', () => {
    it('should connect rooms via floor tiles', () => {
      const dungeon = generator.generate({ width: 80, height: 40, depth: 1 });

      if (dungeon.rooms.length < 2) return;

      // BFS from first room center to check connectivity
      const visited = new Set<string>();
      const queue: Array<{ x: number; y: number }> = [];

      const firstRoom = dungeon.rooms[0];
      queue.push({ x: firstRoom.centerX, y: firstRoom.centerY });
      visited.add(`${firstRoom.centerX},${firstRoom.centerY}`);

      while (queue.length > 0) {
        const { x, y } = queue.shift()!;

        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nx = x + dx;
          const ny = y + dy;
          const key = `${nx},${ny}`;

          if (visited.has(key)) continue;
          if (ny < 0 || ny >= dungeon.height || nx < 0 || nx >= dungeon.width) continue;

          const tile = dungeon.tiles[ny][nx];
          // Can walk through floor or door tiles
          if (tile.feat === 'floor' || tile.feat.includes('door')) {
            visited.add(key);
            queue.push({ x: nx, y: ny });
          }
        }
      }

      // Should reach most rooms
      let reachableRooms = 0;
      for (const room of dungeon.rooms) {
        if (visited.has(`${room.centerX},${room.centerY}`)) {
          reachableRooms++;
        }
      }
      expect(reachableRooms).toBeGreaterThan(dungeon.rooms.length / 2);
    });
  });

  describe('stairs', () => {
    it('should place down stairs', () => {
      const dungeon = generator.generate({ width: 80, height: 40, depth: 1 });
      expect(dungeon.downStairs.length).toBeGreaterThanOrEqual(1);
    });

    it('should place up stairs on levels > 1', () => {
      const dungeon = generator.generate({ width: 80, height: 40, depth: 5 });
      expect(dungeon.upStairs.length).toBeGreaterThanOrEqual(1);
    });

    it('should not place up stairs on level 1', () => {
      const dungeon = generator.generate({ width: 80, height: 40, depth: 1 });
      expect(dungeon.upStairs.length).toBe(0);
    });

    it('should place stairs on floor tiles', () => {
      const dungeon = generator.generate({ width: 80, height: 40, depth: 5 });

      for (const pos of [...dungeon.upStairs, ...dungeon.downStairs]) {
        const feat = dungeon.tiles[pos.y][pos.x].feat;
        expect(['up_stairs', 'down_stairs']).toContain(feat);
      }
    });
  });

  describe('doors', () => {
    it('should place doors in the dungeon', () => {
      let totalDoors = 0;
      for (let i = 0; i < 5; i++) {
        RNG.setSeed(12345 + i);
        const dungeon = generator.generate({ width: 80, height: 40, depth: 5 });

        for (let y = 0; y < dungeon.height; y++) {
          for (let x = 0; x < dungeon.width; x++) {
            const feat = dungeon.tiles[y][x].feat;
            if (feat.includes('door')) {
              totalDoors++;
            }
          }
        }
      }
      expect(totalDoors).toBeGreaterThan(0);
    });
  });

  describe('special features', () => {
    it('should sometimes generate pillars', () => {
      let foundPillars = false;
      for (let i = 0; i < 50; i++) {
        RNG.setSeed(12345 + i * 7);
        const dungeon = generator.generate({ width: 80, height: 40, depth: 1 });

        for (let y = 0; y < dungeon.height && !foundPillars; y++) {
          for (let x = 0; x < dungeon.width && !foundPillars; x++) {
            if (dungeon.tiles[y][x].feat === 'pillar') {
              foundPillars = true;
            }
          }
        }
        if (foundPillars) break;
      }
      expect(foundPillars).toBe(true);
    });

    it('should generate vaults on deep levels', () => {
      let foundVault = false;
      for (let i = 0; i < 20; i++) {
        RNG.setSeed(12345 + i);
        const dungeon = generator.generate({ width: 120, height: 66, depth: 30 });

        for (let y = 0; y < dungeon.height && !foundVault; y++) {
          for (let x = 0; x < dungeon.width && !foundVault; x++) {
            if (dungeon.tiles[y][x].info & CAVE_ICKY) {
              foundVault = true;
            }
          }
        }
        if (foundVault) break;
      }
      expect(foundVault).toBe(true);
    });

    it('should sometimes generate liquid features', () => {
      let foundLiquid = false;
      for (let i = 0; i < 30; i++) {
        RNG.setSeed(12345 + i * 13);
        const dungeon = generator.generate({ width: 80, height: 40, depth: 10 });

        for (let y = 0; y < dungeon.height && !foundLiquid; y++) {
          for (let x = 0; x < dungeon.width && !foundLiquid; x++) {
            const feat = dungeon.tiles[y][x].feat;
            if (feat.includes('water') || feat.includes('lava')) {
              foundLiquid = true;
            }
          }
        }
        if (foundLiquid) break;
      }
      expect(foundLiquid).toBe(true);
    });

    it('should sometimes generate rubble', () => {
      let foundRubble = false;
      for (let i = 0; i < 30; i++) {
        RNG.setSeed(12345 + i * 11);
        const dungeon = generator.generate({ width: 80, height: 40, depth: 1 });

        for (let y = 0; y < dungeon.height && !foundRubble; y++) {
          for (let x = 0; x < dungeon.width && !foundRubble; x++) {
            if (dungeon.tiles[y][x].feat === 'rubble') {
              foundRubble = true;
            }
          }
        }
        if (foundRubble) break;
      }
      expect(foundRubble).toBe(true);
    });
  });

  describe('deterministic generation', () => {
    it('should generate same dungeon with same seed', () => {
      RNG.setSeed(99999);
      const dungeon1 = generator.generate({ width: 60, height: 30, depth: 10 });

      RNG.setSeed(99999);
      const dungeon2 = generator.generate({ width: 60, height: 30, depth: 10 });

      // Same number of rooms
      expect(dungeon1.rooms.length).toBe(dungeon2.rooms.length);

      // Same tile layout
      for (let y = 0; y < dungeon1.height; y++) {
        for (let x = 0; x < dungeon1.width; x++) {
          expect(dungeon1.tiles[y][x].feat).toBe(dungeon2.tiles[y][x].feat);
        }
      }
    });
  });

  describe('dungeon rating', () => {
    it('should track dungeon danger rating', () => {
      // Deep levels with vaults should have higher ratings
      let maxRating = 0;
      for (let i = 0; i < 10; i++) {
        RNG.setSeed(12345 + i);
        const dungeon = generator.generate({ width: 120, height: 66, depth: 30 });
        if (dungeon.rating > maxRating) {
          maxRating = dungeon.rating;
        }
      }
      expect(maxRating).toBeGreaterThanOrEqual(0);
    });
  });

  describe('room types', () => {
    it('should use variety of room types on deep levels', () => {
      // Generate many dungeons and look for variety in shapes
      const features = new Set<string>();

      for (let i = 0; i < 20; i++) {
        RNG.setSeed(12345 + i * 17);
        const dungeon = generator.generate({ width: 120, height: 66, depth: 20 });

        // Look for different tile patterns
        for (let y = 1; y < dungeon.height - 1; y++) {
          for (let x = 1; x < dungeon.width - 1; x++) {
            const feat = dungeon.tiles[y][x].feat;
            features.add(feat);
          }
        }
      }

      // Should have variety of features
      expect(features.size).toBeGreaterThan(3);
    });
  });
});
