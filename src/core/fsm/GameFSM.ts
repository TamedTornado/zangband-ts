/**
 * Game Finite State Machine
 *
 * Controls game state transitions and delegates actions to current state.
 */

import { RNG } from 'rot-js';
import type { State } from './State';
import type { GameAction } from './Actions';
import type { GameData, GameMessage } from './GameData';
import { Player } from '../entities/Player';
import { Level } from '../world/Level';
import { Scheduler } from '../systems/Scheduler';
import { DungeonGenerator } from '../systems/dungeon/DungeonGenerator';
import { FOVSystem } from '../systems/FOV';
import { ItemGeneration } from '../systems/ItemGeneration';
import { MonsterSpawner } from '../systems/MonsterSpawner';
import { ItemSpawner } from '../systems/ItemSpawner';
import { GameLoop } from '../systems/GameLoop';
import { FlavorSystem, getArticle } from '../systems/FlavorSystem';
import { MonsterDataManager } from '../data/MonsterDataManager';
import { DUNGEON_WIDTH, DUNGEON_HEIGHT, BASE_MONSTER_COUNT } from '../constants';
import { TV_POTION, TV_SCROLL } from '../data/tval';
import type { Item } from '../entities/Item';
import type { ItemDef } from '../data/items';
import type { EgoItemDef } from '../data/ego-items';
import type { ArtifactDef } from '../data/artifacts';
import type { MonsterDef } from '../data/monsters';

// Game data imports
import itemsData from '@/data/items/items.json';
import egoItemsData from '@/data/items/ego-items.json';
import artifactsData from '@/data/items/artifacts.json';
import monstersData from '@/data/monsters/monsters.json';

// Initialize shared systems (singleton-like, reused across games)
const itemGen = new ItemGeneration({
  items: itemsData as unknown as Record<string, ItemDef>,
  egoItems: egoItemsData as unknown as Record<string, EgoItemDef>,
  artifacts: artifactsData as unknown as Record<string, ArtifactDef>,
});
const monsterDataManager = new MonsterDataManager(monstersData as unknown as Record<string, MonsterDef>);
const monsterSpawner = new MonsterSpawner(monsterDataManager, RNG);
const itemSpawner = new ItemSpawner(itemGen, RNG);

// Starting equipment
const WARRIOR_STARTING_ITEMS = ['short_sword', 'soft_leather_armour', 'wooden_torch'];

export class GameFSM {
  private currentState: State | null = null;
  private stateStack: State[] = [];
  private listeners: Set<() => void> = new Set();
  private messageId: number = 0;

  // Game data
  data!: GameData;

  // Shared systems (exposed for states to use)
  readonly fovSystem = new FOVSystem();
  readonly gameLoop = new GameLoop(RNG, monsterDataManager);
  readonly monsterDataManager = monsterDataManager;
  readonly itemGen = itemGen;
  readonly flavorSystem = new FlavorSystem(RNG);

  constructor(initialState: State) {
    this.initGameData();
    this.transition(initialState);
  }

  /** Subscribe to state changes */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Notify all listeners of state change */
  notify(): void {
    this.listeners.forEach(l => l());
  }

  /** Get current state name */
  get stateName(): string {
    return this.currentState?.name ?? 'none';
  }

  /** Transition to a new state (clears stack) */
  transition(newState: State): void {
    this.currentState?.onExit(this);
    this.stateStack = [];
    this.currentState = newState;
    this.currentState.onEnter(this);
    this.notify();
  }

  /** Push a child state onto the stack */
  push(childState: State): void {
    if (this.currentState) {
      this.stateStack.push(this.currentState);
    }
    this.currentState = childState;
    this.currentState.onEnter(this);
    this.notify();
  }

  /** Pop current state and return to parent, passing result to onResume */
  pop(result?: unknown): void {
    this.currentState?.onExit(this);
    const parent = this.stateStack.pop();
    if (parent) {
      this.currentState = parent;
      parent.onResume?.(this, result);
      this.notify();
    }
  }

  /** Dispatch an action to the current state */
  dispatch(action: GameAction): void {
    if (this.currentState) {
      this.currentState.handleAction(this, action);
    }
  }

  /** Add a message to the log */
  addMessage(text: string, type: GameMessage['type'] = 'normal'): void {
    this.data.messages.push({
      id: this.messageId++,
      text,
      type,
      turn: this.data.turn,
    });
    if (this.data.messages.length > 100) {
      this.data.messages = this.data.messages.slice(-100);
    }
  }

  /** Initialize fresh game data */
  initGameData(): void {
    // Create player
    const player = new Player({
      id: 'player',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 16, int: 10, wis: 10, dex: 14, con: 15, chr: 10 },
    });

    // Give starting equipment
    for (const itemKey of WARRIOR_STARTING_ITEMS) {
      const item = itemGen.createItemByKey(itemKey);
      if (item) {
        player.addItem(item);
        player.equip(item);
      }
    }

    // Initialize data with placeholder level (will be generated)
    this.data = {
      player,
      level: new Level(DUNGEON_WIDTH, DUNGEON_HEIGHT, { depth: 1 }),
      scheduler: new Scheduler(),
      depth: 1,
      turn: 0,
      messages: [],
      upStairs: [],
      downStairs: [],
      killedBy: null,
      cursor: null,
      itemTargeting: null,
      symbolTargeting: null,
      directionTargeting: null,
      activeModal: null,
      inventoryMode: 'browse',
    };

    this.messageId = 0;

    // Generate first level
    this.generateLevel(1);

    this.addMessage('Welcome to Zangband!', 'info');
    this.addMessage(`You enter dungeon level ${this.data.depth}.`, 'info');
  }

  /** Generate a new dungeon level */
  generateLevel(depth: number): void {
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
      this.data.player.position = { x: stairs.x, y: stairs.y };
    } else if (dungeon.rooms.length > 0) {
      const room = dungeon.rooms[0];
      this.data.player.position = { x: room.centerX, y: room.centerY };
    } else {
      // Last resort - center of map
      this.data.player.position = { x: Math.floor(DUNGEON_WIDTH / 2), y: Math.floor(DUNGEON_HEIGHT / 2) };
    }

    // Initialize scheduler
    const scheduler = new Scheduler();
    scheduler.add(this.data.player);

    // Spawn monsters and items
    monsterSpawner.spawnMonstersForLevel(level, depth, BASE_MONSTER_COUNT + depth);
    itemSpawner.spawnItemsForLevel(level, depth, 5 + depth);

    // Add monsters to scheduler
    for (const monster of level.getMonsters()) {
      scheduler.add(monster);
    }

    // Update data
    this.data.level = level;
    this.data.scheduler = scheduler;
    this.data.depth = depth;
    this.data.upStairs = dungeon.upStairs;
    this.data.downStairs = dungeon.downStairs;
  }

  /** Get monster name from definition */
  getMonsterName(monster: { definitionKey: string }): string {
    return monsterDataManager.getMonsterDef(monster.definitionKey)?.name ?? 'monster';
  }

  /**
   * Get the display name for an item with proper article and flavor.
   *
   * Examples:
   * - "a Robe" (basic equipment)
   * - "an Icky Green Potion" (unidentified potion)
   * - "a Potion of Salt Water" (identified potion)
   * - "The One Ring" (known artifact)
   *
   * @param item - The item to get a name for
   * @param options - Display options
   * @returns Formatted display name with article
   */
  getItemDisplayName(
    item: Item,
    options: { article?: boolean; quantity?: number } = {},
  ): string {
    const { article = true, quantity = item.quantity } = options;

    if (!item.generated) {
      return article ? 'an unknown item' : 'unknown item';
    }

    const base = item.generated.baseItem;
    const tval = base.tval;
    const sval = base.sval;

    // Artifacts always show their name
    if (item.generated.artifact?.name) {
      const name = item.generated.artifact.name;
      if (!article) return name;
      // Known artifacts get "The" prefix
      return `The ${name}`;
    }

    // Check if this item type has flavors (potions, scrolls)
    const hasFlavor = tval === TV_POTION || tval === TV_SCROLL;
    const isAware = this.flavorSystem.isAware(tval, sval);

    let name: string;

    if (hasFlavor && !isAware) {
      // Show flavor name (e.g., "Icky Green Potion", "Scroll titled \"BLAA JU\"")
      if (tval === TV_POTION) {
        name = this.flavorSystem.getPotionFlavorName(sval);
      } else {
        name = this.flavorSystem.getScrollFlavorName(sval);
      }
    } else {
      // Show real name
      name = item.name;
    }

    // Add ego item suffix if identified
    if (item.generated.egoItem?.name && item.generated.identified) {
      name = `${name} ${item.generated.egoItem.name}`;
    }

    if (!article) return name;

    // Handle pluralization for quantities > 1
    if (quantity > 1) {
      // Simple pluralization (add 's' or 'es')
      let plural = name;
      if (name.endsWith('s') || name.endsWith('h')) {
        plural = `${name}es`;
      } else {
        plural = `${name}s`;
      }
      return `${quantity} ${plural}`;
    }

    // Get the appropriate article (a/an)
    const art = getArticle(name, quantity);
    return `${art} ${name}`;
  }

  /**
   * Mark an item type as known (after identifying, using, etc.)
   */
  makeAware(item: Item): void {
    if (item.generated) {
      const { tval, sval } = item.generated.baseItem;
      this.flavorSystem.setAware(tval, sval);
    }
  }
}
