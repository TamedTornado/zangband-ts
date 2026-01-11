import { describe, it, expect } from 'vitest';
import { TownGenerator, type TownLayout } from '@/core/systems/town/TownGenerator';

// Test town layout
const testLayout: TownLayout = {
  key: 'test_town',
  name: 'Test Town',
  width: 66,
  height: 22,
  stores: [
    { storeKey: 'general_store', x: 3, y: 2, width: 7, height: 4 },
    { storeKey: 'armory', x: 12, y: 2, width: 7, height: 4 },
    { storeKey: 'weapon_smith', x: 21, y: 2, width: 7, height: 4 },
    { storeKey: 'temple', x: 30, y: 2, width: 7, height: 4 },
    { storeKey: 'alchemy_shop', x: 39, y: 2, width: 7, height: 4 },
    { storeKey: 'magic_shop', x: 48, y: 2, width: 7, height: 4 },
    { storeKey: 'black_market', x: 57, y: 2, width: 7, height: 4 },
    { storeKey: 'home', x: 3, y: 16, width: 7, height: 4 },
  ],
  dungeonEntrance: { x: 33, y: 11 },
  playerStart: { x: 33, y: 14 },
};

describe('TownGenerator', () => {
  describe('generate', () => {
    it('creates level at depth 0', () => {
      const generator = new TownGenerator();
      const town = generator.generate(testLayout);

      expect(town.level.depth).toBe(0);
    });

    it('creates level with correct dimensions', () => {
      const generator = new TownGenerator();
      const town = generator.generate(testLayout);

      expect(town.level.width).toBe(66);
      expect(town.level.height).toBe(22);
    });

    it('places all 8 store entrances', () => {
      const generator = new TownGenerator();
      const town = generator.generate(testLayout);

      // Check that each store has an entrance
      const storeKeys = ['general_store', 'armory', 'weapon_smith', 'temple', 'alchemy_shop', 'magic_shop', 'black_market', 'home'];

      for (const storeKey of storeKeys) {
        const entrances = town.storeEntrances.filter(e => e.storeKey === storeKey);
        expect(entrances.length).toBe(1);
      }
    });

    it('places dungeon entrance with down stairs', () => {
      const generator = new TownGenerator();
      const town = generator.generate(testLayout);

      const entranceTile = town.level.getTile(testLayout.dungeonEntrance);
      expect(entranceTile).toBeDefined();
      expect(entranceTile!.terrain.key).toBe('down_staircase');
    });

    it('returns valid player start position', () => {
      const generator = new TownGenerator();
      const town = generator.generate(testLayout);

      expect(town.playerStart).toEqual(testLayout.playerStart);
      // Player start should be walkable
      expect(town.level.isWalkable(town.playerStart)).toBe(true);
    });

    it('makes all store entrances walkable', () => {
      const generator = new TownGenerator();
      const town = generator.generate(testLayout);

      for (const entrance of town.storeEntrances) {
        expect(town.level.isWalkable(entrance.position)).toBe(true);
      }
    });

    it('store entrances display store symbols', () => {
      const generator = new TownGenerator();
      const town = generator.generate(testLayout);

      // Store symbols are "1" through "8"
      const generalEntrance = town.storeEntrances.find(e => e.storeKey === 'general_store');
      expect(generalEntrance).toBeDefined();

      const tile = town.level.getTile(generalEntrance!.position);
      expect(tile).toBeDefined();
      expect(tile!.terrain.symbol).toBe('1');
    });

    it('creates store buildings with walls', () => {
      const generator = new TownGenerator();
      const town = generator.generate(testLayout);

      // Check that store area has walls around it (except entrance)
      // General store is at x:3, y:2, width:7, height:4
      const store = testLayout.stores[0];

      // Check top-left corner is wall (blocked)
      const cornerTile = town.level.getTile({ x: store.x, y: store.y });
      expect(cornerTile).toBeDefined();
      expect(town.level.isWalkable({ x: store.x, y: store.y })).toBe(false);
    });

    it('store interiors are solid (not walkable)', () => {
      const generator = new TownGenerator();
      const town = generator.generate(testLayout);

      // General store is at x:3, y:2, width:7, height:4
      // Interior tile at x:5, y:3 should be blocked
      const store = testLayout.stores[0];
      const interiorX = store.x + 2;
      const interiorY = store.y + 1;

      expect(town.level.isWalkable({ x: interiorX, y: interiorY })).toBe(false);
    });

    it('places floor tiles in the town area', () => {
      const generator = new TownGenerator();
      const town = generator.generate(testLayout);

      // Check that area outside stores is walkable floor
      // Player start should be on floor
      const floorTile = town.level.getTile(town.playerStart);
      expect(floorTile).toBeDefined();
      expect(town.level.isWalkable(town.playerStart)).toBe(true);
    });

    it('provides storeKeyAt lookup for entrance positions', () => {
      const generator = new TownGenerator();
      const town = generator.generate(testLayout);

      // Find general store entrance
      const generalEntrance = town.storeEntrances.find(e => e.storeKey === 'general_store');
      expect(generalEntrance).toBeDefined();

      // Lookup should return store key
      expect(town.getStoreKeyAt(generalEntrance!.position)).toBe('general_store');

      // Non-store position should return undefined
      expect(town.getStoreKeyAt(town.playerStart)).toBeUndefined();
    });
  });

  describe('store placement', () => {
    it('places entrance at bottom center of each store building', () => {
      const generator = new TownGenerator();
      const town = generator.generate(testLayout);

      // General store: x:3, y:2, width:7, height:4
      // Bottom center should be: x: 3 + 3 = 6, y: 2 + 4 - 1 = 5
      const generalEntrance = town.storeEntrances.find(e => e.storeKey === 'general_store');
      expect(generalEntrance).toBeDefined();
      expect(generalEntrance!.position.x).toBe(6);  // 3 + floor(7/2)
      expect(generalEntrance!.position.y).toBe(5);  // 2 + 4 - 1
    });
  });

  describe('boundary walls', () => {
    it('places permanent walls at map boundary', () => {
      const generator = new TownGenerator();
      const town = generator.generate(testLayout);

      // Top-left corner should be permanent wall
      expect(town.level.isWalkable({ x: 0, y: 0 })).toBe(false);

      // Bottom-right corner should be permanent wall
      expect(town.level.isWalkable({ x: 65, y: 21 })).toBe(false);

      // Edges should be blocked
      expect(town.level.isWalkable({ x: 0, y: 10 })).toBe(false);
      expect(town.level.isWalkable({ x: 65, y: 10 })).toBe(false);
    });
  });
});
