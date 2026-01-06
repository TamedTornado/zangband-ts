import { useEffect } from 'react';
import { Direction } from '@/core/types';
import { useGame } from '../context/GameContext';

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: Direction.North,
  ArrowDown: Direction.South,
  ArrowLeft: Direction.West,
  ArrowRight: Direction.East,
  k: Direction.North,
  j: Direction.South,
  h: Direction.West,
  l: Direction.East,
  y: Direction.NorthWest,
  u: Direction.NorthEast,
  b: Direction.SouthWest,
  n: Direction.SouthEast,
  // Numpad
  '8': Direction.North,
  '2': Direction.South,
  '4': Direction.West,
  '6': Direction.East,
  '7': Direction.NorthWest,
  '9': Direction.NorthEast,
  '1': Direction.SouthWest,
  '3': Direction.SouthEast,
};

export function useKeyboard() {
  const { movePlayer, goDownStairs, goUpStairs, pickupItem } = useGame();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Handle stair navigation
      if (e.key === '>' || (e.key === '.' && e.shiftKey)) {
        e.preventDefault();
        goDownStairs();
        return;
      }
      if (e.key === '<' || (e.key === ',' && e.shiftKey)) {
        e.preventDefault();
        goUpStairs();
        return;
      }

      // Pickup item
      if (e.key === 'g' || e.key === ',') {
        e.preventDefault();
        pickupItem();
        return;
      }

      const dir = KEY_MAP[e.key];
      if (dir !== undefined) {
        e.preventDefault();
        movePlayer(dir);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, goDownStairs, goUpStairs, pickupItem]);
}
