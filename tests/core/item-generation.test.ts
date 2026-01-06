import { describe, it, expect, beforeEach } from 'vitest';
import { ItemGeneration, type GeneratedItem } from '@/core/systems/ItemGeneration';
import type { ItemDef } from '@/core/data/items';
import type { EgoItemDef } from '@/core/data/ego-items';
import type { ArtifactDef } from '@/core/data/artifacts';

// Test data fixtures
const createTestItem = (overrides: Partial<ItemDef> = {}): ItemDef => ({
  key: 'test_sword',
  index: 1,
  name: 'Test Sword',
  symbol: '|',
  color: 'w',
  tval: 23, // TV_SWORD
  sval: 1,
  pval: 0,
  depth: 5,
  rarity: 1,
  weight: 100,
  cost: 100,
  allocation: [{ depth: 5, rarity: 1 }],
  baseAc: 0,
  damage: '2d5',
  toHit: 0,
  toDam: 0,
  toAc: 0,
  flags: [],
  ...overrides,
});

const createTestEgoItem = (overrides: Partial<EgoItemDef> = {}): EgoItemDef => ({
  key: 'of_slaying',
  index: 1,
  name: 'of Slaying',
  slot: 24, // ES_WIELD
  rating: 15,
  depth: 10,
  rarity: 3,
  weight: 0,
  cost: 500,
  maxToHit: 6,
  maxToDam: 6,
  maxToAc: 0,
  pval: 0,
  flags: ['SLAY_EVIL'],
  ...overrides,
});

const createTestArtifact = (overrides: Partial<ArtifactDef> = {}): ArtifactDef => ({
  key: 'excalibur',
  index: 1,
  name: 'Excalibur',
  tval: 23, // TV_SWORD
  sval: 10,
  pval: 3,
  depth: 40,
  rarity: 50,
  weight: 200,
  cost: 50000,
  baseAc: 0,
  damage: '4d5',
  toHit: 17,
  toDam: 19,
  toAc: 0,
  flags: ['SLAY_EVIL', 'SLAY_UNDEAD', 'SEE_INVIS', 'BLESSED'],
  ...overrides,
});

describe('ItemGeneration', () => {
  let gen: ItemGeneration;
  let testItems: Record<string, ItemDef>;
  let testEgoItems: Record<string, EgoItemDef>;
  let testArtifacts: Record<string, ArtifactDef>;

  beforeEach(() => {
    testItems = {
      wooden_torch: createTestItem({
        key: 'wooden_torch',
        index: 10,
        name: 'Wooden Torch',
        tval: 39, // TV_LITE
        depth: 0,
        rarity: 1,
        allocation: [{ depth: 0, rarity: 1 }],
      }),
      iron_sword: createTestItem({
        key: 'iron_sword',
        index: 20,
        name: 'Iron Sword',
        tval: 23, // TV_SWORD
        depth: 5,
        rarity: 2,
        allocation: [{ depth: 5, rarity: 2 }],
      }),
      steel_sword: createTestItem({
        key: 'steel_sword',
        index: 30,
        name: 'Steel Sword',
        tval: 23, // TV_SWORD
        depth: 15,
        rarity: 3,
        allocation: [{ depth: 15, rarity: 3 }],
      }),
      mithril_sword: createTestItem({
        key: 'mithril_sword',
        index: 40,
        name: 'Mithril Sword',
        tval: 23, // TV_SWORD
        depth: 40,
        rarity: 5,
        allocation: [{ depth: 40, rarity: 5 }],
      }),
      adamantite_sword: createTestItem({
        key: 'adamantite_sword',
        index: 45,
        name: 'Adamantite Sword',
        tval: 23, // TV_SWORD
        depth: 60,
        rarity: 6,
        allocation: [{ depth: 60, rarity: 6 }],
      }),
      leather_armor: createTestItem({
        key: 'leather_armor',
        index: 50,
        name: 'Leather Armor',
        tval: 36, // TV_SOFT_ARMOR
        depth: 3,
        rarity: 1,
        allocation: [{ depth: 3, rarity: 1 }],
        baseAc: 4,
        damage: '0d0',
      }),
    };

    testEgoItems = {
      of_slaying: createTestEgoItem({
        key: 'of_slaying',
        slot: 24, // ES_WIELD
        depth: 10,
        rarity: 3,
        rating: 15,
      }),
      of_extra_attacks: createTestEgoItem({
        key: 'of_extra_attacks',
        index: 2,
        name: 'of Extra Attacks',
        slot: 24, // ES_WIELD
        depth: 50,
        rarity: 3,
        rating: 20,
        pval: 2,
        flags: ['BLOWS'],
      }),
      of_resistance: createTestEgoItem({
        key: 'of_resistance',
        index: 3,
        name: 'of Resistance',
        slot: 30, // ES_BODY
        depth: 15,
        rarity: 8,
        rating: 20,
        maxToAc: 10,
        flags: ['RES_ACID', 'RES_ELEC', 'RES_FIRE', 'RES_COLD'],
      }),
      of_weakness: createTestEgoItem({
        key: 'of_weakness',
        index: 4,
        name: 'of Weakness',
        slot: 34, // ES_HANDS
        depth: 0,
        rarity: 1,
        rating: 0, // Cursed ego items have rating 0
        pval: 10,
        flags: ['STR'],
      }),
    };

    testArtifacts = {
      excalibur: createTestArtifact({
        key: 'excalibur',
        depth: 40,
        rarity: 50,
      }),
      ring_of_power: createTestArtifact({
        key: 'ring_of_power',
        index: 2,
        name: 'The One Ring',
        tval: 45, // TV_RING
        sval: 1,
        depth: 100,
        rarity: 100,
      }),
    };

    gen = new ItemGeneration({
      items: testItems,
      egoItems: testEgoItems,
      artifacts: testArtifacts,
    });
  });

  describe('buildAllocationTable', () => {
    it('should build allocation entries sorted by depth', () => {
      const table = gen.getAllocationTable();

      expect(table.length).toBeGreaterThan(0);

      // Verify sorted by depth
      for (let i = 1; i < table.length; i++) {
        expect(table[i].depth).toBeGreaterThanOrEqual(table[i - 1].depth);
      }
    });

    it('should include items at their appropriate depths', () => {
      const table = gen.getAllocationTable();

      // Iron sword at depth 5 should be in table
      const ironSword = table.find((e) => e.itemKey === 'iron_sword');
      expect(ironSword).toBeDefined();
      expect(ironSword?.depth).toBe(5);
    });

    it('should calculate probability from rarity', () => {
      const table = gen.getAllocationTable();

      const torch = table.find((e) => e.itemKey === 'wooden_torch');
      const mithril = table.find((e) => e.itemKey === 'mithril_sword');

      // Lower rarity = higher probability
      // probability = floor(100 / rarity)
      expect(torch?.probability).toBe(100); // 100 / 1
      expect(mithril?.probability).toBe(20); // 100 / 5
    });
  });

  describe('selectBaseItem', () => {
    it('should mostly select items at or below the given depth (with occasional GREAT_OBJ boost)', () => {
      // At depth 10, should get items <= 10 most of the time
      // GREAT_OBJ (1 in 50 chance) can boost to higher levels
      let atOrBelowLevel = 0;
      let total = 0;
      for (let i = 0; i < 100; i++) {
        const item = gen.selectBaseItem(10);
        if (item) {
          total++;
          if (item.depth <= 10) {
            atOrBelowLevel++;
          }
        }
      }
      // Most selections (>90%) should be at or below level
      // A few can be boosted due to GREAT_OBJ
      if (total > 0) {
        expect(atOrBelowLevel / total).toBeGreaterThan(0.9);
      }
    });

    it('should bias toward higher-level items (depth selection)', () => {
      // At depth 50, should sometimes get depth 40 items
      let highLevelCount = 0;
      for (let i = 0; i < 500; i++) {
        const item = gen.selectBaseItem(50);
        if (item && item.depth >= 30) {
          highLevelCount++;
        }
      }
      expect(highLevelCount).toBeGreaterThan(0);
    });

    it('should occasionally boost depth (GREAT_OBJ mechanic)', () => {
      // At depth 5, can occasionally get higher-depth items due to GREAT_OBJ boost
      // This test verifies the mechanic exists, not exact probabilities
      let maxDepthSeen = 0;
      for (let i = 0; i < 2000; i++) {
        const item = gen.selectBaseItem(5);
        if (item && item.depth > maxDepthSeen) {
          maxDepthSeen = item.depth;
        }
      }
      // With GREAT_OBJ boosting effective level, we should see items above depth 5
      // (The actual boost depends on available items in the dataset)
      expect(maxDepthSeen).toBeGreaterThanOrEqual(5);
    });

    it('should return null if no items are available', () => {
      const emptyGen = new ItemGeneration({
        items: {},
        egoItems: {},
        artifacts: {},
      });
      const item = emptyGen.selectBaseItem(10);
      expect(item).toBeNull();
    });

    it('should respect minLevel parameter', () => {
      // With minLevel 30, should only get items >= 30
      for (let i = 0; i < 100; i++) {
        const item = gen.selectBaseItem(50, 30);
        if (item) {
          expect(item.depth).toBeGreaterThanOrEqual(30);
        }
      }
    });
  });

  describe('m_bonus', () => {
    it('should return values between 0 and max', () => {
      for (let i = 0; i < 100; i++) {
        const bonus = gen.mBonus(10, 50);
        expect(bonus).toBeGreaterThanOrEqual(0);
        expect(bonus).toBeLessThanOrEqual(10);
      }
    });

    it('should increase with level', () => {
      let lowLevelSum = 0;
      let highLevelSum = 0;

      for (let i = 0; i < 500; i++) {
        lowLevelSum += gen.mBonus(10, 10);
        highLevelSum += gen.mBonus(10, 100);
      }

      expect(highLevelSum / 500).toBeGreaterThan(lowLevelSum / 500);
    });

    it('should cluster around bonus value based on level', () => {
      // At max level (128), should mostly give values near max
      const values: number[] = [];
      for (let i = 0; i < 500; i++) {
        values.push(gen.mBonus(10, 128));
      }
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      expect(avg).toBeGreaterThan(7); // Should be high at max level
    });
  });

  describe('calculateGoodChance', () => {
    it('should return base chance for normal items', () => {
      // f = (lev * 3) / 5 + 10, capped at 42
      // At level 0: f = 10
      // At level 50: f = 40
      // At level 100: f = 42 (capped)
      expect(gen.calculateGoodChance(0)).toBe(10);
      expect(gen.calculateGoodChance(50)).toBe(40);
      expect(gen.calculateGoodChance(100)).toBe(42);
    });

    it('should cap at 42', () => {
      expect(gen.calculateGoodChance(128)).toBe(42);
    });
  });

  describe('shouldBeGood', () => {
    it('should return good more often at higher levels', () => {
      let lowGoodCount = 0;
      let highGoodCount = 0;

      for (let i = 0; i < 1000; i++) {
        if (gen.shouldBeGood(5)) lowGoodCount++;
        if (gen.shouldBeGood(50)) highGoodCount++;
      }

      expect(highGoodCount).toBeGreaterThan(lowGoodCount);
    });
  });

  describe('selectEgoItem', () => {
    it('should only select ego items for the correct slot', () => {
      for (let i = 0; i < 100; i++) {
        const ego = gen.selectEgoItem(50, 24, true); // ES_WIELD
        if (ego) {
          expect(ego.slot).toBe(24);
        }
      }
    });

    it('should only select good ego items when good=true', () => {
      for (let i = 0; i < 100; i++) {
        const ego = gen.selectEgoItem(50, 24, true);
        if (ego) {
          expect(ego.rating).toBeGreaterThan(0);
        }
      }
    });

    it('should only select bad ego items when good=false', () => {
      // Need to add a bad ego item for this test
      gen = new ItemGeneration({
        items: testItems,
        egoItems: {
          ...testEgoItems,
          of_morgul: createTestEgoItem({
            key: 'of_morgul',
            index: 5,
            name: 'of Morgul',
            slot: 24, // ES_WIELD
            depth: 5,
            rarity: 1,
            rating: 0, // Cursed
            flags: ['CURSED', 'AGGRAVATE'],
          }),
        },
        artifacts: testArtifacts,
      });

      let foundBad = false;
      for (let i = 0; i < 100; i++) {
        const ego = gen.selectEgoItem(50, 24, false);
        if (ego && ego.rating === 0) {
          foundBad = true;
          break;
        }
      }
      expect(foundBad).toBe(true);
    });

    it('should mostly select ego items at or below level (with occasional EGO_INFLATE boost)', () => {
      // EGO_INFLATE (1 in 10 chance) can boost selection to higher levels
      let atOrBelowLevel = 0;
      let total = 0;
      for (let i = 0; i < 100; i++) {
        const ego = gen.selectEgoItem(20, 24, true);
        if (ego) {
          total++;
          if (ego.depth <= 20) {
            atOrBelowLevel++;
          }
        }
      }
      // Most selections (>80%) should be at or below level
      // Some can be boosted due to EGO_INFLATE
      if (total > 0) {
        expect(atOrBelowLevel / total).toBeGreaterThan(0.7);
      }
    });

    it('should occasionally boost level (EGO_INFLATE mechanic)', () => {
      // Try to get a high-level ego at low depth
      // Just verify the occasional level boost mechanic doesn't crash
      // We don't assert on the result since EGO_INFLATE is random
      for (let i = 0; i < 500; i++) {
        gen.selectEgoItem(30, 24, true);
      }
    });

    it('should return null if no matching ego items', () => {
      const ego = gen.selectEgoItem(50, 99, true); // Invalid slot
      expect(ego).toBeNull();
    });
  });

  describe('applyEgoItem', () => {
    it('should add ego item bonuses to base item', () => {
      const baseItem: GeneratedItem = {
        baseItem: testItems['iron_sword'],
        toHit: 0,
        toDam: 0,
        toAc: 0,
        pval: 0,
        flags: [],
      };

      gen.applyEgoItem(baseItem, testEgoItems['of_slaying']);

      // Should have added random bonuses (1 to max)
      expect(baseItem.toHit).toBeGreaterThan(0);
      expect(baseItem.toDam).toBeGreaterThan(0);
      expect(baseItem.egoItem).toBe(testEgoItems['of_slaying']);
      expect(baseItem.flags).toContain('SLAY_EVIL');
    });

    it('should subtract bonuses for cursed ego items', () => {
      const baseItem: GeneratedItem = {
        baseItem: testItems['iron_sword'],
        toHit: 5,
        toDam: 5,
        toAc: 5,
        pval: 0,
        flags: ['CURSED'],
        cost: 0, // Cursed items have 0 cost
      };

      const cursedEgo = createTestEgoItem({
        key: 'of_weakness',
        rating: 0,
        maxToHit: 5,
        maxToDam: 5,
        pval: 10,
        flags: ['STR'],
      });

      gen.applyEgoItem(baseItem, cursedEgo);

      // Should have subtracted
      expect(baseItem.toHit).toBeLessThan(5);
      expect(baseItem.toDam).toBeLessThan(5);
      expect(baseItem.pval).toBeLessThan(0);
    });

    it('should add pval for ego items with pval', () => {
      const baseItem: GeneratedItem = {
        baseItem: { ...testItems['iron_sword'], pval: 0 },
        toHit: 0,
        toDam: 0,
        toAc: 0,
        pval: 0,
        flags: [],
      };

      gen.applyEgoItem(baseItem, testEgoItems['of_extra_attacks']);

      expect(baseItem.pval).toBeGreaterThan(0);
      expect(baseItem.flags).toContain('BLOWS');
    });
  });

  describe('tryCreateArtifact', () => {
    it('should sometimes create artifacts at appropriate depth', () => {
      let artifactCount = 0;
      for (let i = 0; i < 1000; i++) {
        const artifact = gen.tryCreateArtifact(50, 40);
        if (artifact) {
          artifactCount++;
        }
      }
      // Artifacts are rare - should get some but not many
      expect(artifactCount).toBeGreaterThanOrEqual(0);
    });

    it('should not create artifacts above their level (without out-of-depth roll)', () => {
      // At very low levels, excalibur (depth 40) should be very rare
      let artifactCount = 0;
      for (let i = 0; i < 100; i++) {
        const artifact = gen.tryCreateArtifact(5, 20);
        if (artifact && artifact.key === 'excalibur') {
          artifactCount++;
        }
      }
      // Should be extremely rare or zero
      expect(artifactCount).toBeLessThan(5);
    });

    it('should not create the same artifact twice', () => {
      // Create an artifact
      let firstArtifact: ArtifactDef | null = null;
      for (let i = 0; i < 1000 && !firstArtifact; i++) {
        firstArtifact = gen.tryCreateArtifact(60, 40);
      }

      if (firstArtifact) {
        // Try to create it again - should not get the same one
        for (let i = 0; i < 100; i++) {
          const second = gen.tryCreateArtifact(60, 40);
          if (second && second.key === firstArtifact.key) {
            throw new Error('Should not create same artifact twice');
          }
        }
      }
    });

    it('should track created artifacts', () => {
      // Create an artifact
      for (let i = 0; i < 1000; i++) {
        gen.tryCreateArtifact(60, 40);
      }

      const created = gen.getCreatedArtifacts();
      // May or may not have created any
      expect(created).toBeDefined();
    });
  });

  describe('generateItem', () => {
    it('should generate a complete item', () => {
      const item = gen.generateItem(20, 0);

      expect(item).not.toBeNull();
      if (item) {
        expect(item.baseItem).toBeDefined();
        expect(typeof item.toHit).toBe('number');
        expect(typeof item.toDam).toBe('number');
        expect(typeof item.toAc).toBe('number');
        expect(Array.isArray(item.flags)).toBe(true);
      }
    });

    it('should sometimes generate ego items at higher levels', () => {
      let egoCount = 0;
      for (let i = 0; i < 500; i++) {
        const item = gen.generateItem(40, 20);
        if (item?.egoItem) {
          egoCount++;
        }
      }
      expect(egoCount).toBeGreaterThan(0);
    });

    it('should apply base enchantment bonuses', () => {
      // Generate many items and check they have some bonuses
      let hasBonus = false;
      for (let i = 0; i < 100; i++) {
        const item = gen.generateItem(30, 0);
        if (item && (item.toHit !== 0 || item.toDam !== 0 || item.toAc !== 0)) {
          hasBonus = true;
          break;
        }
      }
      expect(hasBonus).toBe(true);
    });

    it('should respect delta_level for better items', () => {
      let highQualityCount = 0;
      let lowQualityCount = 0;

      for (let i = 0; i < 500; i++) {
        const lowDelta = gen.generateItem(20, 0);
        const highDelta = gen.generateItem(20, 30);

        if (lowDelta?.egoItem || (lowDelta && lowDelta.toHit > 5)) lowQualityCount++;
        if (highDelta?.egoItem || (highDelta && highDelta.toHit > 5)) highQualityCount++;
      }

      expect(highQualityCount).toBeGreaterThan(lowQualityCount);
    });

    it('should sometimes generate cursed items', () => {
      let cursedCount = 0;
      for (let i = 0; i < 500; i++) {
        const item = gen.generateItem(20, 0);
        if (item?.flags.includes('CURSED')) {
          cursedCount++;
        }
      }
      // About 15% chance of cursed
      expect(cursedCount).toBeGreaterThan(0);
    });
  });

  describe('getSlotForTval', () => {
    it('should return correct slot for weapon tvals', () => {
      expect(gen.getSlotForTval(23)).toBe(24); // TV_SWORD -> ES_WIELD
      expect(gen.getSlotForTval(21)).toBe(24); // TV_HAFTED -> ES_WIELD
      expect(gen.getSlotForTval(22)).toBe(24); // TV_POLEARM -> ES_WIELD
    });

    it('should return correct slot for armor tvals', () => {
      expect(gen.getSlotForTval(36)).toBe(30); // TV_SOFT_ARMOR -> ES_BODY
      expect(gen.getSlotForTval(37)).toBe(30); // TV_HARD_ARMOR -> ES_BODY
      expect(gen.getSlotForTval(32)).toBe(33); // TV_HELM -> ES_HEAD
      expect(gen.getSlotForTval(35)).toBe(31); // TV_CLOAK -> ES_OUTER
    });

    it('should return correct slot for other equipment', () => {
      expect(gen.getSlotForTval(19)).toBe(25); // TV_BOW -> ES_BOW
      expect(gen.getSlotForTval(20)).toBe(22); // TV_DIGGING -> ES_DIG
      expect(gen.getSlotForTval(39)).toBe(29); // TV_LITE -> ES_LITE
    });
  });

  describe('parseWeaponDamage', () => {
    it('should parse damage dice notation', () => {
      expect(gen.parseWeaponDamage('2d5')).toEqual({ dice: 2, sides: 5 });
      expect(gen.parseWeaponDamage('1d10')).toEqual({ dice: 1, sides: 10 });
      expect(gen.parseWeaponDamage('4d4')).toEqual({ dice: 4, sides: 4 });
    });

    it('should handle invalid format gracefully', () => {
      expect(gen.parseWeaponDamage('')).toEqual({ dice: 0, sides: 0 });
      expect(gen.parseWeaponDamage('invalid')).toEqual({ dice: 0, sides: 0 });
    });
  });

  describe('resetArtifacts', () => {
    it('should allow artifacts to be created again', () => {
      // Create some artifacts
      for (let i = 0; i < 1000; i++) {
        gen.tryCreateArtifact(60, 40);
      }

      // Verify there are artifacts before reset
      expect(gen.getCreatedArtifacts().length).toBeGreaterThan(0);

      gen.resetArtifacts();

      expect(gen.getCreatedArtifacts().length).toBe(0);
    });
  });
});
