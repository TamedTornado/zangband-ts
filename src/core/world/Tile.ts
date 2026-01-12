import type { Actor } from '../entities/Actor';
import type { Item } from '../entities/Item';
import type { TerrainDef } from '../data/terrain';
import terrainData from '../../data/terrain/terrain.json';

const TERRAIN: Record<string, TerrainDef> = terrainData;

// Build index-to-terrain lookup map for feature ID based access
const TERRAIN_BY_INDEX: Map<number, TerrainDef> = new Map();
for (const terrain of Object.values(TERRAIN)) {
  TERRAIN_BY_INDEX.set(terrain.index, terrain);
}

// Aliases for terrain keys - maps FeatureType names to actual terrain keys
const TERRAIN_ALIASES: Record<string, string> = {
  // Basic terrain
  floor: 'open_floor',
  granite_wall: 'granite_wall_48',
  permanent_wall: 'permanent_wall_60',
  magma_vein: 'magma_vein_50',
  quartz_vein: 'quartz_vein_51',
  pillar: 'pillar_33',
  // DungeonGenerator FeatureTypes
  wall_extra: 'granite_wall_48',
  wall_inner: 'granite_wall_48',
  wall_outer: 'granite_wall_48',
  wall_solid: 'permanent_wall_60',
  up_stairs: 'up_staircase',
  down_stairs: 'down_staircase',
  secret_door: 'door',
  closed_door: 'door',
  rubble: 'pile_of_rubble',
  magma: 'magma_vein_50',
  quartz: 'quartz_vein_51',
  shallow_water: 'shallow_water',
  deep_water: 'deep_water',
  shallow_lava: 'shallow_lava',
  deep_lava: 'deep_lava',
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

/**
 * Get terrain by its numeric index (Zangband feature ID).
 * Falls back to open_floor if index not found.
 */
export function getTerrainByIndex(index: number): TerrainDef {
  const terrain = TERRAIN_BY_INDEX.get(index);
  if (!terrain) {
    // Fall back to grass-like terrain for unknown wilderness features
    return TERRAIN_BY_INDEX.get(89) ?? resolveTerrain('open_floor');
  }
  return terrain;
}

/** Remembered monster appearance for detection spells */
export interface RememberedMonster {
  symbol: string;
  color: string;
  defIndex?: number;
}

export class Tile {
  private _terrain: TerrainDef;
  private _occupant: Actor | null = null;
  private _items: Item[] = [];
  private _explored: boolean = false;
  private _rememberedMonster: RememberedMonster | null = null;

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

  /** Get remembered monster (from detection spell) */
  get rememberedMonster(): RememberedMonster | null {
    return this._rememberedMonster;
  }

  /** Set remembered monster appearance (from detection spell) */
  rememberMonster(symbol: string, color: string, defIndex?: number): void {
    this._rememberedMonster = defIndex !== undefined
      ? { symbol, color, defIndex }
      : { symbol, color };
  }

  /** Clear remembered monster (when tile becomes visible again) */
  clearRememberedMonster(): void {
    this._rememberedMonster = null;
  }
}
