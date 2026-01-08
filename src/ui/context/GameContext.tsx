import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { Direction } from '@/core/types';
import { GameFSM } from '@/core/fsm/GameFSM';
import { PlayingState } from '@/core/fsm/states/PlayingState';
import type { GameMessage } from '@/core/fsm/GameData';
import type { Player } from '@/core/entities/Player';

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
  text: string;
  value: string;
  callback: (value: string) => void;
}

interface GameState {
  player: Player;
  level: GameFSM['data']['level'];
  depth: number;
  turn: number;
  messages: GameMessage[];
  upStairs: { x: number; y: number }[];
  downStairs: { x: number; y: number }[];
  prompt: PromptState | null;
  gameOver: boolean;
  stateName: string;
  cursor: { x: number; y: number } | null;
  // Targeting state (from FSM)
  itemTargeting: { prompt: string; validItemIndices: number[] } | null;
  symbolTargeting: { prompt: string } | null;
  directionTargeting: { prompt: string } | null;
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
}

interface GameContextValue {
  state: GameState;
  actions: GameActions;
}

const GameContext = createContext<GameContextValue | null>(null);

// Create FSM instance (singleton for the app)
const fsm = new GameFSM(new PlayingState());

function extractState(fsm: GameFSM, prompt: PromptState | null): GameState {
  const {
    player, level, depth, turn, messages, upStairs, downStairs, cursor,
    itemTargeting, symbolTargeting, directionTargeting,
  } = fsm.data;
  return {
    player,
    level,
    depth,
    turn,
    messages,
    upStairs,
    downStairs,
    prompt,
    gameOver: fsm.stateName === 'dead',
    stateName: fsm.stateName,
    cursor,
    itemTargeting,
    symbolTargeting,
    directionTargeting,
  };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [, forceUpdate] = useState({});

  // Subscribe to FSM changes
  useEffect(() => {
    return fsm.subscribe(() => forceUpdate({}));
  }, []);

  const state = extractState(fsm, prompt);

  const actions = useMemo<GameActions>(() => ({
    addMessage: (text: string, type: GameMessage['type'] = 'normal') => {
      fsm.addMessage(text, type);
      fsm.notify();
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

    // Prompt system (UI-only, not FSM)
    showPrompt: (text: string, callback: (value: string) => void) => {
      setPrompt({ text, value: '', callback });
    },

    updatePrompt: (value: string) => {
      setPrompt(prev => prev ? { ...prev, value } : null);
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
  }), [prompt]);

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
