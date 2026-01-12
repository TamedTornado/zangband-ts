/**
 * TileManager - Handles tile coordinate lookups for graphical tile rendering
 *
 * Maps entity indices to tile coordinates in the tileset image.
 * Works with rot.js tile mode by building a tileMap object.
 */

export interface TileCoord {
  col: number;
  row: number;
}

export interface TileMappings {
  features: Record<string, TileCoord>;
  monsters: Record<string, TileCoord>;
  items: Record<string, TileCoord>;
  spells: Record<string, TileCoord>;
  player: TileCoord;
}

export interface TilesetConfig {
  name: string;
  file: string;
  tileWidth: number;
  tileHeight: number;
  mappings: string;
}

export type EntityType = 'feature' | 'monster' | 'item' | 'spell';

/**
 * rot.js tileMap format: maps string keys to [x, y] pixel coordinates
 */
export type RotTileMap = Record<string, [number, number]>;

export class TileManager {
  public readonly config: TilesetConfig;
  public readonly mappings: TileMappings;

  constructor(config: TilesetConfig, mappings: TileMappings) {
    this.config = config;
    this.mappings = mappings;
  }

  /**
   * Get tile coordinates for an entity by type and index
   */
  getTileCoords(type: EntityType, index: number): TileCoord | null {
    const indexStr = index.toString();

    switch (type) {
      case 'feature':
        return this.mappings.features[indexStr] ?? null;
      case 'monster':
        return this.mappings.monsters[indexStr] ?? null;
      case 'item':
        return this.mappings.items[indexStr] ?? null;
      case 'spell':
        return this.mappings.spells[indexStr] ?? null;
      default:
        return null;
    }
  }

  /**
   * Check if a tile mapping exists for an entity
   */
  hasTileMapping(type: EntityType, index: number): boolean {
    return this.getTileCoords(type, index) !== null;
  }

  /**
   * Get a tile key for rot.js, with fallback to a default tile if unmapped
   */
  getTileKey(type: EntityType, index: number): string {
    const prefix = type === 'feature' ? 'f' : type === 'monster' ? 'm' : type === 'item' ? 'i' : 's';
    if (this.hasTileMapping(type, index)) {
      return `${prefix}:${index}`;
    }
    // Fall back to visible default tiles
    // Note: f:0 is "nothing" (black), so use f:1 (floor) for unmapped features
    switch (type) {
      case 'feature':
        return 'f:1'; // Floor tile - visible fallback for unmapped terrain
      case 'monster':
        return 'm:1'; // First monster
      case 'item':
        return 'i:1'; // First item
      default:
        return 'f:1';
    }
  }

  /**
   * Get tile coordinates for the player
   */
  getPlayerTileCoords(): TileCoord {
    return this.mappings.player;
  }

  /**
   * Convert tile coordinates to pixel coordinates in the tileset image
   */
  getPixelCoords(tileCoord: TileCoord): { x: number; y: number } {
    return {
      x: tileCoord.col * this.config.tileWidth,
      y: tileCoord.row * this.config.tileHeight,
    };
  }

  /**
   * Get the tile dimensions
   */
  getTileSize(): { width: number; height: number } {
    return {
      width: this.config.tileWidth,
      height: this.config.tileHeight,
    };
  }

  /**
   * Build a rot.js compatible tileMap
   *
   * Keys use the format:
   * - "f:INDEX" for features
   * - "m:INDEX" for monsters
   * - "i:INDEX" for items
   * - "s:INDEX" for spells
   * - "@" for player
   * - " " for empty/blank space
   *
   * Values are [x, y] pixel coordinates in the tileset
   */
  buildRotTileMap(): RotTileMap {
    const tileMap: RotTileMap = {};

    // Add features
    for (const [index, coord] of Object.entries(this.mappings.features)) {
      const pixel = this.getPixelCoords(coord);
      tileMap[`f:${index}`] = [pixel.x, pixel.y];
    }

    // Add monsters
    for (const [index, coord] of Object.entries(this.mappings.monsters)) {
      const pixel = this.getPixelCoords(coord);
      tileMap[`m:${index}`] = [pixel.x, pixel.y];
    }

    // Add items
    for (const [index, coord] of Object.entries(this.mappings.items)) {
      const pixel = this.getPixelCoords(coord);
      tileMap[`i:${index}`] = [pixel.x, pixel.y];
    }

    // Add spells
    for (const [index, coord] of Object.entries(this.mappings.spells)) {
      const pixel = this.getPixelCoords(coord);
      tileMap[`s:${index}`] = [pixel.x, pixel.y];
    }

    // Add player
    const playerPixel = this.getPixelCoords(this.mappings.player);
    tileMap['@'] = [playerPixel.x, playerPixel.y];

    // Add empty/blank space (use feature 0 "nothing" tile)
    const nothingCoord = this.mappings.features['0'];
    if (nothingCoord) {
      const nothingPixel = this.getPixelCoords(nothingCoord);
      tileMap[' '] = [nothingPixel.x, nothingPixel.y];
    }

    // Add ASCII fallbacks for any characters that might be drawn directly
    // Map common ASCII symbols to appropriate tiles
    const toCoord = (coord: TileCoord | undefined): [number, number] => {
      const pixel = this.getPixelCoords(coord ?? { col: 0, row: 0 });
      return [pixel.x, pixel.y];
    };

    tileMap['.'] = toCoord(this.mappings.features['1']); // floor
    tileMap['#'] = toCoord(this.mappings.features['56'] ?? this.mappings.features['1']); // granite wall
    tileMap['+'] = toCoord(this.mappings.features['32']); // closed door
    tileMap["'"] = toCoord(this.mappings.features['4']); // open door
    tileMap['<'] = toCoord(this.mappings.features['6']); // up stairs
    tileMap['>'] = toCoord(this.mappings.features['7']); // down stairs

    return tileMap;
  }
}
