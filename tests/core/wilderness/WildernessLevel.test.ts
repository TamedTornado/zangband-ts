/**
 * WildernessLevel tests
 *
 * Tests for the WildernessLevel class that handles tile-by-tile
 * wilderness navigation with dynamic block loading.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { WildernessLevel, isWildernessLevel } from '@/core/world/WildernessLevel';
import { Level } from '@/core/world/Level';
import { WildernessGenerator } from '@/core/systems/wilderness/WildernessGenerator';
import { WILD_BLOCK_SIZE, WILD_VIEW } from '@/core/data/WildernessTypes';
import type { WildGenData } from '@/core/data/WildernessTypes';
import wInfoData from '@/data/wilderness/w_info.json';

describe('WildernessLevel', () => {
  let wildernessLevel: WildernessLevel;
  let genData: WildGenData[];

  beforeEach(() => {
    RNG.setSeed(12345);
    genData = wInfoData as WildGenData[];
    const generator = new WildernessGenerator(RNG, genData, 64);
    const wildernessMap = generator.generate();
    wildernessLevel = new WildernessLevel(wildernessMap, genData, RNG);
  });

  describe('dimensions', () => {
    it('has correct viewport dimensions', () => {
      expect(wildernessLevel.width).toBe(WILD_VIEW * WILD_BLOCK_SIZE); // 144
      expect(wildernessLevel.height).toBe(WILD_VIEW * WILD_BLOCK_SIZE); // 144
    });

    it('is always depth 0', () => {
      expect(wildernessLevel.depth).toBe(0);
    });
  });

  describe('initialization', () => {
    it('initializes at specified wilderness position', () => {
      const startX = 32 * WILD_BLOCK_SIZE + 8; // Center of block (32, 32)
      const startY = 32 * WILD_BLOCK_SIZE + 8;

      wildernessLevel.initializeAt(startX, startY);

      expect(wildernessLevel.wildernessX).toBe(startX);
      expect(wildernessLevel.wildernessY).toBe(startY);
    });

    it('provides valid screen position after initialization', () => {
      const startX = 32 * WILD_BLOCK_SIZE + 8;
      const startY = 32 * WILD_BLOCK_SIZE + 8;

      wildernessLevel.initializeAt(startX, startY);
      const screenPos = wildernessLevel.getPlayerScreenPosition();

      expect(screenPos).not.toBeNull();
      expect(screenPos!.x).toBeGreaterThanOrEqual(0);
      expect(screenPos!.x).toBeLessThan(wildernessLevel.width);
      expect(screenPos!.y).toBeGreaterThanOrEqual(0);
      expect(screenPos!.y).toBeLessThan(wildernessLevel.height);
    });
  });

  describe('coordinate conversion', () => {
    beforeEach(() => {
      wildernessLevel.initializeAt(32 * WILD_BLOCK_SIZE + 8, 32 * WILD_BLOCK_SIZE + 8);
    });

    it('converts screen to wilderness coordinates', () => {
      const screenPos = wildernessLevel.getPlayerScreenPosition()!;
      const wildPos = wildernessLevel.screenToWilderness(screenPos.x, screenPos.y);

      expect(wildPos.x).toBe(wildernessLevel.wildernessX);
      expect(wildPos.y).toBe(wildernessLevel.wildernessY);
    });

    it('converts wilderness to screen coordinates', () => {
      const wildX = wildernessLevel.wildernessX;
      const wildY = wildernessLevel.wildernessY;
      const screenPos = wildernessLevel.wildernessToScreen(wildX, wildY);

      expect(screenPos).not.toBeNull();
      expect(screenPos).toEqual(wildernessLevel.getPlayerScreenPosition());
    });

    it('returns null for out-of-viewport wilderness positions', () => {
      // Position far outside current viewport
      const screenPos = wildernessLevel.wildernessToScreen(0, 0);
      expect(screenPos).toBeNull();
    });
  });

  describe('setPlayerWildernessPosition', () => {
    beforeEach(() => {
      wildernessLevel.initializeAt(32 * WILD_BLOCK_SIZE + 8, 32 * WILD_BLOCK_SIZE + 8);
    });

    it('updates wilderness coordinates', () => {
      const newX = wildernessLevel.wildernessX + 1;
      const newY = wildernessLevel.wildernessY;

      wildernessLevel.setPlayerWildernessPosition(newX, newY);

      expect(wildernessLevel.wildernessX).toBe(newX);
      expect(wildernessLevel.wildernessY).toBe(newY);
    });

    it('returns false when viewport does not shift', () => {
      // Small movement shouldn't shift viewport
      const newX = wildernessLevel.wildernessX + 1;
      const newY = wildernessLevel.wildernessY;

      const shifted = wildernessLevel.setPlayerWildernessPosition(newX, newY);

      expect(shifted).toBe(false);
    });

    it('returns true when viewport shifts', () => {
      // Move far enough to trigger viewport shift
      const newX = wildernessLevel.wildernessX + WILD_BLOCK_SIZE * 4;
      const newY = wildernessLevel.wildernessY;

      const shifted = wildernessLevel.setPlayerWildernessPosition(newX, newY);

      expect(shifted).toBe(true);
    });
  });

  describe('tile access', () => {
    beforeEach(() => {
      wildernessLevel.initializeAt(32 * WILD_BLOCK_SIZE + 8, 32 * WILD_BLOCK_SIZE + 8);
    });

    it('returns tile at valid position', () => {
      const tile = wildernessLevel.getTile({ x: 72, y: 72 });
      expect(tile).toBeDefined();
      expect(tile?.terrain).toBeDefined();
    });

    it('returns undefined for out-of-bounds position', () => {
      const tile = wildernessLevel.getTile({ x: -1, y: 0 });
      expect(tile).toBeUndefined();
    });

    it('isInBounds returns correct values', () => {
      expect(wildernessLevel.isInBounds({ x: 0, y: 0 })).toBe(true);
      expect(wildernessLevel.isInBounds({ x: 143, y: 143 })).toBe(true);
      expect(wildernessLevel.isInBounds({ x: -1, y: 0 })).toBe(false);
      expect(wildernessLevel.isInBounds({ x: 144, y: 0 })).toBe(false);
    });
  });
});

describe('world coordinate system', () => {
  let wildernessLevel: WildernessLevel;
  let genData: WildGenData[];

  beforeEach(() => {
    RNG.setSeed(12345);
    genData = wInfoData as WildGenData[];
    const generator = new WildernessGenerator(RNG, genData, 64);
    const wildernessMap = generator.generate();
    wildernessLevel = new WildernessLevel(wildernessMap, genData, RNG);
  });

  describe('player.position uses world coordinates', () => {
    it('player.position equals world position after initialization', () => {
      const worldX = 32 * WILD_BLOCK_SIZE + 8;
      const worldY = 32 * WILD_BLOCK_SIZE + 8;

      // Create a mock player
      const mockPlayer = {
        id: 'player',
        position: { x: 0, y: 0 },
        isDead: false,
      } as any;

      wildernessLevel.player = mockPlayer;
      wildernessLevel.initializeAt(worldX, worldY);

      // Player position should be world coordinates, not screen
      expect(mockPlayer.position.x).toBe(worldX);
      expect(mockPlayer.position.y).toBe(worldY);
    });

    it('getPlayerScreenPosition converts world to screen', () => {
      const worldX = 32 * WILD_BLOCK_SIZE + 8;
      const worldY = 32 * WILD_BLOCK_SIZE + 8;

      const mockPlayer = {
        id: 'player',
        position: { x: worldX, y: worldY },
        isDead: false,
      } as any;

      wildernessLevel.player = mockPlayer;
      wildernessLevel.initializeAt(worldX, worldY);

      const screenPos = wildernessLevel.getPlayerScreenPosition();
      expect(screenPos).not.toBeNull();
      // Screen position should be within viewport bounds
      expect(screenPos!.x).toBeGreaterThanOrEqual(0);
      expect(screenPos!.x).toBeLessThan(WILD_VIEW * WILD_BLOCK_SIZE);
      expect(screenPos!.y).toBeGreaterThanOrEqual(0);
      expect(screenPos!.y).toBeLessThan(WILD_VIEW * WILD_BLOCK_SIZE);
    });
  });

  describe('tile access uses world coordinates', () => {
    beforeEach(() => {
      wildernessLevel.initializeAt(32 * WILD_BLOCK_SIZE + 8, 32 * WILD_BLOCK_SIZE + 8);
    });

    it('getTileWorld returns tile at world position', () => {
      const worldX = 32 * WILD_BLOCK_SIZE + 8;
      const worldY = 32 * WILD_BLOCK_SIZE + 8;

      const tile = wildernessLevel.getTileWorld({ x: worldX, y: worldY });
      expect(tile).toBeDefined();
      expect(tile?.terrain).toBeDefined();
    });

    it('isWalkableWorld checks world position', () => {
      const worldX = 32 * WILD_BLOCK_SIZE + 8;
      const worldY = 32 * WILD_BLOCK_SIZE + 8;

      // Should return a boolean (tile exists and is walkable or not)
      const result = wildernessLevel.isWalkableWorld({ x: worldX, y: worldY });
      expect(typeof result).toBe('boolean');
    });

    it('isInBoundsWorld checks world position against wilderness size', () => {
      const worldX = 32 * WILD_BLOCK_SIZE + 8;
      const worldY = 32 * WILD_BLOCK_SIZE + 8;

      expect(wildernessLevel.isInBoundsWorld({ x: worldX, y: worldY })).toBe(true);
      expect(wildernessLevel.isInBoundsWorld({ x: -1, y: 0 })).toBe(false);
      expect(wildernessLevel.isInBoundsWorld({ x: 64 * WILD_BLOCK_SIZE + 1, y: 0 })).toBe(false);
    });
  });

  describe('movement updates world position', () => {
    it('movePlayer updates player.position in world coords and returns viewport shift', () => {
      const worldX = 32 * WILD_BLOCK_SIZE + 8;
      const worldY = 32 * WILD_BLOCK_SIZE + 8;

      const mockPlayer = {
        id: 'player',
        position: { x: worldX, y: worldY },
        isDead: false,
      } as any;

      wildernessLevel.player = mockPlayer;
      wildernessLevel.initializeAt(worldX, worldY);

      // Move player one tile east
      const shifted = wildernessLevel.movePlayer(worldX + 1, worldY);

      expect(mockPlayer.position.x).toBe(worldX + 1);
      expect(mockPlayer.position.y).toBe(worldY);
      expect(typeof shifted).toBe('boolean');
    });
  });
});

describe('isWildernessLevel type guard', () => {
  it('returns true for WildernessLevel', () => {
    RNG.setSeed(12345);
    const genData = wInfoData as WildGenData[];
    const generator = new WildernessGenerator(RNG, genData, 64);
    const wildernessMap = generator.generate();
    const wildLevel = new WildernessLevel(wildernessMap, genData, RNG);

    expect(isWildernessLevel(wildLevel)).toBe(true);
  });

  it('returns false for regular Level', () => {
    const level = new Level(80, 24, { depth: 1 });

    expect(isWildernessLevel(level)).toBe(false);
  });
});
