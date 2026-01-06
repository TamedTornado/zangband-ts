import { describe, it, expect } from 'vitest';
import { parseItems, type ItemDef, type ItemRecord } from '@/core/data/items';

const SAMPLE_ITEMS = `
# Comment
V:2.7.4

N:0:something
G:&:w

N:43:& Dagger~
G:|:W
I:23:4:0
W:0:0:12:10
A:1/1:9/2
P:0:1d4:0:0:0
F:THROW | SHOW_MODS

N:44:& Rapier~
G:|:W
I:23:7:0
W:9:0:40:42
A:9/1
P:0:1d6:0:0:0
F:SHOW_MODS
`;

describe('parseItems', () => {
  it('should return a record keyed by slug', () => {
    const items: ItemRecord = parseItems(SAMPLE_ITEMS);
    expect(items['something']).toBeDefined();
    expect(items['dagger']).toBeDefined();
    expect(items['rapier']).toBeDefined();
  });

  it('should parse item key, index and name', () => {
    const items: ItemRecord = parseItems(SAMPLE_ITEMS);
    expect(items['dagger']?.key).toBe('dagger');
    expect(items['dagger']?.index).toBe(43);
    expect(items['dagger']?.name).toBe('& Dagger~');
  });

  it('should parse graphics', () => {
    const items: ItemRecord = parseItems(SAMPLE_ITEMS);
    expect(items['dagger']?.symbol).toBe('|');
    expect(items['dagger']?.color).toBe('W');
  });

  it('should parse info line (tval, sval, pval)', () => {
    const items: ItemRecord = parseItems(SAMPLE_ITEMS);
    const dagger: ItemDef | undefined = items['dagger'];
    expect(dagger?.tval).toBe(23);
    expect(dagger?.sval).toBe(4);
    expect(dagger?.pval).toBe(0);
  });

  it('should parse world line (depth, rarity, weight, cost)', () => {
    const items: ItemRecord = parseItems(SAMPLE_ITEMS);
    const dagger: ItemDef | undefined = items['dagger'];
    expect(dagger?.depth).toBe(0);
    expect(dagger?.rarity).toBe(0);
    expect(dagger?.weight).toBe(12);
    expect(dagger?.cost).toBe(10);
  });

  it('should parse allocation entries', () => {
    const items: ItemRecord = parseItems(SAMPLE_ITEMS);
    const dagger: ItemDef | undefined = items['dagger'];
    expect(dagger?.allocation).toEqual([
      { depth: 1, rarity: 1 },
      { depth: 9, rarity: 2 },
    ]);

    const rapier: ItemDef | undefined = items['rapier'];
    expect(rapier?.allocation).toEqual([{ depth: 9, rarity: 1 }]);
  });

  it('should parse power line (ac, damage, to_hit, to_dam, to_ac)', () => {
    const items: ItemRecord = parseItems(SAMPLE_ITEMS);
    const dagger: ItemDef | undefined = items['dagger'];
    expect(dagger?.baseAc).toBe(0);
    expect(dagger?.damage).toBe('1d4');
    expect(dagger?.toHit).toBe(0);
    expect(dagger?.toDam).toBe(0);
    expect(dagger?.toAc).toBe(0);
  });

  it('should parse flags', () => {
    const items: ItemRecord = parseItems(SAMPLE_ITEMS);
    const dagger: ItemDef | undefined = items['dagger'];
    expect(dagger?.flags).toContain('THROW');
    expect(dagger?.flags).toContain('SHOW_MODS');

    const rapier: ItemDef | undefined = items['rapier'];
    expect(rapier?.flags).toContain('SHOW_MODS');
    expect(rapier?.flags).not.toContain('THROW');
  });

  it('should add index suffix only for colliding names', () => {
    const withCollisions = `
N:100:& Ring~
G:=:y

N:200:& Ring~
G:=:r

N:43:& Dagger~
G:|:W
`;
    const items: ItemRecord = parseItems(withCollisions);
    expect(items['ring_100']).toBeDefined();
    expect(items['ring_200']).toBeDefined();
    expect(items['dagger']).toBeDefined(); // no suffix - unique
  });
});
