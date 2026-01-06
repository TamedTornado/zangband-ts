import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { RNG } from 'rot-js';
import { Player } from '@/core/entities/Player';
import { Level } from '@/core/world/Level';
import { Direction, movePosition } from '@/core/types';
import { DungeonGenerator } from '@/core/systems/dungeon/DungeonGenerator';
import { ItemGeneration } from '@/core/systems/ItemGeneration';
import { MonsterSpawner } from '@/core/systems/MonsterSpawner';
import { ItemSpawner } from '@/core/systems/ItemSpawner';
import { Scheduler } from '@/core/systems/Scheduler';
import { GameLoop, type GameMessage } from '@/core/systems/GameLoop';
import { MonsterDataManager } from '@/core/data/MonsterDataManager';
import { DUNGEON_WIDTH, DUNGEON_HEIGHT, BASE_MONSTER_COUNT, ENERGY_PER_TURN } from '@/core/constants';
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

// Initialize systems
const itemGen = new ItemGeneration({
  items: itemsData as unknown as Record<string, ItemDef>,
  egoItems: egoItemsData as unknown as Record<string, EgoItemDef>,
  artifacts: artifactsData as unknown as Record<string, ArtifactDef>,
});

const monsterDataManager = new MonsterDataManager(monstersData as unknown as Record<string, MonsterDef>);
const monsterSpawner = new MonsterSpawner(monsterDataManager, RNG);
const itemSpawner = new ItemSpawner(itemGen, RNG);
const gameLoop = new GameLoop(RNG, monsterDataManager);

// Starting equipment
const WARRIOR_STARTING_ITEMS = ['short_sword', 'soft_leather_armour', 'wooden_torch'];

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
  pickupItem: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

/**
 * Generate a dungeon level with monsters and items
 */
function generateLevel(depth: number): { level: Level; dungeon: GeneratedDungeon } {
  const generator = new DungeonGenerator(RNG);
  const dungeon = generator.generate({ width: DUNGEON_WIDTH, height: DUNGEON_HEIGHT, depth });

  const level = new Level(DUNGEON_WIDTH, DUNGEON_HEIGHT, { depth });

  // Copy dungeon tiles to Level terrain
  for (let y = 0; y < DUNGEON_HEIGHT; y++) {
    for (let x = 0; x < DUNGEON_WIDTH; x++) {
      const tile = dungeon.tiles[y]?.[x];
      if (tile) {
        level.setTerrain({ x, y }, tile.feat);
      }
    }
  }

  // Spawn monsters and items
  const depthBonus = Math.max(2, Math.min(10, Math.floor(depth / 3)));
  const monsterCount = BASE_MONSTER_COUNT + RNG.getUniformInt(1, 8) + depthBonus;
  monsterSpawner.spawnMonstersForLevel(level, depth, monsterCount);

  const itemCount = Math.max(3, dungeon.rooms.length) + RNG.getUniformInt(1, 3);
  itemSpawner.spawnItemsForLevel(level, depth, itemCount);

  return { level, dungeon };
}

function createInitialState(): GameState {
  const depth = 1;
  const { level, dungeon } = generateLevel(depth);

  // Find starting position
  let startPos = { x: Math.floor(DUNGEON_WIDTH / 2), y: Math.floor(DUNGEON_HEIGHT / 2) };
  if (dungeon.upStairs.length > 0) {
    startPos = dungeon.upStairs[0];
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

  player.equipStartingItems(itemGen, WARRIOR_STARTING_ITEMS);

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

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(createInitialState);
  const messageIdRef = useRef(2);

  /** Convert core GameMessages to UI Messages with IDs */
  const addGameMessages = (
    messages: Message[],
    gameMessages: GameMessage[],
    turn: number
  ): Message[] => {
    const newMessages = [...messages];
    for (const gm of gameMessages) {
      newMessages.push({
        id: messageIdRef.current++,
        text: gm.text,
        type: gm.type,
        turn,
      });
    }
    return newMessages.slice(-100);
  };

  const addMessage = useCallback((text: string, type: Message['type'] = 'normal') => {
    setState(prev => ({
      ...prev,
      messages: [
        ...prev.messages.slice(-99),
        { id: messageIdRef.current++, text, type, turn: prev.turn },
      ],
    }));
  }, []);

  const movePlayer = useCallback((dir: Direction) => {
    const { player, level, scheduler, messages, turn } = state;
    const newPos = movePosition(player.position, dir);
    const newTurn = turn + 1;
    let newMessages = [...messages];

    // Bump attack
    const targetMonster = level.getMonsterAt(newPos);
    if (targetMonster) {
      const result = gameLoop.playerAttack(player, targetMonster);
      newMessages = addGameMessages(newMessages, result.messages, newTurn);

      if (targetMonster.isDead) {
        level.removeMonster(targetMonster);
        scheduler.remove(targetMonster);
      }
      player.spendEnergy(ENERGY_PER_TURN);
    } else if (level.isWalkable(newPos)) {
      player.position = newPos;
      player.spendEnergy(ENERGY_PER_TURN);

      // Check for items
      const itemsHere = level.getItemsAt(newPos);
      if (itemsHere.length === 1) {
        newMessages.push({
          id: messageIdRef.current++,
          text: `You see ${itemsHere[0].name} here.`,
          type: 'info',
          turn: newTurn,
        });
      } else if (itemsHere.length > 1) {
        newMessages.push({
          id: messageIdRef.current++,
          text: `You see ${itemsHere.length} items here.`,
          type: 'info',
          turn: newTurn,
        });
      }
    } else {
      // Check for door
      const tile = level.getTile(newPos);
      if (tile?.terrain.flags.includes('DOOR')) {
        level.setTerrain(newPos, 'open_door');
        newMessages.push({
          id: messageIdRef.current++,
          text: 'You open the door.',
          type: 'info',
          turn: newTurn,
        });
        player.spendEnergy(ENERGY_PER_TURN);
      } else {
        return; // Can't move
      }
    }

    // Process monster turns
    const turnResult = gameLoop.processMonsterTurns(player, level, scheduler);
    newMessages = addGameMessages(newMessages, turnResult.messages, newTurn);

    // Clean up dead monsters
    for (const monster of level.getMonsters()) {
      if (monster.isDead) {
        level.removeMonster(monster);
        scheduler.remove(monster);
      }
    }

    setState(prev => ({
      ...prev,
      messages: newMessages,
      turn: newTurn,
    }));
  }, [state]);

  const goDownStairs = useCallback(() => {
    setState(prev => {
      const onStairs = prev.downStairs.some(
        s => s.x === prev.player.position.x && s.y === prev.player.position.y
      );
      if (!onStairs) {
        return {
          ...prev,
          messages: [...prev.messages.slice(-99), {
            id: messageIdRef.current++,
            text: 'You see no down stairs here.',
            type: 'info' as const,
            turn: prev.turn,
          }],
        };
      }

      const newDepth = prev.depth + 1;
      const { level, dungeon } = generateLevel(newDepth);

      let startPos = dungeon.upStairs[0] ?? dungeon.rooms[0]
        ? { x: dungeon.rooms[0].centerX, y: dungeon.rooms[0].centerY }
        : { x: DUNGEON_WIDTH / 2, y: DUNGEON_HEIGHT / 2 };
      if (dungeon.upStairs.length > 0) startPos = dungeon.upStairs[0];

      prev.player.position = startPos;

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
        messages: [...prev.messages.slice(-99), {
          id: messageIdRef.current++,
          text: `You descend to dungeon level ${newDepth}.`,
          type: 'info' as const,
          turn: prev.turn,
        }],
      };
    });
  }, []);

  const goUpStairs = useCallback(() => {
    setState(prev => {
      const onStairs = prev.upStairs.some(
        s => s.x === prev.player.position.x && s.y === prev.player.position.y
      );
      if (!onStairs) {
        return {
          ...prev,
          messages: [...prev.messages.slice(-99), {
            id: messageIdRef.current++,
            text: 'You see no up stairs here.',
            type: 'info' as const,
            turn: prev.turn,
          }],
        };
      }

      if (prev.depth <= 1) {
        return {
          ...prev,
          messages: [...prev.messages.slice(-99), {
            id: messageIdRef.current++,
            text: 'You cannot leave the dungeon!',
            type: 'info' as const,
            turn: prev.turn,
          }],
        };
      }

      const newDepth = prev.depth - 1;
      const { level, dungeon } = generateLevel(newDepth);

      let startPos = dungeon.downStairs[0] ?? dungeon.rooms[0]
        ? { x: dungeon.rooms[0].centerX, y: dungeon.rooms[0].centerY }
        : { x: DUNGEON_WIDTH / 2, y: DUNGEON_HEIGHT / 2 };
      if (dungeon.downStairs.length > 0) startPos = dungeon.downStairs[0];

      prev.player.position = startPos;

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
        messages: [...prev.messages.slice(-99), {
          id: messageIdRef.current++,
          text: `You ascend to dungeon level ${newDepth}.`,
          type: 'info' as const,
          turn: prev.turn,
        }],
      };
    });
  }, []);

  const pickupItem = useCallback(() => {
    const { player, level, turn } = state;
    const items = level.getItemsAt(player.position);

    if (items.length === 0) {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages.slice(-99), {
          id: messageIdRef.current++,
          text: 'There is nothing here to pick up.',
          type: 'info' as const,
          turn,
        }],
      }));
      return;
    }

    const item = items[items.length - 1];
    level.removeItem(item);
    player.addItem(item);

    setState(prev => ({
      ...prev,
      messages: [...prev.messages.slice(-99), {
        id: messageIdRef.current++,
        text: `You pick up ${item.name}.`,
        type: 'info' as const,
        turn,
      }],
    }));
  }, [state]);

  const value: GameContextValue = {
    state,
    movePlayer,
    addMessage,
    goDownStairs,
    goUpStairs,
    pickupItem,
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
