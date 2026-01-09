import { describe, it, expect } from 'vitest';
import { Entity } from '@/core/entities/Entity';
import { Actor } from '@/core/entities/Actor';
import { Item } from '@/core/entities/Item';
import { Player } from '@/core/entities/Player';
import { Monster } from '@/core/entities/Monster';

describe('Entity', () => {
  it('should have id, position, symbol, color', () => {
    const entity = new Entity({
      id: 'test-1',
      position: { x: 5, y: 10 },
      symbol: '@',
      color: '#fff',
    });

    expect(entity.id).toBe('test-1');
    expect(entity.position).toEqual({ x: 5, y: 10 });
    expect(entity.symbol).toBe('@');
    expect(entity.color).toBe('#fff');
  });

  it('should return a copy of position (immutable)', () => {
    const entity = new Entity({
      id: 'test-1',
      position: { x: 5, y: 10 },
      symbol: '@',
      color: '#fff',
    });

    const pos = entity.position;
    pos.x = 999;
    expect(entity.position.x).toBe(5);
  });

  it('should allow setting position', () => {
    const entity = new Entity({
      id: 'test-1',
      position: { x: 5, y: 10 },
      symbol: '@',
      color: '#fff',
    });

    entity.position = { x: 20, y: 30 };
    expect(entity.position).toEqual({ x: 20, y: 30 });
  });
});

describe('Actor', () => {
  it('should extend Entity with hp and energy', () => {
    const actor = new Actor({
      id: 'actor-1',
      position: { x: 0, y: 0 },
      symbol: 'k',
      color: '#0f0',
      maxHp: 50,
      speed: 110,
    });

    expect(actor.id).toBe('actor-1');
    expect(actor.symbol).toBe('k');
    expect(actor.maxHp).toBe(50);
    expect(actor.hp).toBe(50); // starts at max
    expect(actor.speed).toBe(110);
    expect(actor.energy).toBe(0); // starts at 0
  });

  it('should track hp changes', () => {
    const actor = new Actor({
      id: 'actor-1',
      position: { x: 0, y: 0 },
      symbol: 'k',
      color: '#0f0',
      maxHp: 50,
      speed: 110,
    });

    actor.hp = 30;
    expect(actor.hp).toBe(30);

    actor.hp = -10; // should clamp to 0
    expect(actor.hp).toBe(0);

    actor.hp = 100; // should clamp to maxHp
    expect(actor.hp).toBe(50);
  });

  it('should report isDead when hp <= 0', () => {
    const actor = new Actor({
      id: 'actor-1',
      position: { x: 0, y: 0 },
      symbol: 'k',
      color: '#0f0',
      maxHp: 50,
      speed: 110,
    });

    expect(actor.isDead).toBe(false);
    actor.hp = 0;
    expect(actor.isDead).toBe(true);
  });

  it('should gain energy based on speed using extract_energy table', () => {
    const actor = new Actor({
      id: 'actor-1',
      position: { x: 0, y: 0 },
      symbol: 'k',
      color: '#0f0',
      maxHp: 50,
      speed: 110, // normal speed = 10 energy per tick
    });

    actor.gainEnergy();
    expect(actor.energy).toBe(10);

    actor.gainEnergy();
    expect(actor.energy).toBe(20);
  });

  it('should spend energy on actions', () => {
    const actor = new Actor({
      id: 'actor-1',
      position: { x: 0, y: 0 },
      symbol: 'k',
      color: '#0f0',
      maxHp: 50,
      speed: 110,
    });

    // Speed 110 = 10 energy per tick (from extract_energy table)
    actor.gainEnergy();
    expect(actor.energy).toBe(10);

    // Gain more energy until we can act
    for (let i = 0; i < 9; i++) {
      actor.gainEnergy();
    }
    expect(actor.energy).toBe(100);

    actor.spendEnergy(100);
    expect(actor.energy).toBe(0);
  });

  it('should report canAct when energy >= 100', () => {
    const actor = new Actor({
      id: 'actor-1',
      position: { x: 0, y: 0 },
      symbol: 'k',
      color: '#0f0',
      maxHp: 50,
      speed: 110,
    });

    expect(actor.canAct).toBe(false);
    // Speed 110 = 10 energy per tick, need 10 ticks to get 100 energy
    for (let i = 0; i < 10; i++) {
      actor.gainEnergy();
    }
    expect(actor.canAct).toBe(true);
  });
});

describe('Item', () => {
  it('should extend Entity with item properties', () => {
    const item = new Item({
      id: 'item-1',
      position: { x: 3, y: 4 },
      symbol: '!',
      color: '#00f',
      generated: {
        baseItem: { name: 'Healing', type: 'potion', sval: 1 } as any,
        toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], cost: 0,
      },
    });

    expect(item.id).toBe('item-1');
    expect(item.symbol).toBe('!');
    expect(item.name).toBe('Potion of Healing');
    expect(item.type).toBe('potion');
  });

  it('should support stacking with quantity', () => {
    const item = new Item({
      id: 'item-1',
      position: { x: 3, y: 4 },
      symbol: '!',
      color: '#00f',
      quantity: 5,
      generated: {
        baseItem: { name: 'Healing', type: 'potion', sval: 1 } as any,
        toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], cost: 0,
      },
    });

    expect(item.quantity).toBe(5);
  });

  it('should default quantity to 1', () => {
    const item = new Item({
      id: 'item-1',
      position: { x: 3, y: 4 },
      symbol: '!',
      color: '#00f',
      generated: {
        baseItem: { name: 'Healing', type: 'potion', sval: 1 } as any,
        toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], cost: 0,
      },
    });

    expect(item.quantity).toBe(1);
  });

  describe('device type checks', () => {
    it('identifies wands', () => {
      const wand = new Item({
        id: 'wand-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#f0f',
        generated: {
          baseItem: { name: 'Magic Missile', type: 'wand', sval: 1, key: 'wand_magic_missile', pval: 5 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], charges: 5, maxCharges: 5,
        },
      });
      expect(wand.isWand).toBe(true);
      expect(wand.isStaff).toBe(false);
      expect(wand.isRod).toBe(false);
      expect(wand.isDevice).toBe(true);
    });

    it('identifies staffs', () => {
      const staff = new Item({
        id: 'staff-1',
        position: { x: 0, y: 0 },
        symbol: '_',
        color: '#880',
        generated: {
          baseItem: { name: 'Teleportation', type: 'staff', sval: 1, key: 'staff_teleport', pval: 3 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], charges: 3, maxCharges: 3,
        },
      });
      expect(staff.isStaff).toBe(true);
      expect(staff.isWand).toBe(false);
      expect(staff.isDevice).toBe(true);
    });

    it('identifies rods', () => {
      const rod = new Item({
        id: 'rod-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 0,
        },
      });
      expect(rod.isRod).toBe(true);
      expect(rod.isWand).toBe(false);
      expect(rod.isDevice).toBe(true);
    });
  });

  describe('device charges', () => {
    it('tracks wand charges', () => {
      const wand = new Item({
        id: 'wand-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#f0f',
        generated: {
          baseItem: { name: 'Magic Missile', type: 'wand', sval: 1, key: 'wand_magic_missile', pval: 5 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], charges: 5, maxCharges: 8,
        },
      });
      expect(wand.charges).toBe(5);
      expect(wand.maxCharges).toBe(8);
    });

    it('useCharge decrements wand charges', () => {
      const wand = new Item({
        id: 'wand-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#f0f',
        generated: {
          baseItem: { name: 'Magic Missile', type: 'wand', sval: 1, key: 'wand_magic_missile', pval: 5 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], charges: 5, maxCharges: 5,
        },
      });
      wand.useCharge();
      expect(wand.charges).toBe(4);
    });

    it('useCharge sets rod timeout', () => {
      const rod = new Item({
        id: 'rod-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 0,
        },
      });
      expect(rod.isReady).toBe(true);
      rod.useCharge();
      expect(rod.timeout).toBe(10); // pval is recharge time
      expect(rod.isReady).toBe(false);
    });

    it('tickTimeout reduces rod recharge time', () => {
      const rod = new Item({
        id: 'rod-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 5,
        },
      });
      rod.tickTimeout(2);
      expect(rod.timeout).toBe(3);
      rod.tickTimeout(5);
      expect(rod.timeout).toBe(0);
      expect(rod.isReady).toBe(true);
    });
  });

  describe('item stacking', () => {
    it('potions can stack with same type', () => {
      const potion1 = new Item({
        id: 'potion-1',
        position: { x: 0, y: 0 },
        symbol: '!',
        color: '#f00',
        generated: {
          baseItem: { name: 'Healing', type: 'potion', sval: 1, key: 'potion_healing' } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [],
        },
      });
      const potion2 = new Item({
        id: 'potion-2',
        position: { x: 0, y: 0 },
        symbol: '!',
        color: '#f00',
        generated: {
          baseItem: { name: 'Healing', type: 'potion', sval: 1, key: 'potion_healing' } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [],
        },
      });
      expect(potion1.canStack(potion2)).toBe(true);
    });

    it('different potions cannot stack', () => {
      const healing = new Item({
        id: 'potion-1',
        position: { x: 0, y: 0 },
        symbol: '!',
        color: '#f00',
        generated: {
          baseItem: { name: 'Healing', type: 'potion', sval: 1, key: 'potion_healing' } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [],
        },
      });
      const speed = new Item({
        id: 'potion-2',
        position: { x: 0, y: 0 },
        symbol: '!',
        color: '#0f0',
        generated: {
          baseItem: { name: 'Speed', type: 'potion', sval: 2, key: 'potion_speed' } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [],
        },
      });
      expect(healing.canStack(speed)).toBe(false);
    });

    it('wands of same type can stack and combine charges', () => {
      const wand1 = new Item({
        id: 'wand-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#f0f',
        generated: {
          baseItem: { name: 'Magic Missile', type: 'wand', sval: 1, key: 'wand_magic_missile', pval: 5 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], charges: 3, maxCharges: 5,
        },
      });
      const wand2 = new Item({
        id: 'wand-2',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#f0f',
        generated: {
          baseItem: { name: 'Magic Missile', type: 'wand', sval: 1, key: 'wand_magic_missile', pval: 5 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], charges: 4, maxCharges: 6,
        },
      });
      expect(wand1.canStack(wand2)).toBe(true);
      wand1.absorb(wand2);
      expect(wand1.quantity).toBe(2);
      expect(wand1.charges).toBe(7); // 3 + 4
      expect(wand1.maxCharges).toBe(11); // 5 + 6
    });

    it('staffs only stack if same charges', () => {
      const staff1 = new Item({
        id: 'staff-1',
        position: { x: 0, y: 0 },
        symbol: '_',
        color: '#880',
        generated: {
          baseItem: { name: 'Teleportation', type: 'staff', sval: 1, key: 'staff_teleport', pval: 3 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], charges: 3, maxCharges: 3,
        },
      });
      const staff2 = new Item({
        id: 'staff-2',
        position: { x: 0, y: 0 },
        symbol: '_',
        color: '#880',
        generated: {
          baseItem: { name: 'Teleportation', type: 'staff', sval: 1, key: 'staff_teleport', pval: 3 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], charges: 3, maxCharges: 3,
        },
      });
      const staff3 = new Item({
        id: 'staff-3',
        position: { x: 0, y: 0 },
        symbol: '_',
        color: '#880',
        generated: {
          baseItem: { name: 'Teleportation', type: 'staff', sval: 1, key: 'staff_teleport', pval: 3 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], charges: 2, maxCharges: 3,
        },
      });
      expect(staff1.canStack(staff2)).toBe(true); // same charges
      expect(staff1.canStack(staff3)).toBe(false); // different charges
    });

    it('artifacts cannot stack', () => {
      const artifact1 = new Item({
        id: 'art-1',
        position: { x: 0, y: 0 },
        symbol: '|',
        color: '#ff0',
        generated: {
          baseItem: { name: 'Sword', type: 'sword', sval: 1, key: 'long_sword' } as any,
          artifact: { name: 'Excalibur', key: 'excalibur' } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [],
        },
      });
      const artifact2 = new Item({
        id: 'art-2',
        position: { x: 0, y: 0 },
        symbol: '|',
        color: '#ff0',
        generated: {
          baseItem: { name: 'Sword', type: 'sword', sval: 1, key: 'long_sword' } as any,
          artifact: { name: 'Excalibur', key: 'excalibur' } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [],
        },
      });
      expect(artifact1.canStack(artifact2)).toBe(false);
    });
  });

  describe('device display names', () => {
    it('shows wand charges in name', () => {
      const wand = new Item({
        id: 'wand-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#f0f',
        generated: {
          baseItem: { name: 'Magic Missile', type: 'wand', sval: 1, key: 'wand_magic_missile', pval: 5 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], charges: 5, maxCharges: 8, identified: true,
        },
      });
      expect(wand.name).toBe('Wand of Magic Missile (5/8 charges)');
    });

    it('shows nothing when rod is ready (Zangband style)', () => {
      const rod = new Item({
        id: 'rod-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 0, identified: true,
        },
      });
      expect(rod.name).toBe('Rod of Light');
    });

    it('shows (charging) when single rod is recharging', () => {
      const rod = new Item({
        id: 'rod-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 5, identified: true,
        },
      });
      expect(rod.name).toBe('Rod of Light (charging)');
    });

    it('shows (N charging) for stacked rods', () => {
      const rod = new Item({
        id: 'rod-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        quantity: 3,
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 15, identified: true,
        },
      });
      // timeout=15, pval=10, quantity=3 → ceil(15/10) = 2 charging
      expect(rod.name).toBe('Rod of Light (2 charging)');
    });
  });

  describe('rod stacking and charging', () => {
    it('chargingCount calculates correctly', () => {
      const rod = new Item({
        id: 'rod-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        quantity: 5,
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 25, identified: true,
        },
      });
      // timeout=25, pval=10 → ceil(25/10) = 3 charging
      expect(rod.chargingCount).toBe(3);
    });

    it('chargingCount caps at quantity', () => {
      const rod = new Item({
        id: 'rod-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        quantity: 2,
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 50, identified: true,
        },
      });
      // timeout=50, pval=10 → ceil(50/10) = 5, but capped at quantity=2
      expect(rod.chargingCount).toBe(2);
    });

    it('isReady returns true when timeout is 0', () => {
      const rod = new Item({
        id: 'rod-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 0, identified: true,
        },
      });
      expect(rod.isReady).toBe(true);
    });

    it('isReady returns false when single rod is charging', () => {
      const rod = new Item({
        id: 'rod-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 5, identified: true,
        },
      });
      expect(rod.isReady).toBe(false);
    });

    it('isReady returns true when stacked rod has at least one ready', () => {
      const rod = new Item({
        id: 'rod-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        quantity: 3,
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 15, identified: true,
        },
      });
      // timeout=15, pval=10, quantity=3 → 2 charging, 1 ready
      expect(rod.chargingCount).toBe(2);
      expect(rod.isReady).toBe(true);
    });

    it('isReady returns false when all stacked rods are charging', () => {
      const rod = new Item({
        id: 'rod-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        quantity: 3,
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 30, identified: true,
        },
      });
      // timeout=30, pval=10, quantity=3 → 3 charging, 0 ready
      expect(rod.chargingCount).toBe(3);
      expect(rod.isReady).toBe(false);
    });

    it('useCharge accumulates timeout for stacked rods', () => {
      const rod = new Item({
        id: 'rod-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        quantity: 3,
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 0, identified: true,
        },
      });
      expect(rod.timeout).toBe(0);
      rod.useCharge();
      expect(rod.timeout).toBe(10); // pval added
      rod.useCharge();
      expect(rod.timeout).toBe(20); // pval added again
    });

    it('rods can stack regardless of timeout state', () => {
      const rod1 = new Item({
        id: 'rod-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 5, identified: true,
        },
      });
      const rod2 = new Item({
        id: 'rod-2',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 0, identified: true,
        },
      });
      expect(rod1.canStack(rod2)).toBe(true);
    });

    it('absorb combines rod timeouts', () => {
      const rod1 = new Item({
        id: 'rod-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        quantity: 2,
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 15, identified: true,
        },
      });
      const rod2 = new Item({
        id: 'rod-2',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        quantity: 1,
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 5, identified: true,
        },
      });
      rod1.absorb(rod2);
      expect(rod1.quantity).toBe(3);
      expect(rod1.timeout).toBe(20); // 15 + 5
    });
  });
});

describe('Player', () => {
  it('should extend Actor with stats', () => {
    const player = new Player({
      id: 'player-1',
      position: { x: 10, y: 10 },
      maxHp: 100,
      speed: 110,
      stats: { str: 16, int: 12, wis: 10, dex: 14, con: 15, chr: 11 },
    });

    expect(player.symbol).toBe('@');
    expect(player.color).toBe('#fff');
    expect(player.maxHp).toBe(100);
    expect(player.stats.str).toBe(16);
    expect(player.stats.dex).toBe(14);
  });

  it('should have empty inventory initially', () => {
    const player = new Player({
      id: 'player-1',
      position: { x: 10, y: 10 },
      maxHp: 100,
      speed: 110,
      stats: { str: 16, int: 12, wis: 10, dex: 14, con: 15, chr: 11 },
    });

    expect(player.inventory).toEqual([]);
  });

  it('should track known spells', () => {
    const player = new Player({
      id: 'player-1',
      position: { x: 10, y: 10 },
      maxHp: 100,
      speed: 110,
      stats: { str: 16, int: 12, wis: 10, dex: 14, con: 15, chr: 11 },
    });

    expect(player.knownSpells).toEqual([]);
  });
});

describe('Monster', () => {
  it('should extend Actor with monster definition reference', () => {
    const monster = new Monster({
      id: 'mon-1',
      position: { x: 5, y: 5 },
      symbol: 'k',
      color: '#0f0',
      maxHp: 20,
      speed: 110,
      definitionKey: 'kobold',
    });

    expect(monster.symbol).toBe('k');
    expect(monster.definitionKey).toBe('kobold');
    expect(monster.maxHp).toBe(20);
  });

  it('should track if monster is awake', () => {
    const monster = new Monster({
      id: 'mon-1',
      position: { x: 5, y: 5 },
      symbol: 'k',
      color: '#0f0',
      maxHp: 20,
      speed: 110,
      definitionKey: 'kobold',
    });

    expect(monster.isAwake).toBe(false); // starts asleep
    monster.wake();
    expect(monster.isAwake).toBe(true);
  });
});
