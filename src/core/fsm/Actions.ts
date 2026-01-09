/**
 * Game Actions - inputs to the FSM
 */

import type { Direction } from '../types';

export type GameAction =
  | { type: 'move'; dir: Direction }
  | { type: 'run'; dir: Direction }
  | { type: 'goDownStairs' }
  | { type: 'goUpStairs' }
  | { type: 'pickup' }
  | { type: 'takeOff'; slot: string }
  | { type: 'rest'; mode: 'full' | 'hp' | { turns: number } }
  | { type: 'restart' }
  // Item actions (trigger FSM state transitions for item selection)
  | { type: 'wield' }
  | { type: 'drop' }
  | { type: 'quaff' }
  | { type: 'read' }
  | { type: 'eat' }
  | { type: 'zap' }
  // Magic actions
  | { type: 'cast' }
  | { type: 'study' }
  // Modal/view actions (trigger FSM state transitions)
  | { type: 'toggleInventory' }
  | { type: 'toggleEquipment' }
  | { type: 'toggleCharacter' }
  // Look/Target mode (cursor-based)
  | { type: 'look' }
  | { type: 'target' }
  | { type: 'moveCursor'; dir: Direction }
  | { type: 'cycleTarget' }
  | { type: 'confirmTarget' }
  | { type: 'cancelTarget' }
  // Effect targeting (item selection, symbol input, direction)
  | { type: 'selectTargetItem'; itemIndex: number }
  | { type: 'selectTargetSymbol'; symbol: string }
  | { type: 'selectTargetDirection'; dir: Direction }
  // Generic inputs (states interpret contextually)
  | { type: 'letterSelect'; letter: string }
  | { type: 'showList' }
  // Repeat last command
  | { type: 'repeatLastCommand' };
