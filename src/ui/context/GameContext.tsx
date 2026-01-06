import { createContext, useContext, useState, useRef, useMemo, type ReactNode } from 'react';
import { RNG } from 'rot-js';
import { Player, type EquipmentSlot } from '@/core/entities/Player';
import { Level } from '@/core/world/Level';
import { Direction, movePosition } from '@/core/types';
import { DungeonGenerator } from '@/core/systems/dungeon/DungeonGenerator';
import { FOVSystem } from '@/core/systems/FOV';
import { ItemGeneration } from '@/core/systems/ItemGeneration';
import { MonsterSpawner } from '@/core/systems/MonsterSpawner';
import { ItemSpawner } from '@/core/systems/ItemSpawner';
import { Scheduler } from '@/core/systems/Scheduler';
import { GameLoop, type GameMessage } from '@/core/systems/GameLoop';
import { RunSystem } from '@/core/systems/RunSystem';
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
const fovSystem = new FOVSystem();

// Starting equipment
const WARRIOR_STARTING_ITEMS = ['short_sword', 'soft_leather_armour', 'wooden_torch'];

interface Message {
  id: number;
  text: string;
  type: 'normal' | 'combat' | 'info' | 'danger';
  turn: number;
}

/**
 * Rest duration types - matches Zangband rest options
 */
export type RestDuration =
  | { type: 'turns'; count: number }
  | { type: 'hp_sp' }
  | { type: 'full' };

/**
 * Prompt state for inline input (rest duration, counts, etc.)
 */
interface PromptState {
  text: string;           // Prompt text shown to user
  value: string;          // Current input value
  callback: (value: string) => void;  // Called when Enter pressed
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
  prompt: PromptState | null;
}

interface GameActions {
  movePlayer: (dir: Direction) => void;
  addMessage: (text: string, type?: Message['type']) => void;
  goDownStairs: () => void;
  goUpStairs: () => void;
  pickupItem: () => void;
  wieldItem: (itemIndex: number) => void;
  dropItem: (itemIndex: number) => void;
  takeOffItem: (slot: string) => void;
  startRest: (duration: RestDuration) => void;
  quaffPotion: (itemIndex: number) => void;
  readScroll: (itemIndex: number) => void;
  eatFood: (itemIndex: number) => void;
  runInDirection: (dir: Direction) => void;
  // Prompt system
  showPrompt: (text: string, callback: (value: string) => void) => void;
  updatePrompt: (value: string) => void;
  submitPrompt: () => void;
  cancelPrompt: () => void;
  // Rest prompt helper
  promptRest: () => void;
}

interface GameContextValue {
  state: GameState;
  actions: GameActions;
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

  const monsterCount = level.getMonsters().length;
  const itemCount = level.getAllItems().length;

  return {
    player,
    level,
    scheduler,
    depth,
    turn: 0,
    messages: [
      { id: 0, text: 'Welcome to Zangband!', type: 'info', turn: 0 },
      { id: 1, text: `You enter dungeon level ${depth}. (${monsterCount} monsters, ${itemCount} items)`, type: 'info', turn: 0 },
    ],
    upStairs: dungeon.upStairs,
    downStairs: dungeon.downStairs,
    prompt: null,
  };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(createInitialState);
  const messageIdRef = useRef(2);

  // Keep a ref to current state so actions can access latest without dependencies
  const stateRef = useRef(state);
  stateRef.current = state;

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

  // Create stable actions object once
  const actions = useMemo<GameActions>(() => ({
    addMessage: (text: string, type: Message['type'] = 'normal') => {
      setState(prev => ({
        ...prev,
        messages: [
          ...prev.messages.slice(-99),
          { id: messageIdRef.current++, text, type, turn: prev.turn },
        ],
      }));
    },

    movePlayer: (dir: Direction) => {
      const { player, level, scheduler, messages, turn } = stateRef.current;
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
    },

    goDownStairs: () => {
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
    },

    goUpStairs: () => {
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
    },

    pickupItem: () => {
      const { player, level, turn } = stateRef.current;
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
    },

    wieldItem: (itemIndex: number) => {
      const { player, turn } = stateRef.current;
      const inventory = player.inventory;

      if (itemIndex < 0 || itemIndex >= inventory.length) {
        return;
      }

      const item = inventory[itemIndex];
      const result = player.equip(item);

      if (result.equipped) {
        const msgs: Array<{ text: string; type: 'info' | 'normal' }> = [];

        if (result.unequipped) {
          msgs.push({
            text: `You were wearing ${result.unequipped.name}.`,
            type: 'info',
          });
        }

        msgs.push({
          text: `You are wearing ${item.name}.`,
          type: 'info',
        });

        setState(prev => ({
          ...prev,
          messages: [
            ...prev.messages.slice(-99 + msgs.length),
            ...msgs.map(m => ({
              id: messageIdRef.current++,
              text: m.text,
              type: m.type,
              turn,
            })),
          ],
        }));
      } else {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages.slice(-99), {
            id: messageIdRef.current++,
            text: `You cannot wield ${item.name}.`,
            type: 'info' as const,
            turn,
          }],
        }));
      }
    },

    dropItem: (itemIndex: number) => {
      const { player, level, turn } = stateRef.current;
      const inventory = player.inventory;

      if (itemIndex < 0 || itemIndex >= inventory.length) {
        return;
      }

      const item = inventory[itemIndex];
      player.removeItem(item.id);
      item.position = { ...player.position };
      level.addItem(item);

      setState(prev => ({
        ...prev,
        messages: [...prev.messages.slice(-99), {
          id: messageIdRef.current++,
          text: `You drop ${item.name}.`,
          type: 'info' as const,
          turn,
        }],
      }));
    },

    takeOffItem: (slot: string) => {
      const { player, turn } = stateRef.current;
      const item = player.unequip(slot as EquipmentSlot);

      if (item) {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages.slice(-99), {
            id: messageIdRef.current++,
            text: `You take off ${item.name}.`,
            type: 'info' as const,
            turn,
          }],
        }));
      } else {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages.slice(-99), {
            id: messageIdRef.current++,
            text: 'You are not wearing anything there.',
            type: 'info' as const,
            turn,
          }],
        }));
      }
    },

    startRest: (duration: RestDuration) => {
      const { player, level, scheduler, messages, turn } = stateRef.current;
      const VISION_RADIUS = 10;
      const HP_REGEN_RATE = 10; // Regen 1 HP every N turns (based on CON later)

      // Check if any monster is already visible
      const isMonsterVisible = (): boolean => {
        const visible = fovSystem.compute(level, player.position, VISION_RADIUS);
        for (const monster of level.getMonsters()) {
          const key = `${monster.position.x},${monster.position.y}`;
          if (visible.has(key)) {
            return true;
          }
        }
        return false;
      };

      // Check if rest condition is met
      const isRestComplete = (mode: RestDuration, turnsRested: number): boolean => {
        switch (mode.type) {
          case 'turns':
            return turnsRested >= mode.count;
          case 'hp_sp':
          case 'full':
            return player.hp >= player.maxHp;
        }
      };

      // Already at full health for hp_sp/full modes
      if ((duration.type === 'hp_sp' || duration.type === 'full') && player.hp >= player.maxHp) {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages.slice(-99), {
            id: messageIdRef.current++,
            text: 'You are already fully rested.',
            type: 'info' as const,
            turn: prev.turn,
          }],
        }));
        return;
      }

      // Monster already visible
      if (isMonsterVisible()) {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages.slice(-99), {
            id: messageIdRef.current++,
            text: 'You cannot rest with monsters nearby!',
            type: 'danger' as const,
            turn: prev.turn,
          }],
        }));
        return;
      }

      let newMessages = [...messages];
      let currentTurn = turn;
      let turnsRested = 0;
      let interrupted = false;
      let interruptReason = '';
      const startHp = player.hp;

      newMessages.push({
        id: messageIdRef.current++,
        text: 'You begin resting...',
        type: 'info',
        turn: currentTurn,
      });

      // Rest loop - process turns until done or interrupted
      const MAX_REST_TURNS = 10000; // Safety limit
      while (turnsRested < MAX_REST_TURNS) {
        currentTurn++;
        turnsRested++;

        // HP regeneration
        if (turnsRested % HP_REGEN_RATE === 0 && player.hp < player.maxHp) {
          player.heal(1);
        }

        // Spend player energy and process monster turns
        player.spendEnergy(ENERGY_PER_TURN);
        const turnResult = gameLoop.processMonsterTurns(player, level, scheduler);
        newMessages = addGameMessages(newMessages, turnResult.messages, currentTurn);

        // Clean up dead monsters
        for (const monster of level.getMonsters()) {
          if (monster.isDead) {
            level.removeMonster(monster);
            scheduler.remove(monster);
          }
        }

        // Check interruption: player took damage
        if (player.hp < startHp) {
          interrupted = true;
          interruptReason = 'You are being attacked!';
          break;
        }

        // Check interruption: monster visible
        if (isMonsterVisible()) {
          interrupted = true;
          interruptReason = 'A monster comes into view!';
          break;
        }

        // Check if rest is complete
        if (isRestComplete(duration, turnsRested)) {
          break;
        }
      }

      // Final message
      if (interrupted) {
        newMessages.push({
          id: messageIdRef.current++,
          text: interruptReason,
          type: 'danger',
          turn: currentTurn,
        });
      } else {
        const hpGained = player.hp - startHp;
        const restMsg = hpGained > 0
          ? `You finish resting. (${turnsRested} turns, +${hpGained} HP)`
          : `You finish resting. (${turnsRested} turns)`;
        newMessages.push({
          id: messageIdRef.current++,
          text: restMsg,
          type: 'info',
          turn: currentTurn,
        });
      }

      setState(prev => ({
        ...prev,
        messages: newMessages.slice(-100),
        turn: currentTurn,
      }));
    },

    quaffPotion: (itemIndex: number) => {
      const { player, turn } = stateRef.current;
      const inventory = player.inventory;

      if (itemIndex < 0 || itemIndex >= inventory.length) {
        return;
      }

      const item = inventory[itemIndex];
      if (!item.isPotion) {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages.slice(-99), {
            id: messageIdRef.current++,
            text: `You cannot quaff ${item.name}.`,
            type: 'info' as const,
            turn,
          }],
        }));
        return;
      }

      // Apply potion effect based on item name/sval
      const msgs: Array<{ text: string; type: 'info' | 'normal' | 'combat' }> = [];
      msgs.push({ text: `You quaff ${item.name}.`, type: 'info' });

      // Simple healing potions (based on name patterns)
      const name = item.name.toLowerCase();
      if (name.includes('cure light wounds') || name.includes('minor healing')) {
        const heal = 2 + RNG.getUniformInt(1, 8);
        player.heal(heal);
        msgs.push({ text: `You feel better. (+${heal} HP)`, type: 'info' });
      } else if (name.includes('cure serious wounds') || name.includes('healing')) {
        const heal = 4 + RNG.getUniformInt(2, 16);
        player.heal(heal);
        msgs.push({ text: `You feel much better. (+${heal} HP)`, type: 'info' });
      } else if (name.includes('cure critical wounds') || name.includes('major healing')) {
        const heal = 6 + RNG.getUniformInt(3, 24);
        player.heal(heal);
        msgs.push({ text: `You feel very good! (+${heal} HP)`, type: 'info' });
      } else if (name.includes('restore life')) {
        player.hp = player.maxHp;
        msgs.push({ text: 'You feel your life force return!', type: 'info' });
      } else if (name.includes('speed') || name.includes('haste')) {
        msgs.push({ text: 'You feel yourself moving faster!', type: 'info' });
      } else if (name.includes('heroism')) {
        const heal = RNG.getUniformInt(5, 15);
        player.heal(heal);
        msgs.push({ text: `You feel like a hero! (+${heal} HP)`, type: 'info' });
      } else if (name.includes('berserk')) {
        const heal = RNG.getUniformInt(10, 25);
        player.heal(heal);
        msgs.push({ text: `You feel like a killing machine! (+${heal} HP)`, type: 'combat' });
      } else {
        // Unknown or minor potion (apple juice, water, etc.)
        msgs.push({ text: 'That tasted... interesting.', type: 'info' });
      }

      // Remove item from inventory
      player.removeItem(item.id);

      setState(prev => ({
        ...prev,
        messages: [
          ...prev.messages.slice(-99 + msgs.length),
          ...msgs.map(m => ({
            id: messageIdRef.current++,
            text: m.text,
            type: m.type,
            turn,
          })),
        ],
      }));
    },

    readScroll: (itemIndex: number) => {
      const { player, level, turn } = stateRef.current;
      const inventory = player.inventory;

      if (itemIndex < 0 || itemIndex >= inventory.length) {
        return;
      }

      const item = inventory[itemIndex];
      if (!item.isScroll) {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages.slice(-99), {
            id: messageIdRef.current++,
            text: `You cannot read ${item.name}.`,
            type: 'info' as const,
            turn,
          }],
        }));
        return;
      }

      const msgs: Array<{ text: string; type: 'info' | 'normal' | 'combat' }> = [];
      msgs.push({ text: `You read ${item.name}.`, type: 'info' });

      // Simple scroll effects based on name
      const name = item.name.toLowerCase();
      if (name.includes('teleport') || name.includes('phase door')) {
        // Random teleport within level
        const attempts = 100;
        for (let i = 0; i < attempts; i++) {
          const newX = RNG.getUniformInt(1, level.width - 2);
          const newY = RNG.getUniformInt(1, level.height - 2);
          if (level.isWalkable({ x: newX, y: newY })) {
            player.position = { x: newX, y: newY };
            msgs.push({ text: 'Your surroundings blur and shift!', type: 'info' });
            break;
          }
        }
      } else if (name.includes('word of recall')) {
        msgs.push({ text: 'The air around you crackles...', type: 'info' });
      } else if (name.includes('identify')) {
        msgs.push({ text: 'You sense the nature of your possessions.', type: 'info' });
      } else if (name.includes('light') || name.includes('illumination')) {
        msgs.push({ text: 'The area is lit up!', type: 'info' });
      } else if (name.includes('mapping') || name.includes('magic mapping')) {
        // Mark explored tiles (simple version)
        msgs.push({ text: 'You sense the layout of the dungeon.', type: 'info' });
      } else if (name.includes('monster detection')) {
        msgs.push({ text: 'You sense the presence of monsters!', type: 'info' });
      } else if (name.includes('blessing') || name.includes('holy chant')) {
        msgs.push({ text: 'You feel righteous!', type: 'info' });
      } else {
        msgs.push({ text: 'The scroll crumbles to dust.', type: 'info' });
      }

      // Remove item from inventory
      player.removeItem(item.id);

      setState(prev => ({
        ...prev,
        messages: [
          ...prev.messages.slice(-99 + msgs.length),
          ...msgs.map(m => ({
            id: messageIdRef.current++,
            text: m.text,
            type: m.type,
            turn,
          })),
        ],
      }));
    },

    eatFood: (itemIndex: number) => {
      const { player, turn } = stateRef.current;
      const inventory = player.inventory;

      if (itemIndex < 0 || itemIndex >= inventory.length) {
        return;
      }

      const item = inventory[itemIndex];
      if (!item.isFood) {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages.slice(-99), {
            id: messageIdRef.current++,
            text: `You cannot eat ${item.name}.`,
            type: 'info' as const,
            turn,
          }],
        }));
        return;
      }

      const msgs: Array<{ text: string; type: 'info' | 'normal' | 'danger' }> = [];
      msgs.push({ text: `You eat ${item.name}.`, type: 'info' });

      // Food effects based on name and pval
      const name = item.name.toLowerCase();
      const pval = item.generated?.baseItem.pval ?? 0;

      if (name.includes('ration') || name.includes('slime mold') || name.includes('jerky')) {
        // Normal food
        if (pval >= 5000) {
          msgs.push({ text: 'That was very satisfying!', type: 'info' });
        } else if (pval >= 2500) {
          msgs.push({ text: 'That hit the spot!', type: 'info' });
        } else {
          msgs.push({ text: 'That was tasty.', type: 'info' });
        }
      } else if (name.includes('waybread') || name.includes('lembas')) {
        // Magical food that heals
        const heal = RNG.getUniformInt(5, 15);
        player.heal(heal);
        msgs.push({ text: `You feel refreshed! (+${heal} HP)`, type: 'info' });
      } else if (name.includes('poison') || name.includes('sickness')) {
        const damage = RNG.getUniformInt(1, 10);
        player.takeDamage(damage);
        msgs.push({ text: `Yuck! That was poisonous! (-${damage} HP)`, type: 'danger' });
      } else if (name.includes('apple') || name.includes('juice')) {
        // Light snack/drink
        msgs.push({ text: 'Refreshing!', type: 'info' });
      } else {
        // Generic food
        msgs.push({ text: 'That was... edible.', type: 'info' });
      }

      // Remove item from inventory
      player.removeItem(item.id);

      setState(prev => ({
        ...prev,
        messages: [
          ...prev.messages.slice(-99 + msgs.length),
          ...msgs.map(m => ({
            id: messageIdRef.current++,
            text: m.text,
            type: m.type,
            turn,
          })),
        ],
      }));
    },

    runInDirection: (dir: Direction) => {
      const { player, level, scheduler, messages, turn } = stateRef.current;
      const VISION_RADIUS = 10;

      // Check if any monster is visible
      const isMonsterVisible = (): boolean => {
        const visible = fovSystem.compute(level, player.position, VISION_RADIUS);
        for (const monster of level.getMonsters()) {
          const key = `${monster.position.x},${monster.position.y}`;
          if (visible.has(key)) return true;
        }
        return false;
      };

      if (isMonsterVisible()) {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages.slice(-99), {
            id: messageIdRef.current++,
            text: 'You cannot run with monsters nearby!',
            type: 'danger' as const,
            turn: prev.turn,
          }],
        }));
        return;
      }

      let newMessages = [...messages];
      let currentTurn = turn;
      let stepsRun = 0;
      let interruptReason = '';
      const startHp = player.hp;

      // Initialize run state (Zangband algorithm)
      const runState = RunSystem.initRun(level, player.position, dir);
      let runDir = runState.direction;

      const MAX_RUN_STEPS = 100;
      while (stepsRun < MAX_RUN_STEPS) {
        const newPos = movePosition(player.position, runDir);

        if (!level.isWalkable(newPos)) {
          if (stepsRun === 0) interruptReason = 'Something blocks your path.';
          break;
        }

        const tile = level.getTile(newPos);
        if (tile?.terrain.flags.includes('DOOR')) break;

        // Move
        stepsRun++;
        currentTurn++;
        player.position = newPos;
        player.spendEnergy(ENERGY_PER_TURN);

        // Process monsters
        const turnResult = gameLoop.processMonsterTurns(player, level, scheduler);
        newMessages = addGameMessages(newMessages, turnResult.messages, currentTurn);
        for (const monster of level.getMonsters()) {
          if (monster.isDead) {
            level.removeMonster(monster);
            scheduler.remove(monster);
          }
        }

        // Interruption checks
        if (player.hp < startHp) { interruptReason = 'You are being attacked!'; break; }
        if (isMonsterVisible()) { interruptReason = 'A monster comes into view!'; break; }

        const itemsHere = level.getItemsAt(newPos);
        if (itemsHere.length > 0) {
          newMessages.push({
            id: messageIdRef.current++,
            text: itemsHere.length === 1 ? `You see ${itemsHere[0].name} here.` : `You see ${itemsHere.length} items here.`,
            type: 'info',
            turn: currentTurn,
          });
          break;
        }

        // Run test (handles doorways, corners, intersections)
        const result = RunSystem.testRun(level, newPos, runState);
        if (result.stopReason) interruptReason = result.stopReason;
        if (!result.canContinue) break;
        runDir = result.newDirection;
      }

      if (stepsRun > 0 || interruptReason) {
        if (interruptReason) {
          newMessages.push({ id: messageIdRef.current++, text: interruptReason, type: 'danger', turn: currentTurn });
        }
        setState(prev => ({ ...prev, messages: newMessages.slice(-100), turn: currentTurn }));
      }
    },

    // Prompt system - for inline input like rest duration
    showPrompt: (text: string, callback: (value: string) => void) => {
      setState(prev => ({
        ...prev,
        prompt: { text, value: '', callback },
      }));
    },

    updatePrompt: (value: string) => {
      setState(prev => {
        if (!prev.prompt) return prev;
        return {
          ...prev,
          prompt: { ...prev.prompt, value },
        };
      });
    },

    submitPrompt: () => {
      const { prompt } = stateRef.current;
      if (prompt) {
        prompt.callback(prompt.value);
        setState(prev => ({ ...prev, prompt: null }));
      }
    },

    cancelPrompt: () => {
      setState(prev => ({ ...prev, prompt: null }));
    },

    // Rest prompt - shows inline prompt then calls startRest
    promptRest: () => {
      const handleRestInput = (value: string) => {
        const trimmed = value.trim();
        if (trimmed === '*') {
          actions.startRest({ type: 'hp_sp' });
        } else if (trimmed === '&') {
          actions.startRest({ type: 'full' });
        } else {
          const turns = parseInt(trimmed, 10);
          if (!isNaN(turns) && turns > 0) {
            actions.startRest({ type: 'turns', count: turns });
          }
        }
      };

      setState(prev => ({
        ...prev,
        prompt: {
          text: "Rest (0-9999, '*' for HP/SP, '&' for HP/SP/status): ",
          value: '',
          callback: handleRestInput,
        },
      }));
    },
  }), []); // Empty deps - actions are stable

  const value: GameContextValue = {
    state,
    actions,
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
