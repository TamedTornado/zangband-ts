import type { Actor } from '../entities/Actor';
import type { Item } from '../entities/Item';

// Terrain definitions - simplified for now
// Later these will come from terrain.json
const TERRAIN_DATA: Record<string, { walkable: boolean; transparent: boolean }> = {
  floor: { walkable: true, transparent: true },
  granite_wall: { walkable: false, transparent: false },
  permanent_wall: { walkable: false, transparent: false },
  open_door: { walkable: true, transparent: true },
  closed_door: { walkable: false, transparent: false },
  up_stairs: { walkable: true, transparent: true },
  down_stairs: { walkable: true, transparent: true },
  // Default for unknown terrain
  unknown: { walkable: false, transparent: false },
};

export class Tile {
  private _terrainKey: string;
  private _occupant: Actor | null = null;
  private _items: Item[] = [];
  private _explored: boolean = false;

  constructor(terrainKey: string = 'floor') {
    this._terrainKey = terrainKey;
  }

  get terrainKey(): string {
    return this._terrainKey;
  }

  set terrainKey(key: string) {
    this._terrainKey = key;
  }

  private get terrainData(): { walkable: boolean; transparent: boolean } {
    return TERRAIN_DATA[this._terrainKey] ?? TERRAIN_DATA['unknown'];
  }

  get isWalkable(): boolean {
    // Tile is walkable if terrain is walkable AND no blocking occupant
    return this.terrainData.walkable && this._occupant === null;
  }

  get isPassable(): boolean {
    // Terrain is passable (ignoring occupants)
    return this.terrainData.walkable;
  }

  get isTransparent(): boolean {
    return this.terrainData.transparent;
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
