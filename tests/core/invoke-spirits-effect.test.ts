import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { RNG } from 'rot-js';
import { InvokeSpiritsEffect } from '@/core/systems/effects/InvokeSpiritsEffect';
import { Player } from '@/core/entities/Player';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext, GPEffectDef, GPEffect } from '@/core/systems/effects/GPEffect';
import { createMockLevel, createTestMonster } from './testHelpers';

function createTestPlayer(x: number, y: number, level: number = 10): Player {
  const player = new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 500,
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
  // Set player level
  (player as any)._level = level;
  return player;
}

// Mock effect for createEffect
function createMockEffect(result: any): GPEffect {
  return {
    canExecute: () => true,
    execute: () => result,
    resources: null,
  } as unknown as GPEffect;
}

describe('InvokeSpiritsEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns true when target position is provided', () => {
      const effect = new InvokeSpiritsEffect({ type: 'invokeSpirits' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 30, y: 25 },
        createEffect: (_def: GPEffectDef) => createMockEffect({ success: true, messages: [], turnConsumed: true }),
      };

      expect(effect.canExecute(context)).toBe(true);
    });

    it('returns false when target position is missing', () => {
      const effect = new InvokeSpiritsEffect({ type: 'invokeSpirits' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(false);
    });
  });

  describe('execute', () => {
    it('always shows the invocation message', () => {
      const effect = new InvokeSpiritsEffect({ type: 'invokeSpirits' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 30, y: 25 },
        createEffect: (_def: GPEffectDef) => createMockEffect({ success: true, messages: [], turnConsumed: true }),
      };

      const result = effect.execute(context);

      expect(result.messages.some(m => m.includes('call on the power of the dead'))).toBe(true);
    });

    it('returns the die roll in result data', () => {
      const effect = new InvokeSpiritsEffect({ type: 'invokeSpirits' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 30, y: 25 },
        createEffect: (_def: GPEffectDef) => createMockEffect({ success: true, messages: [], turnConsumed: true }),
      };

      const result = effect.execute(context);

      // Die roll should be between 1 and 100 + level/5
      expect(result.data?.['dieRoll']).toBeDefined();
      expect(result.data?.['dieRoll']).toBeGreaterThanOrEqual(1);
    });

    describe('low rolls (bad effects on player)', () => {
      it('summons undead on very low roll (die < 8)', () => {
        const effect = new InvokeSpiritsEffect({ type: 'invokeSpirits' });
        const player = createTestPlayer(25, 25, 1); // Low level for low roll
        const level = createMockLevel([], player);

        // Mock RNG to return very low value
        const mockRng = {
          getUniformInt: vi.fn().mockReturnValue(1), // Will give die = 1 + 0 = 1
        };

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: mockRng as any,
          targetPosition: { x: 30, y: 25 },
          createEffect: (_def: GPEffectDef) => createMockEffect({ success: true, messages: ['summoned'], turnConsumed: true }),
        };

        const result = effect.execute(context);

        expect(result.data?.['outcome']).toBe('summonUndead');
        expect(result.messages.some(m => m.includes('Mouldering forms rise'))).toBe(true);
      });

      it('causes fear on low roll (die 8-13)', () => {
        const effect = new InvokeSpiritsEffect({ type: 'invokeSpirits' });
        const player = createTestPlayer(25, 25, 1);
        const level = createMockLevel([], player);

        const mockRng = {
          getUniformInt: vi.fn().mockReturnValue(10),
        };

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: mockRng as any,
          targetPosition: { x: 30, y: 25 },
          createEffect: (_def: GPEffectDef) => createMockEffect({ success: true, messages: [], turnConsumed: true }),
        };

        const result = effect.execute(context);

        expect(result.data?.['outcome']).toBe('fear');
        expect(result.messages.some(m => m.includes('unnamable evil'))).toBe(true);
      });

      it('causes confusion on low roll (die 14-25)', () => {
        const effect = new InvokeSpiritsEffect({ type: 'invokeSpirits' });
        const player = createTestPlayer(25, 25, 1);
        const level = createMockLevel([], player);

        const mockRng = {
          getUniformInt: vi.fn().mockReturnValue(20),
        };

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: mockRng as any,
          targetPosition: { x: 30, y: 25 },
          createEffect: (_def: GPEffectDef) => createMockEffect({ success: true, messages: [], turnConsumed: true }),
        };

        const result = effect.execute(context);

        expect(result.data?.['outcome']).toBe('confusion');
        expect(result.messages.some(m => m.includes('gibbering spectral voices'))).toBe(true);
      });

      it('shows chuckle message on low rolls (die < 31)', () => {
        const effect = new InvokeSpiritsEffect({ type: 'invokeSpirits' });
        const player = createTestPlayer(25, 25, 1);
        const level = createMockLevel([], player);

        const mockRng = {
          getUniformInt: vi.fn().mockReturnValue(25),
        };

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: mockRng as any,
          targetPosition: { x: 30, y: 25 },
          createEffect: (_def: GPEffectDef) => createMockEffect({ success: true, messages: [], turnConsumed: true }),
        };

        const result = effect.execute(context);

        expect(result.messages.some(m => m.includes('Soon you will join us'))).toBe(true);
      });
    });

    describe('medium rolls (standard attacks)', () => {
      it('fires polymorph on die 26-30', () => {
        const effect = new InvokeSpiritsEffect({ type: 'invokeSpirits' });
        const player = createTestPlayer(25, 25, 1);
        const level = createMockLevel([], player);

        let createdEffectType: string | undefined;
        const mockRng = {
          getUniformInt: vi.fn().mockReturnValue(28),
        };

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: mockRng as any,
          targetPosition: { x: 30, y: 25 },
          createEffect: (def: GPEffectDef) => {
            createdEffectType = def.type;
            return createMockEffect({ success: true, messages: ['polymorphed'], turnConsumed: true });
          },
        };

        const result = effect.execute(context);

        expect(result.data?.['outcome']).toBe('polymorph');
        expect(createdEffectType).toBe('polymorph');
      });

      it('fires missile bolt on die 31-35', () => {
        const effect = new InvokeSpiritsEffect({ type: 'invokeSpirits' });
        const player = createTestPlayer(25, 25, 1);
        const level = createMockLevel([], player);

        let createdEffectType: string | undefined;
        const mockRng = {
          getUniformInt: vi.fn().mockReturnValue(33),
        };

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: mockRng as any,
          targetPosition: { x: 30, y: 25 },
          createEffect: (def: GPEffectDef) => {
            createdEffectType = def.type;
            return createMockEffect({ success: true, messages: ['bolt fired'], turnConsumed: true });
          },
        };

        const result = effect.execute(context);

        expect(result.data?.['outcome']).toBe('missileBolt');
        expect(createdEffectType).toBe('bolt');
      });

      it('fires poison ball on die 41-45', () => {
        const effect = new InvokeSpiritsEffect({ type: 'invokeSpirits' });
        const player = createTestPlayer(25, 25, 1);
        const level = createMockLevel([], player);

        let createdEffectDef: GPEffectDef | undefined;
        const mockRng = {
          getUniformInt: vi.fn().mockReturnValue(43),
        };

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: mockRng as any,
          targetPosition: { x: 30, y: 25 },
          createEffect: (def: GPEffectDef) => {
            createdEffectDef = def;
            return createMockEffect({ success: true, messages: ['ball explodes'], turnConsumed: true });
          },
        };

        const result = effect.execute(context);

        expect(result.data?.['outcome']).toBe('poisonBall');
        expect(createdEffectDef?.type).toBe('ball');
        expect((createdEffectDef as any)?.['element']).toBe('poison');
      });
    });

    describe('high rolls (powerful effects)', () => {
      it('shows surge message on die > 100', () => {
        const effect = new InvokeSpiritsEffect({ type: 'invokeSpirits' });
        const player = createTestPlayer(25, 25, 50); // High level to get high roll
        const level = createMockLevel([], player);

        // Die = 95 + 50/5 = 95 + 10 = 105
        const mockRng = {
          getUniformInt: vi.fn().mockReturnValue(95),
        };

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: mockRng as any,
          targetPosition: { x: 30, y: 25 },
          createEffect: (_def: GPEffectDef) => createMockEffect({ success: true, messages: [], turnConsumed: true }),
        };

        const result = effect.execute(context);

        expect(result.messages.some(m => m.includes('surge of eldritch force'))).toBe(true);
      });

      it('fires earthquake on very high roll (die 101-103)', () => {
        const effect = new InvokeSpiritsEffect({ type: 'invokeSpirits' });
        const player = createTestPlayer(25, 25, 50);
        const level = createMockLevel([], player);

        // Die = 92 + 10 = 102
        let createdEffectType: string | undefined;
        const mockRng = {
          getUniformInt: vi.fn().mockReturnValue(92),
        };

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: mockRng as any,
          targetPosition: { x: 30, y: 25 },
          createEffect: (def: GPEffectDef) => {
            createdEffectType = def.type;
            return createMockEffect({ success: true, messages: ['earthquake'], turnConsumed: true });
          },
        };

        const result = effect.execute(context);

        expect(result.data?.['outcome']).toBe('earthquake');
        expect(createdEffectType).toBe('earthquake');
      });

      it('fires dispel monsters on high roll (die 106-109)', () => {
        const effect = new InvokeSpiritsEffect({ type: 'invokeSpirits' });
        const player = createTestPlayer(25, 25, 50);
        const level = createMockLevel([], player);

        // Die = 98 + 10 = 108
        let createdEffectType: string | undefined;
        const mockRng = {
          getUniformInt: vi.fn().mockReturnValue(98),
        };

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: mockRng as any,
          targetPosition: { x: 30, y: 25 },
          createEffect: (def: GPEffectDef) => {
            createdEffectType = def.type;
            return createMockEffect({ success: true, messages: ['dispelled'], turnConsumed: true });
          },
        };

        const result = effect.execute(context);

        expect(result.data?.['outcome']).toBe('dispel');
        expect(createdEffectType).toBe('dispel');
      });

      it('fires genocide on high roll (die 106-107)', () => {
        const effect = new InvokeSpiritsEffect({ type: 'invokeSpirits' });
        const player = createTestPlayer(25, 25, 50);
        // Create multiple monsters of same type
        const monster1 = createTestMonster({ id: 'm1', position: { x: 27, y: 25 }, maxHp: 50, symbol: 'o' });
        const monster2 = createTestMonster({ id: 'm2', position: { x: 28, y: 25 }, maxHp: 50, symbol: 'o' });
        const monster3 = createTestMonster({ id: 'm3', position: { x: 29, y: 25 }, maxHp: 50, symbol: 'k' });
        const level = createMockLevel([monster1, monster2, monster3], player);

        // Die = 97 + 10 = 107
        const mockRng = {
          getUniformInt: vi.fn().mockReturnValue(97),
        };

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: mockRng as any,
          targetPosition: { x: 30, y: 25 },
          createEffect: (_def: GPEffectDef) => createMockEffect({ success: true, messages: [], turnConsumed: true }),
        };

        const result = effect.execute(context);

        expect(result.data?.['outcome']).toBe('genocide');
        // Should pick 'o' as most numerous and kill both
        expect(result.data?.['symbol']).toBe('o');
        expect(result.data?.['killed']).toBe(2);
        expect(monster1.isDead).toBe(true);
        expect(monster2.isDead).toBe(true);
        expect(monster3.isDead).toBe(false); // Different symbol
      });

      it('fires ultimate combo on extremely high roll (die >= 110)', () => {
        const effect = new InvokeSpiritsEffect({ type: 'invokeSpirits' });
        const player = createTestPlayer(25, 25, 50);
        const level = createMockLevel([], player);

        // Die = 100 + 10 = 110
        const createdTypes: string[] = [];
        const mockRng = {
          getUniformInt: vi.fn().mockReturnValue(100),
        };

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: mockRng as any,
          targetPosition: { x: 30, y: 25 },
          createEffect: (def: GPEffectDef) => {
            createdTypes.push(def.type);
            return createMockEffect({ success: true, messages: [], turnConsumed: true });
          },
        };

        const result = effect.execute(context);

        expect(result.data?.['outcome']).toBe('ultimate');
        // Should dispel, slow, sleep, and heal
        expect(createdTypes).toContain('dispel');
        expect(createdTypes).toContain('areaStatus');
        expect(createdTypes).toContain('heal');
      });
    });
  });
});
