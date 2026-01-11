/**
 * GameData - Pure data container for game state
 *
 * No logic here, just data that states operate on.
 */

import type { Player } from '../entities/Player';
import type { ILevel } from '../world/Level';
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
  level: ILevel;
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

  // Effect targeting states (null when not active)
  itemTargeting: { prompt: string; validItemIndices: number[] } | null;
  symbolTargeting: { prompt: string } | null;
  directionTargeting: { prompt: string } | null;

  // Modal state
  activeModal: 'inventory' | 'equipment' | 'character' | null;
  inventoryMode: 'browse' | 'wield' | 'drop' | 'quaff' | 'read' | 'eat';
}
