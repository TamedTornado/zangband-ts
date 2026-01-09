import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { hasLineOfSight, checkAwareness } from '@/core/systems/Awareness';
import { createTestMonster, createTestMonsterDef, createMockLevel } from './testHelpers';
import { Player, type Stats } from '@/core/entities/Player';
import type { Position } from '@/core/types';

function createPlayer(position: Position, stealth = 0): Player {
  const stats: Stats = { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 };
  return new Player({
    id: 'test-player',
    position,
    maxHp: 100,
    speed: 110,
    stats,
    classDef: {
      index: 0,
      name: 'Test Class',
      stats: { str: 0, int: 0, wis: 0, dex: 0, con: 0, chr: 0 },
      skills: {
        disarm: 0, device: 0, save: 0, stealth,
        search: 0, searchFreq: 0, melee: 0, ranged: 0,
      },
      xSkills: {
        disarm: 0, device: 0, save: 0, stealth: 0,
        search: 0, searchFreq: 0, melee: 0, ranged: 0,
      },
      hitDie: 0,
      expMod: 0,
      petUpkeepDiv: 1,
      heavySense: false,
      spellStat: null,
      spellFirst: null,
      spellWeight: null,
      realms: [],
      secondaryRealm: false,
    },
    level: 1,
  });
}

describe('hasLineOfSight', () => {
  it('returns true for adjacent positions', () => {
    const level = createMockLevel();
    expect(hasLineOfSight({ x: 5, y: 5 }, { x: 6, y: 5 }, level)).toBe(true);
  });

  it('returns true for clear diagonal line', () => {
    const level = createMockLevel();
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 10, y: 10 }, level)).toBe(true);
  });

  it('returns true for clear horizontal line', () => {
    const level = createMockLevel();
    expect(hasLineOfSight({ x: 0, y: 5 }, { x: 20, y: 5 }, level)).toBe(true);
  });

  it('returns false when wall blocks line', () => {
    const level = createMockLevel([], null, { walls: [{ x: 5, y: 5 }] });
    expect(hasLineOfSight({ x: 0, y: 5 }, { x: 10, y: 5 }, level)).toBe(false);
  });

  it('returns true for same position', () => {
    const level = createMockLevel();
    expect(hasLineOfSight({ x: 5, y: 5 }, { x: 5, y: 5 }, level)).toBe(true);
  });

  it('returns false when multiple walls block', () => {
    const level = createMockLevel([], null, {
      walls: [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }],
    });
    expect(hasLineOfSight({ x: 0, y: 5 }, { x: 10, y: 5 }, level)).toBe(false);
  });

  it('returns true when wall is not on the line', () => {
    const level = createMockLevel([], null, { walls: [{ x: 5, y: 6 }] });
    // Line from (0,5) to (10,5) doesn't pass through (5,6)
    expect(hasLineOfSight({ x: 0, y: 5 }, { x: 10, y: 5 }, level)).toBe(true);
  });
});

describe('checkAwareness', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  it('does nothing if monster is already awake', () => {
    const def = createTestMonsterDef({ alertness: 100 });
    const monster = createTestMonster({ def });
    monster.wake();
    const player = createPlayer({ x: 10, y: 10 });
    const level = createMockLevel([monster], player);

    checkAwareness(monster, player, level, RNG);
    expect(monster.isAwake).toBe(true);
  });

  it('does not instantly wake monster even when nearby', () => {
    // Monster nearby should NOT instantly wake - allows sneaking
    const def = createTestMonsterDef({ alertness: 100, vision: 20 });
    const monster = createTestMonster({ def, position: { x: 15, y: 10 } });

    const player = createPlayer({ x: 10, y: 10 }, 30); // Very stealthy
    const level = createMockLevel([monster], player);

    // Single check with max stealth should not wake
    checkAwareness(monster, player, level, RNG);
    expect(monster.sleepCounter).toBeGreaterThan(0);
  });

  it('gradually wakes monster when player is nearby and loud', () => {
    const def = createTestMonsterDef({ alertness: 50 });
    const monster = createTestMonster({ def, position: { x: 12, y: 10 } });

    // Loud player (stealth 0) nearby
    const player = createPlayer({ x: 10, y: 10 }, 0);
    const level = createMockLevel([monster], player);

    const initialSleep = monster.sleepCounter;
    // Run checks - loud player nearby should wake relatively quickly
    for (let i = 0; i < 20 && !monster.isAwake; i++) {
      checkAwareness(monster, player, level, RNG);
    }
    // Should have woken or reduced sleep significantly
    expect(monster.sleepCounter).toBeLessThan(initialSleep);
  });

  it('wakes distant monsters more slowly', () => {
    const def = createTestMonsterDef({ alertness: 50 });
    const nearMonster = createTestMonster({ def, position: { x: 12, y: 10 } });
    const farMonster = createTestMonster({ def, position: { x: 45, y: 10 } });

    const player = createPlayer({ x: 10, y: 10 }, 0);
    const level = createMockLevel([nearMonster, farMonster], player);

    // Run same number of checks for both
    RNG.setSeed(12345);
    const nearInitial = nearMonster.sleepCounter;
    for (let i = 0; i < 10; i++) {
      checkAwareness(nearMonster, player, level, RNG);
    }
    const nearReduction = nearInitial - nearMonster.sleepCounter;

    RNG.setSeed(12345);
    const farInitial = farMonster.sleepCounter;
    for (let i = 0; i < 10; i++) {
      checkAwareness(farMonster, player, level, RNG);
    }
    const farReduction = farInitial - farMonster.sleepCounter;

    // Near monster should wake faster (more sleep reduction)
    expect(nearReduction).toBeGreaterThanOrEqual(farReduction);
  });

  it('stealthy player rarely wakes monsters', () => {
    // With very high stealth, noise is minimal and monsters rarely wake
    const def = createTestMonsterDef({ alertness: 200 });
    const monster = createTestMonster({ def, position: { x: 15, y: 10 } });

    // Very stealthy player (stealth 30 = noise of 1)
    const player = createPlayer({ x: 10, y: 10 }, 30);
    const level = createMockLevel([monster], player);

    const initialSleep = monster.sleepCounter;
    // Even after many checks, high stealth means little waking
    for (let i = 0; i < 20; i++) {
      checkAwareness(monster, player, level, RNG);
    }
    // With stealth 30 (noise=1) and notice^3 check, very hard to wake
    // notice must be 0 or 1 for notice^3 <= 1, which is rare
    expect(monster.sleepCounter).toBe(initialSleep);
  });

  it('allows sneaking past sleeping monsters', () => {
    // Core gameplay: stealthy player can move near sleeping monster
    const def = createTestMonsterDef({ alertness: 100 });
    const monster = createTestMonster({ def, position: { x: 11, y: 10 } });

    // Adjacent to monster but stealthy
    const player = createPlayer({ x: 10, y: 10 }, 25);
    const level = createMockLevel([monster], player);

    // Several turns of being adjacent
    for (let i = 0; i < 5; i++) {
      checkAwareness(monster, player, level, RNG);
    }
    // High stealth should keep monster asleep even when adjacent
    expect(monster.sleepCounter).toBeGreaterThan(0);
  });
});
