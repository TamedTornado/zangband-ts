import { RNG } from 'rot-js';
import type { Position } from '../types';
import type { TerrainDef } from '../data/terrain';
import { Tile, getTerrain } from './Tile';
import type { Actor } from '../entities/Actor';
import type { Monster } from '../entities/Monster';
import type { Item } from '../entities/Item';
import type { Trap } from '../entities/Trap';
import type {
  GPActiveEffect,
  GPActiveEffectContext,
  GPActiveEffectTickResult,
  GameEvent,
  GPActiveEffectTriggerResult,
} from '../systems/activeEffects';
import type { Player } from '../entities/Player';
import { Scheduler } from '../systems/Scheduler';
import { DungeonGenerator } from '../systems/dungeon/DungeonGenerator';
import { MonsterSpawner } from '../systems/MonsterSpawner';
import { ItemSpawner } from '../systems/ItemSpawner';
import { TownGenerator, type TownLayout, type StoreEntrance } from '../systems/town/TownGenerator';
import { DUNGEON_WIDTH, DUNGEON_HEIGHT, BASE_MONSTER_COUNT } from '../constants';
import townData from '@/data/towns/town.json';

export interface LevelConfig {
  depth?: number;
}

/**
 * Interface for Level - used by effects and for test mocks
 */
export interface ILevel {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  player: Actor | null;

  // Bounds checking
  isInBounds(pos: Position): boolean;

  // Actor queries
  getActorAt(pos: Position): Actor | undefined;
  getMonsterAt(pos: Position): Monster | undefined;
  getMonsterById(id: string): Monster | undefined;
  getMonsters(): Monster[];
  getMonstersInRadius(center: Position, radius: number): Monster[];

  // Tile queries
  getTile(pos: Position): Tile | undefined;
  isWalkable(pos: Position): boolean;
  isTransparent(pos: Position): boolean;
  isOccupied(pos: Position): boolean;

  // Terrain modification
  setTerrain(pos: Position, terrain: string): void;

  // Monster management
  addMonster(monster: Monster): void;
  removeMonster(monster: Monster): void;

  // Item management
  addItem(item: Item): void;
  removeItem(item: Item): void;
  getItemsAt(pos: Position): Item[];
  getAllItems(): Item[];

  // Trap management
  getTrapAt(pos: Position): Trap | undefined;
  getTraps(): Trap[];
  addTrap(trap: Trap): void;
  removeTrap(trap: Trap): void;
}

export class Level implements ILevel {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  private tiles: Tile[][];

  // Entity tracking - unified actors list plus player reference for quick lookup
  private actors: Actor[] = [];
  private _player: Actor | null = null;
  private items: Item[] = [];
  private traps: Trap[] = [];
  private activeEffects: GPActiveEffect[] = [];

  /** Set the player reference for actor queries */
  set player(p: Actor | null) {
    // Remove old player from actors list
    if (this._player) {
      const index = this.actors.indexOf(this._player);
      if (index !== -1) {
        this.actors.splice(index, 1);
      }
    }
    this._player = p;
    // Add new player to actors list
    if (p) {
      this.actors.push(p);
    }
  }

  get player(): Actor | null {
    return this._player;
  }

  /** Get any actor (player or monster) at a position */
  getActorAt(pos: Position): Actor | undefined {
    return this.actors.find(
      (a) => !a.isDead && a.position.x === pos.x && a.position.y === pos.y
    );
  }

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

  // Monster methods - monsters are actors, stored in unified actors list
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

  // Check if position is occupied by a monster
  isOccupied(pos: Position): boolean {
    return this.getMonsterAt(pos) !== undefined;
  }

  // Active effect methods

  /**
   * Add an active effect to the level
   */
  addActiveEffect(effect: GPActiveEffect): void {
    this.activeEffects.push(effect);
  }

  /**
   * Remove an active effect from the level
   */
  removeActiveEffect(effect: GPActiveEffect): void {
    const index = this.activeEffects.indexOf(effect);
    if (index !== -1) {
      this.activeEffects.splice(index, 1);
    }
  }

  /**
   * Get all active effects
   */
  getActiveEffects(): GPActiveEffect[] {
    return [...this.activeEffects];
  }

  /**
   * Get active effects at a specific position
   */
  getActiveEffectsAt(pos: Position): GPActiveEffect[] {
    return this.activeEffects.filter(
      (e) => e.position && e.position.x === pos.x && e.position.y === pos.y
    );
  }

  /**
   * Tick all active effects and return results
   */
  tickActiveEffects(rng: typeof RNG): GPActiveEffectTickResult[] {
    const context: GPActiveEffectContext = { level: this, rng };
    const results: GPActiveEffectTickResult[] = [];

    for (const effect of this.activeEffects) {
      results.push(effect.tick(context));
    }

    // Remove expired effects
    this.activeEffects = this.activeEffects.filter((e) => !e.isExpired());

    return results;
  }

  /**
   * Fire a game event and let reactive effects respond
   */
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
}

export interface GeneratedLevelData {
  level: ILevel;
  scheduler: Scheduler;
  upStairs: Position[];
  downStairs: Position[];
  storeEntrances?: StoreEntrance[];
  isTown?: boolean;
  isWilderness?: boolean;
}

/**
 * Generate a new dungeon level with monsters and items.
 * For depth 0, generates town instead.
 */
export function generateLevel(
  depth: number,
  player: Player,
  monsterSpawner: MonsterSpawner,
  itemSpawner: ItemSpawner,
): GeneratedLevelData {
  // Town generation for depth 0
  if (depth === 0) {
    return generateTownLevel(player);
  }

  const generator = new DungeonGenerator(RNG);
  const dungeon = generator.generate({ width: DUNGEON_WIDTH, height: DUNGEON_HEIGHT, depth });

  // Create level
  const level = new Level(DUNGEON_WIDTH, DUNGEON_HEIGHT, { depth });

  // Apply terrain
  for (let y = 0; y < DUNGEON_HEIGHT; y++) {
    for (let x = 0; x < DUNGEON_WIDTH; x++) {
      const tile = dungeon.tiles[y]?.[x];
      if (tile) {
        level.setTerrain({ x, y }, tile.feat);
      }
    }
  }

  // Place player at up stairs or fallback to first room
  if (dungeon.upStairs.length > 0) {
    const stairs = dungeon.upStairs[0];
    player.position = { x: stairs.x, y: stairs.y };
  } else if (dungeon.rooms.length > 0) {
    const room = dungeon.rooms[0];
    player.position = { x: room.centerX, y: room.centerY };
  } else {
    player.position = { x: Math.floor(DUNGEON_WIDTH / 2), y: Math.floor(DUNGEON_HEIGHT / 2) };
  }

  // Set level.player so player is in actors list
  level.player = player;

  // Initialize scheduler
  const scheduler = new Scheduler();
  scheduler.add(player);

  // Spawn monsters and items
  monsterSpawner.spawnMonstersForLevel(level, depth, BASE_MONSTER_COUNT + depth);
  itemSpawner.spawnItemsForLevel(level, depth, 5 + depth);

  // Add monsters to scheduler
  for (const monster of level.getMonsters()) {
    scheduler.add(monster);
  }

  return {
    level,
    scheduler,
    upStairs: dungeon.upStairs,
    downStairs: dungeon.downStairs,
  };
}

/**
 * Generate the town level (depth 0).
 * Town has no monsters, no random items, just stores and dungeon entrance.
 */
function generateTownLevel(player: Player): GeneratedLevelData {
  const townGenerator = new TownGenerator();
  const layout = (townData as { default: TownLayout }).default;
  const town = townGenerator.generate(layout);

  // Place player at town start position
  player.position = { ...town.playerStart };

  // Set level.player so player is in actors list
  town.level.player = player;

  // Initialize scheduler (player only in town - no monsters)
  const scheduler = new Scheduler();
  scheduler.add(player);

  return {
    level: town.level,
    scheduler,
    upStairs: [], // Town has no up stairs
    downStairs: [layout.dungeonEntrance], // Dungeon entrance is the down stairs
    storeEntrances: town.storeEntrances,
    isTown: true,
  };
}
