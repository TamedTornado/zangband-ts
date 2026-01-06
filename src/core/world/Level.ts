import type { Position } from '../types';
import { Tile } from './Tile';

export interface LevelConfig {
  depth?: number;
}

export class Level {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  private tiles: Tile[][];

  constructor(width: number, height: number, config: LevelConfig = {}) {
    this.width = width;
    this.height = height;
    this.depth = config.depth ?? 0;

    // Initialize tile grid with floor tiles
    this.tiles = [];
    for (let y = 0; y < height; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < width; x++) {
        row.push(new Tile('floor'));
      }
      this.tiles.push(row);
    }
  }

  isInBounds(pos: Position): boolean {
    return pos.x >= 0 && pos.x < this.width && pos.y >= 0 && pos.y < this.height;
  }

  getTile(pos: Position): Tile | undefined {
    if (!this.isInBounds(pos)) {
      return undefined;
    }
    return this.tiles[pos.y][pos.x];
  }

  setTerrain(pos: Position, terrainKey: string): void {
    const tile = this.getTile(pos);
    if (tile) {
      tile.terrainKey = terrainKey;
    }
  }

  isWalkable(pos: Position): boolean {
    const tile = this.getTile(pos);
    return tile?.isPassable ?? false;
  }

  isTransparent(pos: Position): boolean {
    const tile = this.getTile(pos);
    return tile?.isTransparent ?? false;
  }

  // Legacy method for backward compatibility with old tests
  setWalkable(pos: Position, walkable: boolean): void {
    if (walkable) {
      this.setTerrain(pos, 'floor');
    } else {
      this.setTerrain(pos, 'granite_wall');
    }
  }
}
