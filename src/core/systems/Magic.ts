import { RNG } from 'rot-js';
import { Combat } from './Combat';
import type { Actor } from '../entities/Actor';

export type EffectType = 'heal' | 'damage' | 'detect' | 'buff' | 'debuff' | 'teleport' | 'summon' | 'utility';
export type Element = 'fire' | 'cold' | 'lightning' | 'acid' | 'poison' | 'light' | 'dark' | 'chaos' | 'nether' | 'physical' | 'none';

export interface SpellEffect {
  type: EffectType;
  element?: Element;
  power?: string; // Dice string like "3d6" or "2d10+10"
  radius?: number;
  duration?: string; // Dice string for duration
  detectType?: string;
  buffType?: string;
  debuffType?: string;
}

export interface EffectResult {
  success: boolean;
  effectType: EffectType;
  damage?: number;
  healing?: number;
  duration?: number;
  message?: string;
}

export class MagicSystem {
  private rng: typeof RNG;
  private combat: Combat;

  constructor(rng: typeof RNG = RNG) {
    this.rng = rng;
    this.combat = new Combat(rng);
  }

  /**
   * Check if caster has enough mana to cast.
   */
  canCast(currentMana: number, cost: number): boolean {
    return currentMana >= cost;
  }

  /**
   * Roll to see if spell succeeds.
   * @param baseFail - Base failure rate (0-100)
   * @param stat - Relevant casting stat (INT or WIS)
   * @param level - Caster level
   * @returns true if spell succeeds, false if it fails
   */
  rollFailure(baseFail: number, stat: number, level: number): boolean {
    // Reduce failure chance based on stat and level
    // Higher stat and level = lower failure
    let failChance = baseFail;

    // Stat bonus: each point above 10 reduces fail by 1%
    failChance -= Math.max(0, stat - 10);

    // Level bonus: reduce fail slightly with level
    failChance -= Math.floor(level / 5);

    // Minimum 5% fail unless base was 0
    if (baseFail > 0) {
      failChance = Math.max(5, failChance);
    }

    // Roll
    const roll = this.rng.getUniformInt(0, 99);
    return roll >= failChance;
  }

  /**
   * Execute a spell effect.
   */
  executeEffect(effect: SpellEffect, caster: Actor, target: Actor | null): EffectResult {
    switch (effect.type) {
      case 'heal':
        return this.executeHeal(effect, target ?? caster);

      case 'damage':
        if (!target) {
          return { success: false, effectType: 'damage', message: 'No target' };
        }
        return this.executeDamage(effect, target);

      case 'detect':
        return this.executeDetect(effect, caster);

      case 'buff':
        return this.executeBuff(effect, target ?? caster);

      case 'debuff':
        if (!target) {
          return { success: false, effectType: 'debuff', message: 'No target' };
        }
        return this.executeDebuff(effect, target);

      default:
        return { success: true, effectType: effect.type, message: 'Effect executed' };
    }
  }

  private executeHeal(effect: SpellEffect, target: Actor): EffectResult {
    if (!effect.power) {
      return { success: false, effectType: 'heal', message: 'No power specified' };
    }

    const dice = Combat.parseDice(effect.power);
    const healing = this.combat.rollDice(dice);

    target.heal(healing);

    return {
      success: true,
      effectType: 'heal',
      healing,
      message: `Healed for ${healing} HP`,
    };
  }

  private executeDamage(effect: SpellEffect, target: Actor): EffectResult {
    if (!effect.power) {
      return { success: false, effectType: 'damage', message: 'No power specified' };
    }

    const dice = Combat.parseDice(effect.power);
    let damage = this.combat.rollDice(dice);

    // TODO: Apply elemental resistances based on effect.element

    target.takeDamage(damage);

    return {
      success: true,
      effectType: 'damage',
      damage,
      message: `Dealt ${damage} ${effect.element ?? ''} damage`,
    };
  }

  private executeDetect(effect: SpellEffect, _caster: Actor): EffectResult {
    // Detection effects don't modify actors directly
    // They return info for the UI to display
    return {
      success: true,
      effectType: 'detect',
      message: `Detecting ${effect.detectType} in radius ${effect.radius ?? 'full map'}`,
    };
  }

  private executeBuff(effect: SpellEffect, _target: Actor): EffectResult {
    let duration = 0;
    if (effect.duration) {
      // Parse duration like "12+1d12"
      const parts = effect.duration.split('+');
      for (const part of parts) {
        if (part.includes('d')) {
          const dice = Combat.parseDice(part);
          duration += this.combat.rollDice(dice);
        } else {
          duration += parseInt(part, 10);
        }
      }
    }

    // TODO: Actually apply buff to target's status effects
    return {
      success: true,
      effectType: 'buff',
      duration,
      message: `Applied ${effect.buffType} for ${duration} turns`,
    };
  }

  private executeDebuff(effect: SpellEffect, _target: Actor): EffectResult {
    let duration = 0;
    if (effect.duration) {
      const parts = effect.duration.split('+');
      for (const part of parts) {
        if (part.includes('d')) {
          const dice = Combat.parseDice(part);
          duration += this.combat.rollDice(dice);
        } else {
          duration += parseInt(part, 10);
        }
      }
    }

    // TODO: Actually apply debuff to target's status effects
    return {
      success: true,
      effectType: 'debuff',
      duration,
      message: `Applied ${effect.debuffType} for ${duration} turns`,
    };
  }
}
