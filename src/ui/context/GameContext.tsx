import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { RNG } from 'rot-js';
import { Player } from '@/core/entities/Player';
import { Item } from '@/core/entities/Item';
import { Monster } from '@/core/entities/Monster';
import { Level } from '@/core/world/Level';
import { Direction, movePosition, type Position } from '@/core/types';
import { DungeonGenerator } from '@/core/systems/dungeon/DungeonGenerator';
import { ItemGeneration, type GeneratedItem } from '@/core/systems/ItemGeneration';
import { MonsterSpawner } from '@/core/systems/MonsterSpawner';
import { ItemSpawner } from '@/core/systems/ItemSpawner';
import { Scheduler } from '@/core/systems/Scheduler';
import { MonsterAI, AIAction, type MonsterAIContext } from '@/core/systems/MonsterAI';
import { Combat, type MonsterAttack } from '@/core/systems/Combat';
import { MonsterDataManager } from '@/core/data/MonsterDataManager';
import type { GeneratedDungeon, Coord } from '@/core/systems/dungeon/DungeonTypes';
import type { ItemDef } from '@/core/data/items';
import type { EgoItemDef } from '@/core/data/ego-items';
import type { ArtifactDef } from '@/core/data/artifacts';
import type { MonsterDef } from '@/core/data/monsters';

// Import game data
import itemsData from '@/data/items/items.json';
import egoItemsData from '@/data/items/ego-items.json';
import artifactsData from '@/data/items/artifacts.json';
import monstersData from '@/data/monsters/monsters.json';

const WIDTH = 198;
const HEIGHT = 66;
const MONSTER_COUNT = 8; // Monsters per level
const ITEM_COUNT = 5; // Items per level

// Initialize item generation system
const itemGen = new ItemGeneration({
  items: itemsData as unknown as Record<string, ItemDef>,
  egoItems: egoItemsData as unknown as Record<string, EgoItemDef>,
  artifacts: artifactsData as unknown as Record<string, ArtifactDef>,
});

// Initialize monster data manager
const monsterDataManager = new MonsterDataManager(monstersData as unknown as Record<string, MonsterDef>);

// Systems
const monsterSpawner = new MonsterSpawner(monsterDataManager, RNG);
const itemSpawner = new ItemSpawner(itemGen, RNG);
const monsterAI = new MonsterAI(RNG);
const combat = new Combat(RNG);

// Warrior starting equipment
const WARRIOR_STARTING_ITEMS = ['short_sword', 'soft_leather_armour', 'wooden_torch'];

let itemIdCounter = 0;
function generateItemId(): string {
  return `item_${++itemIdCounter}`;
}

function getItemTypeFromTval(tval: number): string {
  if (tval >= 16 && tval <= 23) return 'weapon';
  if (tval >= 30 && tval <= 38) return 'armor';
  if (tval === 40) return 'amulet';
  if (tval === 45) return 'ring';
  if (tval === 39) return 'light';
  if (tval === 75) return 'potion';
  if (tval === 70) return 'scroll';
  if (tval === 80) return 'food';
  return 'misc';
}

/**
 * Create an Item from an item key
 */
function createItem(itemKey: string): Item | null {
  const itemDef = itemGen.getItemDef(itemKey);
  if (!itemDef) return null;

  const generated: GeneratedItem = {
    baseItem: itemDef,
    toHit: itemDef.toHit,
    toDam: itemDef.toDam,
    toAc: itemDef.toAc,
    pval: itemDef.pval,
    flags: [...itemDef.flags],
    cost: itemDef.cost,
  };

  // Clean up display name (remove & prefix and ~ suffix)
  const name = itemDef.name.replace(/^& /, '').replace(/~$/, '');

  return new Item({
    id: generateItemId(),
    position: { x: 0, y: 0 }, // Not on the ground
    symbol: itemDef.symbol,
    color: itemDef.color,
    name,
    itemType: getItemTypeFromTval(itemDef.tval),
    generated,
  });
}

/**
 * Equip starting items on the player
 */
function equipStartingItems(player: Player, itemKeys: string[]): void {
  for (const key of itemKeys) {
    const item = createItem(key);
    if (item) {
      player.equip(item);
    }
  }
}

interface Message {
  id: number;
  text: string;
  type: 'normal' | 'combat' | 'info' | 'danger';
  turn: number;
}

interface GameState {
  player: Player;
  level: Level;
  scheduler: Scheduler;
  depth: number;
  turn: number;
  messages: Message[];
  upStairs: Coord[];
  downStairs: Coord[];
}

interface GameContextValue {
  state: GameState;
  movePlayer: (dir: Direction) => void;
  addMessage: (text: string, type?: Message['type']) => void;
  goDownStairs: () => void;
  goUpStairs: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

/**
 * Generate a dungeon level and create a Level with terrain
 */
function generateLevel(depth: number): { level: Level; dungeon: GeneratedDungeon } {
  const generator = new DungeonGenerator(RNG);
  const dungeon = generator.generate({
    width: WIDTH,
    height: HEIGHT,
    depth,
  });

  const level = new Level(WIDTH, HEIGHT, { depth });

  // Copy dungeon tiles to Level terrain
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const tile = dungeon.tiles[y]?.[x];
      if (tile) {
        level.setTerrain({ x, y }, tile.feat);
      }
    }
  }

  // Spawn monsters and items
  monsterSpawner.spawnMonstersForLevel(level, depth, MONSTER_COUNT + depth);
  itemSpawner.spawnItemsForLevel(level, depth, ITEM_COUNT);

  return { level, dungeon };
}

function createInitialState(): GameState {
  const depth = 1;
  const { level, dungeon } = generateLevel(depth);

  // Find player starting position - prefer up stairs, else first room center
  let startPos = { x: Math.floor(WIDTH / 2), y: Math.floor(HEIGHT / 2) };
  if (dungeon.upStairs.length > 0) {
    startPos = { x: dungeon.upStairs[0].x, y: dungeon.upStairs[0].y };
  } else if (dungeon.rooms.length > 0) {
    startPos = { x: dungeon.rooms[0].centerX, y: dungeon.rooms[0].centerY };
  }

  const player = new Player({
    id: 'player',
    position: startPos,
    maxHp: 100,
    speed: 110,
    stats: { str: 16, int: 12, wis: 10, dex: 14, con: 15, chr: 8 },
    className: 'Warrior',
  });

  // Equip starting gear
  equipStartingItems(player, WARRIOR_STARTING_ITEMS);

  // Set up scheduler with player and all monsters
  const scheduler = new Scheduler();
  scheduler.add(player);
  for (const monster of level.getMonsters()) {
    scheduler.add(monster);
  }

  return {
    player,
    level,
    scheduler,
    depth,
    turn: 0,
    messages: [
      { id: 0, text: 'Welcome to Zangband!', type: 'info', turn: 0 },
      { id: 1, text: `You enter dungeon level ${depth}.`, type: 'info', turn: 0 },
    ],
    upStairs: dungeon.upStairs,
    downStairs: dungeon.downStairs,
  };
}

/**
 * Calculate distance between two positions
 */
function distance(a: Position, b: Position): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/**
 * Get monster definition for a monster
 */
function getMonsterDef(monster: Monster): MonsterDef | undefined {
  return monsterDataManager.getMonsterDef(monster.definitionKey);
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(createInitialState);
  const messageIdRef = useRef(2);

  const addMessage = useCallback((text: string, type: Message['type'] = 'normal') => {
    setState(prev => ({
      ...prev,
      messages: [
        ...prev.messages.slice(-99), // Keep last 100
        { id: messageIdRef.current++, text, type, turn: prev.turn },
      ],
    }));
  }, []);

  /**
   * Execute player attack against a monster
   */
  const playerAttack = useCallback((
    player: Player,
    monster: Monster,
    messages: Message[],
    turn: number
  ): Message[] => {
    const newMessages = [...messages];
    const monsterDef = getMonsterDef(monster);
    const monsterName = monsterDef?.name ?? 'monster';

    // Parse weapon damage
    const weaponDice = Combat.parseDice(player.weaponDamage);
    weaponDice.bonus += player.weaponToDam;

    // Calculate hit chance (simplified: base 50 + tohit bonus)
    const hitChance = 50 + player.weaponToHit + Math.floor(player.stats.dex / 2);

    // Test hit
    const hit = combat.testHit(hitChance, monsterDef?.ac ?? 0, true);

    if (hit) {
      const damage = combat.calcDamage(weaponDice, 0, 100);
      monster.takeDamage(damage);

      newMessages.push({
        id: messageIdRef.current++,
        text: `You hit the ${monsterName} for ${damage} damage.`,
        type: 'combat',
        turn,
      });

      if (monster.isDead) {
        newMessages.push({
          id: messageIdRef.current++,
          text: `You have slain the ${monsterName}!`,
          type: 'combat',
          turn,
        });
      }
    } else {
      newMessages.push({
        id: messageIdRef.current++,
        text: `You miss the ${monsterName}.`,
        type: 'combat',
        turn,
      });
    }

    return newMessages;
  }, []);

  /**
   * Execute monster attack against player
   */
  const monsterAttack = useCallback((
    monster: Monster,
    player: Player,
    messages: Message[],
    turn: number
  ): Message[] => {
    const newMessages = [...messages];
    const monsterDef = getMonsterDef(monster);
    const monsterName = monsterDef?.name ?? 'monster';

    if (!monsterDef?.attacks || monsterDef.attacks.length === 0) {
      return newMessages;
    }

    // Execute each attack
    for (const attack of monsterDef.attacks) {
      // Calculate hit chance based on monster depth
      const hitChance = 30 + monsterDef.depth * 3;

      // Build MonsterAttack with only defined properties
      const monsterAttackDef: MonsterAttack = {
        method: attack.method,
        ...(attack.effect !== undefined && { effect: attack.effect }),
        ...(attack.damage !== undefined && { damage: attack.damage }),
      };

      const result = combat.resolveMonsterAttack(monsterAttackDef, player.totalAc, hitChance);

      if (result.hit && result.damage > 0) {
        player.takeDamage(result.damage);
        newMessages.push({
          id: messageIdRef.current++,
          text: `The ${monsterName} ${attack.method.toLowerCase()}s you for ${result.damage} damage!`,
          type: 'danger',
          turn,
        });
      } else if (result.hit) {
        newMessages.push({
          id: messageIdRef.current++,
          text: `The ${monsterName} ${attack.method.toLowerCase()}s you.`,
          type: 'combat',
          turn,
        });
      } else {
        newMessages.push({
          id: messageIdRef.current++,
          text: `The ${monsterName} misses you.`,
          type: 'combat',
          turn,
        });
      }
    }

    return newMessages;
  }, []);

  /**
   * Process monster turns until player can act again
   */
  const processMonsterTurns = useCallback((
    prevState: GameState,
    messages: Message[]
  ): { messages: Message[]; turn: number } => {
    let newMessages = [...messages];
    let turn = prevState.turn;
    const { player, level, scheduler } = prevState;

    // Tick to give energy
    scheduler.tick();

    // Process monster actions
    let iterations = 0;
    const maxIterations = 100;

    while (iterations < maxIterations) {
      iterations++;
      const nextActor = scheduler.next();

      if (!nextActor || nextActor === player) {
        break;
      }

      // It's a monster's turn
      const monster = nextActor as Monster;
      if (monster.isDead) continue;

      const monsterDef = getMonsterDef(monster);
      if (!monsterDef) continue;

      // Build AI context
      const ctx: MonsterAIContext = {
        monsterPos: monster.position,
        monsterHp: monster.hp,
        monsterMaxHp: monster.maxHp,
        monsterLevel: monsterDef.depth,
        playerPos: player.position,
        playerHp: player.hp,
        playerMaxHp: player.maxHp,
        playerLevel: 1, // Player level not yet implemented
        distanceToPlayer: distance(monster.position, player.position),
        hasLineOfSight: true, // Simplified for now
        isConfused: false,
        isFeared: false,
        isStunned: false,
        isSleeping: false,
        flags: monsterDef.flags,
        spells: [],
        spellChance: 0,
        level,
      };

      // Get AI decision
      const decision = monsterAI.decide(ctx);

      // Execute action
      switch (decision.action) {
        case AIAction.Attack:
          newMessages = monsterAttack(monster, player, newMessages, turn);
          monster.spendEnergy(100);
          break;

        case AIAction.Move:
        case AIAction.Flee:
          if (decision.targetPos) {
            // Check if moving into player (attack instead)
            if (decision.targetPos.x === player.position.x &&
                decision.targetPos.y === player.position.y) {
              newMessages = monsterAttack(monster, player, newMessages, turn);
            } else if (level.isWalkable(decision.targetPos) && !level.isOccupied(decision.targetPos)) {
              monster.position = decision.targetPos;
            }
          }
          monster.spendEnergy(100);
          break;

        default:
          monster.spendEnergy(100);
          break;
      }

      // Check if player died
      if (player.isDead) {
        newMessages.push({
          id: messageIdRef.current++,
          text: 'You have died!',
          type: 'danger',
          turn,
        });
        break;
      }
    }

    return { messages: newMessages.slice(-100), turn };
  }, [monsterAttack]);

  /**
   * Handle player movement including bump-attack
   * Game logic runs outside setState to avoid StrictMode double-execution
   */
  const movePlayer = useCallback((dir: Direction) => {
    // Get current state via ref pattern - game logic runs once
    const { player, level, scheduler, messages, turn } = state;
    const newPos = movePosition(player.position, dir);
    const newTurn = turn + 1;
    let newMessages = [...messages];

    // Check for monster at target position (bump attack)
    const targetMonster = level.getMonsterAt(newPos);

    if (targetMonster) {
      newMessages = playerAttack(player, targetMonster, newMessages, newTurn);

      if (targetMonster.isDead) {
        level.removeMonster(targetMonster);
        scheduler.remove(targetMonster);
      }

      player.spendEnergy(100);
    } else if (level.isWalkable(newPos)) {
      player.position = newPos;
      player.spendEnergy(100);
    } else {
      // Check if it's a closed door (easy_open behavior)
      const tile = level.getTile(newPos);
      if (tile?.terrain.flags.includes('DOOR')) {
        // Open the door - costs a turn but don't move
        level.setTerrain(newPos, 'open_door');
        newMessages.push({
          id: messageIdRef.current++,
          text: 'You open the door.',
          type: 'info',
          turn: newTurn,
        });
        player.spendEnergy(100);
      } else {
        return; // Can't move, don't advance turn
      }
    }

    // Process monster turns
    const result = processMonsterTurns(state, newMessages);

    // Remove dead monsters
    for (const monster of level.getMonsters()) {
      if (monster.isDead) {
        level.removeMonster(monster);
        scheduler.remove(monster);
      }
    }

    // Trigger re-render with new turn/messages
    setState(prev => ({
      ...prev,
      messages: result.messages,
      turn: newTurn,
    }));
  }, [state, playerAttack, processMonsterTurns]);

  /**
   * Check if player is on down stairs
   */
  const isOnDownStairs = useCallback((state: GameState): boolean => {
    const { player, downStairs } = state;
    return downStairs.some(s => s.x === player.position.x && s.y === player.position.y);
  }, []);

  /**
   * Check if player is on up stairs
   */
  const isOnUpStairs = useCallback((state: GameState): boolean => {
    const { player, upStairs } = state;
    return upStairs.some(s => s.x === player.position.x && s.y === player.position.y);
  }, []);

  /**
   * Go down stairs to next level
   */
  const goDownStairs = useCallback(() => {
    setState(prev => {
      if (!isOnDownStairs(prev)) {
        return {
          ...prev,
          messages: [
            ...prev.messages.slice(-99),
            { id: messageIdRef.current++, text: 'You see no down stairs here.', type: 'info' as const, turn: prev.turn },
          ],
        };
      }

      const newDepth = prev.depth + 1;
      const { level, dungeon } = generateLevel(newDepth);

      // Find player starting position - prefer up stairs (coming from above)
      let startPos = { x: Math.floor(WIDTH / 2), y: Math.floor(HEIGHT / 2) };
      if (dungeon.upStairs.length > 0) {
        startPos = { x: dungeon.upStairs[0].x, y: dungeon.upStairs[0].y };
      } else if (dungeon.rooms.length > 0) {
        startPos = { x: dungeon.rooms[0].centerX, y: dungeon.rooms[0].centerY };
      }

      prev.player.position = startPos;

      // Set up new scheduler with player and new monsters
      const scheduler = new Scheduler();
      scheduler.add(prev.player);
      for (const monster of level.getMonsters()) {
        scheduler.add(monster);
      }

      return {
        ...prev,
        level,
        scheduler,
        depth: newDepth,
        upStairs: dungeon.upStairs,
        downStairs: dungeon.downStairs,
        messages: [
          ...prev.messages.slice(-99),
          { id: messageIdRef.current++, text: `You descend to dungeon level ${newDepth}.`, type: 'info' as const, turn: prev.turn },
        ],
      };
    });
  }, [isOnDownStairs]);

  /**
   * Go up stairs to previous level
   */
  const goUpStairs = useCallback(() => {
    setState(prev => {
      if (!isOnUpStairs(prev)) {
        return {
          ...prev,
          messages: [
            ...prev.messages.slice(-99),
            { id: messageIdRef.current++, text: 'You see no up stairs here.', type: 'info' as const, turn: prev.turn },
          ],
        };
      }

      if (prev.depth <= 1) {
        return {
          ...prev,
          messages: [
            ...prev.messages.slice(-99),
            { id: messageIdRef.current++, text: 'You cannot leave the dungeon!', type: 'info' as const, turn: prev.turn },
          ],
        };
      }

      const newDepth = prev.depth - 1;
      const { level, dungeon } = generateLevel(newDepth);

      // Find player starting position - prefer down stairs (coming from below)
      let startPos = { x: Math.floor(WIDTH / 2), y: Math.floor(HEIGHT / 2) };
      if (dungeon.downStairs.length > 0) {
        startPos = { x: dungeon.downStairs[0].x, y: dungeon.downStairs[0].y };
      } else if (dungeon.rooms.length > 0) {
        startPos = { x: dungeon.rooms[0].centerX, y: dungeon.rooms[0].centerY };
      }

      prev.player.position = startPos;

      // Set up new scheduler with player and new monsters
      const scheduler = new Scheduler();
      scheduler.add(prev.player);
      for (const monster of level.getMonsters()) {
        scheduler.add(monster);
      }

      return {
        ...prev,
        level,
        scheduler,
        depth: newDepth,
        upStairs: dungeon.upStairs,
        downStairs: dungeon.downStairs,
        messages: [
          ...prev.messages.slice(-99),
          { id: messageIdRef.current++, text: `You ascend to dungeon level ${newDepth}.`, type: 'info' as const, turn: prev.turn },
        ],
      };
    });
  }, [isOnUpStairs]);

  const value: GameContextValue = {
    state,
    movePlayer,
    addMessage,
    goDownStairs,
    goUpStairs,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within GameProvider');
  }
  return ctx;
}
