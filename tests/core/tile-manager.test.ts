import { describe, it, expect, beforeEach } from 'vitest';
import {
  TileManager,
  type TilesetConfig,
  type TileMappings,
} from '@/core/systems/TileManager';

// Test fixtures (coordinates are tile indices, not pixels)
const mockMappings: TileMappings = {
  features: {
    '0': { col: 0, row: 0 },
    '1': { col: 0, row: 1 },
    '48': { col: 0, row: 4 },
  },
  monsters: {
    '1': { col: 18, row: 0 },
    '20': { col: 13, row: 10 },
  },
  items: {
    '1': { col: 5, row: 20 },
    '100': { col: 12, row: 32 },
  },
  spells: {
    '48': { col: 17, row: 8 },
  },
  player: { col: 16, row: 0 },
};

const mockTilesetConfig: TilesetConfig = {
  name: 'Adam Bolt 16x16',
  file: 'adam-bolt-16x16.png',
  tileWidth: 16,
  tileHeight: 16,
  mappings: 'adam-bolt-mappings.json',
};

describe('TileManager', () => {
  let manager: TileManager;

  beforeEach(() => {
    manager = new TileManager(mockTilesetConfig, mockMappings);
  });

  describe('constructor', () => {
    it('stores tileset config', () => {
      expect(manager.config).toEqual(mockTilesetConfig);
    });

    it('stores tile mappings', () => {
      expect(manager.mappings).toEqual(mockMappings);
    });
  });

  describe('getTileCoords', () => {
    describe('features', () => {
      it('returns correct coords for mapped feature by index', () => {
        const coords = manager.getTileCoords('feature', 0);
        expect(coords).toEqual({ col: 0, row: 0 });
      });

      it('returns correct coords for another mapped feature', () => {
        const coords = manager.getTileCoords('feature', 48);
        expect(coords).toEqual({ col: 0, row: 4 });
      });

      it('returns null for unmapped feature', () => {
        const coords = manager.getTileCoords('feature', 999);
        expect(coords).toBeNull();
      });
    });

    describe('monsters', () => {
      it('returns correct coords for mapped monster by index', () => {
        const coords = manager.getTileCoords('monster', 1);
        expect(coords).toEqual({ col: 18, row: 0 });
      });

      it('returns correct coords for another mapped monster', () => {
        const coords = manager.getTileCoords('monster', 20);
        expect(coords).toEqual({ col: 13, row: 10 });
      });

      it('returns null for unmapped monster', () => {
        const coords = manager.getTileCoords('monster', 999);
        expect(coords).toBeNull();
      });
    });

    describe('items', () => {
      it('returns correct coords for mapped item by index', () => {
        const coords = manager.getTileCoords('item', 1);
        expect(coords).toEqual({ col: 5, row: 20 });
      });

      it('returns correct coords for another mapped item', () => {
        const coords = manager.getTileCoords('item', 100);
        expect(coords).toEqual({ col: 12, row: 32 });
      });

      it('returns null for unmapped item', () => {
        const coords = manager.getTileCoords('item', 999);
        expect(coords).toBeNull();
      });
    });

    describe('player', () => {
      it('returns player tile coords', () => {
        const coords = manager.getPlayerTileCoords();
        expect(coords).toEqual({ col: 16, row: 0 });
      });
    });

    describe('spells', () => {
      it('returns correct coords for mapped spell', () => {
        const coords = manager.getTileCoords('spell', 48);
        expect(coords).toEqual({ col: 17, row: 8 });
      });

      it('returns null for unmapped spell', () => {
        const coords = manager.getTileCoords('spell', 999);
        expect(coords).toBeNull();
      });
    });
  });

  describe('getPixelCoords', () => {
    it('converts tile coords to pixel coords for 16x16 tileset', () => {
      // Tile at (0, 0) with 16x16 tiles = pixel (0, 0)
      const pixel = manager.getPixelCoords({ col: 0, row: 0 });
      expect(pixel).toEqual({ x: 0, y: 0 });
    });

    it('converts another tile coord correctly', () => {
      // Tile at (18, 0) with 16x16 tiles = pixel (288, 0)
      const pixel = manager.getPixelCoords({ col: 18, row: 0 });
      expect(pixel).toEqual({ x: 288, y: 0 });
    });

    it('converts tile with row offset', () => {
      // Tile at (5, 10) with 16x16 tiles = pixel (80, 160)
      const pixel = manager.getPixelCoords({ col: 5, row: 10 });
      expect(pixel).toEqual({ x: 80, y: 160 });
    });
  });

  describe('getTileSize', () => {
    it('returns tile dimensions from config', () => {
      const size = manager.getTileSize();
      expect(size).toEqual({ width: 16, height: 16 });
    });
  });

  describe('buildRotTileMap', () => {
    it('builds a map of symbols to pixel coordinates', () => {
      // This is the format rot.js expects: { symbol: [x, y] }
      const tileMap = manager.buildRotTileMap();

      // Check that it's an object
      expect(typeof tileMap).toBe('object');

      // The map should have entries for entities we can render
      // Each entry maps a string key to [x, y] pixel coords
    });

    it('includes feature tiles with index-based keys', () => {
      const tileMap = manager.buildRotTileMap();
      // Features are keyed by "f:INDEX"
      expect(tileMap['f:0']).toEqual([0, 0]); // col 0 * 16, row 0 * 16
      expect(tileMap['f:1']).toEqual([0, 16]); // col 0 * 16, row 1 * 16
    });

    it('includes monster tiles with index-based keys', () => {
      const tileMap = manager.buildRotTileMap();
      // Monsters are keyed by "m:INDEX"
      expect(tileMap['m:1']).toEqual([288, 0]); // col 18 * 16, row 0 * 16
    });

    it('includes item tiles with index-based keys', () => {
      const tileMap = manager.buildRotTileMap();
      // Items are keyed by "i:INDEX"
      expect(tileMap['i:1']).toEqual([80, 320]); // col 5 * 16, row 20 * 16
    });

    it('includes player tile', () => {
      const tileMap = manager.buildRotTileMap();
      expect(tileMap['@']).toEqual([256, 0]); // col 16 * 16, row 0 * 16
    });

    it('includes space character for empty tiles', () => {
      const tileMap = manager.buildRotTileMap();
      // Space maps to feature 0 ("nothing" tile)
      expect(tileMap[' ']).toEqual([0, 0]); // col 0 * 16, row 0 * 16
    });
  });

  describe('with different tile sizes', () => {
    it('scales pixel coords for 32x32 tileset', () => {
      const config32: TilesetConfig = {
        ...mockTilesetConfig,
        tileWidth: 32,
        tileHeight: 32,
      };
      const manager32 = new TileManager(config32, mockMappings);

      // Same tile coords but larger pixels
      const pixel = manager32.getPixelCoords({ col: 5, row: 10 });
      expect(pixel).toEqual({ x: 160, y: 320 }); // 5 * 32, 10 * 32
    });

    it('returns correct tile size for 32x32', () => {
      const config32: TilesetConfig = {
        ...mockTilesetConfig,
        tileWidth: 32,
        tileHeight: 32,
      };
      const manager32 = new TileManager(config32, mockMappings);

      expect(manager32.getTileSize()).toEqual({ width: 32, height: 32 });
    });
  });
});
