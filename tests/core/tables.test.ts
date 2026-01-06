import { describe, it, expect } from 'vitest';
import tables from '@/data/meta/tables.json';

describe('Extracted tables from Zangband', () => {
  describe('experience table', () => {
    it('should have 50 entries (one per level)', () => {
      expect(tables.experience).toHaveLength(50);
    });

    it('should have correct values for early levels', () => {
      // From tables.c player_exp array
      expect(tables.experience[0]).toBe(10);   // Level 2
      expect(tables.experience[1]).toBe(25);   // Level 3
      expect(tables.experience[2]).toBe(45);   // Level 4
      expect(tables.experience[4]).toBe(100);  // Level 6
      expect(tables.experience[9]).toBe(500);  // Level 11
    });

    it('should have correct values for late levels', () => {
      expect(tables.experience[29]).toBe(100000);   // Level 31
      expect(tables.experience[39]).toBe(1250000);  // Level 41
      expect(tables.experience[49]).toBe(5000000);  // Level 50 (max)
    });

    it('should be monotonically increasing', () => {
      for (let i = 1; i < tables.experience.length; i++) {
        expect(tables.experience[i]).toBeGreaterThan(tables.experience[i - 1]);
      }
    });
  });

  describe('CON HP bonus table', () => {
    it('should have 37 entries (stats 3-18/220+)', () => {
      expect(tables.conHpBonus).toHaveLength(37);
    });

    it('should have negative values for low CON', () => {
      expect(tables.conHpBonus[0]).toBe(-5);  // CON 3
      expect(tables.conHpBonus[1]).toBe(-3);  // CON 4
      expect(tables.conHpBonus[2]).toBe(-2);  // CON 5
    });

    it('should have zero for average CON (8-14)', () => {
      expect(tables.conHpBonus[5]).toBe(0);   // CON 8
      expect(tables.conHpBonus[7]).toBe(0);   // CON 10
      expect(tables.conHpBonus[11]).toBe(0);  // CON 14
    });

    it('should have positive values for high CON', () => {
      expect(tables.conHpBonus[12]).toBe(1);  // CON 15
      expect(tables.conHpBonus[15]).toBe(2);  // CON 18/00-18/09
      expect(tables.conHpBonus[25]).toBe(8);  // CON 18/100-18/109
      expect(tables.conHpBonus[36]).toBe(18); // CON 18/210-18/219
    });
  });

  describe('magic mana table', () => {
    it('should have 37 entries', () => {
      expect(tables.magMana).toHaveLength(37);
    });

    it('should have zero for very low stats', () => {
      expect(tables.magMana[0]).toBe(0);  // INT/WIS 3
      expect(tables.magMana[1]).toBe(0);  // INT/WIS 4
    });

    it('should scale up with stat', () => {
      expect(tables.magMana[7]).toBe(15);   // stat 10
      expect(tables.magMana[15]).toBe(35);  // stat 18/00-18/09
      expect(tables.magMana[25]).toBe(84);  // stat 18/100-18/109
    });

    it('should cap at high end', () => {
      expect(tables.magMana[36]).toBe(161); // stat 18/210-18/219
    });
  });

  describe('STR damage bonus table', () => {
    it('should have 37 entries', () => {
      expect(tables.strDamageBonus).toHaveLength(37);
    });

    it('should have negative values for very low STR', () => {
      expect(tables.strDamageBonus[0]).toBe(-2);  // STR 3
      expect(tables.strDamageBonus[1]).toBe(-2);  // STR 4
    });

    it('should have zero for average STR', () => {
      expect(tables.strDamageBonus[4]).toBe(0);   // STR 7
      expect(tables.strDamageBonus[7]).toBe(0);   // STR 10
    });

    it('should scale up for high STR', () => {
      expect(tables.strDamageBonus[15]).toBe(3);   // STR 18/00-18/09
      expect(tables.strDamageBonus[25]).toBe(12);  // STR 18/100-18/109
      expect(tables.strDamageBonus[36]).toBe(23);  // STR 18/210-18/219
    });
  });

  describe('DEX AC bonus table', () => {
    it('should have 37 entries', () => {
      expect(tables.dexAcBonus).toHaveLength(37);
    });

    it('should have negative values for low DEX', () => {
      expect(tables.dexAcBonus[0]).toBe(-4);  // DEX 3
      expect(tables.dexAcBonus[1]).toBe(-3);  // DEX 4
    });

    it('should have zero for average DEX', () => {
      expect(tables.dexAcBonus[4]).toBe(0);   // DEX 7
      expect(tables.dexAcBonus[7]).toBe(0);   // DEX 10
    });

    it('should have small positive values for moderately high DEX', () => {
      expect(tables.dexAcBonus[12]).toBe(1);  // DEX 15
      expect(tables.dexAcBonus[15]).toBe(2);  // DEX 18/00-18/09
    });

    it('should scale up for very high DEX', () => {
      expect(tables.dexAcBonus[25]).toBe(6);   // DEX 18/100-18/109
      expect(tables.dexAcBonus[36]).toBe(15);  // DEX 18/210-18/219
    });
  });
});
