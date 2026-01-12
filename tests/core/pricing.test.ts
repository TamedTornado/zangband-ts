import { describe, it, expect } from 'vitest';
import { PricingSystem } from '@/core/systems/Pricing';

describe('PricingSystem', () => {
  describe('getCharismaFactor', () => {
    it('returns 130 for CHR 3 (minimum)', () => {
      expect(PricingSystem.getCharismaFactor(3)).toBe(130);
    });

    it('returns 80 for CHR 18', () => {
      expect(PricingSystem.getCharismaFactor(18)).toBe(80);
    });

    it('interpolates for middle values', () => {
      // CHR 10 should be roughly in the middle
      // Linear: 130 - (10 - 3) * 50 / 15 = 130 - 23.33 = 106.67 ≈ 107
      const factor = PricingSystem.getCharismaFactor(10);
      expect(factor).toBeGreaterThan(100);
      expect(factor).toBeLessThan(120);
    });

    it('caps below 3 to 130', () => {
      expect(PricingSystem.getCharismaFactor(1)).toBe(130);
    });

    it('continues to improve beyond 18', () => {
      // Very high charisma should give even better prices
      const factor = PricingSystem.getCharismaFactor(25);
      expect(factor).toBeLessThan(80);
    });
  });

  describe('calculateSellPrice', () => {
    it('calculates base price with neutral greed and charisma', () => {
      // greed = 100 (neutral), charisma factor = 100 (neutral)
      // price = 1000 * 100 / 100 * 100 / 100 = 1000
      const price = PricingSystem.calculateSellPrice(1000, 100, 100);
      expect(price).toBe(1000);
    });

    it('applies greed to increase price', () => {
      // greed = 110 increases price by 10%
      // price = 1000 * 110 / 100 * 100 / 100 = 1100
      const price = PricingSystem.calculateSellPrice(1000, 110, 100);
      expect(price).toBe(1100);
    });

    it('applies charisma factor to decrease price', () => {
      // charisma factor = 80 (high CHR) decreases price by 20%
      // price = 1000 * 100 / 100 * 80 / 100 = 800
      const price = PricingSystem.calculateSellPrice(1000, 100, 80);
      expect(price).toBe(800);
    });

    it('doubles price for black market', () => {
      // Black market = 2x price
      const normalPrice = PricingSystem.calculateSellPrice(1000, 100, 100, false);
      const blackPrice = PricingSystem.calculateSellPrice(1000, 100, 100, true);
      expect(blackPrice).toBe(normalPrice * 2);
    });

    it('returns minimum 1 gold', () => {
      const price = PricingSystem.calculateSellPrice(0, 100, 100);
      expect(price).toBe(1);
    });

    it('rounds to nearest integer', () => {
      // price = 100 * 105 / 100 * 90 / 100 = 94.5 → 95
      const price = PricingSystem.calculateSellPrice(100, 105, 90);
      expect(Number.isInteger(price)).toBe(true);
    });
  });

  describe('calculateBuyPrice', () => {
    it('calculates base price with neutral greed and charisma', () => {
      // greed = 100, charisma factor = 100
      // price = 1000 * 100 / 100 * 100 / 100 = 1000
      const price = PricingSystem.calculateBuyPrice(1000, 100, 100, 10000);
      expect(price).toBe(1000);
    });

    it('applies greed to decrease price (store pays less)', () => {
      // Higher greed = store pays less when buying from player
      // price = 1000 * 100 / 110 * 100 / 100 = 909
      const price = PricingSystem.calculateBuyPrice(1000, 110, 100, 10000);
      expect(price).toBeLessThan(1000);
    });

    it('applies charisma factor to increase price (player gets more)', () => {
      // Lower charisma factor (higher CHR) = player gets more
      // price = 1000 * 100 / 100 * 100 / 80 = 1250
      const price = PricingSystem.calculateBuyPrice(1000, 100, 80, 10000);
      expect(price).toBeGreaterThan(1000);
    });

    it('halves price for black market', () => {
      // Black market pays half price
      const normalPrice = PricingSystem.calculateBuyPrice(1000, 100, 100, 10000, false);
      const blackPrice = PricingSystem.calculateBuyPrice(1000, 100, 100, 10000, true);
      expect(blackPrice).toBe(Math.floor(normalPrice / 2));
    });

    it('caps at owner purse limit', () => {
      const price = PricingSystem.calculateBuyPrice(100000, 100, 80, 5000);
      expect(price).toBe(5000);
    });

    it('returns minimum 1 gold', () => {
      const price = PricingSystem.calculateBuyPrice(0, 100, 100, 10000);
      expect(price).toBe(1);
    });

    it('rounds to nearest integer', () => {
      const price = PricingSystem.calculateBuyPrice(100, 105, 90, 10000);
      expect(Number.isInteger(price)).toBe(true);
    });
  });
});
