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
import { generateLevel } from '../world/Level';
import { FOVSystem } from '../systems/FOV';
import { ItemGeneration } from '../systems/ItemGeneration';
import { MonsterSpawner } from '../systems/MonsterSpawner';
import { ItemSpawner } from '../systems/ItemSpawner';
import { TrapSpawner } from '../systems/TrapSpawner';
import { TrapDataManager, type TrapDef } from '../data/traps';
import { GameLoop } from '../systems/GameLoop';
import { FlavorSystem } from '../systems/FlavorSystem';
import { TickSystem } from '../systems/TickSystem';
import { MonsterDataManager } from '../data/MonsterDataManager';
import { getEffectManager } from '../systems/effects';
import { ENERGY_PER_TURN, VIEW_RADIUS } from '../constants';
import type { Item } from '../entities/Item';
import type { ItemDef } from '../data/items';
import type { EgoItemDef } from '../data/ego-items';
import type { ArtifactDef } from '../data/artifacts';
import type { MonsterDef } from '../data/monsters';
import { DEBUG_MODE, applyDebugSetup } from '../debug/debugSetup';
import { getGameStore } from '../store/gameStore';
import { StoreManager } from '../systems/StoreManager';

// Game data imports
import itemsData from '@/data/items/items.json';
import egoItemsData from '@/data/items/ego-items.json';
import artifactsData from '@/data/items/artifacts.json';
import monstersData from '@/data/monsters/monsters.json';
import trapsData from '@/data/traps/traps.json';

// Initialize shared systems (singleton-like, reused across games)
const itemGen = new ItemGeneration({
  items: itemsData as unknown as Record<string, ItemDef>,
  egoItems: egoItemsData as unknown as Record<string, EgoItemDef>,
  artifacts: artifactsData as unknown as Record<string, ArtifactDef>,
});
const monsterDataManager = new MonsterDataManager(monstersData as unknown as Record<string, MonsterDef>);
const monsterSpawner = new MonsterSpawner(monsterDataManager, RNG);
const itemSpawner = new ItemSpawner(itemGen, RNG);
const trapDataManager = new TrapDataManager(trapsData as unknown as Record<string, TrapDef>, RNG);
const trapSpawner = new TrapSpawner(trapDataManager, RNG);

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
  readonly storeManager = new StoreManager(RNG);

  constructor(initialState: State) {
    // Initialize store inventory generation
    this.storeManager.setItemGeneration(this.itemGen);
    this.storeManager.generateAllStoreInventories();

    // Don't init game data here - let character creation handle it
    // or call initGameData() explicitly for debug/restart scenarios
    this.transition(initialState);
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

    // Give starting gold
    player.addGold(200);

    // Note: Wilderness generation is handled by WildernessInitState
  }

  /** Generate a new dungeon level and update store */
  goToLevel(depth: number): void {
    const store = getGameStore();
    const player = store.player!;

    const data = generateLevel(depth, player, monsterSpawner, itemSpawner, trapSpawner);

    // Compute initial FOV to mark tiles as explored before first render
    this.fovSystem.computeAndMark(data.level, player.position, VIEW_RADIUS);

    // Register store positions with StoreManager if this is town
    if (data.storeEntrances) {
      this.storeManager.registerStorePositions(data.storeEntrances);
    }

    store.setLevelData({
      level: data.level,
      scheduler: data.scheduler,
      depth,
      upStairs: data.upStairs,
      downStairs: data.downStairs,
      storeEntrances: data.storeEntrances ?? [],
      isTown: data.isTown ?? false,
    });
  }

  /** Get monster name from definition */
  getMonsterName(monster: { definitionKey: string }): string {
    return this.monsterDataManager.getName(monster.definitionKey);
  }

  /** Get the display name for an item with proper article and flavor */
  getItemDisplayName(item: Item, options?: { article?: boolean; quantity?: number }): string {
    return this.flavorSystem.getItemDisplayName(item, options);
  }

  /** Mark an item type as known (after identifying, using, etc.) */
  makeAware(item: Item): void {
    this.flavorSystem.makeAware(item);
  }

  /**
   * Complete a player turn: spend energy and process the game world.
   *
   * This is the ONLY way to complete a player turn. It:
   * 1. Spends player energy
   * 2. Loops until player can act again:
   *    - Ticks energy for all actors
   *    - Processes monster turns
   *    - Processes status effect ticks
   * 3. Cleans up dead monsters
   *
   * @param energyCost The amount of energy to spend (default: ENERGY_PER_TURN = 100)
   */
  completeTurn(energyCost: number = ENERGY_PER_TURN): void {
    const store = getGameStore();
    const player = store.player!;
    const level = store.level!;
    const scheduler = store.scheduler!;

    // Spend energy
    player.spendEnergy(energyCost);

    // Keep processing until player can act again (or dies)
    let iterations = 0;
    const maxIterations = 100; // Safety limit

    while (!player.canAct && !player.isDead && iterations < maxIterations) {
      iterations++;

      // Process status effect ticks
      const tickResult = this.tickSystem.tick(player);
      for (const msg of tickResult.messages) {
        this.addMessage(msg, 'info');
      }

      // Process monster turns (includes scheduler.tick())
      const result = this.gameLoop.processMonsterTurns(player, level, scheduler);
      for (const msg of result.messages) {
        this.addMessage(msg.text, msg.type as 'normal' | 'combat' | 'info' | 'danger');
      }

      // Clean up dead monsters and award XP
      for (const monster of level.getMonsters()) {
        if (monster.isDead) {
          // Award XP for kills (from spells, effects, etc.)
          const xpMessages = this.gameLoop.awardXP(player, monster);
          for (const msg of xpMessages) {
            this.addMessage(msg.text, msg.type as 'normal' | 'combat' | 'info' | 'danger');
          }

          // Track killed uniques (Farmer Maggot, etc. - never respawn)
          this.monsterDataManager.markUniqueKilled(monster.definitionKey);

          level.removeMonster(monster);
          scheduler.remove(monster);
        }
      }

      // Track what killed the player
      if (player.isDead) {
        const lastAttack = [...result.messages].reverse().find((m: { text: string }) =>
          m.text.includes('hits you') || m.text.includes('bites you') || m.text.includes('claws you')
        );
        if (lastAttack) {
          const match = lastAttack.text.match(/^The (.+?) /);
          if (match) {
            store.setKilledBy(match[1]);
          }
        }
      }
    }

    // Check for newly visible monsters and announce them
    this.announceNewlyVisibleMonsters();
  }

  /** Check for newly visible monsters and announce them */
  private announceNewlyVisibleMonsters(): void {
    const store = getGameStore();
    const player = store.player!;
    const level = store.level!;

    const visibleIds = this.fovSystem.getVisibleMonsterIds(level, player.position, VIEW_RADIUS);
    const newlyVisible = store.updateVisibleMonsters(visibleIds);

    for (const monsterId of newlyVisible) {
      const monster = level.getMonsterById(monsterId);
      if (monster && !monster.isDead) {
        const name = this.getMonsterName(monster);
        const sleepStatus = monster.isAwake ? '' : ' (sleeping)';
        this.addMessage(`You see a ${name}${sleepStatus}.`, 'info');
      }
    }
  }

}
