import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { MassTeleportEffect } from '@/core/systems/effects/MassTeleportEffect';
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

describe('MassTeleportEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new MassTeleportEffect({ type: 'massTeleport', power: 20 });
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

  describe('execute - teleports all monsters', () => {
    it('teleports monsters within sight range', () => {
      const effect = new MassTeleportEffect({ type: 'massTeleport', power: 20 });
      const player = createTestPlayer(25, 25);

      const monster = createTestMonster({
        id: 'monster',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: [],
      });
      const originalPos = { ...monster.position };

      const level = createMockLevel([monster], player);

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
        monster.position.x !== originalPos.x ||
        monster.position.y !== originalPos.y
      ).toBe(true);
    });

    it('teleports both good and evil monsters', () => {
      const effect = new MassTeleportEffect({ type: 'massTeleport', power: 20 });
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

      // Both should have moved
      expect(
        evilMonster.position.x !== evilOriginal.x ||
        evilMonster.position.y !== evilOriginal.y
      ).toBe(true);
      expect(
        goodMonster.position.x !== goodOriginal.x ||
        goodMonster.position.y !== goodOriginal.y
      ).toBe(true);
    });
  });

  describe('execute - teleport resistance', () => {
    it('unique monsters with RES_TELE always resist', () => {
      const effect = new MassTeleportEffect({ type: 'massTeleport', power: 20 });
      const player = createTestPlayer(25, 25);

      const uniqueMonster = createTestMonster({
        id: 'unique',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: ['UNIQUE', 'RES_TELE'],
      });
      const originalPos = { ...uniqueMonster.position };

      const level = createMockLevel([uniqueMonster], player);

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
      expect(uniqueMonster.position).toEqual(originalPos);
      expect(result.messages.some(m => m.includes('unaffected'))).toBe(true);
    });

    it('non-unique with RES_TELE can resist based on level', () => {
      const effect = new MassTeleportEffect({ type: 'massTeleport', power: 20 });
      const player = createTestPlayer(25, 25);

      let resisted = 0;
      const trials = 50;

      for (let i = 0; i < trials; i++) {
        RNG.setSeed(i * 1000);

        const highLevelMonster = createTestMonster({
          id: `high-${i}`,
          position: { x: 27, y: 25 },
          maxHp: 100,
          flags: ['RES_TELE'],
          level: 200, // Very high level
        });
        const originalPos = { ...highLevelMonster.position };

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

    it('monsters without RES_TELE are always teleported', () => {
      const effect = new MassTeleportEffect({ type: 'massTeleport', power: 20 });
      const player = createTestPlayer(25, 25);

      let teleported = 0;
      const trials = 20;

      for (let i = 0; i < trials; i++) {
        RNG.setSeed(i * 1000);

        const monster = createTestMonster({
          id: `monster-${i}`,
          position: { x: 27, y: 25 },
          maxHp: 100,
          flags: [], // No RES_TELE
        });
        const originalPos = { ...monster.position };

        const level = createMockLevel([monster], player);

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
          monster.position.x !== originalPos.x ||
          monster.position.y !== originalPos.y
        ) {
          teleported++;
        }
      }

      // Should always be teleported (no resistance)
      expect(teleported).toBe(trials);
    });
  });

  describe('execute - radius', () => {
    it('only affects monsters within sight range', () => {
      const effect = new MassTeleportEffect({ type: 'massTeleport', power: 20 });
      const player = createTestPlayer(25, 25);

      // Near monster
      const nearMonster = createTestMonster({
        id: 'near',
        position: { x: 30, y: 25 }, // Distance 5
        maxHp: 100,
        flags: [],
      });
      const nearOriginal = { ...nearMonster.position };

      // Far monster (beyond MAX_SIGHT = 20)
      const farMonster = createTestMonster({
        id: 'far',
        position: { x: 48, y: 25 }, // Distance 23
        maxHp: 100,
        flags: [],
      });
      const farOriginal = { ...farMonster.position };

      const level = createMockLevel([nearMonster, farMonster], player);

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
        nearMonster.position.x !== nearOriginal.x ||
        nearMonster.position.y !== nearOriginal.y
      ).toBe(true);
      // Far should NOT move
      expect(farMonster.position).toEqual(farOriginal);
    });
  });

  describe('execute - messages', () => {
    it('shows message when teleporting monsters', () => {
      const effect = new MassTeleportEffect({ type: 'massTeleport', power: 20 });
      const player = createTestPlayer(25, 25);

      const monster = createTestMonster({
        id: 'monster',
        position: { x: 27, y: 25 },
        maxHp: 100,
        flags: [],
      });

      const level = createMockLevel([monster], player);

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

      expect(result.messages.some(m => m.includes('disappears'))).toBe(true);
    });

    it('shows nothing happens when no monsters', () => {
      const effect = new MassTeleportEffect({ type: 'massTeleport', power: 20 });
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
