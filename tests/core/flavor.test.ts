import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FlavorSystem, getArticle } from '@/core/systems/FlavorSystem';

// Mock RNG with controlled output
const mockRNG = {
  getUniform: vi.fn(),
  getUniformInt: vi.fn(),
};

describe('FlavorSystem', () => {
  let flavorSystem: FlavorSystem;

  beforeEach(() => {
    // Reset mock to return predictable values
    let callCount = 0;
    mockRNG.getUniformInt.mockImplementation((min: number, max: number) => {
      // Return values in sequence to get predictable shuffles
      callCount++;
      return Math.floor((min + max) / 2);
    });
    mockRNG.getUniform.mockReturnValue(0.5);

    flavorSystem = new FlavorSystem(mockRNG as unknown as typeof import('rot-js').RNG);
  });

  describe('getFlavor', () => {
    it('returns flavor for potions (tval 75)', () => {
      const flavor = flavorSystem.getFlavor(75, 0);
      expect(flavor).toBeTruthy();
      expect(typeof flavor).toBe('string');
    });

    it('returns flavor for scrolls (tval 70)', () => {
      const flavor = flavorSystem.getFlavor(70, 0);
      expect(flavor).toBeTruthy();
      expect(typeof flavor).toBe('string');
    });

    it('returns null for non-flavored items', () => {
      expect(flavorSystem.getFlavor(23, 0)).toBeNull(); // sword
      expect(flavorSystem.getFlavor(36, 0)).toBeNull(); // armor
    });
  });

  describe('awareness tracking', () => {
    it('items start unaware', () => {
      expect(flavorSystem.isAware(75, 0)).toBe(false);
      expect(flavorSystem.isAware(70, 0)).toBe(false);
    });

    it('setAware marks item type as known', () => {
      flavorSystem.setAware(75, 5);
      expect(flavorSystem.isAware(75, 5)).toBe(true);
    });

    it('awareness is per item type (tval:sval)', () => {
      flavorSystem.setAware(75, 5);
      expect(flavorSystem.isAware(75, 5)).toBe(true);
      expect(flavorSystem.isAware(75, 6)).toBe(false); // different sval
      expect(flavorSystem.isAware(70, 5)).toBe(false); // different tval
    });
  });

  describe('flavor names', () => {
    it('getPotionFlavorName returns color + Potion', () => {
      const name = flavorSystem.getPotionFlavorName(0);
      expect(name).toMatch(/\w+ Potion$/);
    });

    it('getScrollFlavorName returns Scroll titled "..."', () => {
      const name = flavorSystem.getScrollFlavorName(0);
      expect(name).toMatch(/^Scroll titled "[A-Z\s]+"$/);
    });
  });

  describe('export/import', () => {
    it('preserves flavor data across export/import', () => {
      flavorSystem.setAware(75, 3);
      const flavor = flavorSystem.getFlavor(75, 0);
      const scrollTitle = flavorSystem.getScrollFlavorName(5);

      const exported = flavorSystem.export();

      const newSystem = new FlavorSystem(mockRNG as unknown as typeof import('rot-js').RNG);
      newSystem.import(exported);

      expect(newSystem.isAware(75, 3)).toBe(true);
      expect(newSystem.getFlavor(75, 0)).toBe(flavor);
      expect(newSystem.getScrollFlavorName(5)).toBe(scrollTitle);
    });
  });
});

describe('getArticle', () => {
  it('returns "a" for consonant-starting words', () => {
    expect(getArticle('Robe')).toBe('a');
    expect(getArticle('Sword')).toBe('a');
    expect(getArticle('Potion')).toBe('a');
  });

  it('returns "an" for vowel-starting words', () => {
    expect(getArticle('Azure Potion')).toBe('an');
    expect(getArticle('Icky Green Potion')).toBe('an');
    expect(getArticle('Orange Potion')).toBe('an');
  });

  it('returns quantity for multiple items', () => {
    expect(getArticle('Robe', 3)).toBe('3');
    expect(getArticle('Potion', 5)).toBe('5');
  });

  it('returns "no more" for zero quantity', () => {
    expect(getArticle('Robe', 0)).toBe('no more');
  });
});
