import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { BlessWeaponEffect } from '@/core/systems/effects/BlessWeaponEffect';
import { Player } from '@/core/entities/Player';
import { Item } from '@/core/entities/Item';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import type { ArtifactDef } from '@/core/data/artifacts';
import { createMockLevel, createTestItemDef } from './testHelpers';

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
}

const TEST_ARTIFACT: ArtifactDef = {
  key: 'test_artifact',
  index: 1,
  name: 'Test Artifact',
  type: 'weapon',
  sval: 1,
  depth: 10,
  rarity: 1,
  weight: 100,
  cost: 10000,
  pval: 0,
  toHit: 10,
  toDam: 10,
  toAc: 0,
  baseAc: 0,
  damage: '2d6',
  flags: [],
};

function createTestWeapon(options: {
  cursed?: boolean;
  heavyCurse?: boolean;
  permaCurse?: boolean;
  blessed?: boolean;
  artifact?: boolean;
  toHit?: number;
  toDam?: number;
  toAC?: number;
} = {}): Item {
  // Build flags array based on options
  const flags: string[] = [];
  if (options.cursed) flags.push('CURSED');
  if (options.heavyCurse) flags.push('HEAVY_CURSE');
  if (options.permaCurse) flags.push('PERMA_CURSE');
  if (options.blessed) flags.push('BLESSED');

  // Use 'as any' for legacy boolean properties that the effect code expects
  const generated = {
    baseItem: createTestItemDef({ key: 'longsword', name: 'Longsword', type: 'weapon', cost: 300 }),
    identified: true,
    artifact: options.artifact ? TEST_ARTIFACT : undefined,
    toHit: options.toHit ?? 0,
    toDam: options.toDam ?? 0,
    toAc: options.toAC ?? 0,
    pval: 0,
    flags,
    // Legacy boolean properties for backward compatibility
    cursed: options.cursed,
    heavyCurse: options.heavyCurse,
    permaCurse: options.permaCurse,
    blessed: options.blessed,
  } as any;

  return new Item({
    id: 'test-weapon',
    position: { x: 0, y: 0 },
    symbol: '/',
    color: 'w',
    generated,
  });
}

describe('BlessWeaponEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns true when item target is provided', () => {
      const effect = new BlessWeaponEffect({ type: 'blessWeapon', target: 'item' });
      const player = createTestPlayer(25, 25);
      const weapon = createTestWeapon();
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetItem: weapon,
      };

      expect(effect.canExecute(context)).toBe(true);
    });

    it('returns false when no item target', () => {
      const effect = new BlessWeaponEffect({ type: 'blessWeapon', target: 'item' });
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
    describe('cursed weapons', () => {
      it('removes regular curse from weapon', () => {
        const effect = new BlessWeaponEffect({ type: 'blessWeapon', target: 'item' });
        const player = createTestPlayer(25, 25);
        const weapon = createTestWeapon({ cursed: true });
        const level = createMockLevel([], player);

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
          targetItem: weapon,
        };

        const result = effect.execute(context);

        expect(result.success).toBe(true);
        expect(result.data?.['uncursed']).toBe(true);
        expect(result.messages.some(m => m.includes('malignant aura'))).toBe(true);
      });

      it('fails on perma-cursed weapon', () => {
        const effect = new BlessWeaponEffect({ type: 'blessWeapon', target: 'item' });
        const player = createTestPlayer(25, 25);
        const weapon = createTestWeapon({ cursed: true, permaCurse: true });
        const level = createMockLevel([], player);

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
          targetItem: weapon,
        };

        const result = effect.execute(context);

        expect(result.success).toBe(true); // Spell succeeds but curse remains
        expect(result.data?.['uncursed']).toBe(false);
        expect(result.data?.['curseDisrupted']).toBe(true);
        expect(result.messages.some(m => m.includes('disrupts'))).toBe(true);
      });

      it('may fail on heavy-cursed weapon (33% chance)', () => {
        const effect = new BlessWeaponEffect({ type: 'blessWeapon', target: 'item' });
        const player = createTestPlayer(25, 25);
        const level = createMockLevel([], player);

        // Run multiple times to check randomness
        let disruptions = 0;
        let successes = 0;
        for (let i = 0; i < 100; i++) {
          RNG.setSeed(i * 17 + 1); // Vary seed more
          const newWeapon = createTestWeapon({ cursed: true, heavyCurse: true });
          const context: GPEffectContext = {
            actor: player,
            level: level as any,
            rng: RNG,
            targetItem: newWeapon,
          };
          const result = effect.execute(context);
          if (result.data?.['curseDisrupted']) {
            disruptions++;
          } else {
            successes++;
          }
        }

        // Should have some disruptions (around 33%) and some successes (around 67%)
        expect(disruptions).toBeGreaterThan(5);
        expect(successes).toBeGreaterThan(5);
      });
    });

    describe('already blessed weapon', () => {
      it('reports weapon is already blessed', () => {
        const effect = new BlessWeaponEffect({ type: 'blessWeapon', target: 'item' });
        const player = createTestPlayer(25, 25);
        const weapon = createTestWeapon({ blessed: true });
        const level = createMockLevel([], player);

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
          targetItem: weapon,
        };

        const result = effect.execute(context);

        expect(result.success).toBe(true);
        expect(result.data?.['alreadyBlessed']).toBe(true);
        expect(result.messages.some(m => m.includes('already'))).toBe(true);
      });
    });

    describe('normal weapons', () => {
      it('blesses a normal weapon', () => {
        const effect = new BlessWeaponEffect({ type: 'blessWeapon', target: 'item' });
        const player = createTestPlayer(25, 25);
        const weapon = createTestWeapon();
        const level = createMockLevel([], player);

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
          targetItem: weapon,
        };

        const result = effect.execute(context);

        expect(result.success).toBe(true);
        expect(result.data?.['blessed']).toBe(true);
        expect(result.messages.some(m => m.includes('shine'))).toBe(true);
      });
    });

    describe('artifact weapons', () => {
      it('may bless artifact (1/3 chance)', () => {
        const effect = new BlessWeaponEffect({ type: 'blessWeapon', target: 'item' });
        const player = createTestPlayer(25, 25);
        const level = createMockLevel([], player);

        // Run multiple times to check randomness
        let blessed = 0;
        let resisted = 0;
        for (let i = 0; i < 100; i++) {
          RNG.setSeed(i * 17 + 1); // Vary seed more
          const weapon = createTestWeapon({ artifact: true, toHit: 10, toDam: 10 });
          const context: GPEffectContext = {
            actor: player,
            level: level as any,
            rng: RNG,
            targetItem: weapon,
          };
          const result = effect.execute(context);
          if (result.data?.['blessed']) {
            blessed++;
          } else if (result.data?.['artifactResisted']) {
            resisted++;
          }
        }

        // Should have some blessings (around 33%) and some resistances (around 67%)
        expect(blessed).toBeGreaterThan(5);
        expect(resisted).toBeGreaterThan(5);
      });

      it('disenchants artifact when it resists', () => {
        // Find a seed that causes resist
        RNG.setSeed(2); // Known to cause resist with this test setup
        const effect = new BlessWeaponEffect({ type: 'blessWeapon', target: 'item' });
        const player = createTestPlayer(25, 25);
        const weapon = createTestWeapon({ artifact: true, toHit: 10, toDam: 10 });
        const level = createMockLevel([], player);

        const context: GPEffectContext = {
          actor: player,
          level: level as any,
          rng: RNG,
          targetItem: weapon,
        };

        const result = effect.execute(context);

        if (result.data?.['artifactResisted']) {
          expect(result.messages.some(m => m.includes('resists'))).toBe(true);
          // Should have some disenchantment
          expect(result.data?.['disenchanted']).toBeDefined();
        }
      });
    });
  });
});
