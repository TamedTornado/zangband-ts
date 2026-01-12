import { describe, it, expect } from 'vitest';
import { createTestActor } from './testHelpers';
import { MagicSystem, type SpellEffect } from '@/core/systems/Magic';
import { Actor } from '@/core/entities/Actor';

function createActor(id: string, hp: number = 100): Actor {
  return createTestActor({
    id,
    position: { x: 5, y: 5 },
    symbol: '@',
    color: '#fff',
    maxHp: hp,
    speed: 110,
  });
}

describe('MagicSystem', () => {
  describe('canCast', () => {
    it('should return true if caster has enough mana', () => {
      const magic = new MagicSystem();
      expect(magic.canCast(10, 5)).toBe(true);
      expect(magic.canCast(5, 5)).toBe(true);
    });

    it('should return false if caster lacks mana', () => {
      const magic = new MagicSystem();
      expect(magic.canCast(3, 5)).toBe(false);
    });
  });

  describe('rollFailure', () => {
    it('should sometimes fail at high fail rates', () => {
      const magic = new MagicSystem();

      let failures = 0;
      for (let i = 0; i < 1000; i++) {
        if (!magic.rollFailure(50, 10, 10)) failures++;
      }

      // Should fail roughly 50% at base, less with higher stats/level
      expect(failures).toBeGreaterThan(100);
      expect(failures).toBeLessThan(600);
    });

    it('should rarely fail at low fail rates', () => {
      const magic = new MagicSystem();

      let failures = 0;
      for (let i = 0; i < 1000; i++) {
        if (!magic.rollFailure(5, 18, 30)) failures++;
      }

      expect(failures).toBeLessThan(100);
    });
  });

  describe('executeEffect', () => {
    it('should execute HEAL effect', () => {
      const magic = new MagicSystem();
      const target = createActor('target', 100);
      target.takeDamage(50); // Reduce to 50 HP

      const effect: SpellEffect = {
        type: 'heal',
        power: '2d10+10', // 12-30 healing
      };

      const result = magic.executeEffect(effect, target, target);

      expect(result.success).toBe(true);
      expect(target.hp).toBeGreaterThan(50);
    });

    it('should execute DAMAGE effect', () => {
      const magic = new MagicSystem();
      const caster = createActor('caster');
      const target = createActor('target', 100);

      const effect: SpellEffect = {
        type: 'damage',
        element: 'fire',
        power: '3d6', // 3-18 damage
      };

      const result = magic.executeEffect(effect, caster, target);

      expect(result.success).toBe(true);
      expect(target.hp).toBeLessThan(100);
    });

    it('should execute DETECT effect', () => {
      const magic = new MagicSystem();
      const caster = createActor('caster');

      const effect: SpellEffect = {
        type: 'detect',
        detectType: 'evil',
        radius: 10,
      };

      const result = magic.executeEffect(effect, caster, null);

      expect(result.success).toBe(true);
      expect(result.effectType).toBe('detect');
    });

    it('should execute BUFF effect', () => {
      const magic = new MagicSystem();
      const caster = createActor('caster');

      const effect: SpellEffect = {
        type: 'buff',
        buffType: 'bless',
        duration: '12+1d12',
      };

      const result = magic.executeEffect(effect, caster, caster);

      expect(result.success).toBe(true);
      expect(result.effectType).toBe('buff');
      expect(result.duration).toBeGreaterThan(0);
    });
  });
});
