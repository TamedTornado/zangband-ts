import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { RemoveCurseEffect } from '@/core/systems/effects/RemoveCurseEffect';
import { Player } from '@/core/entities/Player';
import { Item } from '@/core/entities/Item';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
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

function createTestWeapon(options: {
  cursed?: boolean;
  heavyCurse?: boolean;
  permaCurse?: boolean;
} = {}): Item {
  const flags: string[] = [];
  if (options.cursed) flags.push('CURSED');
  if (options.heavyCurse) flags.push('HEAVY_CURSE');
  if (options.permaCurse) flags.push('PERMA_CURSE');

  const generated = {
    // type: 'sword' matches weapon slot in SLOT_TYPES
    baseItem: createTestItemDef({ key: 'longsword', name: 'Longsword', type: 'sword', cost: 300 }),
    toHit: 0,
    toDam: 0,
    toAc: 0,
    pval: 0,
    flags,
  } as any;

  return new Item({
    id: 'test-weapon',
    position: { x: 0, y: 0 },
    symbol: '/',
    color: 'w',
    generated,
  });
}

describe('RemoveCurseEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('remove light curse (removeAll: false)', () => {
    it('removes CURSED flag from equipped item', () => {
      const effect = new RemoveCurseEffect({ type: 'removeCurse', removeAll: false });
      const player = createTestPlayer(25, 25);
      const weapon = createTestWeapon({ cursed: true });
      player.equip(weapon);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.['uncursedCount']).toBe(1);
      // Verify curse was actually removed
      expect(weapon.generated?.flags.includes('CURSED')).toBe(false);
    });

    it('fails to remove HEAVY_CURSE when removeAll is false', () => {
      const effect = new RemoveCurseEffect({ type: 'removeCurse', removeAll: false });
      const player = createTestPlayer(25, 25);
      const weapon = createTestWeapon({ cursed: true, heavyCurse: true });
      player.equip(weapon);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // Should still succeed but not uncurse heavy cursed items
      expect(result.success).toBe(true);
      expect(result.data?.['uncursedCount']).toBe(0);
      // Curse should still be there
      expect(weapon.generated?.flags.includes('CURSED')).toBe(true);
      expect(weapon.generated?.flags.includes('HEAVY_CURSE')).toBe(true);
    });

    it('never removes PERMA_CURSE', () => {
      const effect = new RemoveCurseEffect({ type: 'removeCurse', removeAll: false });
      const player = createTestPlayer(25, 25);
      const weapon = createTestWeapon({ cursed: true, permaCurse: true });
      player.equip(weapon);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.['uncursedCount']).toBe(0);
      expect(weapon.generated?.flags.includes('PERMA_CURSE')).toBe(true);
    });
  });

  describe('dispel curse (removeAll: true)', () => {
    it('removes HEAVY_CURSE when removeAll is true', () => {
      const effect = new RemoveCurseEffect({ type: 'removeCurse', removeAll: true });
      const player = createTestPlayer(25, 25);
      const weapon = createTestWeapon({ cursed: true, heavyCurse: true });
      player.equip(weapon);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.['uncursedCount']).toBe(1);
      expect(weapon.generated?.flags.includes('CURSED')).toBe(false);
      expect(weapon.generated?.flags.includes('HEAVY_CURSE')).toBe(false);
    });

    it('still cannot remove PERMA_CURSE even with removeAll', () => {
      const effect = new RemoveCurseEffect({ type: 'removeCurse', removeAll: true });
      const player = createTestPlayer(25, 25);
      const weapon = createTestWeapon({ cursed: true, heavyCurse: true, permaCurse: true });
      player.equip(weapon);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.['uncursedCount']).toBe(0);
      expect(weapon.generated?.flags.includes('PERMA_CURSE')).toBe(true);
    });
  });

  describe('no cursed items', () => {
    it('reports nothing to uncurse when no cursed items equipped', () => {
      const effect = new RemoveCurseEffect({ type: 'removeCurse', removeAll: false });
      const player = createTestPlayer(25, 25);
      const weapon = createTestWeapon(); // Not cursed
      player.equip(weapon);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.['uncursedCount']).toBe(0);
      expect(result.messages.some(m => m.includes('watching over you'))).toBe(true);
    });

    it('reports nothing when no items equipped', () => {
      const effect = new RemoveCurseEffect({ type: 'removeCurse', removeAll: false });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.['uncursedCount']).toBe(0);
    });
  });

  describe('multiple items', () => {
    it('uncurses multiple equipped items', () => {
      const effect = new RemoveCurseEffect({ type: 'removeCurse', removeAll: false });
      const player = createTestPlayer(25, 25);

      // Create cursed weapon
      const weapon = createTestWeapon({ cursed: true });
      player.equip(weapon);

      // Create cursed armor (type: 'hard_armor' matches armor slot in SLOT_TYPES)
      const armor = new Item({
        id: 'test-armor',
        position: { x: 0, y: 0 },
        symbol: '[',
        color: 'w',
        generated: {
          baseItem: createTestItemDef({ key: 'chain_mail', name: 'Chain Mail', type: 'hard_armor' }),
          toHit: 0,
          toDam: 0,
          toAc: 0,
          pval: 0,
          flags: ['CURSED'],
        } as any,
      });
      player.equip(armor);

      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.['uncursedCount']).toBe(2);
      expect(weapon.generated?.flags.includes('CURSED')).toBe(false);
      expect(armor.generated?.flags.includes('CURSED')).toBe(false);
    });
  });
});
