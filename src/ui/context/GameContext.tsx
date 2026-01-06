import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { Player } from '@/core/entities/Player';
import { Level } from '@/core/world/Level';
import { Direction } from '@/core/types';

const WIDTH = 198;
const HEIGHT = 66;

interface Message {
  id: number;
  text: string;
  type: 'normal' | 'combat' | 'info' | 'danger';
  turn: number;
}

interface GameState {
  player: Player;
  level: Level;
  turn: number;
  messages: Message[];
}

interface GameContextValue {
  state: GameState;
  movePlayer: (dir: Direction) => void;
  addMessage: (text: string, type?: Message['type']) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

function createInitialState(): GameState {
  const level = new Level(WIDTH, HEIGHT);

  // Add walls around the border
  for (let x = 0; x < WIDTH; x++) {
    level.setWalkable({ x, y: 0 }, false);
    level.setWalkable({ x, y: HEIGHT - 1 }, false);
  }
  for (let y = 0; y < HEIGHT; y++) {
    level.setWalkable({ x: 0, y }, false);
    level.setWalkable({ x: WIDTH - 1, y }, false);
  }

  const player = new Player({
    id: 'player',
    position: { x: Math.floor(WIDTH / 2), y: Math.floor(HEIGHT / 2) },
    maxHp: 100,
    speed: 110,
    stats: { str: 16, int: 12, wis: 10, dex: 14, con: 15, chr: 8 },
  });

  return {
    player,
    level,
    turn: 0,
    messages: [
      { id: 0, text: 'Welcome to Zangband!', type: 'info', turn: 0 },
    ],
  };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(createInitialState);
  const messageIdRef = useRef(1);

  const addMessage = useCallback((text: string, type: Message['type'] = 'normal') => {
    setState(prev => ({
      ...prev,
      messages: [
        ...prev.messages.slice(-99), // Keep last 100
        { id: messageIdRef.current++, text, type, turn: prev.turn },
      ],
    }));
  }, []);

  const movePlayer = useCallback((dir: Direction) => {
    setState(prev => {
      const moved = prev.player.tryMove(dir, prev.level);
      if (moved) {
        return { ...prev, turn: prev.turn + 1 };
      }
      return prev;
    });
  }, []);

  const value: GameContextValue = {
    state,
    movePlayer,
    addMessage,
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
