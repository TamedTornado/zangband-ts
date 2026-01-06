import { describe, it, expect } from 'vitest';
import { toSlug } from '@/core/data/slug';

describe('toSlug', () => {
  it('should convert name to lowercase', () => {
    expect(toSlug('Dagger')).toBe('dagger');
    expect(toSlug('Long Sword')).toBe('long_sword');
  });

  it('should replace spaces with underscores', () => {
    expect(toSlug('Filthy street urchin')).toBe('filthy_street_urchin');
  });

  it('should remove special characters', () => {
    expect(toSlug('& Dagger~')).toBe('dagger');
    expect(toSlug("& Chain Mail~")).toBe('chain_mail');
  });

  it('should handle apostrophes', () => {
    expect(toSlug("Farmer Maggot's dog")).toBe('farmer_maggots_dog');
  });

  it('should collapse multiple underscores', () => {
    expect(toSlug('& Long Sword~')).toBe('long_sword');
  });

  it('should trim leading/trailing underscores', () => {
    expect(toSlug('& Dagger')).toBe('dagger');
    expect(toSlug('Dagger~')).toBe('dagger');
  });

  it('should handle "of X" artifact names', () => {
    expect(toSlug('of Galadriel')).toBe('of_galadriel');
    expect(toSlug('of Resist Acid')).toBe('of_resist_acid');
  });

  it('should handle empty or whitespace', () => {
    expect(toSlug('')).toBe('');
    expect(toSlug('   ')).toBe('');
  });
});
