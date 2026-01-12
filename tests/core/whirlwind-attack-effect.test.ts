import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { WhirlwindAttackEffect } from '@/core/systems/effects/WhirlwindAttackEffect';
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

describe('WhirlwindAttackEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new WhirlwindAttackEffect({ type: 'whirlwindAttack' });
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

  describe('execute - attacks adjacent monsters', () => {
    it('attacks a single adjacent monster', () => {
      const effect = new WhirlwindAttackEffect({ type: 'whirlwindAttack' });
      const player = createTestPlayer(25, 25);

      const monster = createTestMonster({
        id: 'monster',
        position: { x: 26, y: 25 }, // Adjacent east
        maxHp: 50,
        flags: [],
      });
      const initialHp = monster.hp;

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
      // Monster should have taken damage
      expect(monster.hp).toBeLessThan(initialHp);
    });

    it('attacks all adjacent monsters', () => {
      const effect = new WhirlwindAttackEffect({ type: 'whirlwindAttack' });
      const player = createTestPlayer(25, 25);

      // Create monsters in multiple adjacent positions
      const monsters = [
        createTestMonster({
          id: 'monster1',
          position: { x: 26, y: 25 }, // East
          maxHp: 50,
          flags: [],
        }),
        createTestMonster({
          id: 'monster2',
          position: { x: 24, y: 25 }, // West
          maxHp: 50,
          flags: [],
        }),
        createTestMonster({
          id: 'monster3',
          position: { x: 25, y: 24 }, // North
          maxHp: 50,
          flags: [],
        }),
        createTestMonster({
          id: 'monster4',
          position: { x: 26, y: 26 }, // Southeast
          maxHp: 50,
          flags: [],
        }),
      ];

      const initialHps = monsters.map(m => m.hp);

      const level = createMockLevel(monsters, player);

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

      // All adjacent monsters should have taken damage
      for (let i = 0; i < monsters.length; i++) {
        expect(monsters[i].hp).toBeLessThan(initialHps[i]);
      }
    });

    it('does not attack non-adjacent monsters', () => {
      const effect = new WhirlwindAttackEffect({ type: 'whirlwindAttack' });
      const player = createTestPlayer(25, 25);

      const farMonster = createTestMonster({
        id: 'far',
        position: { x: 28, y: 25 }, // Not adjacent (distance 3)
        maxHp: 50,
        flags: [],
      });
      const initialHp = farMonster.hp;

      const level = createMockLevel([farMonster], player);

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

      // Far monster should NOT have taken damage
      expect(farMonster.hp).toBe(initialHp);
    });
  });

  describe('execute - messages', () => {
    it('shows "Nothing to attack" when no adjacent monsters', () => {
      const effect = new WhirlwindAttackEffect({ type: 'whirlwindAttack' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.messages.some(m =>
        m.toLowerCase().includes('nothing') ||
        m.toLowerCase().includes('no ')
      )).toBe(true);
    });

    it('shows attack messages for each monster hit', () => {
      const effect = new WhirlwindAttackEffect({ type: 'whirlwindAttack' });
      const player = createTestPlayer(25, 25);

      const monster = createTestMonster({
        id: 'monster',
        name: 'Test Monster',
        position: { x: 26, y: 25 },
        maxHp: 50,
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

      // Should have attack message mentioning the monster or damage
      expect(result.messages.some(m =>
        m.toLowerCase().includes('hit') ||
        m.toLowerCase().includes('attack') ||
        m.toLowerCase().includes('damage')
      )).toBe(true);
    });
  });

  describe('execute - can kill monsters', () => {
    it('can kill weak monsters', () => {
      const effect = new WhirlwindAttackEffect({ type: 'whirlwindAttack' });
      const player = createTestPlayer(25, 25);

      const weakMonster = createTestMonster({
        id: 'weak',
        position: { x: 26, y: 25 },
        maxHp: 5, // Very low HP
        flags: [],
      });

      const level = createMockLevel([weakMonster], player);

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

      // Monster should be dead or severely damaged
      expect(weakMonster.hp <= 0 || weakMonster.isDead).toBe(true);
    });
  });
});
