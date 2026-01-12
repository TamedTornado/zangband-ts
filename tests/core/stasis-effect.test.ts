import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { StasisEffect } from '@/core/systems/effects/StasisEffect';
import { Player } from '@/core/entities/Player';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import { createTestMonster, createMockLevel } from './testHelpers';

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
}

describe('StasisEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new StasisEffect({ type: 'stasis', power: 20 });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute - stasis mechanics', () => {
    it('puts normal monsters into stasis (deep sleep)', () => {
      const effect = new StasisEffect({ type: 'stasis', power: 50 });
      const player = createTestPlayer(25, 25);

      const monster = createTestMonster({
        id: 'monster',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: [],
        level: 5,
      });
      monster.wake(); // Start awake

      const level = createMockLevel([monster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
          level: m.def.depth ?? 10,
        }),
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(monster.isAwake).toBe(false);
      expect(monster.sleepCounter).toBeGreaterThanOrEqual(500); // Deep stasis sleep
      expect(result.messages.some(m => m.includes('suspended'))).toBe(true);
    });

    it('does not affect UNIQUE monsters', () => {
      const effect = new StasisEffect({ type: 'stasis', power: 100 });
      const player = createTestPlayer(25, 25);

      const uniqueMonster = createTestMonster({
        id: 'unique',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: ['UNIQUE'],
        level: 1,
      });
      uniqueMonster.wake(); // Start awake

      const level = createMockLevel([uniqueMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
          level: m.def.depth ?? 10,
        }),
      };

      effect.execute(context);

      expect(uniqueMonster.isAwake).toBe(true);
    });

    it('high level monsters can resist stasis', () => {
      const effect = new StasisEffect({ type: 'stasis', power: 10 });
      const player = createTestPlayer(25, 25);

      let resisted = 0;
      const trials = 50;

      for (let i = 0; i < trials; i++) {
        RNG.setSeed(i * 1000);

        const highLevelMonster = createTestMonster({
          id: `monster-${i}`,
          position: { x: 27, y: 25 },
          maxHp: 100,
          flags: [],
          level: 100, // Very high level vs power 10 (max roll = 40)
        });
        highLevelMonster.wake();

        const level = createMockLevel([highLevelMonster], player);

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
          getMonsterInfo: (m) => ({
            name: m.def.name,
            flags: m.def.flags ?? [],
            level: m.def.depth ?? 10,
          }),
        };

        effect.execute(context);

        if (highLevelMonster.isAwake) {
          resisted++;
        }
      }

      // Level 100 vs power 10 (max roll 40): should always resist
      expect(resisted).toBe(trials);
    });

    it('low level monsters are easily put in stasis', () => {
      const effect = new StasisEffect({ type: 'stasis', power: 50 });
      const player = createTestPlayer(25, 25);

      let affected = 0;
      const trials = 20;

      for (let i = 0; i < trials; i++) {
        RNG.setSeed(i * 1000);

        const lowLevelMonster = createTestMonster({
          id: `monster-${i}`,
          position: { x: 27, y: 25 },
          maxHp: 100,
          flags: [],
          level: 5, // Low level vs power 50 (roll 1-200)
        });
        lowLevelMonster.wake();

        const level = createMockLevel([lowLevelMonster], player);

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
          getMonsterInfo: (m) => ({
            name: m.def.name,
            flags: m.def.flags ?? [],
            level: m.def.depth ?? 10,
          }),
        };

        effect.execute(context);

        if (!lowLevelMonster.isAwake) {
          affected++;
        }
      }

      // Level 5 vs power 50 (roll 1-200): should affect most of the time
      expect(affected).toBeGreaterThan(trials * 0.9);
    });
  });

  describe('execute - range', () => {
    it('only affects monsters within sight range', () => {
      const effect = new StasisEffect({ type: 'stasis', power: 100 });
      const player = createTestPlayer(25, 25);

      const nearMonster = createTestMonster({
        id: 'near',
        position: { x: 30, y: 25 }, // Distance 5
        maxHp: 100,
        flags: [],
        level: 1,
      });
      nearMonster.wake();

      const farMonster = createTestMonster({
        id: 'far',
        position: { x: 48, y: 25 }, // Distance 23, beyond MAX_SIGHT
        maxHp: 100,
        flags: [],
        level: 1,
      });
      farMonster.wake();

      const level = createMockLevel([nearMonster, farMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
          level: m.def.depth ?? 10,
        }),
      };

      effect.execute(context);

      expect(nearMonster.isAwake).toBe(false);
      expect(farMonster.isAwake).toBe(true);
    });
  });

  describe('execute - multiple monsters', () => {
    it('can put multiple monsters in stasis', () => {
      const effect = new StasisEffect({ type: 'stasis', power: 100 });
      const player = createTestPlayer(25, 25);

      const monsters = [
        createTestMonster({
          id: 'monster1',
          position: { x: 27, y: 25 },
          maxHp: 100,
          flags: [],
          level: 1,
        }),
        createTestMonster({
          id: 'monster2',
          position: { x: 25, y: 27 },
          maxHp: 100,
          flags: [],
          level: 1,
        }),
        createTestMonster({
          id: 'monster3',
          position: { x: 23, y: 25 },
          maxHp: 100,
          flags: [],
          level: 1,
        }),
      ];

      monsters.forEach(m => m.wake());

      const level = createMockLevel(monsters, player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
          level: m.def.depth ?? 10,
        }),
      };

      effect.execute(context);

      expect(monsters.every(m => !m.isAwake)).toBe(true);
    });
  });

  describe('execute - messages', () => {
    it('shows "Nothing happens" when no monsters', () => {
      const effect = new StasisEffect({ type: 'stasis', power: 50 });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.messages.some(m => m.includes('Nothing') || m.includes('nothing'))).toBe(true);
    });
  });
});
