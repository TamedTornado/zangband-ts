/**
 * Trap Spawner
 *
 * Handles spawning traps into the dungeon level.
 * Uses TrapDataManager for selection and places
 * traps on valid floor tiles.
 */

import { RNG } from 'rot-js';
import { Trap } from '@/core/entities/Trap';
import type { ILevel } from '@/core/world/Level';
import type { Position } from '@/core/types';
import type { TrapDataManager, TrapDef } from '@/core/data/traps';

let trapIdCounter = 0;

function generateTrapId(): string {
  return `trap_${++trapIdCounter}`;
}

export class TrapSpawner {
  private dataManager: TrapDataManager;
  private rng: typeof RNG;

  constructor(dataManager: TrapDataManager, rng: typeof RNG = RNG) {
    this.dataManager = dataManager;
    this.rng = rng;
  }

  /**
   * Spawn a specific trap at a position
   */
  spawnTrap(level: ILevel, pos: Position, trapKey: string): Trap | null {
    const def = this.dataManager.getTrapDef(trapKey);
    if (!def) return null;

    // Check position is valid
    if (!this.isValidTrapPosition(level, pos)) {
      return null;
    }

    const trap = this.createTrap(def, pos);
    level.addTrap(trap);

    return trap;
  }

  /**
   * Spawn a random depth-appropriate trap at a position
   */
  spawnRandomTrap(level: ILevel, pos: Position, depth: number): Trap | null {
    const def = this.dataManager.selectTrap(depth);
    if (!def) return null;

    return this.spawnTrap(level, pos, def.key);
  }

  /**
   * Spawn multiple traps throughout the level
   */
  spawnTrapsForLevel(level: ILevel, depth: number, count: number): number {
    let spawned = 0;
    let attempts = 0;
    const maxAttempts = count * 100;

    while (spawned < count && attempts < maxAttempts) {
      attempts++;

      // Find a random floor position
      const pos = this.findRandomFloorPosition(level);
      if (!pos) continue;

      const trap = this.spawnRandomTrap(level, pos, depth);
      if (trap) {
        spawned++;
      }
    }

    return spawned;
  }

  /**
   * Check if a position is valid for trap placement
   */
  private isValidTrapPosition(level: ILevel, pos: Position): boolean {
    // Must be walkable
    if (!level.isWalkable(pos)) {
      return false;
    }

    // No trap already there
    if (level.getTrapAt(pos)) {
      return false;
    }

    // Not on stairs
    const tile = level.getTile(pos);
    if (tile) {
      const terrainKey = tile.terrain.key;
      if (terrainKey === 'up_staircase' || terrainKey === 'down_staircase') {
        return false;
      }
    }

    return true;
  }

  /**
   * Find a random walkable position without traps
   */
  private findRandomFloorPosition(level: ILevel): Position | null {
    const maxAttempts = 1000;

    for (let i = 0; i < maxAttempts; i++) {
      const x = this.rng.getUniformInt(1, level.width - 2);
      const y = this.rng.getUniformInt(1, level.height - 2);
      const pos = { x, y };

      if (this.isValidTrapPosition(level, pos)) {
        return pos;
      }
    }

    return null;
  }

  /**
   * Create a Trap instance from a definition
   */
  private createTrap(def: TrapDef, pos: Position): Trap {
    return new Trap({
      id: generateTrapId(),
      position: pos,
      definition: def,
    });
  }
}
