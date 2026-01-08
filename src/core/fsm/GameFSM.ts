/**
 * Game Finite State Machine
 *
 * Controls game state transitions and delegates actions to current state.
 * Game data is stored in Zustand store for automatic React updates.
 */

import { RNG } from 'rot-js';
import type { State } from './State';
import type { GameAction } from './Actions';
import type { GameMessage } from './GameData';
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
import { TickSystem } from '../systems/TickSystem';
import { MonsterDataManager } from '../data/MonsterDataManager';
import { getEffectManager } from '../systems/effects';
import { DUNGEON_WIDTH, DUNGEON_HEIGHT, BASE_MONSTER_COUNT } from '../constants';
import type { Item } from '../entities/Item';
import type { ItemDef } from '../data/items';
import type { EgoItemDef } from '../data/ego-items';
import type { ArtifactDef } from '../data/artifacts';
import type { MonsterDef } from '../data/monsters';
import { DEBUG_MODE, applyDebugSetup } from '../debug/debugSetup';
import { useGameStore, getGameStore } from '../store/gameStore';

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

// Initialize effect manager with shared resources
getEffectManager().setMonsterDataManager(monsterDataManager);

// Starting equipment
const WARRIOR_STARTING_ITEMS = ['short_sword', 'soft_leather_armour', 'wooden_torch'];

export class GameFSM {
  private currentState: State | null = null;
  private stateStack: State[] = [];

  // Shared systems (exposed for states to use)
  readonly fovSystem = new FOVSystem();
  readonly gameLoop = new GameLoop(RNG, monsterDataManager);
  readonly tickSystem = new TickSystem();
  readonly monsterDataManager = monsterDataManager;
  readonly itemGen = itemGen;
  readonly flavorSystem = new FlavorSystem(RNG);
  readonly effectManager = getEffectManager();

  constructor(initialState: State) {
    this.initGameData();
    this.transition(initialState);
  }

  /**
   * Get current game data from store.
   * This provides backward compatibility for states using fsm.data.x
   */
  get data() {
    const store = getGameStore();
    return {
      get player() { return store.player!; },
      set player(p: Player) { useGameStore.setState({ player: p }); },
      get level() { return store.level!; },
      set level(l: Level) { useGameStore.setState({ level: l }); },
      get scheduler() { return store.scheduler!; },
      set scheduler(s: Scheduler) { useGameStore.setState({ scheduler: s }); },
      get depth() { return store.depth; },
      set depth(d: number) { useGameStore.setState({ depth: d }); },
      get turn() { return store.turn; },
      set turn(t: number) { useGameStore.setState({ turn: t }); },
      get messages() { return store.messages; },
      get upStairs() { return store.upStairs; },
      get downStairs() { return store.downStairs; },
      get killedBy() { return store.killedBy; },
      set killedBy(k: string | null) { useGameStore.setState({ killedBy: k }); },
      get cursor() { return store.cursor; },
      set cursor(c: { x: number; y: number } | null) { useGameStore.setState({ cursor: c }); },
      get itemTargeting() { return store.itemTargeting; },
      set itemTargeting(t: typeof store.itemTargeting) { useGameStore.setState({ itemTargeting: t }); },
      get symbolTargeting() { return store.symbolTargeting; },
      set symbolTargeting(t: typeof store.symbolTargeting) { useGameStore.setState({ symbolTargeting: t }); },
      get directionTargeting() { return store.directionTargeting; },
      set directionTargeting(t: typeof store.directionTargeting) { useGameStore.setState({ directionTargeting: t }); },
      get activeModal() { return store.activeModal; },
      set activeModal(m: typeof store.activeModal) { useGameStore.setState({ activeModal: m }); },
      get inventoryMode() { return store.inventoryMode; },
      set inventoryMode(m: typeof store.inventoryMode) { useGameStore.setState({ inventoryMode: m }); },
    };
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
    getGameStore().setStateName(newState.name);
    this.currentState.onEnter(this);
  }

  /** Push a child state onto the stack */
  push(childState: State): void {
    if (this.currentState) {
      this.stateStack.push(this.currentState);
    }
    this.currentState = childState;
    getGameStore().setStateName(childState.name);
    this.currentState.onEnter(this);
  }

  /** Pop current state and return to parent, passing result to onResume */
  pop(result?: unknown): void {
    this.currentState?.onExit(this);
    const parent = this.stateStack.pop();
    if (parent) {
      this.currentState = parent;
      getGameStore().setStateName(parent.name);
      parent.onResume?.(this, result);
    }
  }

  /** Dispatch an action to the current state */
  dispatch(action: GameAction): void {
    if (this.currentState) {
      this.currentState.handleAction(this, action);
    }
  }

  /**
   * @deprecated Use notify() for backward compatibility during migration.
   * This is now a no-op since Zustand auto-updates React.
   */
  notify(): void {
    // No-op - Zustand handles React updates automatically
  }

  /**
   * @deprecated Subscribe is no longer needed with Zustand.
   * Returns a no-op unsubscribe function for backward compatibility.
   */
  subscribe(_listener: () => void): () => void {
    return () => {};
  }

  /** Add a message to the log */
  addMessage(text: string, type: GameMessage['type'] = 'normal'): void {
    getGameStore().addMessage(text, type);
  }

  /** Initialize fresh game data */
  initGameData(): void {
    const store = getGameStore();

    // Reset store
    store.reset();

    // Create player
    const player = new Player({
      id: 'player',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 16, int: 10, wis: 10, dex: 14, con: 15, chr: 10 },
    });

    // Apply debug setup or give default starting equipment
    if (DEBUG_MODE) {
      applyDebugSetup(player, itemGen);
    } else {
      // Give starting equipment
      for (const itemKey of WARRIOR_STARTING_ITEMS) {
        const item = itemGen.createItemByKey(itemKey);
        if (item) {
          player.addItem(item);
          player.equip(item);
        }
      }
    }

    // Set player in store
    store.setPlayer(player);

    // Generate first level
    this.generateLevel(1);

    this.addMessage('Welcome to Zangband!', 'info');
    this.addMessage(`You enter dungeon level ${store.depth}.`, 'info');
  }

  /** Generate a new dungeon level */
  generateLevel(depth: number): void {
    const store = getGameStore();
    const player = store.player!;

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
      // Last resort - center of map
      player.position = { x: Math.floor(DUNGEON_WIDTH / 2), y: Math.floor(DUNGEON_HEIGHT / 2) };
    }

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

    // Update store with all level data
    store.setLevelData({
      level,
      scheduler,
      depth,
      upStairs: dungeon.upStairs,
      downStairs: dungeon.downStairs,
    });
  }

  /** Get monster name from definition */
  getMonsterName(monster: { definitionKey: string }): string {
    return monsterDataManager.getMonsterDef(monster.definitionKey)?.name ?? 'monster';
  }

  /**
   * Get the display name for an item with proper article and flavor.
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
    const type = base.type;
    const sval = base.sval;

    // Artifacts always show their name
    if (item.generated.artifact?.name) {
      const name = item.generated.artifact.name;
      if (!article) return name;
      // Known artifacts get "The" prefix
      return `The ${name}`;
    }

    // Check if this item type has flavors (potions, scrolls)
    const hasFlavor = type === 'potion' || type === 'scroll';
    const isAware = this.flavorSystem.isAware(type, sval);

    let name: string;

    if (hasFlavor && !isAware) {
      // Show flavor name (e.g., "Icky Green Potion", "Scroll titled \"BLAA JU\"")
      if (type === 'potion') {
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
      const { type, sval } = item.generated.baseItem;
      this.flavorSystem.setAware(type, sval);
    }
  }
}
