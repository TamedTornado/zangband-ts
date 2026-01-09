/**
 * Shared test utilities for creating test entities
 */

import type { MonsterDef } from '@/core/data/monsters';
import { Monster } from '@/core/entities/Monster';

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
