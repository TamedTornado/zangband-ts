import { describe, it, expect } from 'vitest';
import { parseEgoItems, type EgoItemDef, type EgoItemRecord } from '@/core/data/ego-items';

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
  it('should return a record keyed by slug', () => {
    const egoItems: EgoItemRecord = parseEgoItems(SAMPLE_EGO_ITEMS);
    expect(egoItems['of_resist_acid']).toBeDefined();
    expect(egoItems['of_resistance']).toBeDefined();
  });

  it('should parse ego item key, index and name', () => {
    const egoItems: EgoItemRecord = parseEgoItems(SAMPLE_EGO_ITEMS);
    expect(egoItems['of_resist_acid']?.key).toBe('of_resist_acid');
    expect(egoItems['of_resist_acid']?.index).toBe(4);
    expect(egoItems['of_resist_acid']?.name).toBe('of Resist Acid');
  });

  it('should parse extra info (slot, rating)', () => {
    const egoItems: EgoItemRecord = parseEgoItems(SAMPLE_EGO_ITEMS);
    const resistAcid: EgoItemDef | undefined = egoItems['of_resist_acid'];
    expect(resistAcid?.slot).toBe(30);
    expect(resistAcid?.rating).toBe(16);
  });

  it('should parse world line (depth, rarity, weight, cost)', () => {
    const egoItems: EgoItemRecord = parseEgoItems(SAMPLE_EGO_ITEMS);
    const resistance: EgoItemDef | undefined = egoItems['of_resistance'];
    expect(resistance?.depth).toBe(15);
    expect(resistance?.rarity).toBe(8);
    expect(resistance?.cost).toBe(1000);
  });

  it('should parse creation bonuses (toHit, toDam, toAc, pval)', () => {
    const egoItems: EgoItemRecord = parseEgoItems(SAMPLE_EGO_ITEMS);
    const resistance: EgoItemDef | undefined = egoItems['of_resistance'];
    expect(resistance?.maxToHit).toBe(0);
    expect(resistance?.maxToDam).toBe(0);
    expect(resistance?.maxToAc).toBe(10);
    expect(resistance?.pval).toBe(0);
  });

  it('should parse flags from multiple lines', () => {
    const egoItems: EgoItemRecord = parseEgoItems(SAMPLE_EGO_ITEMS);
    const resistance: EgoItemDef | undefined = egoItems['of_resistance'];
    expect(resistance?.flags).toContain('RES_ACID');
    expect(resistance?.flags).toContain('RES_COLD');
    expect(resistance?.flags).toContain('IGNORE_FIRE');
  });

  it('should add index suffix only for colliding names', () => {
    const withCollisions = `
N:4:of Resist Acid
X:30:16

N:10:of Resist Acid
X:31:18

N:8:of Resistance
X:30:20
`;
    const egoItems: EgoItemRecord = parseEgoItems(withCollisions);
    expect(egoItems['of_resist_acid_4']).toBeDefined();
    expect(egoItems['of_resist_acid_10']).toBeDefined();
    expect(egoItems['of_resistance']).toBeDefined(); // no suffix - unique
  });
});
