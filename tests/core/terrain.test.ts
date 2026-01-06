import { describe, it, expect } from 'vitest';
import { parseTerrain, type TerrainDef, type TerrainRecord } from '@/core/data/terrain';

const SAMPLE_TERRAIN = `
# Comment line
V:2.7.4

N:0:nothing
G: :w

N:1:open floor
G:.:w
F:USE_TRANS

N:6:up staircase
G:<:w
F:USE_TRANS | ICKY | PERM | OBJECT | MARK
`;

describe('parseTerrain', () => {
  it('should return a record keyed by slug', () => {
    const terrain: TerrainRecord = parseTerrain(SAMPLE_TERRAIN);

    expect(terrain['nothing']).toBeDefined();
    expect(terrain['open_floor']).toBeDefined();
    expect(terrain['up_staircase']).toBeDefined();
  });

  it('should parse terrain key, index and name', () => {
    const terrain: TerrainRecord = parseTerrain(SAMPLE_TERRAIN);

    expect(terrain['nothing']?.key).toBe('nothing');
    expect(terrain['nothing']?.index).toBe(0);
    expect(terrain['nothing']?.name).toBe('nothing');

    expect(terrain['open_floor']?.key).toBe('open_floor');
    expect(terrain['open_floor']?.index).toBe(1);
    expect(terrain['open_floor']?.name).toBe('open floor');
  });

  it('should parse graphics (symbol and color)', () => {
    const terrain: TerrainRecord = parseTerrain(SAMPLE_TERRAIN);

    expect(terrain['nothing']?.symbol).toBe(' ');
    expect(terrain['nothing']?.color).toBe('w');
    expect(terrain['open_floor']?.symbol).toBe('.');
    expect(terrain['up_staircase']?.symbol).toBe('<');
  });

  it('should parse flags', () => {
    const terrain: TerrainRecord = parseTerrain(SAMPLE_TERRAIN);

    expect(terrain['nothing']?.flags).toEqual([]);
    expect(terrain['open_floor']?.flags).toEqual(['USE_TRANS']);
    expect(terrain['up_staircase']?.flags).toContain('USE_TRANS');
    expect(terrain['up_staircase']?.flags).toContain('ICKY');
    expect(terrain['up_staircase']?.flags).toContain('PERM');
  });

  it('should add index suffix only for colliding names', () => {
    const withCollisions = `
N:50:magma vein
G:#:s

N:52:magma vein
G:#:s

N:1:open floor
G:.:w
`;
    const terrain: TerrainRecord = parseTerrain(withCollisions);
    expect(terrain['magma_vein_50']).toBeDefined();
    expect(terrain['magma_vein_52']).toBeDefined();
    expect(terrain['open_floor']).toBeDefined(); // no suffix - unique
  });

  it('should throw on actual duplicate keys', () => {
    const duplicateIndex = `
N:1:floor
G:.:w

N:1:floor
G:.:w
`;
    expect(() => parseTerrain(duplicateIndex)).toThrow(/duplicate.*floor_1/i);
  });
});

describe('TerrainDef', () => {
  it('should have required fields', () => {
    const terrain: TerrainRecord = parseTerrain(SAMPLE_TERRAIN);
    const floor: TerrainDef | undefined = terrain['open_floor'];

    expect(floor).toBeDefined();
    expect(floor?.key).toBe('open_floor');
    expect(floor?.index).toBe(1);
    expect(floor?.name).toBe('open floor');
    expect(floor?.symbol).toBe('.');
    expect(floor?.color).toBe('w');
    expect(floor?.flags).toEqual(['USE_TRANS']);
  });
});
