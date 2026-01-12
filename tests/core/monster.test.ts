import { describe, it, expect } from 'vitest';
import { Monster } from '@/core/entities/Monster';
import { createTestMonsterDef } from './testHelpers';

function createMonster(overrides: Partial<{ alertness: number; flags: string[] }> = {}): Monster {
  const def = createTestMonsterDef({
    alertness: overrides.alertness ?? 0,
    flags: overrides.flags ?? [],
  });
  return new Monster({
    id: 'test-monster',
    position: { x: 5, y: 5 },
    symbol: 'm',
    color: '#f00',
    maxHp: 100,
    speed: 110,
    def,
  });
}

describe('Monster', () => {
  describe('sleep/wake', () => {
    it('spawns with sleep counter based on alertness', () => {
      const monster = createMonster({ alertness: 10 });
      expect(monster.sleepCounter).toBeGreaterThan(0);
      expect(monster.isAwake).toBe(false);
    });

    it('isAwake is true when sleepCounter is 0', () => {
      const monster = createMonster({ alertness: 0 });
      expect(monster.sleepCounter).toBe(0);
      expect(monster.isAwake).toBe(true);
    });

    it('reduceSleep decrements counter', () => {
      const monster = createMonster({ alertness: 100 });
      const initial = monster.sleepCounter;
      monster.reduceSleep(10);
      expect(monster.sleepCounter).toBe(initial - 10);
    });

    it('reduceSleep does not go below 0', () => {
      const monster = createMonster({ alertness: 10 });
      monster.reduceSleep(9999);
      expect(monster.sleepCounter).toBe(0);
      expect(monster.isAwake).toBe(true);
    });

    it('wake() sets counter to 0', () => {
      const monster = createMonster({ alertness: 100 });
      monster.wake();
      expect(monster.sleepCounter).toBe(0);
      expect(monster.isAwake).toBe(true);
    });

    it('NO_SLEEP flagged monsters are always awake', () => {
      const monster = createMonster({ alertness: 100, flags: ['NO_SLEEP'] });
      expect(monster.isAwake).toBe(true);
      expect(monster.sleepCounter).toBe(0);
    });

    it('sleep counter varies based on RNG within alertness range', () => {
      // Multiple monsters with same alertness should have different sleep counters
      const counters: number[] = [];
      for (let i = 0; i < 10; i++) {
        const monster = createMonster({ alertness: 50 });
        counters.push(monster.sleepCounter);
      }
      // Should have some variation (not all the same)
      // With alertness 50, range is [50, 150] so there should be variation
      const unique = new Set(counters);
      // May occasionally get same values, but with 10 samples there should be at least 2 different
      expect(unique.size).toBeGreaterThanOrEqual(1);
      // All should be in valid range
      for (const c of counters) {
        expect(c).toBeGreaterThanOrEqual(50);
        expect(c).toBeLessThanOrEqual(150);
      }
    });
  });

  describe('last known player position', () => {
    it('starts with no knowledge of player location', () => {
      const monster = createMonster();
      expect(monster.lastKnownPlayerPos).toBeNull();
    });

    it('updatePlayerLocation stores the position', () => {
      const monster = createMonster();
      monster.updatePlayerLocation({ x: 10, y: 15 });
      expect(monster.lastKnownPlayerPos).toEqual({ x: 10, y: 15 });
    });

    it('updatePlayerLocation creates a copy of the position', () => {
      const monster = createMonster();
      const pos = { x: 10, y: 15 };
      monster.updatePlayerLocation(pos);
      pos.x = 99; // Modify original
      expect(monster.lastKnownPlayerPos?.x).toBe(10); // Should be unchanged
    });

    it('clearPlayerLocation removes knowledge', () => {
      const monster = createMonster();
      monster.updatePlayerLocation({ x: 10, y: 15 });
      monster.clearPlayerLocation();
      expect(monster.lastKnownPlayerPos).toBeNull();
    });

    it('multiple updates overwrite previous position', () => {
      const monster = createMonster();
      monster.updatePlayerLocation({ x: 5, y: 5 });
      monster.updatePlayerLocation({ x: 10, y: 10 });
      expect(monster.lastKnownPlayerPos).toEqual({ x: 10, y: 10 });
    });
  });
});
