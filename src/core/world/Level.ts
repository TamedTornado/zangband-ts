import type { Position } from '../types';
import type { TerrainDef } from '../data/terrain';
import { Tile, getTerrain } from './Tile';
import type { Monster } from '../entities/Monster';
import type { Item } from '../entities/Item';
import type { Trap } from '../entities/Trap';

export interface LevelConfig {
  depth?: number;
}

export class Level {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  private tiles: Tile[][];

  // Entity tracking
  private monsters: Monster[] = [];
  private items: Item[] = [];
  private traps: Trap[] = [];

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

  setTerrain(pos: Position, terrain: TerrainDef | string): void {
    const tile = this.getTile(pos);
    if (tile) {
      tile.terrain = typeof terrain === 'string' ? getTerrain(terrain) : terrain;
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

  // Monster methods
  addMonster(monster: Monster): void {
    this.monsters.push(monster);
  }

  removeMonster(monster: Monster): void {
    const index = this.monsters.indexOf(monster);
    if (index !== -1) {
      this.monsters.splice(index, 1);
    }
  }

  getMonsters(): Monster[] {
    return [...this.monsters];
  }

  getMonsterAt(pos: Position): Monster | undefined {
    return this.monsters.find(
      (m) => m.position.x === pos.x && m.position.y === pos.y
    );
  }

  // Item methods
  addItem(item: Item): void {
    this.items.push(item);
  }

  removeItem(item: Item): void {
    const index = this.items.indexOf(item);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
  }

  getItemsAt(pos: Position): Item[] {
    return this.items.filter(
      (i) => i.position.x === pos.x && i.position.y === pos.y
    );
  }

  getAllItems(): Item[] {
    return [...this.items];
  }

  // Trap methods
  addTrap(trap: Trap): void {
    this.traps.push(trap);
  }

  removeTrap(trap: Trap): void {
    const index = this.traps.indexOf(trap);
    if (index !== -1) {
      this.traps.splice(index, 1);
    }
  }

  getTraps(): Trap[] {
    return [...this.traps];
  }

  getTrapAt(pos: Position): Trap | undefined {
    return this.traps.find(
      (t) => t.position.x === pos.x && t.position.y === pos.y
    );
  }

  // Check if position is occupied by a monster
  isOccupied(pos: Position): boolean {
    return this.getMonsterAt(pos) !== undefined;
  }
}
