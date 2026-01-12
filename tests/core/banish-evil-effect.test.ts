import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { BanishEvilEffect } from '@/core/systems/effects/BanishEvilEffect';
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

describe('BanishEvilEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new BanishEvilEffect({ type: 'banishEvil', power: 20 });
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

  describe('execute - teleports evil monsters', () => {
    it('teleports evil monsters within sight range', () => {
      const effect = new BanishEvilEffect({ type: 'banishEvil', power: 20 });
      const player = createTestPlayer(25, 25);

      const evilMonster = createTestMonster({
        id: 'evil',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: ['EVIL'],
      });
      const originalPos = { ...evilMonster.position };

      const level = createMockLevel([evilMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      // Monster should have moved
      expect(
        evilMonster.position.x !== originalPos.x ||
        evilMonster.position.y !== originalPos.y
      ).toBe(true);
    });

    it('ignores non-evil monsters', () => {
      const effect = new BanishEvilEffect({ type: 'banishEvil', power: 20 });
      const player = createTestPlayer(25, 25);

      const goodMonster = createTestMonster({
        id: 'good',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: [], // No EVIL flag
      });
      const originalPos = { ...goodMonster.position };

      const level = createMockLevel([goodMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      effect.execute(context);

      // Monster should NOT have moved
      expect(goodMonster.position).toEqual(originalPos);
    });

    it('only affects evil monsters when mixed', () => {
      const effect = new BanishEvilEffect({ type: 'banishEvil', power: 20 });
      const player = createTestPlayer(25, 25);

      const evilMonster = createTestMonster({
        id: 'evil',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: ['EVIL'],
      });
      const goodMonster = createTestMonster({
        id: 'good',
        position: { x: 23, y: 25 },
        maxHp: 100,
        flags: [],
      });

      const evilOriginal = { ...evilMonster.position };
      const goodOriginal = { ...goodMonster.position };

      const level = createMockLevel([evilMonster, goodMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      effect.execute(context);

      // Evil should move
      expect(
        evilMonster.position.x !== evilOriginal.x ||
        evilMonster.position.y !== evilOriginal.y
      ).toBe(true);
      // Good should NOT move
      expect(goodMonster.position).toEqual(goodOriginal);
    });
  });

  describe('execute - teleport resistance', () => {
    it('unique monsters with RES_TELE always resist', () => {
      const effect = new BanishEvilEffect({ type: 'banishEvil', power: 20 });
      const player = createTestPlayer(25, 25);

      const uniqueEvilMonster = createTestMonster({
        id: 'unique',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: ['EVIL', 'UNIQUE', 'RES_TELE'],
      });
      const originalPos = { ...uniqueEvilMonster.position };

      const level = createMockLevel([uniqueEvilMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      const result = effect.execute(context);

      // Monster should NOT have moved
      expect(uniqueEvilMonster.position).toEqual(originalPos);
      expect(result.messages.some(m => m.includes('unaffected'))).toBe(true);
    });

    it('non-unique with RES_TELE can resist based on level', () => {
      const effect = new BanishEvilEffect({ type: 'banishEvil', power: 20 });
      const player = createTestPlayer(25, 25);

      // High-level monster has better chance to resist
      let resisted = 0;
      const trials = 50;

      for (let i = 0; i < trials; i++) {
        RNG.setSeed(i * 1000);

        const highLevelMonster = createTestMonster({
          id: `high-${i}`,
          position: { x: 27, y: 25 },
          maxHp: 100,
          flags: ['EVIL', 'RES_TELE'],
        });
        (highLevelMonster.def as any).level = 200; // Very high level
        const originalPos = { ...highLevelMonster.position };

        const level = createMockLevel([highLevelMonster], player);

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
          getMonsterInfo: (m) => ({
            name: m.def.name,
            flags: m.def.flags ?? [],
            level: (m.def as any).level ?? 10,
          }),
        };

        effect.execute(context);

        if (
          highLevelMonster.position.x === originalPos.x &&
          highLevelMonster.position.y === originalPos.y
        ) {
          resisted++;
        }
      }

      // High-level monster (200) vs random(150) should resist most of the time
      expect(resisted).toBeGreaterThan(trials * 0.8);
    });

    it('evil monsters without RES_TELE are always banished', () => {
      const effect = new BanishEvilEffect({ type: 'banishEvil', power: 20 });
      const player = createTestPlayer(25, 25);

      let banished = 0;
      const trials = 20;

      for (let i = 0; i < trials; i++) {
        RNG.setSeed(i * 1000);

        const evilMonster = createTestMonster({
          id: `evil-${i}`,
          position: { x: 27, y: 25 },
          maxHp: 100,
          flags: ['EVIL'], // No RES_TELE
        });
        const originalPos = { ...evilMonster.position };

        const level = createMockLevel([evilMonster], player);

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
          getMonsterInfo: (m) => ({
            name: m.def.name,
            flags: m.def.flags ?? [],
          }),
        };

        effect.execute(context);

        if (
          evilMonster.position.x !== originalPos.x ||
          evilMonster.position.y !== originalPos.y
        ) {
          banished++;
        }
      }

      // Should always be banished (no resistance)
      expect(banished).toBe(trials);
    });
  });

  describe('execute - radius', () => {
    it('only affects monsters within sight range', () => {
      const effect = new BanishEvilEffect({ type: 'banishEvil', power: 20 });
      const player = createTestPlayer(25, 25);

      // Near evil monster
      const nearEvil = createTestMonster({
        id: 'near',
        position: { x: 30, y: 25 }, // Distance 5
        maxHp: 100,
        flags: ['EVIL'],
      });
      const nearOriginal = { ...nearEvil.position };

      // Far evil monster (beyond MAX_SIGHT = 20)
      const farEvil = createTestMonster({
        id: 'far',
        position: { x: 48, y: 25 }, // Distance 23
        maxHp: 100,
        flags: ['EVIL'],
      });
      const farOriginal = { ...farEvil.position };

      const level = createMockLevel([nearEvil, farEvil], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      effect.execute(context);

      // Near should move
      expect(
        nearEvil.position.x !== nearOriginal.x ||
        nearEvil.position.y !== nearOriginal.y
      ).toBe(true);
      // Far should NOT move
      expect(farEvil.position).toEqual(farOriginal);
    });
  });

  describe('execute - messages', () => {
    it('shows message when banishing evil', () => {
      const effect = new BanishEvilEffect({ type: 'banishEvil', power: 20 });
      const player = createTestPlayer(25, 25);

      const evilMonster = createTestMonster({
        id: 'evil',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: ['EVIL'],
      });

      const level = createMockLevel([evilMonster], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        getMonsterInfo: (m) => ({
          name: m.def.name,
          flags: m.def.flags ?? [],
        }),
      };

      const result = effect.execute(context);

      expect(result.messages.some(m => m.includes('disappears') || m.includes('banish'))).toBe(true);
    });

    it('shows nothing happens when no evil monsters', () => {
      const effect = new BanishEvilEffect({ type: 'banishEvil', power: 20 });
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
