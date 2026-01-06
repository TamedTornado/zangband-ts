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
  | { type: 'wield'; itemIndex: number }
  | { type: 'drop'; itemIndex: number }
  | { type: 'takeOff'; slot: string }
  | { type: 'rest'; mode: 'full' | 'hp' | { turns: number } }
  | { type: 'quaff'; itemIndex: number }
  | { type: 'read'; itemIndex: number }
  | { type: 'eat'; itemIndex: number }
  | { type: 'restart' };
