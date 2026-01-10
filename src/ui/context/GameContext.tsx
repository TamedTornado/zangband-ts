import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Direction } from '@/core/types';
import { GameFSM } from '@/core/fsm/GameFSM';
import { SexSelectionState } from '@/core/fsm/states/creation/SexSelectionState';
import type { GameMessage } from '@/core/fsm/GameData';
import type { Player } from '@/core/entities/Player';
import type { Level } from '@/core/world/Level';
import type { Item } from '@/core/entities/Item';
import type { GameAction } from '@/core/fsm/Actions';
import { useGameStore, type PromptState } from '@/core/store/gameStore';
import type { CharacterCreationData } from '@/core/data/characterCreation';

/**
 * Rest duration types - matches Zangband rest options
 */
export type RestDuration =
  | { type: 'turns'; count: number }
  | { type: 'hp_sp' }
  | { type: 'full' };

interface GameState {
  player: Player | null;
  level: Level | null;
  depth: number;
  turn: number;
  messages: GameMessage[];
  upStairs: { x: number; y: number }[];
  downStairs: { x: number; y: number }[];
  prompt: PromptState | null;
  gameOver: boolean;
  stateName: string;
  cursor: { x: number; y: number } | null;
  // Targeting state
  itemTargeting: { prompt: string; validItemIndices: number[] } | null;
  symbolTargeting: { prompt: string } | null;
  directionTargeting: { prompt: string } | null;
  // Character creation
  characterCreation: CharacterCreationData | null;
  // Town/store data
  isTown: boolean;
  // Shopping state
  shopping: {
    storeKey: string;
    mode: 'buy' | 'sell';
    storeName: string;
    ownerName: string;
    stock: Array<{ name: string; price: number; quantity: number }>;
  } | null;
}

interface GameActions {
  movePlayer: (dir: Direction) => void;
  addMessage: (text: string, type?: GameMessage['type']) => void;
  goDownStairs: () => void;
  goUpStairs: () => void;
  pickupItem: () => void;
  wieldItem: () => void;
  dropItem: () => void;
  takeOffItem: (slot: string) => void;
  startRest: (duration: RestDuration) => void;
  quaffPotion: () => void;
  readScroll: () => void;
  eatFood: () => void;
  zapDevice: () => void;
  castSpell: () => void;
  studySpell: () => void;
  runInDirection: (dir: Direction) => void;
  restart: () => void;
  // Targeting
  look: () => void;
  target: () => void;
  moveCursor: (dir: Direction) => void;
  cycleTarget: () => void;
  confirmTarget: () => void;
  cancelTarget: () => void;
  // View toggles
  toggleInventory: () => void;
  toggleEquipment: () => void;
  toggleCharacter: () => void;
  // Generic input (states interpret contextually)
  letterSelect: (letter: string) => void;
  showList: () => void;
  // Prompt system
  showPrompt: (text: string, callback: (value: string) => void) => void;
  updatePrompt: (value: string) => void;
  submitPrompt: () => void;
  cancelPrompt: () => void;
  // Rest prompt helper
  promptRest: () => void;
  // Repeat last command
  repeatLastCommand: () => void;
  // Item display
  getItemDisplayName: (item: Item) => string;
  // Store entry
  enterCurrentStore: () => void;
  exitStore: () => void;
  // Generic dispatch for any action
  dispatch: (action: GameAction) => void;
}

interface GameContextValue {
  state: GameState;
  actions: GameActions;
}

const GameContext = createContext<GameContextValue | null>(null);

// Create FSM instance (singleton for the app)
const fsm = new GameFSM(new SexSelectionState());

export function GameProvider({ children }: { children: ReactNode }) {
  // Subscribe to store updates - Zustand handles this automatically
  const player = useGameStore(s => s.player);
  const level = useGameStore(s => s.level);
  const depth = useGameStore(s => s.depth);
  const turn = useGameStore(s => s.turn);
  const messages = useGameStore(s => s.messages);
  const upStairs = useGameStore(s => s.upStairs);
  const downStairs = useGameStore(s => s.downStairs);
  const prompt = useGameStore(s => s.prompt);
  const stateName = useGameStore(s => s.stateName);
  const cursor = useGameStore(s => s.cursor);
  const itemTargeting = useGameStore(s => s.itemTargeting);
  const symbolTargeting = useGameStore(s => s.symbolTargeting);
  const directionTargeting = useGameStore(s => s.directionTargeting);
  const characterCreation = useGameStore(s => s.characterCreation);
  const isTown = useGameStore(s => s.isTown);
  const shopping = useGameStore(s => s.shopping);
  const setPrompt = useGameStore(s => s.setPrompt);
  const updatePromptValue = useGameStore(s => s.updatePromptValue);
  const addMessage = useGameStore(s => s.addMessage);

  const state: GameState = {
    player,
    level,
    depth,
    turn,
    messages,
    upStairs,
    downStairs,
    prompt,
    gameOver: stateName === 'dead',
    stateName,
    cursor,
    itemTargeting,
    symbolTargeting,
    directionTargeting,
    characterCreation,
    isTown,
    shopping,
  };

  const actions = useMemo<GameActions>(() => ({
    addMessage: (text: string, type: GameMessage['type'] = 'normal') => {
      addMessage(text, type);
    },

    movePlayer: (dir: Direction) => {
      fsm.dispatch({ type: 'move', dir });
    },

    runInDirection: (dir: Direction) => {
      fsm.dispatch({ type: 'run', dir });
    },

    goDownStairs: () => {
      fsm.dispatch({ type: 'goDownStairs' });
    },

    goUpStairs: () => {
      fsm.dispatch({ type: 'goUpStairs' });
    },

    pickupItem: () => {
      fsm.dispatch({ type: 'pickup' });
    },

    wieldItem: () => {
      fsm.dispatch({ type: 'wield' });
    },

    dropItem: () => {
      fsm.dispatch({ type: 'drop' });
    },

    takeOffItem: (slot: string) => {
      fsm.dispatch({ type: 'takeOff', slot });
    },

    startRest: (duration: RestDuration) => {
      const mode = duration.type === 'turns'
        ? { turns: duration.count }
        : duration.type === 'hp_sp'
          ? 'hp'
          : 'full';
      fsm.dispatch({ type: 'rest', mode: mode as 'full' | 'hp' | { turns: number } });
    },

    quaffPotion: () => {
      fsm.dispatch({ type: 'quaff' });
    },

    readScroll: () => {
      fsm.dispatch({ type: 'read' });
    },

    eatFood: () => {
      fsm.dispatch({ type: 'eat' });
    },

    zapDevice: () => {
      fsm.dispatch({ type: 'zap' });
    },

    castSpell: () => {
      fsm.dispatch({ type: 'cast' });
    },

    studySpell: () => {
      fsm.dispatch({ type: 'study' });
    },

    restart: () => {
      fsm.dispatch({ type: 'restart' });
    },

    // Targeting
    look: () => {
      fsm.dispatch({ type: 'look' });
    },

    target: () => {
      fsm.dispatch({ type: 'target' });
    },

    moveCursor: (dir: Direction) => {
      fsm.dispatch({ type: 'moveCursor', dir });
    },

    cycleTarget: () => {
      fsm.dispatch({ type: 'cycleTarget' });
    },

    confirmTarget: () => {
      fsm.dispatch({ type: 'confirmTarget' });
    },

    cancelTarget: () => {
      fsm.dispatch({ type: 'cancelTarget' });
    },

    toggleInventory: () => {
      fsm.dispatch({ type: 'toggleInventory' });
    },

    toggleEquipment: () => {
      fsm.dispatch({ type: 'toggleEquipment' });
    },

    toggleCharacter: () => {
      fsm.dispatch({ type: 'toggleCharacter' });
    },

    letterSelect: (letter: string) => {
      fsm.dispatch({ type: 'letterSelect', letter });
    },

    showList: () => {
      fsm.dispatch({ type: 'showList' });
    },

    // Prompt system
    showPrompt: (text: string, callback: (value: string) => void) => {
      setPrompt({ text, value: '', callback });
    },

    updatePrompt: (value: string) => {
      updatePromptValue(value);
    },

    submitPrompt: () => {
      if (prompt) {
        prompt.callback(prompt.value);
        setPrompt(null);
      }
    },

    cancelPrompt: () => {
      setPrompt(null);
    },

    promptRest: () => {
      const handleRestInput = (value: string) => {
        const trimmed = value.trim();
        if (trimmed === '*') {
          fsm.dispatch({ type: 'rest', mode: 'hp' });
        } else if (trimmed === '&') {
          fsm.dispatch({ type: 'rest', mode: 'full' });
        } else {
          const turns = parseInt(trimmed, 10);
          if (!isNaN(turns) && turns > 0) {
            fsm.dispatch({ type: 'rest', mode: { turns } });
          }
        }
      };

      setPrompt({
        text: "Rest (0-9999, '*' for HP/SP, '&' for HP/SP/status): ",
        value: '',
        callback: handleRestInput,
      });
    },

    repeatLastCommand: () => {
      fsm.dispatch({ type: 'repeatLastCommand' });
    },

    getItemDisplayName: (item: Item) => {
      return fsm.getItemDisplayName(item);
    },

    enterCurrentStore: () => {
      // Check if player is on a store entrance
      const store = useGameStore.getState();
      const playerPos = store.player?.position;
      if (!playerPos) return;

      const storeKey = fsm.storeManager.getStoreKeyAt(playerPos);
      if (storeKey) {
        fsm.dispatch({ type: 'enterStore', storeKey });
      }
    },

    exitStore: () => {
      fsm.dispatch({ type: 'exitStore' });
    },

    dispatch: (action: GameAction) => {
      fsm.dispatch(action);
    },
  }), [prompt, setPrompt, updatePromptValue, addMessage]);

  const value: GameContextValue = { state, actions };

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
