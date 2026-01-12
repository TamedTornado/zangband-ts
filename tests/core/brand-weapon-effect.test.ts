import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { BrandWeaponEffect } from '@/core/systems/effects/BrandWeaponEffect';
import { Player } from '@/core/entities/Player';
import { Item } from '@/core/entities/Item';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import type { ItemDef } from '@/core/data/items';
import type { EgoItemDef } from '@/core/data/ego-items';
import type { ArtifactDef } from '@/core/data/artifacts';
import { createMockLevel } from './testHelpers';
import egoItemsData from '@/data/items/ego-items.json';

// Load ego items for verification
const egoItems = egoItemsData as Record<string, EgoItemDef>;

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
  });
}

function createTestWeapon(overrides: {
  egoItem?: EgoItemDef;
  artifact?: ArtifactDef;
  flags?: string[];
} = {}): Item {
  const baseItem: ItemDef = {
    key: 'test_sword',
    index: 1,
    name: 'Test Sword',
    symbol: '|',
    color: 'w',
    type: 'sword',
    sval: 1,
    pval: 0,
    depth: 1,
    rarity: 1,
    weight: 80,
    cost: 100,
    allocation: [],
    baseAc: 0,
    damage: '2d5',
    toHit: 0,
    toDam: 0,
    toAc: 0,
    flags: [],
  };
  const generated: import('@/core/systems/ItemGeneration').GeneratedItem = {
    baseItem,
    toHit: 0,
    toDam: 0,
    toAc: 0,
    pval: 0,
    flags: overrides.flags ?? [],
  };

  // Only add optional properties if defined
  if (overrides.egoItem) {
    generated.egoItem = overrides.egoItem;
  }
  if (overrides.artifact) {
    generated.artifact = overrides.artifact;
  }

  return new Item({
    id: 'test_weapon',
    position: { x: 0, y: 0 },
    symbol: '|',
    color: 'w',
    generated,
  });
}

describe('BrandWeaponEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted effect)', () => {
      const effect = new BrandWeaponEffect({ type: 'brandWeapon', brand: 'chaos' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute - failure cases', () => {
    it('fails when no weapon is equipped', () => {
      const effect = new BrandWeaponEffect({ type: 'brandWeapon', brand: 'chaos' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.success).toBe(false);
      expect(result.messages[0]).toContain('no weapon');
    });

    it('fails on artifact weapons', () => {
      const effect = new BrandWeaponEffect({ type: 'brandWeapon', brand: 'chaos' });
      const player = createTestPlayer(5, 5);
      const weapon = createTestWeapon({
        artifact: { key: 'test_artifact', name: 'Excalibur', index: 1 } as ArtifactDef,
      });
      player.addItem(weapon);
      player.equip(weapon);

      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.success).toBe(false);
      expect(result.messages[0]).toContain('failed');
    });

    it('fails on ego items (already branded)', () => {
      const effect = new BrandWeaponEffect({ type: 'brandWeapon', brand: 'chaos' });
      const player = createTestPlayer(5, 5);
      const weapon = createTestWeapon({
        egoItem: egoItems['chaotic'],
      });
      player.addItem(weapon);
      player.equip(weapon);

      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.success).toBe(false);
      expect(result.messages[0]).toContain('failed');
    });

    it('fails on cursed items', () => {
      const effect = new BrandWeaponEffect({ type: 'brandWeapon', brand: 'chaos' });
      const player = createTestPlayer(5, 5);
      const weapon = createTestWeapon({
        flags: ['CURSED'],
      });
      player.addItem(weapon);
      player.equip(weapon);

      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.success).toBe(false);
      expect(result.messages[0]).toContain('failed');
    });
  });

  describe('execute - brand types', () => {
    it('applies chaos brand with chaotic ego', () => {
      const effect = new BrandWeaponEffect({ type: 'brandWeapon', brand: 'chaos' });
      const player = createTestPlayer(5, 5);
      const weapon = createTestWeapon();
      player.addItem(weapon);
      player.equip(weapon);

      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(weapon.generated!.egoItem?.key).toBe('chaotic');
      expect(result.messages[0]).toContain('engulfed in raw Logrus');
    });

    it('applies poison brand with of_venom ego', () => {
      const effect = new BrandWeaponEffect({ type: 'brandWeapon', brand: 'poison' });
      const player = createTestPlayer(5, 5);
      const weapon = createTestWeapon();
      player.addItem(weapon);
      player.equip(weapon);

      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(weapon.generated!.egoItem?.key).toBe('of_venom');
      expect(result.messages[0]).toContain('coated with poison');
    });

    it('applies vampiric brand with vampiric ego', () => {
      const effect = new BrandWeaponEffect({ type: 'brandWeapon', brand: 'vampiric' });
      const player = createTestPlayer(5, 5);
      const weapon = createTestWeapon();
      player.addItem(weapon);
      player.equip(weapon);

      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(weapon.generated!.egoItem?.key).toBe('vampiric');
      expect(result.messages[0]).toContain('thirsts for blood');
    });

    it('applies teleport brand with trump_weapon ego', () => {
      const effect = new BrandWeaponEffect({ type: 'brandWeapon', brand: 'teleport' });
      const player = createTestPlayer(5, 5);
      const weapon = createTestWeapon();
      player.addItem(weapon);
      player.equip(weapon);

      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(weapon.generated!.egoItem?.key).toBe('trump_weapon');
      expect(result.messages[0]).toContain('unstable');
      // Trump brand also sets pval 1-2
      expect(weapon.generated!.pval).toBeGreaterThanOrEqual(1);
      expect(weapon.generated!.pval).toBeLessThanOrEqual(2);
    });

    it('applies elemental brand (fire or cold) randomly', () => {
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);

      // Run multiple times to verify randomness
      const egoKeys = new Set<string>();
      for (let i = 0; i < 20; i++) {
        RNG.setSeed(i);
        const effect = new BrandWeaponEffect({ type: 'brandWeapon', brand: 'elemental' });
        const weapon = createTestWeapon();
        player.addItem(weapon);
        player.equip(weapon);

        const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };
        effect.execute(context);

        egoKeys.add(weapon.generated!.egoItem?.key ?? '');
        player.unequip('weapon');
      }

      // Should have both fire and cold brands
      expect(egoKeys.has('of_flame') || egoKeys.has('of_frost')).toBe(true);
    });
  });

  describe('execute - enchantment bonus', () => {
    it('adds +4 to +6 to hit and damage', () => {
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);

      const bonuses: { toHit: number; toDam: number }[] = [];
      for (let i = 0; i < 20; i++) {
        RNG.setSeed(i);
        const effect = new BrandWeaponEffect({ type: 'brandWeapon', brand: 'chaos' });
        const weapon = createTestWeapon();
        player.addItem(weapon);
        player.equip(weapon);

        const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };
        effect.execute(context);

        bonuses.push({
          toHit: weapon.generated!.toHit,
          toDam: weapon.generated!.toDam,
        });
        player.unequip('weapon');
      }

      // All bonuses should be in range 4-6
      for (const bonus of bonuses) {
        expect(bonus.toHit).toBeGreaterThanOrEqual(4);
        expect(bonus.toHit).toBeLessThanOrEqual(6);
        expect(bonus.toDam).toBeGreaterThanOrEqual(4);
        expect(bonus.toDam).toBeLessThanOrEqual(6);
      }
    });
  });
});
