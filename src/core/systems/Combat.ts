import { RNG } from 'rot-js';

export interface DiceRoll {
  dice: number;
  sides: number;
  bonus: number;
}

export interface CriticalResult {
  isCritical: boolean;
  damageMultiplier: number;
  bonusDamage: number;
  message?: string;
}

export interface MonsterAttack {
  method: string; // CLAW, BITE, HIT, TOUCH, etc.
  effect?: string; // HURT, POISON, EAT_GOLD, etc.
  damage?: string; // Dice string like "2d6"
}

export interface AttackResult {
  hit: boolean;
  damage: number;
  effect?: string;
  method: string;
}

export class Combat {
  private rng: typeof RNG;

  constructor(rng: typeof RNG = RNG) {
    this.rng = rng;
  }

  /**
   * Test if an attack hits.
   * Based on Zangband's test_hit_combat:
   * - 5% instant hit chance
   * - Invisible targets halve hit chance
   * - Roll chance vs AC
   */
  testHit(chance: number, ac: number, visible: boolean): boolean {
    // Percentile dice - instant hit on < 5
    const k = this.rng.getUniformInt(0, 99);
    if (k < 5) return true;

    // Invisible targets are harder to hit
    let effectiveChance = chance;
    if (!visible) {
      effectiveChance = Math.floor(chance / 2);
    }

    // Power competes against armor
    if (effectiveChance > 0 && this.rng.getUniformInt(0, effectiveChance - 1) >= ac) {
      return true;
    }

    return false;
  }

  /**
   * Calculate damage from a weapon hit.
   * @param weaponDice - Weapon damage dice (e.g., 2d6+3)
   * @param damageBonus - Flat damage bonus from stats/equipment
   * @param slayMultiplier - 100 = normal, 150 = 1.5x (slay), 200 = 2x (kill), etc.
   */
  calcDamage(weaponDice: DiceRoll, damageBonus: number, slayMultiplier: number): number {
    // Roll weapon dice
    let damage = weaponDice.bonus;
    for (let i = 0; i < weaponDice.dice; i++) {
      damage += this.rng.getUniformInt(1, weaponDice.sides);
    }

    // Apply slay multiplier (divide by 100 since 100 = 1x)
    damage = Math.floor((damage * slayMultiplier) / 100);

    // Add flat damage bonus
    damage += damageBonus;

    // Minimum 0 damage
    return Math.max(0, damage);
  }

  /**
   * Check for critical hit.
   * Based on Zangband's critical_norm:
   * - Power = weight + (tohit * 5) + (level * 3)
   * - Chance = power / 5000
   * - Crit tier based on weight + random
   */
  criticalHit(weight: number, level: number, tohitBonus: number = 0): CriticalResult {
    // Extract "blow" power
    const power = weight + tohitBonus * 5 + level * 3;

    // Chance for critical
    if (this.rng.getUniformInt(1, 5000) > power) {
      return { isCritical: false, damageMultiplier: 1, bonusDamage: 0 };
    }

    // Determine critical tier
    const k = weight + this.rng.getUniformInt(1, 650);

    if (k < 400) {
      return {
        isCritical: true,
        damageMultiplier: 2,
        bonusDamage: 5,
        message: 'It was a good hit!',
      };
    } else if (k < 700) {
      return {
        isCritical: true,
        damageMultiplier: 2,
        bonusDamage: 10,
        message: 'It was a great hit!',
      };
    } else if (k < 900) {
      return {
        isCritical: true,
        damageMultiplier: 3,
        bonusDamage: 15,
        message: 'It was a superb hit!',
      };
    } else if (k < 1300) {
      return {
        isCritical: true,
        damageMultiplier: 3,
        bonusDamage: 20,
        message: 'It was a *GREAT* hit!',
      };
    } else {
      return {
        isCritical: true,
        damageMultiplier: 4,
        bonusDamage: 25,
        message: 'It was a *SUPERB* hit!',
      };
    }
  }

  /**
   * Roll dice from a DiceRoll specification.
   */
  rollDice(roll: DiceRoll): number {
    let total = roll.bonus;
    for (let i = 0; i < roll.dice; i++) {
      total += this.rng.getUniformInt(1, roll.sides);
    }
    return total;
  }

  /**
   * Parse dice string like "3d6+2" into DiceRoll.
   */
  static parseDice(str: string): DiceRoll {
    const match = str.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) {
      throw new Error(`Invalid dice string: ${str}`);
    }
    return {
      dice: parseInt(match[1], 10),
      sides: parseInt(match[2], 10),
      bonus: match[3] ? parseInt(match[3], 10) : 0,
    };
  }

  /**
   * Resolve a monster attack against a target.
   * @param attack - The attack definition from monster data
   * @param targetAC - Target's armor class
   * @param hitChance - Monster's hit chance (based on level, etc.)
   */
  resolveMonsterAttack(attack: MonsterAttack, targetAC: number, hitChance: number): AttackResult {
    const hit = this.testHit(hitChance, targetAC, true);

    if (!hit) {
      return {
        hit: false,
        damage: 0,
        method: attack.method,
      };
    }

    let damage = 0;
    if (attack.damage && attack.effect === 'HURT') {
      const dice = Combat.parseDice(attack.damage);
      damage = this.rollDice(dice);
    }

    const result: AttackResult = {
      hit: true,
      damage,
      method: attack.method,
    };
    if (attack.effect) {
      result.effect = attack.effect;
    }
    return result;
  }
}
