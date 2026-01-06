import { describe, it, expect } from 'vitest';
import { parseTerrain, type TerrainDef } from '@/core/data/terrain';

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
  it('should parse terrain entries from text', () => {
    const terrain: TerrainDef[] = parseTerrain(SAMPLE_TERRAIN);

    expect(terrain.length).toBe(3);
  });

  it('should parse terrain id and name', () => {
    const terrain = parseTerrain(SAMPLE_TERRAIN);

    expect(terrain[0]?.id).toBe(0);
    expect(terrain[0]?.name).toBe('nothing');
    expect(terrain[1]?.id).toBe(1);
    expect(terrain[1]?.name).toBe('open floor');
  });

  it('should parse graphics (symbol and color)', () => {
    const terrain = parseTerrain(SAMPLE_TERRAIN);

    expect(terrain[0]?.symbol).toBe(' ');
    expect(terrain[0]?.color).toBe('w');
    expect(terrain[1]?.symbol).toBe('.');
    expect(terrain[2]?.symbol).toBe('<');
  });

  it('should parse flags', () => {
    const terrain = parseTerrain(SAMPLE_TERRAIN);

    expect(terrain[0]?.flags).toEqual([]);
    expect(terrain[1]?.flags).toEqual(['USE_TRANS']);
    expect(terrain[2]?.flags).toContain('USE_TRANS');
    expect(terrain[2]?.flags).toContain('ICKY');
    expect(terrain[2]?.flags).toContain('PERM');
  });

  it('should skip comments and version lines', () => {
    const terrain = parseTerrain(SAMPLE_TERRAIN);

    // Should not have any entry for comment or version
    expect(terrain.every((t) => t.name !== '')).toBe(true);
  });
});

describe('TerrainDef', () => {
  it('should have required fields', () => {
    const terrain = parseTerrain(SAMPLE_TERRAIN);
    const floor = terrain.find((t) => t.name === 'open floor');

    expect(floor).toBeDefined();
    expect(floor?.id).toBe(1);
    expect(floor?.name).toBe('open floor');
    expect(floor?.symbol).toBe('.');
    expect(floor?.color).toBe('w');
    expect(floor?.flags).toEqual(['USE_TRANS']);
  });
});
