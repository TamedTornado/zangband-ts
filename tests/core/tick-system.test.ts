import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { TickSystem } from '@/core/systems/TickSystem';
import { Player } from '@/core/entities/Player';
import { Item } from '@/core/entities/Item';

describe('TickSystem', () => {
  let tickSystem: TickSystem;
  let player: Player;

  beforeEach(() => {
    tickSystem = new TickSystem();
    player = new Player({
      id: 'player',
      position: { x: 0, y: 0 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
    });
  });

  describe('tick', () => {
    it('returns messages from status ticks', () => {
      // Status manager tick is called, but we don't have active statuses
      const result = tickSystem.tick(player);
      expect(result.messages).toEqual([]);
    });
  });

  describe('rod timeout ticking', () => {
    it('ticks all rods in player inventory', () => {
      // Create two rods with timeouts
      const rod1 = new Item({
        id: 'rod-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 5,
        },
      });

      const rod2 = new Item({
        id: 'rod-2',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        generated: {
          baseItem: { name: 'Detection', type: 'rod', sval: 2, key: 'rod_detect', pval: 15 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 10,
        },
      });

      player.addItem(rod1);
      player.addItem(rod2);

      // Tick once
      tickSystem.tick(player);

      // Both rods should have decremented timeout
      expect(rod1.timeout).toBe(4);
      expect(rod2.timeout).toBe(9);
    });

    it('does not tick non-rod items', () => {
      const potion = new Item({
        id: 'potion-1',
        position: { x: 0, y: 0 },
        symbol: '!',
        color: '#f00',
        generated: {
          baseItem: { name: 'Healing', type: 'potion', sval: 1, key: 'potion_healing' } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [],
        },
      });

      const sword = new Item({
        id: 'sword-1',
        position: { x: 0, y: 0 },
        symbol: '|',
        color: '#aaa',
        generated: {
          baseItem: { name: 'Short Sword', type: 'sword', sval: 1, key: 'short_sword' } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [],
        },
      });

      player.addItem(potion);
      player.addItem(sword);

      // Should not throw or error
      const result = tickSystem.tick(player);
      expect(result.messages).toEqual([]);
    });

    it('rod becomes ready when timeout reaches zero', () => {
      const rod = new Item({
        id: 'rod-1',
        position: { x: 0, y: 0 },
        symbol: '-',
        color: '#888',
        generated: {
          baseItem: { name: 'Light', type: 'rod', sval: 1, key: 'rod_light', pval: 10 } as any,
          toHit: 0, toDam: 0, toAc: 0, pval: 0, flags: [], timeout: 2,
        },
      });

      player.addItem(rod);
      expect(rod.isReady).toBe(false);

      tickSystem.tick(player);
      expect(rod.timeout).toBe(1);
      expect(rod.isReady).toBe(false);

      tickSystem.tick(player);
      expect(rod.timeout).toBe(0);
      expect(rod.isReady).toBe(true);
    });

    it('ready rods stay at zero timeout', () => {
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

      player.addItem(rod);
      expect(rod.isReady).toBe(true);

      tickSystem.tick(player);
      expect(rod.timeout).toBe(0);
      expect(rod.isReady).toBe(true);
    });
  });
});
