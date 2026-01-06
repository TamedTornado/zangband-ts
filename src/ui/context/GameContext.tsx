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
}

interface GameActions {
  movePlayer: (dir: Direction) => void;
  addMessage: (text: string, type?: GameMessage['type']) => void;
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
  restart: () => void;
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
  const { player, level, depth, turn, messages, upStairs, downStairs } = fsm.data;
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

    wieldItem: (itemIndex: number) => {
      fsm.dispatch({ type: 'wield', itemIndex });
    },

    dropItem: (itemIndex: number) => {
      fsm.dispatch({ type: 'drop', itemIndex });
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

    quaffPotion: (itemIndex: number) => {
      fsm.dispatch({ type: 'quaff', itemIndex });
    },

    readScroll: (itemIndex: number) => {
      fsm.dispatch({ type: 'read', itemIndex });
    },

    eatFood: (itemIndex: number) => {
      fsm.dispatch({ type: 'eat', itemIndex });
    },

    restart: () => {
      fsm.dispatch({ type: 'restart' });
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
