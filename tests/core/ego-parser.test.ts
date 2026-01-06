import { describe, it, expect } from 'vitest';
import { parseEgoItems, type EgoItemDef } from '@/core/data/ego-items';

const SAMPLE_EGO_ITEMS = `
# Comment
V:2.7.4

N:4:of Resist Acid
X:30:16
W:0:4:0:0
F:RES_ACID | IGNORE_ACID

N:8:of Resistance
X:30:20
W:15:8:0:1000
C:0:0:10:0
F:RES_ACID | RES_ELEC | RES_FIRE | RES_COLD
F:IGNORE_ACID | IGNORE_ELEC | IGNORE_FIRE | IGNORE_COLD
`;

describe('parseEgoItems', () => {
  it('should parse ego item entries from text', () => {
    const egoItems: EgoItemDef[] = parseEgoItems(SAMPLE_EGO_ITEMS);
    expect(egoItems.length).toBe(2);
  });

  it('should parse ego item id and name', () => {
    const egoItems: EgoItemDef[] = parseEgoItems(SAMPLE_EGO_ITEMS);
    expect(egoItems[0]?.id).toBe(4);
    expect(egoItems[0]?.name).toBe('of Resist Acid');
  });

  it('should parse extra info (slot, rating)', () => {
    const egoItems: EgoItemDef[] = parseEgoItems(SAMPLE_EGO_ITEMS);
    expect(egoItems[0]?.slot).toBe(30);
    expect(egoItems[0]?.rating).toBe(16);
  });

  it('should parse world line (depth, rarity, weight, cost)', () => {
    const egoItems: EgoItemDef[] = parseEgoItems(SAMPLE_EGO_ITEMS);
    const resistance = egoItems[1];
    expect(resistance?.depth).toBe(15);
    expect(resistance?.rarity).toBe(8);
    expect(resistance?.cost).toBe(1000);
  });

  it('should parse creation bonuses', () => {
    const egoItems: EgoItemDef[] = parseEgoItems(SAMPLE_EGO_ITEMS);
    const resistance = egoItems[1];
    expect(resistance?.maxToHit).toBe(0);
    expect(resistance?.maxToDam).toBe(0);
    expect(resistance?.maxToAc).toBe(10);
    expect(resistance?.pval).toBe(0);
  });

  it('should parse flags from multiple lines', () => {
    const egoItems: EgoItemDef[] = parseEgoItems(SAMPLE_EGO_ITEMS);
    const resistance = egoItems[1];
    expect(resistance?.flags).toContain('RES_ACID');
    expect(resistance?.flags).toContain('RES_COLD');
    expect(resistance?.flags).toContain('IGNORE_FIRE');
  });
});
