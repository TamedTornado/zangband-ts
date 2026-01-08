/**
 * Zustand store for game state
 *
 * Replaces the manual FSM subscription pattern with automatic React updates.
 */

import { create } from 'zustand';
import type { Player } from '../entities/Player';
import type { Level } from '../world/Level';
import type { Scheduler } from '../systems/Scheduler';
import type { Coord } from '../systems/dungeon/DungeonTypes';
import type { GameMessage } from '../fsm/GameData';

/**
 * Prompt state for inline input (rest duration, counts, etc.)
 */
export interface PromptState {
  text: string;
  value: string;
  callback: (value: string) => void;
}

export interface GameState {
  // Core game data
  player: Player | null;
  level: Level | null;
  scheduler: Scheduler | null;
  depth: number;
  turn: number;
  messages: GameMessage[];
  upStairs: Coord[];
  downStairs: Coord[];

  // Death info
  killedBy: string | null;

  // Targeting cursor
  cursor: Coord | null;

  // Effect targeting states
  itemTargeting: { prompt: string; validItemIndices: number[] } | null;
  symbolTargeting: { prompt: string } | null;
  directionTargeting: { prompt: string } | null;

  // Spell selection state (for cast/study modals)
  spellTargeting: {
    mode: 'cast' | 'study';
    prompt: string;
    spells: Array<{
      letter: string;
      name: string;
      level: number;
      mana: number;
      fail: number;
      canUse: boolean;
      reason?: string;
      realm?: string;
    }>;
  } | null;

  // Modal state
  activeModal: 'inventory' | 'equipment' | 'character' | null;
  inventoryMode: 'browse' | 'wield' | 'drop' | 'quaff' | 'read' | 'eat';

  // FSM state name (for UI)
  stateName: string;

  // UI prompt state
  prompt: PromptState | null;

  // Internal
  _messageId: number;
}

export interface GameActions {
  // Message handling
  addMessage: (text: string, type?: GameMessage['type']) => void;

  // Prompt handling
  setPrompt: (prompt: PromptState | null) => void;
  updatePromptValue: (value: string) => void;

  // State setters (for FSM to use)
  setStateName: (name: string) => void;
  setPlayer: (player: Player) => void;
  setLevel: (level: Level) => void;
  setScheduler: (scheduler: Scheduler) => void;
  setDepth: (depth: number) => void;
  setTurn: (turn: number) => void;
  incrementTurn: () => void;
  setStairs: (upStairs: Coord[], downStairs: Coord[]) => void;
  setKilledBy: (killer: string | null) => void;
  setCursor: (cursor: Coord | null) => void;
  setItemTargeting: (targeting: GameState['itemTargeting']) => void;
  setSymbolTargeting: (targeting: GameState['symbolTargeting']) => void;
  setDirectionTargeting: (targeting: GameState['directionTargeting']) => void;
  setSpellTargeting: (targeting: GameState['spellTargeting']) => void;
  setActiveModal: (modal: GameState['activeModal']) => void;
  setInventoryMode: (mode: GameState['inventoryMode']) => void;

  // Batch update for level generation
  setLevelData: (data: {
    level: Level;
    scheduler: Scheduler;
    depth: number;
    upStairs: Coord[];
    downStairs: Coord[];
  }) => void;

  // Reset for new game
  reset: () => void;
}

const initialState: GameState = {
  player: null,
  level: null,
  scheduler: null,
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
  spellTargeting: null,
  activeModal: null,
  inventoryMode: 'browse',
  stateName: 'none',
  prompt: null,
  _messageId: 0,
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,

  addMessage: (text, type = 'normal') => {
    set(state => {
      const newMessage: GameMessage = {
        id: state._messageId,
        text,
        type,
        turn: state.turn,
      };
      const messages = [...state.messages, newMessage];
      // Keep last 100 messages
      const trimmed = messages.length > 100 ? messages.slice(-100) : messages;
      return {
        messages: trimmed,
        _messageId: state._messageId + 1,
      };
    });
  },

  setPrompt: (prompt) => set({ prompt }),

  updatePromptValue: (value) => {
    const current = get().prompt;
    if (current) {
      set({ prompt: { ...current, value } });
    }
  },

  setStateName: (stateName) => set({ stateName }),
  setPlayer: (player) => set({ player }),
  setLevel: (level) => set({ level }),
  setScheduler: (scheduler) => set({ scheduler }),
  setDepth: (depth) => set({ depth }),
  setTurn: (turn) => set({ turn }),
  incrementTurn: () => set(state => ({ turn: state.turn + 1 })),
  setStairs: (upStairs, downStairs) => set({ upStairs, downStairs }),
  setKilledBy: (killedBy) => set({ killedBy }),
  setCursor: (cursor) => set({ cursor }),
  setItemTargeting: (itemTargeting) => set({ itemTargeting }),
  setSymbolTargeting: (symbolTargeting) => set({ symbolTargeting }),
  setDirectionTargeting: (directionTargeting) => set({ directionTargeting }),
  setSpellTargeting: (spellTargeting) => set({ spellTargeting }),
  setActiveModal: (activeModal) => set({ activeModal }),
  setInventoryMode: (inventoryMode) => set({ inventoryMode }),

  setLevelData: (data) => set({
    level: data.level,
    scheduler: data.scheduler,
    depth: data.depth,
    upStairs: data.upStairs,
    downStairs: data.downStairs,
  }),

  reset: () => set({
    ...initialState,
    _messageId: get()._messageId, // Preserve message ID counter
  }),
}));

// Non-React access for game logic
export const getGameStore = () => useGameStore.getState();
