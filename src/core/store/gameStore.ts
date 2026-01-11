/**
 * Zustand store for game state
 *
 * Replaces the manual FSM subscription pattern with automatic React updates.
 */

import { create } from 'zustand';
import type { Player } from '../entities/Player';
import type { ILevel } from '../world/Level';
import type { Scheduler } from '../systems/Scheduler';
import type { Coord } from '../systems/dungeon/DungeonTypes';
import type { GameMessage } from '../fsm/GameData';
import type { CharacterCreationData } from '../data/characterCreation';
import type { StoreEntrance } from '../systems/town/TownGenerator';
import type { WildernessMap } from '../systems/wilderness/WildernessGenerator';
import type { WildPlace } from '../data/WildernessTypes';

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
  level: ILevel | null;
  scheduler: Scheduler | null;
  depth: number;
  turn: number;
  messages: GameMessage[];
  upStairs: Coord[];
  downStairs: Coord[];

  // Town/store data
  storeEntrances: StoreEntrance[];
  isTown: boolean;

  // Death info
  killedBy: string | null;

  // Targeting cursor
  cursor: Coord | null;

  // Last confirmed target monster ID (for repeat targeting)
  lastTargetMonsterId: string | null;

  // Currently visible monster IDs (for tracking newly visible monsters)
  visibleMonsterIds: Set<string>;

  // Repeat last command system
  lastCommand: {
    actionType: string;
    itemId: string;
    spellKey?: string;
    targetPosition?: { x: number; y: number };
    targetDirection?: string;
  } | null;
  isRepeating: boolean;

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

  // Character creation state
  characterCreation: CharacterCreationData | null;

  // Shopping state
  shopping: {
    storeKey: string;
    mode: 'browse' | 'buying' | 'selling' | 'examining';
    storeName: string;
    ownerName: string;
    stock: Array<{ name: string; price: number; quantity: number }>;
  } | null;

  // Service building state
  serviceBuilding: {
    buildingKey: string;
    mode: 'browse' | 'item_select' | 'confirm';
    buildingName: string;
    services: Array<{
      key: string;
      name: string;
      description: string;
      cost: number;
      available: boolean;
      reason?: string;
    }>;
    selectedServiceKey?: string;
    itemPrompt?: string;
    validItemIndices?: number[];
  } | null;

  // Previous character for quick start (persisted to localStorage)
  previousCharacter: CharacterCreationData | null;

  // Wilderness state
  wildernessX: number;
  wildernessY: number;
  isInWilderness: boolean;
  wildernessMap: WildernessMap | null;
  currentPlace: WildPlace | null;

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
  setLevel: (level: ILevel) => void;
  setScheduler: (scheduler: Scheduler) => void;
  setDepth: (depth: number) => void;
  setTurn: (turn: number) => void;
  incrementTurn: () => void;
  setStairs: (upStairs: Coord[], downStairs: Coord[]) => void;
  setKilledBy: (killer: string | null) => void;
  setCursor: (cursor: Coord | null) => void;
  setLastTargetMonsterId: (monsterId: string | null) => void;
  updateVisibleMonsters: (newIds: Set<string>) => Set<string>; // Returns newly visible IDs
  setLastCommand: (command: GameState['lastCommand']) => void;
  setIsRepeating: (isRepeating: boolean) => void;
  setItemTargeting: (targeting: GameState['itemTargeting']) => void;
  setSymbolTargeting: (targeting: GameState['symbolTargeting']) => void;
  setDirectionTargeting: (targeting: GameState['directionTargeting']) => void;
  setSpellTargeting: (targeting: GameState['spellTargeting']) => void;
  setActiveModal: (modal: GameState['activeModal']) => void;
  setInventoryMode: (mode: GameState['inventoryMode']) => void;

  // Batch update for level generation
  setLevelData: (data: {
    level: ILevel;
    scheduler: Scheduler;
    depth: number;
    upStairs: Coord[];
    downStairs: Coord[];
    storeEntrances?: StoreEntrance[];
    isTown?: boolean;
    isWilderness?: boolean;
  }) => void;

  // Character creation
  setCharacterCreation: (data: CharacterCreationData | null) => void;
  updateCharacterCreation: (partial: Partial<CharacterCreationData>) => void;

  // Shopping
  setShopping: (shopping: GameState['shopping']) => void;
  updateShoppingMode: (mode: 'browse' | 'buying' | 'selling' | 'examining') => void;
  updateShoppingStock: (stock: GameState['shopping'] extends null ? never : NonNullable<GameState['shopping']>['stock']) => void;

  // Service building
  setServiceBuilding: (serviceBuilding: GameState['serviceBuilding']) => void;
  updateServiceBuildingMode: (mode: 'browse' | 'item_select' | 'confirm') => void;

  // Quick start
  setPreviousCharacter: (data: CharacterCreationData | null) => void;

  // Wilderness
  setWildernessPosition: (x: number, y: number) => void;
  setIsInWilderness: (isInWilderness: boolean) => void;
  setWildernessMap: (map: WildernessMap | null) => void;
  setCurrentPlace: (place: WildPlace | null) => void;

  // Reset for new game
  reset: () => void;
}

// Load previous character from localStorage if available
function loadPreviousCharacter(): CharacterCreationData | null {
  try {
    const stored = localStorage.getItem('zangband_previousCharacter');
    if (stored) {
      return JSON.parse(stored) as CharacterCreationData;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

const initialState: GameState = {
  player: null,
  level: null,
  scheduler: null,
  depth: 0,
  turn: 0,
  messages: [],
  upStairs: [],
  downStairs: [],
  storeEntrances: [],
  isTown: false,
  killedBy: null,
  cursor: null,
  lastTargetMonsterId: null,
  visibleMonsterIds: new Set<string>(),
  lastCommand: null,
  isRepeating: false,
  itemTargeting: null,
  symbolTargeting: null,
  directionTargeting: null,
  spellTargeting: null,
  activeModal: null,
  inventoryMode: 'browse',
  stateName: 'none',
  prompt: null,
  characterCreation: null,
  shopping: null,
  serviceBuilding: null,
  previousCharacter: loadPreviousCharacter(),
  wildernessX: 0,
  wildernessY: 0,
  isInWilderness: false,
  wildernessMap: null,
  currentPlace: null,
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
  setLastTargetMonsterId: (lastTargetMonsterId) => set({ lastTargetMonsterId }),
  updateVisibleMonsters: (newIds) => {
    const current = get().visibleMonsterIds;
    const newlyVisible = new Set<string>();
    for (const id of newIds) {
      if (!current.has(id)) {
        newlyVisible.add(id);
      }
    }
    set({ visibleMonsterIds: newIds });
    return newlyVisible;
  },
  setLastCommand: (lastCommand) => set({ lastCommand }),
  setIsRepeating: (isRepeating) => set({ isRepeating }),
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
    storeEntrances: data.storeEntrances ?? [],
    isTown: data.isTown ?? false,
    isInWilderness: data.isWilderness ?? false,
  }),

  setCharacterCreation: (characterCreation) => set({ characterCreation }),

  updateCharacterCreation: (partial) => {
    const current = get().characterCreation;
    if (current) {
      set({ characterCreation: { ...current, ...partial } });
    }
  },

  setShopping: (shopping) => set({ shopping }),

  updateShoppingMode: (mode) => {
    const current = get().shopping;
    if (current) {
      set({ shopping: { ...current, mode } });
    }
  },

  updateShoppingStock: (stock) => {
    const current = get().shopping;
    if (current) {
      set({ shopping: { ...current, stock } });
    }
  },

  setServiceBuilding: (serviceBuilding) => set({ serviceBuilding }),

  updateServiceBuildingMode: (mode) => {
    const current = get().serviceBuilding;
    if (current) {
      set({ serviceBuilding: { ...current, mode } });
    }
  },

  setPreviousCharacter: (data) => {
    set({ previousCharacter: data });
    // Persist to localStorage
    if (data) {
      localStorage.setItem('zangband_previousCharacter', JSON.stringify(data));
    } else {
      localStorage.removeItem('zangband_previousCharacter');
    }
  },

  // Wilderness setters
  setWildernessPosition: (x, y) => set({ wildernessX: x, wildernessY: y }),
  setIsInWilderness: (isInWilderness) => set({ isInWilderness }),
  setWildernessMap: (wildernessMap) => set({ wildernessMap }),
  setCurrentPlace: (currentPlace) => set({ currentPlace }),

  reset: () => set({
    ...initialState,
    previousCharacter: get().previousCharacter, // Preserve for quick start
    _messageId: get()._messageId, // Preserve message ID counter
  }),
}));

// Non-React access for game logic
export const getGameStore = () => useGameStore.getState();
