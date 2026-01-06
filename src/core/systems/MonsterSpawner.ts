/**
 * Monster Spawner
 *
 * Handles spawning monsters into the dungeon level.
 * Uses MonsterDataManager for selection and places
 * monsters on valid floor tiles.
 */

import { RNG } from 'rot-js';
import { Monster } from '@/core/entities/Monster';
import type { Level } from '@/core/world/Level';
import type { Position } from '@/core/types';
import type { MonsterDataManager } from '@/core/data/MonsterDataManager';
import type { MonsterDef } from '@/core/data/monsters';

let monsterIdCounter = 0;

function generateMonsterId(): string {
  return `monster_${++monsterIdCounter}`;
}

/**
 * Roll dice in XdY format
 */
function rollDice(diceStr: string): number {
  const match = diceStr.match(/^(\d+)d(\d+)$/);
  if (!match) return 1;

  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += RNG.getUniformInt(1, sides);
  }
  return total;
}

export class MonsterSpawner {
  private dataManager: MonsterDataManager;
  private rng: typeof RNG;

  constructor(dataManager: MonsterDataManager, rng: typeof RNG = RNG) {
    this.dataManager = dataManager;
    this.rng = rng;
  }

  /**
   * Spawn a specific monster at a position
   */
  spawnMonster(level: Level, pos: Position, monsterKey: string): Monster | null {
    const def = this.dataManager.getMonsterDef(monsterKey);
    if (!def) return null;

    // Check position is valid
    if (!level.isWalkable(pos) || level.isOccupied(pos)) {
      return null;
    }

    const monster = this.createMonster(def, pos);
    level.addMonster(monster);

    return monster;
  }

  /**
   * Spawn a random depth-appropriate monster at a position
   */
  spawnRandomMonster(level: Level, pos: Position, depth: number): Monster | null {
    const def = this.dataManager.selectMonster(depth);
    if (!def) return null;

    return this.spawnMonster(level, pos, def.key);
  }

  /**
   * Spawn multiple monsters throughout the level
   */
  spawnMonstersForLevel(level: Level, depth: number, count: number): number {
    let spawned = 0;
    let attempts = 0;
    const maxAttempts = count * 100;

    while (spawned < count && attempts < maxAttempts) {
      attempts++;

      // Find a random floor position
      const pos = this.findRandomFloorPosition(level);
      if (!pos) continue;

      const monster = this.spawnRandomMonster(level, pos, depth);
      if (monster) {
        spawned++;
      }
    }

    return spawned;
  }

  /**
   * Find a random walkable, unoccupied position
   */
  private findRandomFloorPosition(level: Level): Position | null {
    const maxAttempts = 1000;

    for (let i = 0; i < maxAttempts; i++) {
      const x = this.rng.getUniformInt(1, level.width - 2);
      const y = this.rng.getUniformInt(1, level.height - 2);
      const pos = { x, y };

      if (level.isWalkable(pos) && !level.isOccupied(pos)) {
        return pos;
      }
    }

    return null;
  }

  /**
   * Create a Monster instance from a definition
   */
  private createMonster(def: MonsterDef, pos: Position): Monster {
    const hp = rollDice(def.hp);

    return new Monster({
      id: generateMonsterId(),
      position: pos,
      symbol: def.symbol,
      color: def.color,
      definitionKey: def.key,
      speed: def.speed,
      maxHp: hp,
    });
  }
}
