import { describe, it, expect, beforeEach } from 'vitest';
import { Actor } from '@/core/entities/Actor';
import { Player } from '@/core/entities/Player';
import { extractEnergy, calculateDeviceEnergyCost } from '@/core/systems/Energy';
import { ENERGY_PER_TURN } from '@/core/constants';

/**
 * Tests for the Zangband energy system.
 *
 * Key concepts:
 * - Speed 110 is "normal" (BASE_SPEED)
 * - Energy gain per tick is looked up from extract_energy table
 * - Actions cost energy (usually 100)
 * - When energy >= 100, actor can act
 *
 * Speed effects (from Zangband extract_energy table):
 * - Speed 100 (slowed by 10): 5 energy/tick (half speed!)
 * - Speed 110 (normal): 10 energy/tick
 * - Speed 120 (hasted by 10): 20 energy/tick (2x speed!)
 */

describe('Energy System', () => {
  describe('extractEnergy table', () => {
    it('should return 10 energy for normal speed (110)', () => {
      expect(extractEnergy(110)).toBe(10);
    });

    it('should return 20 energy for hasted speed (120)', () => {
      // +10 speed doubles your action rate
      expect(extractEnergy(120)).toBe(20);
    });

    it('should return 5 energy for slowed speed (100)', () => {
      // -10 speed halves your action rate
      expect(extractEnergy(100)).toBe(5);
    });

    it('should return 1 energy for very slow speeds (< 70)', () => {
      expect(extractEnergy(60)).toBe(1);
      expect(extractEnergy(50)).toBe(1);
      expect(extractEnergy(0)).toBe(1);
    });

    it('should cap at 49 energy for very fast speeds (> 179)', () => {
      expect(extractEnergy(180)).toBe(49);
      expect(extractEnergy(199)).toBe(49);
    });

    it('should clamp negative speeds to minimum', () => {
      expect(extractEnergy(-10)).toBe(1);
    });

    it('should clamp speeds >= 200 to maximum', () => {
      expect(extractEnergy(200)).toBe(49);
      expect(extractEnergy(300)).toBe(49);
    });

    // Test the non-linear progression
    it('should have diminishing returns at high speeds', () => {
      const e110 = extractEnergy(110);
      const e120 = extractEnergy(120);
      const e130 = extractEnergy(130);
      const e140 = extractEnergy(140);

      // 110->120 is +10 energy (doubles)
      expect(e120 - e110).toBe(10);
      // 120->130 is +10 energy
      expect(e130 - e120).toBe(10);
      // 130->140 starts diminishing (table shows 36, 37, 37 pattern)
      expect(e140 - e130).toBeLessThan(10);
    });
  });

  describe('Actor energy gain', () => {
    it('should gain energy based on extract_energy table, not raw speed', () => {
      const actor = new Actor({
        id: 'test',
        position: { x: 0, y: 0 },
        symbol: 'a',
        color: '#fff',
        maxHp: 10,
        speed: 110,
      });

      // Actors start with 100 energy
      expect(actor.energy).toBe(100);
      actor.spendEnergy(100); // Reset to 0 for testing
      expect(actor.energy).toBe(0);

      actor.gainEnergy();
      // Should gain 10 energy (from table), not 110
      expect(actor.energy).toBe(10);
    });

    it('should gain 20 energy per tick when hasted (+10 speed)', () => {
      const actor = new Actor({
        id: 'test',
        position: { x: 0, y: 0 },
        symbol: 'a',
        color: '#fff',
        maxHp: 10,
        speed: 120,
      });

      actor.spendEnergy(100); // Reset to 0 for testing
      actor.gainEnergy();
      expect(actor.energy).toBe(20);
    });

    it('should gain 5 energy per tick when slowed (-10 speed)', () => {
      // -10 speed (100) = half speed = 5 energy/tick
      const actor = new Actor({
        id: 'test',
        position: { x: 0, y: 0 },
        symbol: 'a',
        color: '#fff',
        maxHp: 10,
        speed: 100,
      });

      actor.spendEnergy(100); // Reset to 0 for testing
      actor.gainEnergy();
      expect(actor.energy).toBe(5);
    });

    it('should gain 20 energy per tick at speed 120 (simulating haste)', () => {
      // Creating actor with hasted speed directly
      // (Status system integration tested separately)
      const actor = new Actor({
        id: 'test',
        position: { x: 0, y: 0 },
        symbol: 'a',
        color: '#fff',
        maxHp: 10,
        speed: 120, // hasted speed
      });

      expect(actor.speed).toBe(120);
      actor.spendEnergy(100); // Reset to 0 for testing
      actor.gainEnergy();
      expect(actor.energy).toBe(20);
    });

    it('should gain 5 energy per tick at speed 100 (simulating slow)', () => {
      // Creating actor with slowed speed directly
      const actor = new Actor({
        id: 'test',
        position: { x: 0, y: 0 },
        symbol: 'a',
        color: '#fff',
        maxHp: 10,
        speed: 100, // slowed speed
      });

      expect(actor.speed).toBe(100);
      actor.spendEnergy(100); // Reset to 0 for testing
      actor.gainEnergy();
      expect(actor.energy).toBe(5);
    });
  });

  describe('Action timing with speed', () => {
    it('normal speed actor needs 10 ticks to act after spending energy', () => {
      const actor = new Actor({
        id: 'test',
        position: { x: 0, y: 0 },
        symbol: 'a',
        color: '#fff',
        maxHp: 10,
        speed: 110,
      });

      // Actors start with 100 energy, spend it first
      actor.spendEnergy(100);
      expect(actor.canAct).toBe(false);

      // 10 energy per tick, need 100 to act
      for (let i = 0; i < 9; i++) {
        actor.gainEnergy();
        expect(actor.canAct).toBe(false);
      }
      actor.gainEnergy(); // 10th tick
      expect(actor.canAct).toBe(true);
      expect(actor.energy).toBe(100);
    });

    it('hasted actor needs only 5 ticks to act after spending energy', () => {
      const actor = new Actor({
        id: 'test',
        position: { x: 0, y: 0 },
        symbol: 'a',
        color: '#fff',
        maxHp: 10,
        speed: 120,
      });

      // Actors start with 100 energy, spend it first
      actor.spendEnergy(100);
      expect(actor.canAct).toBe(false);

      // 20 energy per tick, need 100 to act
      for (let i = 0; i < 4; i++) {
        actor.gainEnergy();
        expect(actor.canAct).toBe(false);
      }
      actor.gainEnergy(); // 5th tick
      expect(actor.canAct).toBe(true);
      expect(actor.energy).toBe(100);
    });

    it('slowed actor needs 20 ticks to act after spending energy', () => {
      const actor = new Actor({
        id: 'test',
        position: { x: 0, y: 0 },
        symbol: 'a',
        color: '#fff',
        maxHp: 10,
        speed: 100,
      });

      // Actors start with 100 energy, spend it first
      actor.spendEnergy(100);
      expect(actor.canAct).toBe(false);

      // 5 energy per tick, need 100 to act
      // 19 ticks = 95 energy (not enough)
      // 20 ticks = 100 energy (can act)
      for (let i = 0; i < 19; i++) {
        actor.gainEnergy();
        expect(actor.canAct).toBe(false);
      }
      actor.gainEnergy(); // 20th tick
      expect(actor.canAct).toBe(true);
      expect(actor.energy).toBe(100);
    });

    it('hasted actor acts twice as often as normal', () => {
      const normal = new Actor({
        id: 'normal',
        position: { x: 0, y: 0 },
        symbol: 'a',
        color: '#fff',
        maxHp: 10,
        speed: 110,
      });

      const hasted = new Actor({
        id: 'hasted',
        position: { x: 0, y: 0 },
        symbol: 'a',
        color: '#fff',
        maxHp: 10,
        speed: 120,
      });

      // Reset both to 0 energy for fair comparison
      normal.spendEnergy(100);
      hasted.spendEnergy(100);

      let normalActions = 0;
      let hastedActions = 0;

      // Simulate 100 ticks
      for (let tick = 0; tick < 100; tick++) {
        normal.gainEnergy();
        hasted.gainEnergy();

        while (normal.canAct) {
          normal.spendEnergy(ENERGY_PER_TURN);
          normalActions++;
        }
        while (hasted.canAct) {
          hasted.spendEnergy(ENERGY_PER_TURN);
          hastedActions++;
        }
      }

      // Hasted should have ~2x actions
      expect(hastedActions).toBe(normalActions * 2);
    });
  });

  describe('Player skills', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player({
        id: 'player',
        position: { x: 0, y: 0 },
        maxHp: 100,
        speed: 110,
        stats: { str: 16, int: 16, wis: 10, dex: 14, con: 15, chr: 10 },
      });
    });

    it('should have all skill types initialized', () => {
      expect(player.skills).toBeDefined();
      expect(typeof player.skills.disarming).toBe('number');
      expect(typeof player.skills.device).toBe('number');
      expect(typeof player.skills.saving).toBe('number');
      expect(typeof player.skills.stealth).toBe('number');
      expect(typeof player.skills.searching).toBe('number');
      expect(typeof player.skills.perception).toBe('number');
      expect(typeof player.skills.melee).toBe('number');
      expect(typeof player.skills.ranged).toBe('number');
      expect(typeof player.skills.throwing).toBe('number');
      expect(typeof player.skills.digging).toBe('number');
    });

    it('should have reasonable default device skill', () => {
      // Default warrior-like character should have some device skill
      expect(player.skills.device).toBeGreaterThan(0);
    });
  });

  describe('Device energy cost', () => {
    it('should cost 200 energy with 0 device skill', () => {
      // Formula: 200 - 5 * 0 / 8 = 200
      const cost = calculateDeviceEnergyCost(0);
      expect(cost).toBe(200);
    });

    it('should cost less energy with higher device skill', () => {
      const lowSkill = calculateDeviceEnergyCost(20);
      const highSkill = calculateDeviceEnergyCost(80);
      expect(highSkill).toBeLessThan(lowSkill);
    });

    it('should have minimum cost of 75 energy', () => {
      // Even with max skill, minimum is 75
      const cost = calculateDeviceEnergyCost(1000);
      expect(cost).toBe(75);
    });

    it('should match Zangband formula: MAX(75, 200 - 5 * skill / 8)', () => {
      // Zangband formula from cmd6.c:
      // energy_use = MIN(75, 200 - 5 * skill / 8)
      // But MIN with a cost gives minimum CEILING, so effectively:
      // cost = max(75, 200 - 5 * skill / 8)
      //
      // skill 0: 200 - 0 = 200
      expect(calculateDeviceEnergyCost(0)).toBe(200);

      // skill 80: 200 - 50 = 150
      expect(calculateDeviceEnergyCost(80)).toBe(150);

      // skill 160: 200 - 100 = 100
      expect(calculateDeviceEnergyCost(160)).toBe(100);

      // skill 200: 200 - 125 = 75
      expect(calculateDeviceEnergyCost(200)).toBe(75);

      // skill 240: 200 - 150 = 50, but capped at 75
      expect(calculateDeviceEnergyCost(240)).toBe(75);
    });
  });
});
