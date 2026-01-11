/**
 * WildernessLevel - A Level implementation for wilderness/overworld
 *
 * Unlike dungeon levels which have fixed dimensions, wilderness levels
 * dynamically load 16x16 tile blocks as the player moves. The visible
 * area is WILD_VIEW x WILD_VIEW blocks (144x144 tiles).
 *
 * The player has wilderness coordinates (wildX, wildY) which are their
 * actual position in the full wilderness. The level maintains a viewport
 * that follows the player.
 */

import { RNG } from 'rot-js';
import type { Position } from '../types';
import { Tile, getTerrain, getTerrainByIndex } from './Tile';
import type { Actor } from '../entities/Actor';
import { Monster } from '../entities/Monster';
import type { Item } from '../entities/Item';
import type { Trap } from '../entities/Trap';
import type { ILevel } from './Level';
import type {
  GPActiveEffect,
  GPActiveEffectContext,
  GPActiveEffectTickResult,
  GameEvent,
  GPActiveEffectTriggerResult,
} from '../systems/activeEffects';
import {
  WILD_BLOCK_SIZE,
  WILD_VIEW,
  WILD_INFO_ROAD,
  WILD_INFO_TRACK,
  type WildBlock,
  type WildGenData,
  type WildPlace,
} from '../data/WildernessTypes';
import type { WildernessMap } from '../systems/wilderness/WildernessGenerator';
import {
  WildBlockGenerator,
  ROAD_LEVEL,
  TRACK_LEVEL,
  GROUND_LEVEL,
  type NeighborRoadInfo,
} from '../systems/wilderness/BlockGenerator';
import { ZangbandTownGenerator, type GeneratedTownData } from '../systems/wilderness/TownGen';
import type { MonsterDataManager } from '../data/MonsterDataManager';

/**
 * Type guard to check if a level is a WildernessLevel.
 */
export function isWildernessLevel(level: ILevel): level is WildernessLevel {
  return level.levelType === 'wilderness';
}

export class WildernessLevel implements ILevel {
  readonly levelType = 'wilderness' as const;

  /** Visible width in tiles (WILD_VIEW * WILD_BLOCK_SIZE = 144) */
  readonly width = WILD_VIEW * WILD_BLOCK_SIZE;

  /** Visible height in tiles */
  readonly height = WILD_VIEW * WILD_BLOCK_SIZE;

  /** Wilderness is always depth 0 */
  readonly depth = 0;

  /** Block generator for creating terrain */
  private blockGenerator: WildBlockGenerator;

  /** Town generator for town blocks */
  private townGenerator: ZangbandTownGenerator;

  /** Cache of generated towns: key = place.key */
  private townCache: Map<string, GeneratedTownData> = new Map();

  /** Wilderness map data (blocks, places, etc.) */
  private wildernessMap: WildernessMap;

  /** Cache of loaded blocks: key = "blockX,blockY" */
  private blockCache: Map<string, Tile[][]> = new Map();

  /** Current viewport origin in block coordinates */
  private viewBlockX = 0;
  private viewBlockY = 0;

  /** Player's position in wilderness tile coordinates */
  private _wildernessX = 0;
  private _wildernessY = 0;

  /** Entity tracking */
  private actors: Actor[] = [];
  private _player: Actor | null = null;
  private items: Item[] = [];
  private traps: Trap[] = [];
  private activeEffects: GPActiveEffect[] = [];

  /** Monster data manager for spawning */
  private monsterDataManager: MonsterDataManager | null = null;

  /** RNG for monster spawning */
  private rng: typeof RNG;

  /** Counter for monster IDs */
  private monsterIdCounter = 0;

  constructor(
    wildernessMap: WildernessMap,
    genData: WildGenData[],
    rng: typeof RNG,
    monsterDataManager?: MonsterDataManager
  ) {
    this.wildernessMap = wildernessMap;
    this.blockGenerator = new WildBlockGenerator(rng, genData);
    this.townGenerator = new ZangbandTownGenerator(rng);
    this.rng = rng;
    this.monsterDataManager = monsterDataManager ?? null;
  }

  /** Get wilderness X coordinate (tile position in full wilderness) */
  get wildernessX(): number {
    return this._wildernessX;
  }

  /** Get wilderness Y coordinate (tile position in full wilderness) */
  get wildernessY(): number {
    return this._wildernessY;
  }

  /** Set player and manage actors list */
  set player(p: Actor | null) {
    if (this._player) {
      const index = this.actors.indexOf(this._player);
      if (index !== -1) {
        this.actors.splice(index, 1);
      }
    }
    this._player = p;
    if (p) {
      this.actors.push(p);
    }
  }

  get player(): Actor | null {
    return this._player;
  }

  /**
   * Initialize the wilderness at a specific position.
   * This sets up the viewport and loads initial blocks.
   * Player.position is set to world coordinates.
   */
  initializeAt(wildX: number, wildY: number): void {
    this._wildernessX = wildX;
    this._wildernessY = wildY;

    // Set player position to world coordinates
    if (this._player) {
      this._player.position = { x: wildX, y: wildY };
    }

    // Center viewport on player's block
    const playerBlockX = Math.floor(wildX / WILD_BLOCK_SIZE);
    const playerBlockY = Math.floor(wildY / WILD_BLOCK_SIZE);

    this.viewBlockX = playerBlockX - Math.floor(WILD_VIEW / 2);
    this.viewBlockY = playerBlockY - Math.floor(WILD_VIEW / 2);

    // Clamp to wilderness bounds
    const maxBlock = this.wildernessMap.size - 1;
    this.viewBlockX = Math.max(0, Math.min(this.viewBlockX, maxBlock - WILD_VIEW + 1));
    this.viewBlockY = Math.max(0, Math.min(this.viewBlockY, maxBlock - WILD_VIEW + 1));

    // Load all visible blocks
    this.loadVisibleBlocks();
  }

  /**
   * Convert wilderness tile coordinates to screen coordinates.
   * Returns null if the position is outside the current viewport.
   */
  wildernessToScreen(wildX: number, wildY: number): Position | null {
    const screenX = wildX - this.viewBlockX * WILD_BLOCK_SIZE;
    const screenY = wildY - this.viewBlockY * WILD_BLOCK_SIZE;

    if (screenX < 0 || screenX >= this.width || screenY < 0 || screenY >= this.height) {
      return null;
    }

    return { x: screenX, y: screenY };
  }

  /**
   * Convert screen coordinates to wilderness tile coordinates.
   */
  screenToWilderness(screenX: number, screenY: number): Position {
    return {
      x: this.viewBlockX * WILD_BLOCK_SIZE + screenX,
      y: this.viewBlockY * WILD_BLOCK_SIZE + screenY,
    };
  }

  /**
   * Get the player's position in screen coordinates.
   * Converts from world coordinates (player.position) to screen coordinates.
   */
  getPlayerScreenPosition(): Position | null {
    if (!this._player) {
      return this.wildernessToScreen(this._wildernessX, this._wildernessY);
    }
    return this.wildernessToScreen(this._player.position.x, this._player.position.y);
  }

  /**
   * Update the player's wilderness position.
   * This should be called after player movement.
   * Returns true if the viewport shifted (requiring redraw).
   */
  setPlayerWildernessPosition(wildX: number, wildY: number): boolean {
    this._wildernessX = wildX;
    this._wildernessY = wildY;

    // Check if we need to shift the viewport
    const playerBlockX = Math.floor(wildX / WILD_BLOCK_SIZE);
    const playerBlockY = Math.floor(wildY / WILD_BLOCK_SIZE);

    // Keep player at least 2 blocks from viewport edge
    const margin = 2;
    let shifted = false;

    if (playerBlockX < this.viewBlockX + margin) {
      this.viewBlockX = Math.max(0, playerBlockX - margin);
      shifted = true;
    } else if (playerBlockX >= this.viewBlockX + WILD_VIEW - margin) {
      this.viewBlockX = Math.min(
        this.wildernessMap.size - WILD_VIEW,
        playerBlockX - WILD_VIEW + margin + 1
      );
      shifted = true;
    }

    if (playerBlockY < this.viewBlockY + margin) {
      this.viewBlockY = Math.max(0, playerBlockY - margin);
      shifted = true;
    } else if (playerBlockY >= this.viewBlockY + WILD_VIEW - margin) {
      this.viewBlockY = Math.min(
        this.wildernessMap.size - WILD_VIEW,
        playerBlockY - WILD_VIEW + margin + 1
      );
      shifted = true;
    }

    if (shifted) {
      this.loadVisibleBlocks();
    }

    return shifted;
  }

  /**
   * Move the player to a new world position.
   * Updates player.position and handles viewport shifting.
   * Returns true if the viewport shifted.
   */
  movePlayer(worldX: number, worldY: number): boolean {
    if (this._player) {
      this._player.position = { x: worldX, y: worldY };
    }
    return this.setPlayerWildernessPosition(worldX, worldY);
  }

  // =========================================================================
  // World coordinate methods
  // These operate on world (wilderness) coordinates, not screen coordinates.
  // =========================================================================

  /**
   * Check if a world position is within wilderness bounds.
   */
  isInBoundsWorld(pos: Position): boolean {
    const maxTile = this.wildernessMap.size * WILD_BLOCK_SIZE;
    return pos.x >= 0 && pos.x < maxTile && pos.y >= 0 && pos.y < maxTile;
  }

  /**
   * Get tile at a world position.
   * Ensures the block is loaded if in viewport range.
   */
  getTileWorld(pos: Position): Tile | undefined {
    if (!this.isInBoundsWorld(pos)) {
      return undefined;
    }

    const blockX = Math.floor(pos.x / WILD_BLOCK_SIZE);
    const blockY = Math.floor(pos.y / WILD_BLOCK_SIZE);
    const offsetX = pos.x % WILD_BLOCK_SIZE;
    const offsetY = pos.y % WILD_BLOCK_SIZE;

    // Ensure block is loaded
    this.ensureBlockLoaded(blockX, blockY);

    const key = `${blockX},${blockY}`;
    const block = this.blockCache.get(key);
    if (!block) {
      return undefined;
    }

    return block[offsetY]?.[offsetX];
  }

  /**
   * Check if a world position is walkable.
   */
  isWalkableWorld(pos: Position): boolean {
    const tile = this.getTileWorld(pos);
    return tile?.isPassable ?? false;
  }

  /**
   * Check if a world position is transparent (for FOV).
   */
  isTransparentWorld(pos: Position): boolean {
    const tile = this.getTileWorld(pos);
    return tile?.isTransparent ?? false;
  }

  /**
   * Check if a world position is occupied by a monster.
   */
  isOccupiedWorld(pos: Position): boolean {
    return this.getMonsterAtWorld(pos) !== undefined;
  }

  /**
   * Get monster at a world position.
   */
  getMonsterAtWorld(pos: Position): Monster | undefined {
    const actor = this.actors.find(
      (a) => a !== this._player && !a.isDead && a.position.x === pos.x && a.position.y === pos.y
    );
    return actor as Monster | undefined;
  }

  /**
   * Load all blocks currently in the viewport.
   */
  private loadVisibleBlocks(): void {
    for (let by = 0; by < WILD_VIEW; by++) {
      for (let bx = 0; bx < WILD_VIEW; bx++) {
        const blockX = this.viewBlockX + bx;
        const blockY = this.viewBlockY + by;
        this.ensureBlockLoaded(blockX, blockY);
      }
    }

    // Optionally: prune blocks that are far from viewport
    this.pruneDistantBlocks();
  }

  /**
   * Check if a block is within any town's bounds.
   * Towns can span multiple blocks (xsize x ysize).
   */
  private getTownAtBlock(blockX: number, blockY: number): WildPlace | undefined {
    for (const place of this.wildernessMap.places) {
      if (place.type !== 'town') continue;
      // Check if blockX, blockY is within place bounds
      if (
        blockX >= place.x &&
        blockX < place.x + place.xsize &&
        blockY >= place.y &&
        blockY < place.y + place.ysize
      ) {
        return place;
      }
    }
    return undefined;
  }


  /**
   * Ensure a specific block is loaded.
   *
   * Per Zangband reference (gen_block in wild3.c):
   * 1. ALWAYS generate wilderness terrain first
   * 2. Overlay town if present (only solid tiles)
   * 3. Add dungeon entrances
   */
  private ensureBlockLoaded(blockX: number, blockY: number): void {
    const key = `${blockX},${blockY}`;
    if (this.blockCache.has(key)) {
      return;
    }
    // Get wilderness block data
    const block = this.wildernessMap.getBlock(blockX, blockY);
    if (!block) {
      return; // Out of bounds
    }

    // 1. ALWAYS generate wilderness terrain first
    const tiles = this.generateWildernessTiles(block, blockX, blockY);

    // 2. Overlay town if present (not replace)
    const townPlace = this.getTownAtBlock(blockX, blockY);
    if (townPlace) {
      this.overlayTownTiles(tiles, townPlace, blockX, blockY);
    }

    // 3. Place dungeon entrances at dungeon locations
    if (block.place > 0) {
      const place = this.wildernessMap.places.find(
        (p) => p.x === blockX && p.y === blockY && p.type === 'dungeon'
      );
      if (place) {
        const centerX = Math.floor(WILD_BLOCK_SIZE / 2);
        const centerY = Math.floor(WILD_BLOCK_SIZE / 2);
        tiles[centerY][centerX] = new Tile('down_staircase');
      }
    }

    this.blockCache.set(key, tiles);

    // 4. Spawn monsters (including towns - WILD_TOWN monsters spawn there)
    if (this.monsterDataManager) {
      this.spawnBlockMonsters(block, blockX, blockY, tiles, !!townPlace);
    }
  }

  /**
   * Generate wilderness terrain tiles for a block.
   */
  private generateWildernessTiles(block: { wild: number }, blockX: number, blockY: number): Tile[][] {
    const genData = this.blockGenerator.getGenData(block.wild);

    // Compute neighbor road info for proper road rendering
    const neighborRoads = this.computeNeighborRoadInfo(blockX, blockY);

    // Generate tiles for this block
    const generatedTiles = genData
      ? this.blockGenerator.generateBlock(
          block as any,
          blockX,
          blockY,
          this.wildernessMap.seed,
          neighborRoads
        )
      : null;

    // Convert to Tile objects
    const tiles: Tile[][] = [];
    for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
      tiles[y] = [];
      for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
        if (generatedTiles) {
          const feat = generatedTiles[y][x].feat;
          const terrain = getTerrainByIndex(feat);
          tiles[y][x] = new Tile(terrain.key);
        } else {
          // Fallback to grass
          tiles[y][x] = new Tile('grass');
        }
      }
    }
    return tiles;
  }

  /**
   * Compute road info for current block and its neighbors.
   *
   * Port of wild3.c:make_wild_road() neighbor checking.
   * Returns road levels for each of the 8 directions plus center (5).
   * Also returns whether the current block has a road/track flag.
   */
  private computeNeighborRoadInfo(blockX: number, blockY: number): NeighborRoadInfo {
    const thisBlock = this.wildernessMap.getBlock(blockX, blockY);
    const hasRoadFlag = !!(thisBlock && (thisBlock.info & (WILD_INFO_ROAD | WILD_INFO_TRACK)));

    // Direction offsets (keypad style):
    // 7=NW, 8=N, 9=NE
    // 4=W,  5=C, 6=E
    // 1=SW, 2=S, 3=SE
    const ddx = [0, -1, 0, 1, -1, 0, 1, -1, 0, 1];
    const ddy = [0, 1, 1, 1, 0, 0, 0, -1, -1, -1];

    const levels: number[] = [0]; // Index 0 unused

    for (let dir = 1; dir <= 9; dir++) {
      const nx = blockX + ddx[dir];
      const ny = blockY + ddy[dir];

      const block = this.wildernessMap.getBlock(nx, ny);
      if (!block) {
        levels[dir] = GROUND_LEVEL;
        continue;
      }

      // Check block's road/track flags
      if (block.info & WILD_INFO_ROAD) {
        levels[dir] = ROAD_LEVEL;
      } else if (block.info & WILD_INFO_TRACK) {
        levels[dir] = TRACK_LEVEL;
      } else {
        levels[dir] = GROUND_LEVEL;
      }
    }

    return { levels, hasRoadFlag };
  }

  /**
   * Overlay town tiles onto wilderness tiles.
   * Per Zangband wild3.c:107: Only overlays tiles where feat != FEAT_NONE (0).
   * FEAT_NONE = 0 = transparent, wilderness shows through.
   */
  private overlayTownTiles(
    tiles: Tile[][],
    place: WildPlace,
    blockX: number,
    blockY: number
  ): void {
    // Generate or get cached town data
    let townData = this.townCache.get(place.key);
    if (!townData) {
      townData = this.townGenerator.generate(place);
      this.townCache.set(place.key, townData);
    }

    // Calculate offset within town
    const offsetX = (blockX - place.x) * WILD_BLOCK_SIZE;
    const offsetY = (blockY - place.y) * WILD_BLOCK_SIZE;

    // FEAT_NONE (0) = transparent, per Zangband defines.h:1131
    const FEAT_NONE = 0;

    // Overlay non-transparent tiles
    for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
      for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
        const townTile = townData.tiles[offsetY + y]?.[offsetX + x];
        if (townTile) {
          const feat = townTile.feat;
          // Only overlay if feat != FEAT_NONE (per wild3.c overlay_place)
          if (feat !== FEAT_NONE) {
            const terrain = getTerrainByIndex(feat);
            tiles[y][x] = new Tile(terrain.key);
          }
        }
      }
    }
  }

  /**
   * Spawn monsters in a wilderness block.
   *
   * Per Zangband wild3.c add_monsters_block():
   * - prob = daytime ? 32786 : 20000 (we stub to always daytime)
   * - prob /= (monProb + 1)
   * - For each walkable tile: if random(0, prob) == 0, spawn monster
   * - Use monGen as monster level for selection
   * - In towns, only WILD_TOWN monsters spawn (per test_monster_wild)
   */
  private spawnBlockMonsters(
    block: WildBlock,
    blockX: number,
    blockY: number,
    tiles: Tile[][],
    isTown: boolean
  ): void {
    if (!this.monsterDataManager) return;

    // Daytime probability (stub: always daytime)
    const DAYTIME_PROB = 32786;

    // Calculate spawn probability threshold
    const monProb = block.monProb ?? 0;
    const prob = Math.floor(DAYTIME_PROB / (monProb + 1));

    // Monster difficulty level from block data
    const monGen = block.monGen ?? 0;

    // Iterate through all tiles in the block
    for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
      for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
        const tile = tiles[y]?.[x];
        if (!tile || !tile.isPassable) continue;

        // Roll for spawn
        if (this.rng.getUniformInt(0, prob - 1) !== 0) continue;

        // Select a monster appropriate for this location
        // In towns, only WILD_TOWN monsters; in wilderness, normal selection
        const monsterDef = this.monsterDataManager.selectMonster(monGen, { isTown });
        if (!monsterDef) continue;

        // Calculate world position
        const worldX = blockX * WILD_BLOCK_SIZE + x;
        const worldY = blockY * WILD_BLOCK_SIZE + y;

        // Don't spawn on player position
        if (
          this._player &&
          this._player.position.x === worldX &&
          this._player.position.y === worldY
        ) {
          continue;
        }

        // Check if position is already occupied
        if (this.getMonsterAtWorld({ x: worldX, y: worldY })) continue;

        // Roll HP
        const hpMatch = monsterDef.hp.match(/^(\d+)d(\d+)$/);
        let hp = 1;
        if (hpMatch) {
          const count = parseInt(hpMatch[1], 10);
          const sides = parseInt(hpMatch[2], 10);
          hp = 0;
          for (let i = 0; i < count; i++) {
            hp += this.rng.getUniformInt(1, sides);
          }
        }

        // Create the monster
        const monster = new Monster({
          id: `wild_monster_${blockX}_${blockY}_${++this.monsterIdCounter}`,
          position: { x: worldX, y: worldY },
          symbol: monsterDef.symbol,
          color: monsterDef.color,
          def: monsterDef,
          speed: monsterDef.speed,
          maxHp: hp,
        });

        this.addMonster(monster);
      }
    }
  }

  /**
   * Remove blocks that are far from the current viewport.
   */
  private pruneDistantBlocks(): void {
    const margin = 2; // Keep blocks within 2 blocks of viewport
    const keysToRemove: string[] = [];

    for (const key of this.blockCache.keys()) {
      const [bx, by] = key.split(',').map(Number);
      if (
        bx < this.viewBlockX - margin ||
        bx >= this.viewBlockX + WILD_VIEW + margin ||
        by < this.viewBlockY - margin ||
        by >= this.viewBlockY + WILD_VIEW + margin
      ) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.blockCache.delete(key);
    }
  }

  // =========================================================================
  // ILevel implementation
  // In WildernessLevel, all positions are WORLD coordinates (not screen).
  // The player.position uses world coords, so level methods should too.
  // =========================================================================

  isInBounds(pos: Position): boolean {
    // Check world bounds, not viewport bounds
    return this.isInBoundsWorld(pos);
  }

  getTile(pos: Position): Tile | undefined {
    // Get tile at world position
    return this.getTileWorld(pos);
  }

  isWalkable(pos: Position): boolean {
    return this.isWalkableWorld(pos);
  }

  isTransparent(pos: Position): boolean {
    return this.isTransparentWorld(pos);
  }

  isOccupied(pos: Position): boolean {
    return this.isOccupiedWorld(pos);
  }

  // Actor methods - all use world coordinates
  getActorAt(pos: Position): Actor | undefined {
    return this.actors.find(
      (a) => !a.isDead && a.position.x === pos.x && a.position.y === pos.y
    );
  }

  addMonster(monster: Monster): void {
    this.actors.push(monster);
  }

  removeMonster(monster: Monster): void {
    const index = this.actors.indexOf(monster);
    if (index !== -1) {
      this.actors.splice(index, 1);
    }
  }

  getMonsters(): Monster[] {
    return this.actors.filter((a): a is Monster => a !== this._player) as Monster[];
  }

  getMonsterAt(pos: Position): Monster | undefined {
    // Use world coordinates (same as getMonsterAtWorld)
    return this.getMonsterAtWorld(pos);
  }

  getMonsterById(id: string): Monster | undefined {
    return this.actors.find((a) => a !== this._player && a.id === id) as Monster | undefined;
  }

  getMonstersInRadius(center: Position, radius: number): Monster[] {
    return this.getMonsters().filter((m) => {
      if (m.isDead) return false;
      const dx = m.position.x - center.x;
      const dy = m.position.y - center.y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
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

  // Active effect methods
  addActiveEffect(effect: GPActiveEffect): void {
    this.activeEffects.push(effect);
  }

  removeActiveEffect(effect: GPActiveEffect): void {
    const index = this.activeEffects.indexOf(effect);
    if (index !== -1) {
      this.activeEffects.splice(index, 1);
    }
  }

  getActiveEffects(): GPActiveEffect[] {
    return [...this.activeEffects];
  }

  getActiveEffectsAt(pos: Position): GPActiveEffect[] {
    return this.activeEffects.filter(
      (e) => e.position && e.position.x === pos.x && e.position.y === pos.y
    );
  }

  tickActiveEffects(rng: typeof RNG): GPActiveEffectTickResult[] {
    const context: GPActiveEffectContext = { level: this, rng };
    const results: GPActiveEffectTickResult[] = [];

    for (const effect of this.activeEffects) {
      results.push(effect.tick(context));
    }

    this.activeEffects = this.activeEffects.filter((e) => !e.isExpired());

    return results;
  }

  fireEvent(event: GameEvent, rng: typeof RNG): GPActiveEffectTriggerResult[] {
    const context: GPActiveEffectContext = { level: this, rng };
    const results: GPActiveEffectTriggerResult[] = [];

    for (const effect of this.activeEffects) {
      if (effect.shouldTrigger?.(event)) {
        const result = effect.onTrigger?.(event, context);
        if (result) {
          results.push(result);
        }
      }
    }

    return results;
  }

  // Terrain modification (needed for Level compatibility but limited in wilderness)
  setTerrain(pos: Position, terrain: string): void {
    const tile = this.getTile(pos);
    if (tile) {
      tile.terrain = getTerrain(terrain);
    }
  }
}
