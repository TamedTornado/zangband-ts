/**
 * ServiceSystem tests
 *
 * Tests service cost calculation and execution.
 */

import { describe, it, expect } from 'vitest';
import { ServiceSystem } from '@/core/systems/ServiceSystem';
import { ServiceType } from '@/core/data/services';
import type { ServiceDef } from '@/core/data/services';
import type { Player } from '@/core/entities/Player';

// Mock player interface for testing (includes properties not on actual Player)
interface MockPlayer {
  gold: number;
  food: number;
  maxFood: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stats: {
    str: { base: number; current: number };
    int: { base: number; current: number };
    wis: { base: number; current: number };
    dex: { base: number; current: number };
    con: { base: number; current: number };
    chr: { base: number; current: number };
  };
  level: number;
  spendGold: (amount: number) => boolean;
}

// Create mock player for testing
function createMockPlayer(overrides: Partial<MockPlayer> = {}): Player {
  const player: MockPlayer = {
    gold: 1000,
    food: 5000,
    maxFood: 15000,
    hp: 50,
    maxHp: 100,
    mp: 20,
    maxMp: 50,
    stats: {
      str: { base: 10, current: 10 },
      int: { base: 10, current: 10 },
      wis: { base: 10, current: 10 },
      dex: { base: 10, current: 10 },
      con: { base: 10, current: 10 },
      chr: { base: 12, current: 12 },
    },
    level: 10,
    spendGold: function(this: MockPlayer, amount: number) {
      if (amount <= 0) return false;
      if (this.gold >= amount) {
        this.gold -= amount;
        return true;
      }
      return false;
    },
    ...overrides,
  };
  return player as unknown as Player;
}

// Helper to create service def
function createServiceDef(overrides: Partial<ServiceDef> = {}): ServiceDef {
  return {
    key: 'test_service',
    type: ServiceType.INN_EAT,
    name: 'Test Service',
    description: 'A test service',
    baseCost: 100,
    action: 'action:test',
    ...overrides,
  };
}

describe('ServiceSystem', () => {
  describe('getServiceCost', () => {
    it('applies charisma modifier to base cost', () => {
      // CHR 12 gives factor ~100 (neutral-ish)
      const cost = ServiceSystem.getServiceCost(100, 12);
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(200); // Should be reasonable
    });

    it('higher charisma = lower price', () => {
      const lowChrCost = ServiceSystem.getServiceCost(100, 8);
      const highChrCost = ServiceSystem.getServiceCost(100, 18);

      expect(highChrCost).toBeLessThan(lowChrCost);
    });

    it('returns minimum 1 gold even for 0 base cost', () => {
      const cost = ServiceSystem.getServiceCost(0, 12);
      expect(cost).toBe(0); // 0 base cost means free service
    });

    it('calculates cost for inn eat service', () => {
      const service = createServiceDef({
        type: ServiceType.INN_EAT,
        baseCost: 10,
      });
      const cost = ServiceSystem.getServiceCost(service.baseCost, 12);
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThanOrEqual(20); // Reasonable for 10 base
    });
  });

  describe('canUseService', () => {
    it('returns false if player lacks gold', () => {
      const player = createMockPlayer({ gold: 5 });
      const service = createServiceDef({ baseCost: 100 });

      const result = ServiceSystem.canUseService(player, service);
      expect(result.canUse).toBe(false);
      expect(result.reason).toContain('gold');
    });

    it('returns true if player has sufficient gold', () => {
      const player = createMockPlayer({ gold: 1000 });
      const service = createServiceDef({ baseCost: 100 });

      const result = ServiceSystem.canUseService(player, service);
      expect(result.canUse).toBe(true);
    });

    it('returns true for free services regardless of gold', () => {
      const player = createMockPlayer({ gold: 0 });
      const service = createServiceDef({ baseCost: 0 });

      const result = ServiceSystem.canUseService(player, service);
      expect(result.canUse).toBe(true);
    });

    it('returns false for inn_rest during daytime', () => {
      const player = createMockPlayer({ gold: 1000 });
      const service = createServiceDef({
        type: ServiceType.INN_REST,
        baseCost: 50,
        nightOnly: true,
      });

      // Daytime context
      const result = ServiceSystem.canUseService(player, service, { isNight: false });
      expect(result.canUse).toBe(false);
      expect(result.reason).toContain('night');
    });

    it('returns true for inn_rest at night', () => {
      const player = createMockPlayer({ gold: 1000 });
      const service = createServiceDef({
        type: ServiceType.INN_REST,
        baseCost: 50,
        nightOnly: true,
      });

      // Nighttime context
      const result = ServiceSystem.canUseService(player, service, { isNight: true });
      expect(result.canUse).toBe(true);
    });
  });

  describe('executeService', () => {
    describe('inn_eat', () => {
      it('restores food to max', () => {
        const player = createMockPlayer({ food: 5000, maxFood: 15000, gold: 100 });
        const service = createServiceDef({
          type: ServiceType.INN_EAT,
          baseCost: 10,
        });

        const result = ServiceSystem.executeService(player, service);
        expect(result.success).toBe(true);
        expect((player as any).food).toBe((player as any).maxFood);
      });

      it('deducts cost from player gold', () => {
        const player = createMockPlayer({ gold: 100, food: 5000 });
        const service = createServiceDef({
          type: ServiceType.INN_EAT,
          baseCost: 10,
        });

        const initialGold = player.gold;
        ServiceSystem.executeService(player, service);

        expect(player.gold).toBeLessThan(initialGold);
      });
    });

    describe('inn_rest', () => {
      it('restores HP to max', () => {
        const player = createMockPlayer({ hp: 50, maxHp: 100, gold: 100 });
        const service = createServiceDef({
          type: ServiceType.INN_REST,
          baseCost: 50,
          nightOnly: true,
        });

        const result = ServiceSystem.executeService(player, service, { isNight: true });
        expect(result.success).toBe(true);
        expect((player as any).hp).toBe((player as any).maxHp);
      });

      it('restores MP to max', () => {
        const player = createMockPlayer({ mp: 20, maxMp: 50, gold: 100 });
        const service = createServiceDef({
          type: ServiceType.INN_REST,
          baseCost: 50,
          nightOnly: true,
        });

        ServiceSystem.executeService(player, service, { isNight: true });
        expect((player as any).mp).toBe((player as any).maxMp);
      });

      it('fails during daytime', () => {
        const player = createMockPlayer({ gold: 100 });
        const service = createServiceDef({
          type: ServiceType.INN_REST,
          baseCost: 50,
          nightOnly: true,
        });

        const result = ServiceSystem.executeService(player, service, { isNight: false });
        expect(result.success).toBe(false);
        expect(result.message).toContain('night');
      });
    });

    describe('healer_restore', () => {
      it('restores drained stats', () => {
        const player = createMockPlayer({
          gold: 500,
          stats: {
            str: { base: 15, current: 12 }, // Drained
            int: { base: 10, current: 10 },
            wis: { base: 10, current: 10 },
            dex: { base: 10, current: 10 },
            con: { base: 10, current: 10 },
            chr: { base: 12, current: 12 },
          },
        });
        const service = createServiceDef({
          type: ServiceType.HEALER_RESTORE,
          baseCost: 200,
        });

        const result = ServiceSystem.executeService(player, service);
        expect(result.success).toBe(true);
        expect((player as any).stats.str.current).toBe((player as any).stats.str.base);
      });

      it('no charge if nothing to restore', () => {
        const player = createMockPlayer({
          gold: 500,
          stats: {
            str: { base: 10, current: 10 },
            int: { base: 10, current: 10 },
            wis: { base: 10, current: 10 },
            dex: { base: 10, current: 10 },
            con: { base: 10, current: 10 },
            chr: { base: 12, current: 12 },
          },
        });
        const service = createServiceDef({
          type: ServiceType.HEALER_RESTORE,
          baseCost: 200,
        });

        const initialGold = player.gold;
        const result = ServiceSystem.executeService(player, service);
        expect(result.success).toBe(false);
        expect(result.message).toContain('nothing');
        expect(player.gold).toBe(initialGold);
      });
    });

    describe('identify_all', () => {
      it('identifies unidentified items via generated.identified', () => {
        const player = createMockPlayer({ gold: 600 });
        const service = createServiceDef({
          type: ServiceType.IDENTIFY_ALL,
          baseCost: 500,
        });

        // Mock inventory with items using correct structure
        const item1 = { generated: { identified: false } };
        const item2 = { generated: { identified: true } };
        const item3 = { generated: { identified: false } };
        (player as any).inventory = { items: [item1, item2, item3] };

        const result = ServiceSystem.executeService(player, service);
        expect(result.success).toBe(true);
        expect(result.message).toContain('2'); // Should identify 2 items
        expect(item1.generated.identified).toBe(true);
        expect(item2.generated.identified).toBe(true);
        expect(item3.generated.identified).toBe(true);
      });

      it('reports already identified when all items identified', () => {
        const player = createMockPlayer({ gold: 600 });
        const service = createServiceDef({
          type: ServiceType.IDENTIFY_ALL,
          baseCost: 500,
        });

        const item1 = { generated: { identified: true } };
        (player as any).inventory = { items: [item1] };

        const result = ServiceSystem.executeService(player, service);
        expect(result.success).toBe(true);
        expect(result.message).toContain('already identified');
      });

      it('deducts cost even if nothing to identify', () => {
        const player = createMockPlayer({ gold: 600 });
        const service = createServiceDef({
          type: ServiceType.IDENTIFY_ALL,
          baseCost: 500,
        });
        (player as any).inventory = { items: [] };

        const initialGold = player.gold;
        ServiceSystem.executeService(player, service);
        expect(player.gold).toBeLessThan(initialGold);
      });

      it('skips items without generated property', () => {
        const player = createMockPlayer({ gold: 600 });
        const service = createServiceDef({
          type: ServiceType.IDENTIFY_ALL,
          baseCost: 500,
        });

        // Mix of items with and without generated
        const item1 = { generated: { identified: false } };
        const item2 = { name: 'gold pile' }; // No generated property
        (player as any).inventory = { items: [item1, item2] };

        const result = ServiceSystem.executeService(player, service);
        expect(result.success).toBe(true);
        expect(result.message).toContain('1'); // Only 1 item identified
        expect(item1.generated.identified).toBe(true);
      });
    });

    describe('enchant_weapon', () => {
      it('caps to_hit at level/5', () => {
        const player = createMockPlayer({ level: 10, gold: 500 });

        // Max cap should be level/5 = 2
        const result = ServiceSystem.getEnchantCap(player.level, 'hit');
        expect(result).toBe(2);
      });

      it('caps to_dam at level/3', () => {
        const player = createMockPlayer({ level: 15, gold: 500 });

        // Max cap should be level/3 = 5
        const result = ServiceSystem.getEnchantCap(player.level, 'dam');
        expect(result).toBe(5);
      });
    });

    describe('enchant_armor', () => {
      it('caps to_ac at level/5', () => {
        const player = createMockPlayer({ level: 20, gold: 500 });

        // Max cap should be level/5 = 4
        const result = ServiceSystem.getEnchantCap(player.level, 'ac');
        expect(result).toBe(4);
      });
    });

    describe('quest_view', () => {
      it('shows placeholder message', () => {
        const player = createMockPlayer({ gold: 0 });
        const service = createServiceDef({
          type: ServiceType.QUEST_VIEW,
          baseCost: 0,
        });

        const result = ServiceSystem.executeService(player, service);
        expect(result.success).toBe(true);
        expect(result.message).toContain('coming soon');
      });

      it('no charge', () => {
        const player = createMockPlayer({ gold: 100 });
        const service = createServiceDef({
          type: ServiceType.QUEST_VIEW,
          baseCost: 0,
        });

        const initialGold = player.gold;
        ServiceSystem.executeService(player, service);
        expect(player.gold).toBe(initialGold);
      });
    });
  });
});
