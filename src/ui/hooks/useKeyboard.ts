import { useEffect } from 'react';
import { Direction } from '@/core/types';
import { useGame } from '../context/GameContext';
import { useModal } from '../context/ModalContext';

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
  const { activeModal, toggleModal } = useModal();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // If a modal is open, let the modal handle keys (except toggle keys)
      if (activeModal) {
        // Allow toggling modals off with same key
        if (e.key === 'i' && activeModal === 'inventory') {
          e.preventDefault();
          toggleModal('inventory');
          return;
        }
        if (e.key === 'e' && activeModal === 'equipment') {
          e.preventDefault();
          toggleModal('equipment');
          return;
        }
        if (e.key === 'C' && activeModal === 'character') {
          e.preventDefault();
          toggleModal('character');
          return;
        }
        // Other keys handled by modal's own handlers
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
      if (e.key === 'g') {
        e.preventDefault();
        pickupItem();
        return;
      }

      // Inventory modal
      if (e.key === 'i') {
        e.preventDefault();
        toggleModal('inventory');
        return;
      }

      // Equipment modal
      if (e.key === 'e') {
        e.preventDefault();
        toggleModal('equipment');
        return;
      }

      // Character screen (shift+C)
      if (e.key === 'C') {
        e.preventDefault();
        toggleModal('character');
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
  }, [movePlayer, goDownStairs, goUpStairs, pickupItem, activeModal, toggleModal]);
}
