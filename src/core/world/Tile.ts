import type { Actor } from '../entities/Actor';
import type { Item } from '../entities/Item';
import type { TerrainDef } from '../data/terrain';
import terrainData from '../../data/terrain/terrain.json';

const TERRAIN: Record<string, TerrainDef> = terrainData;

// Aliases for terrain keys with index suffixes (TODO: fix in data extraction)
const TERRAIN_ALIASES: Record<string, string> = {
  floor: 'open_floor',
  granite_wall: 'granite_wall_48',
  permanent_wall: 'permanent_wall_60',
  magma_vein: 'magma_vein_50',
  quartz_vein: 'quartz_vein_51',
  pillar: 'pillar_33',
};

function resolveTerrain(key: string): TerrainDef {
  const terrain = TERRAIN[key] ?? TERRAIN[TERRAIN_ALIASES[key] ?? ''];
  if (!terrain) {
    throw new Error(`Unknown terrain: ${key}`);
  }
  return terrain;
}

export function getTerrain(key: string): TerrainDef {
  return resolveTerrain(key);
}

export class Tile {
  private _terrain: TerrainDef;
  private _occupant: Actor | null = null;
  private _items: Item[] = [];
  private _explored: boolean = false;

  constructor(terrain: TerrainDef | string = 'floor') {
    this._terrain = typeof terrain === 'string' ? resolveTerrain(terrain) : terrain;
  }

  get terrain(): TerrainDef {
    return this._terrain;
  }

  set terrain(terrain: TerrainDef) {
    this._terrain = terrain;
  }

  get terrainKey(): string {
    return this._terrain.key;
  }

  get isWalkable(): boolean {
    return !this._terrain.flags.includes('BLOCK') && this._occupant === null;
  }

  get isPassable(): boolean {
    return !this._terrain.flags.includes('BLOCK');
  }

  get isTransparent(): boolean {
    // Terrain is transparent for LOS if it doesn't block movement
    return !this._terrain.flags.includes('BLOCK');
  }

  get occupant(): Actor | null {
    return this._occupant;
  }

  set occupant(actor: Actor | null) {
    this._occupant = actor;
  }

  get items(): Item[] {
    return [...this._items];
  }

  addItem(item: Item): void {
    this._items.push(item);
  }

  removeItem(itemId: string): Item | undefined {
    const idx = this._items.findIndex(i => i.id === itemId);
    if (idx >= 0) {
      return this._items.splice(idx, 1)[0];
    }
    return undefined;
  }

  get explored(): boolean {
    return this._explored;
  }

  set explored(value: boolean) {
    this._explored = value;
  }
}
