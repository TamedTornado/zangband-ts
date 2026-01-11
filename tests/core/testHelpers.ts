/**
 * Shared test utilities for creating test entities
 */

import type { MonsterDef } from '@/core/data/monsters';
import type { Actor } from '@/core/entities/Actor';
import { Monster } from '@/core/entities/Monster';
import type { ILevel } from '@/core/world/Level';
import type { Position } from '@/core/types';

/**
 * Create a minimal MonsterDef for testing.
 * Provides sensible defaults that can be overridden.
 */
export function createTestMonsterDef(overrides: Partial<MonsterDef> = {}): MonsterDef {
  return {
    key: 'test_monster',
    index: 1,
    name: 'Test Monster',
    symbol: 'm',
    color: 'r',
    speed: 110,
    hp: '10d10',
    vision: 20,
    ac: 10,
    alertness: 10,
    depth: 10,
    rarity: 1,
    exp: 100,
    attacks: [],
    flags: [],
    description: 'A test monster',
    spellFrequency: 0,
    spellFlags: [],
    ...overrides,
  };
}

/**
 * Create a Monster instance for testing.
 * Provides sensible defaults that can be overridden.
 */
export function createTestMonster(
  overrides: Partial<{
    id: string;
    position: { x: number; y: number };
    symbol: string;
    color: string;
    maxHp: number;
    speed: number;
    def: MonsterDef;
    flags: string[];
    name: string;
    definitionKey: string;
  }> = {}
): Monster {
  // Build def from overrides if not provided directly
  const def = overrides.def ?? createTestMonsterDef({
    key: overrides.definitionKey ?? 'test_monster',
    name: overrides.name ?? 'Test Monster',
    flags: overrides.flags ?? [],
  });

  return new Monster({
    id: overrides.id ?? 'test_monster_1',
    position: overrides.position ?? { x: 5, y: 5 },
    symbol: overrides.symbol ?? def.symbol,
    color: overrides.color ?? def.color,
    maxHp: overrides.maxHp ?? 100,
    speed: overrides.speed ?? 110,
    def,
  });
}

/**
 * Create a mock level implementing ILevel for testing.
 */
export function createMockLevel(
  monsters: Monster[] = [],
  player: Actor | null = null,
  options: { width?: number; height?: number; depth?: number; walls?: Position[] } = {}
): ILevel {
  const { width = 50, height = 50, depth = 1, walls = [] } = options;
  const wallSet = new Set(walls.map((p) => `${p.x},${p.y}`));
  const items: import('@/core/entities/Item').Item[] = [];
  const traps: import('@/core/entities/Trap').Trap[] = [];

  return {
    width,
    height,
    depth,
    player,
    isInBounds: (pos: Position) => {
      return pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height;
    },
    getActorAt: (pos: Position) => {
      if (player && !player.isDead && player.position.x === pos.x && player.position.y === pos.y) {
        return player;
      }
      return monsters.find((m) => !m.isDead && m.position.x === pos.x && m.position.y === pos.y);
    },
    getMonsterAt: (pos: Position) => {
      return monsters.find((m) => !m.isDead && m.position.x === pos.x && m.position.y === pos.y);
    },
    getMonsterById: (id: string) => {
      return monsters.find((m) => m.id === id);
    },
    getMonsters: () => monsters.filter((m) => !m.isDead),
    getMonstersInRadius: (center: Position, radius: number) => {
      return monsters.filter((m) => {
        if (m.isDead) return false;
        const dx = m.position.x - center.x;
        const dy = m.position.y - center.y;
        return Math.sqrt(dx * dx + dy * dy) <= radius;
      });
    },
    getTile: (pos: Position) => {
      if (wallSet.has(`${pos.x},${pos.y}`)) {
        return { terrain: { flags: ['WALL'] } } as unknown as ReturnType<ILevel['getTile']>;
      }
      return { terrain: { flags: [] } } as unknown as ReturnType<ILevel['getTile']>;
    },
    isWalkable: (pos: Position) => {
      if (pos.x < 0 || pos.x >= width || pos.y < 0 || pos.y >= height) return false;
      return !wallSet.has(`${pos.x},${pos.y}`);
    },
    isTransparent: (pos: Position) => {
      if (pos.x < 0 || pos.x >= width || pos.y < 0 || pos.y >= height) return false;
      return !wallSet.has(`${pos.x},${pos.y}`);
    },
    isOccupied: (pos: Position) => {
      return monsters.some((m) => !m.isDead && m.position.x === pos.x && m.position.y === pos.y);
    },
    setTerrain: () => {
      // No-op in mock
    },
    addMonster: (monster: Monster) => {
      monsters.push(monster);
    },
    removeMonster: (monster: Monster) => {
      const idx = monsters.indexOf(monster);
      if (idx !== -1) monsters.splice(idx, 1);
    },
    addItem: (item: import('@/core/entities/Item').Item) => {
      items.push(item);
    },
    removeItem: (item: import('@/core/entities/Item').Item) => {
      const idx = items.indexOf(item);
      if (idx !== -1) items.splice(idx, 1);
    },
    getItemsAt: (pos: Position) => {
      return items.filter((i) => i.position.x === pos.x && i.position.y === pos.y);
    },
    getAllItems: () => [...items],
    getTrapAt: (pos: Position) => {
      return traps.find((t) => t.position.x === pos.x && t.position.y === pos.y);
    },
    getTraps: () => [...traps],
    addTrap: (trap: import('@/core/entities/Trap').Trap) => {
      traps.push(trap);
    },
    removeTrap: (trap: import('@/core/entities/Trap').Trap) => {
      const idx = traps.indexOf(trap);
      if (idx !== -1) traps.splice(idx, 1);
    },
  };
}
