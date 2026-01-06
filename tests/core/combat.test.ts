import { describe, it, expect } from 'vitest';
import { Combat, type MonsterAttack } from '@/core/systems/Combat';

describe('Combat', () => {
  describe('testHit', () => {
    it('should always hit on roll < 5 (instant hit)', () => {
      // With fixed seed, verify hit behavior
      const combat = new Combat();

      // High AC should still be hittable due to instant hit mechanic
      // Test many times to verify probability
      let hits = 0;
      for (let i = 0; i < 1000; i++) {
        if (combat.testHit(1, 1000, true)) hits++;
      }
      // Should hit roughly 5% of time from instant hit alone
      expect(hits).toBeGreaterThan(30);
      expect(hits).toBeLessThan(100);
    });

    it('should hit more often with higher chance vs lower AC', () => {
      const combat = new Combat();

      let easyHits = 0;
      let hardHits = 0;

      for (let i = 0; i < 1000; i++) {
        if (combat.testHit(100, 10, true)) easyHits++;
        if (combat.testHit(100, 90, true)) hardHits++;
      }

      expect(easyHits).toBeGreaterThan(hardHits);
    });

    it('should be harder to hit invisible targets', () => {
      const combat = new Combat();

      let visibleHits = 0;
      let invisibleHits = 0;

      for (let i = 0; i < 1000; i++) {
        if (combat.testHit(50, 30, true)) visibleHits++;
        if (combat.testHit(50, 30, false)) invisibleHits++;
      }

      expect(visibleHits).toBeGreaterThan(invisibleHits);
    });
  });

  describe('calcDamage', () => {
    it('should roll weapon dice and add bonuses', () => {
      const combat = new Combat();

      // 1d4+2 weapon with +5 damage bonus
      const damage = combat.calcDamage(
        { dice: 1, sides: 4, bonus: 2 },
        5, // damageBonus
        100, // slayMultiplier (100 = no slay, 150 = 1.5x, etc.)
      );

      // Min: 1+2+5 = 8, Max: 4+2+5 = 11
      expect(damage).toBeGreaterThanOrEqual(8);
      expect(damage).toBeLessThanOrEqual(11);
    });

    it('should apply slay multiplier', () => {
      const combat = new Combat();

      // Test slay increases damage
      const normalDamages: number[] = [];
      const slayDamages: number[] = [];

      for (let i = 0; i < 100; i++) {
        normalDamages.push(combat.calcDamage({ dice: 2, sides: 6, bonus: 0 }, 0, 100));
        slayDamages.push(combat.calcDamage({ dice: 2, sides: 6, bonus: 0 }, 0, 200));
      }

      const avgNormal = normalDamages.reduce((a, b) => a + b, 0) / normalDamages.length;
      const avgSlay = slayDamages.reduce((a, b) => a + b, 0) / slayDamages.length;

      // Slay should roughly double damage
      expect(avgSlay).toBeGreaterThan(avgNormal * 1.5);
    });
  });

  describe('criticalHit', () => {
    it('should occasionally return critical bonus', () => {
      const combat = new Combat();

      let crits = 0;
      let totalBonus = 0;

      for (let i = 0; i < 1000; i++) {
        const result = combat.criticalHit(100, 15); // weight 100, level 15
        if (result.isCritical) {
          crits++;
          totalBonus += result.damageMultiplier;
        }
      }

      // Should get some crits
      expect(crits).toBeGreaterThan(0);
      // Crits should have multiplier > 1
      expect(totalBonus / crits).toBeGreaterThan(1);
    });

    it('should crit more often with heavier weapons', () => {
      const combat = new Combat();

      let lightCrits = 0;
      let heavyCrits = 0;

      for (let i = 0; i < 1000; i++) {
        if (combat.criticalHit(50, 10).isCritical) lightCrits++;
        if (combat.criticalHit(300, 10).isCritical) heavyCrits++;
      }

      expect(heavyCrits).toBeGreaterThan(lightCrits);
    });
  });

  describe('resolveMonsterAttack', () => {
    it('should resolve HURT attacks with damage', () => {
      const combat = new Combat();
      const attack: MonsterAttack = {
        method: 'CLAW',
        effect: 'HURT',
        damage: '1d4',
      };

      const result = combat.resolveMonsterAttack(attack, 10, 50); // AC 10, hit chance 50

      // Should have hit/miss result and damage if hit
      expect(result).toHaveProperty('hit');
      expect(result).toHaveProperty('damage');
      if (result.hit) {
        expect(result.damage).toBeGreaterThan(0);
      }
    });

    it('should resolve effect-only attacks (EAT_GOLD, etc)', () => {
      const combat = new Combat();
      const attack: MonsterAttack = {
        method: 'TOUCH',
        effect: 'EAT_GOLD',
      };

      // Force a hit with high chance and 0 AC
      const result = combat.resolveMonsterAttack(attack, 0, 100);

      expect(result).toHaveProperty('hit');
      expect(result.damage).toBe(0);
      expect(result.hit).toBe(true);
      expect(result.effect).toBe('EAT_GOLD');
    });

    it('should resolve HURT attacks with varying damage', () => {
      const combat = new Combat();
      const attack: MonsterAttack = {
        method: 'HIT',
        effect: 'HURT',
        damage: '2d6',
      };

      const damages: number[] = [];
      for (let i = 0; i < 100; i++) {
        const result = combat.resolveMonsterAttack(attack, 0, 100); // Always hit
        if (result.hit) {
          damages.push(result.damage);
        }
      }

      // Should have variation (2d6 ranges from 2-12)
      const min = Math.min(...damages);
      const max = Math.max(...damages);
      expect(min).toBeGreaterThanOrEqual(2);
      expect(max).toBeLessThanOrEqual(12);
      expect(max).toBeGreaterThan(min);
    });
  });
});
