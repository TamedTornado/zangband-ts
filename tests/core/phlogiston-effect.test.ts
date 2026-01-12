import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { PhlogistonEffect } from '@/core/systems/effects/PhlogistonEffect';
import { Player } from '@/core/entities/Player';
import { Item } from '@/core/entities/Item';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import { createMockLevel } from './testHelpers';

// Mock torch item definition
const torchDef = {
  key: 'wooden_torch',
  name: 'Wooden Torch',
  symbol: '~',
  color: 'u',
  type: 'light',
  sval: 0,
  pval: 4000, // Max fuel
};

// Mock lantern item definition
const lanternDef = {
  key: 'brass_lantern',
  name: 'Brass Lantern',
  symbol: '~',
  color: 'U',
  type: 'light',
  sval: 1,
  pval: 7500, // Max fuel
};

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
}

function createLightItem(def: any, currentFuel: number): Item {
  const item = new Item({
    id: `${def.key}-${Math.random()}`,
    position: { x: 0, y: 0 },
    symbol: def.symbol,
    color: def.color,
    generated: {
      baseItem: def,
      timeout: currentFuel,
      toHit: 0,
      toDam: 0,
      toAc: 0,
      pval: 0,
      flags: [],
    },
  });
  return item;
}

describe('PhlogistonEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new PhlogistonEffect({ type: 'phlogiston' });
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

  describe('execute - no light equipped', () => {
    it('fails when no light source equipped', () => {
      const effect = new PhlogistonEffect({ type: 'phlogiston' });
      const player = createTestPlayer(25, 25);
      // Don't equip any light
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(false);
      expect(result.messages.some(m => m.includes('not wielding') || m.includes('no light'))).toBe(true);
    });
  });

  describe('execute - torch refueling', () => {
    it('adds fuel to a partially empty torch', () => {
      const effect = new PhlogistonEffect({ type: 'phlogiston' });
      const player = createTestPlayer(25, 25);
      const torch = createLightItem(torchDef, 1000); // 1000/4000 fuel
      player.equip(torch);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      // Should add half of max fuel (2000) = 1000 + 2000 = 3000
      expect(torch.generated!.timeout).toBe(3000);
      expect(result.messages.some(m => m.includes('phlogiston') || m.includes('add'))).toBe(true);
    });

    it('caps torch fuel at maximum', () => {
      const effect = new PhlogistonEffect({ type: 'phlogiston' });
      const player = createTestPlayer(25, 25);
      const torch = createLightItem(torchDef, 3500); // Near full
      player.equip(torch);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      // Would be 3500 + 2000 = 5500, but capped at 4000
      expect(torch.generated!.timeout).toBe(4000);
      expect(result.messages.some(m => m.includes('full'))).toBe(true);
    });

    it('fails when torch is already full', () => {
      const effect = new PhlogistonEffect({ type: 'phlogiston' });
      const player = createTestPlayer(25, 25);
      const torch = createLightItem(torchDef, 4000); // Full
      player.equip(torch);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(false);
      expect(result.messages.some(m => m.includes('No more') || m.includes('full') || m.includes('already'))).toBe(true);
    });
  });

  describe('execute - lantern refueling', () => {
    it('adds fuel to a partially empty lantern', () => {
      const effect = new PhlogistonEffect({ type: 'phlogiston' });
      const player = createTestPlayer(25, 25);
      const lantern = createLightItem(lanternDef, 2000); // 2000/7500 fuel
      player.equip(lantern);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      // Should add half of max fuel (3750) = 2000 + 3750 = 5750
      expect(lantern.generated!.timeout).toBe(5750);
    });

    it('caps lantern fuel at maximum', () => {
      const effect = new PhlogistonEffect({ type: 'phlogiston' });
      const player = createTestPlayer(25, 25);
      const lantern = createLightItem(lanternDef, 6000); // Near full
      player.equip(lantern);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      // Would be 6000 + 3750 = 9750, but capped at 7500
      expect(lantern.generated!.timeout).toBe(7500);
    });
  });

  describe('execute - non-refuelable light', () => {
    it('fails for non-torch/lantern light sources', () => {
      const effect = new PhlogistonEffect({ type: 'phlogiston' });
      const player = createTestPlayer(25, 25);
      // Permanent light (like Phial) - sval > 1
      const permanentLight = createLightItem({
        ...lanternDef,
        key: 'phial_of_galadriel',
        name: 'Phial of Galadriel',
        sval: 4, // Not a torch or lantern
      }, 0);
      player.equip(permanentLight);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(false);
      expect(result.messages.some(m => m.includes('not') || m.includes('cannot'))).toBe(true);
    });
  });
});
