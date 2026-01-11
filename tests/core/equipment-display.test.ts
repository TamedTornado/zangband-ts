/**
 * Equipment display tests
 *
 * Tests for formatting equipment items in the UI.
 */

import { describe, it, expect } from 'vitest';

// Weapon types that should show damage dice
const WEAPON_TYPES = ['sword', 'hafted', 'polearm', 'bow', 'crossbow', 'digging'];

/**
 * Check if an item type is a weapon (should show damage dice)
 */
function isWeaponType(type: string): boolean {
  return WEAPON_TYPES.includes(type);
}

describe('Equipment display', () => {
  describe('isWeaponType', () => {
    it('returns true for sword', () => {
      expect(isWeaponType('sword')).toBe(true);
    });

    it('returns true for hafted weapons', () => {
      expect(isWeaponType('hafted')).toBe(true);
    });

    it('returns true for polearms', () => {
      expect(isWeaponType('polearm')).toBe(true);
    });

    it('returns true for bows', () => {
      expect(isWeaponType('bow')).toBe(true);
    });

    it('returns true for digging tools', () => {
      expect(isWeaponType('digging')).toBe(true);
    });

    it('returns false for light sources', () => {
      expect(isWeaponType('light')).toBe(false);
    });

    it('returns false for armor', () => {
      expect(isWeaponType('soft_armor')).toBe(false);
      expect(isWeaponType('hard_armor')).toBe(false);
    });

    it('returns false for rings and amulets', () => {
      expect(isWeaponType('ring')).toBe(false);
      expect(isWeaponType('amulet')).toBe(false);
    });
  });
});
