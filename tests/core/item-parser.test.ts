import { describe, it, expect } from 'vitest';
import { parseItems, type ItemDef } from '@/core/data/items';

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
  it('should parse item entries from text', () => {
    const items: ItemDef[] = parseItems(SAMPLE_ITEMS);
    expect(items.length).toBe(3);
  });

  it('should parse item id and name', () => {
    const items: ItemDef[] = parseItems(SAMPLE_ITEMS);
    expect(items[1]?.id).toBe(43);
    expect(items[1]?.name).toBe('& Dagger~');
  });

  it('should parse graphics', () => {
    const items: ItemDef[] = parseItems(SAMPLE_ITEMS);
    expect(items[1]?.symbol).toBe('|');
    expect(items[1]?.color).toBe('W');
  });

  it('should parse info line (tval, sval, pval)', () => {
    const items: ItemDef[] = parseItems(SAMPLE_ITEMS);
    const dagger = items[1];
    expect(dagger?.tval).toBe(23);
    expect(dagger?.sval).toBe(4);
    expect(dagger?.pval).toBe(0);
  });

  it('should parse world line (depth, rarity, weight, cost)', () => {
    const items: ItemDef[] = parseItems(SAMPLE_ITEMS);
    const dagger = items[1];
    expect(dagger?.depth).toBe(0);
    expect(dagger?.rarity).toBe(0);
    expect(dagger?.weight).toBe(12);
    expect(dagger?.cost).toBe(10);
  });

  it('should parse allocation entries', () => {
    const items: ItemDef[] = parseItems(SAMPLE_ITEMS);
    const dagger = items[1];
    expect(dagger?.allocation).toEqual([
      { depth: 1, rarity: 1 },
      { depth: 9, rarity: 2 },
    ]);

    const rapier = items[2];
    expect(rapier?.allocation).toEqual([{ depth: 9, rarity: 1 }]);
  });

  it('should parse power line (ac, damage, to_hit, to_dam, to_ac)', () => {
    const items: ItemDef[] = parseItems(SAMPLE_ITEMS);
    const dagger = items[1];
    expect(dagger?.baseAc).toBe(0);
    expect(dagger?.damage).toBe('1d4');
    expect(dagger?.toHit).toBe(0);
    expect(dagger?.toDam).toBe(0);
    expect(dagger?.toAc).toBe(0);
  });

  it('should parse flags', () => {
    const items: ItemDef[] = parseItems(SAMPLE_ITEMS);
    const dagger = items[1];
    expect(dagger?.flags).toContain('THROW');
    expect(dagger?.flags).toContain('SHOW_MODS');

    const rapier = items[2];
    expect(rapier?.flags).toContain('SHOW_MODS');
    expect(rapier?.flags).not.toContain('THROW');
  });
});
