/**
 * GameData - Pure data container for game state
 *
 * No logic here, just data that states operate on.
 */

import type { Player } from '../entities/Player';
import type { Level } from '../world/Level';
import type { Scheduler } from '../systems/Scheduler';
import type { Coord } from '../systems/dungeon/DungeonTypes';

export interface GameMessage {
  id: number;
  text: string;
  type: 'normal' | 'combat' | 'info' | 'danger';
  turn: number;
}

export interface GameData {
  player: Player;
  level: Level;
  scheduler: Scheduler;
  depth: number;
  turn: number;
  messages: GameMessage[];
  upStairs: Coord[];
  downStairs: Coord[];

  // Death info
  killedBy: string | null;

  // Targeting cursor (null when not in targeting mode)
  cursor: Coord | null;
}
