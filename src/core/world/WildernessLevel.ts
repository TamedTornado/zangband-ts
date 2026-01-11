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
import type { Monster } from '../entities/Monster';
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
import { WILD_BLOCK_SIZE, WILD_VIEW } from '../data/WildernessTypes';
import type { WildernessMap } from '../systems/wilderness/WildernessGenerator';
import { WildBlockGenerator } from '../systems/wilderness/BlockGenerator';
import type { WildGenData } from '../data/WildernessTypes';

/**
 * Type guard to check if a level is a WildernessLevel.
 */
export function isWildernessLevel(level: ILevel): level is WildernessLevel {
  return level instanceof WildernessLevel;
}

export class WildernessLevel implements ILevel {
  /** Visible width in tiles (WILD_VIEW * WILD_BLOCK_SIZE = 144) */
  readonly width = WILD_VIEW * WILD_BLOCK_SIZE;

  /** Visible height in tiles */
  readonly height = WILD_VIEW * WILD_BLOCK_SIZE;

  /** Wilderness is always depth 0 */
  readonly depth = 0;

  /** Block generator for creating terrain */
  private blockGenerator: WildBlockGenerator;

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

  constructor(
    wildernessMap: WildernessMap,
    genData: WildGenData[],
    rng: typeof RNG
  ) {
    this.wildernessMap = wildernessMap;
    this.blockGenerator = new WildBlockGenerator(rng, genData);
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
   */
  initializeAt(wildX: number, wildY: number): void {
    this._wildernessX = wildX;
    this._wildernessY = wildY;

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
   */
  getPlayerScreenPosition(): Position | null {
    return this.wildernessToScreen(this._wildernessX, this._wildernessY);
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
   * Ensure a specific block is loaded.
   */
  private ensureBlockLoaded(blockX: number, blockY: number): void {
    const key = `${blockX},${blockY}`;
    if (this.blockCache.has(key)) {
      return;
    }

    // Generate the block
    const block = this.wildernessMap.getBlock(blockX, blockY);
    if (!block) {
      return; // Out of bounds
    }

    const genData = this.blockGenerator.getGenData(block.wild);
    if (!genData) {
      return;
    }

    // Generate tiles for this block
    const generatedTiles = this.blockGenerator.generateBlock(
      block,
      blockX,
      blockY,
      this.wildernessMap.seed
    );

    // Convert to Tile objects using terrain index lookup
    const tiles: Tile[][] = [];
    for (let y = 0; y < WILD_BLOCK_SIZE; y++) {
      tiles[y] = [];
      for (let x = 0; x < WILD_BLOCK_SIZE; x++) {
        const feat = generatedTiles[y][x].feat;
        const terrain = getTerrainByIndex(feat);
        tiles[y][x] = new Tile(terrain.key);
      }
    }

    // Place dungeon entrances (FEAT_MORE / down_staircase) at dungeon locations
    if (block.place > 0) {
      const place = this.wildernessMap.places.find(
        (p) => p.x === blockX && p.y === blockY && p.type === 'dungeon'
      );
      if (place) {
        // Place down stairs at center of block
        const centerX = Math.floor(WILD_BLOCK_SIZE / 2);
        const centerY = Math.floor(WILD_BLOCK_SIZE / 2);
        tiles[centerY][centerX] = new Tile('down_staircase');
      }
    }

    this.blockCache.set(key, tiles);
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
  // =========================================================================

  isInBounds(pos: Position): boolean {
    return pos.x >= 0 && pos.x < this.width && pos.y >= 0 && pos.y < this.height;
  }

  getTile(pos: Position): Tile | undefined {
    if (!this.isInBounds(pos)) {
      return undefined;
    }

    // Convert screen position to block + offset
    const blockX = this.viewBlockX + Math.floor(pos.x / WILD_BLOCK_SIZE);
    const blockY = this.viewBlockY + Math.floor(pos.y / WILD_BLOCK_SIZE);
    const offsetX = pos.x % WILD_BLOCK_SIZE;
    const offsetY = pos.y % WILD_BLOCK_SIZE;

    const key = `${blockX},${blockY}`;
    const block = this.blockCache.get(key);
    if (!block) {
      return undefined;
    }

    return block[offsetY]?.[offsetX];
  }

  isWalkable(pos: Position): boolean {
    const tile = this.getTile(pos);
    return tile?.isPassable ?? false;
  }

  isTransparent(pos: Position): boolean {
    const tile = this.getTile(pos);
    return tile?.isTransparent ?? false;
  }

  isOccupied(pos: Position): boolean {
    return this.getMonsterAt(pos) !== undefined;
  }

  // Actor methods
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
    const actor = this.actors.find(
      (a) => a !== this._player && !a.isDead && a.position.x === pos.x && a.position.y === pos.y
    );
    return actor as Monster | undefined;
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
