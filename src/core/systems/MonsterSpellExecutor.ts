/**
 * MonsterSpellExecutor - Executes monster spells via the GPEffect system
 *
 * This service translates monster spell flags into effect definitions and
 * executes them using the shared EffectManager.
 *
 * ## Damage Calculation
 *
 * Different spell types use different damage formulas:
 *
 * - **Breaths**: damage = monster.hp / divisor (capped)
 * - **Balls**: damage = monsterDef.depth * multiplier + bonus
 * - **Bolts**: damage = roll dice + monsterDef.depth / levelBonus
 * - **Fixed**: constant damage value
 *
 * ## Usage
 *
 * ```typescript
 * const executor = new MonsterSpellExecutor(effectManager);
 * const result = executor.executeSpell('BR_FIRE', {
 *   monster,
 *   level,
 *   player,
 *   rng,
 * });
 * ```
 */

import type { RNG } from 'rot-js';
import type { Monster } from '@/core/entities/Monster';
import type { Player } from '@/core/entities/Player';
import type { ILevel } from '@/core/world/Level';
import type { GPEffectResult, GPEffectDef, GPEffectContext } from '@/core/systems/effects/GPEffect';
import type { EffectManager } from '@/core/systems/effects/EffectManager';
import { getMonsterSpell, type DamageFormula, type MonsterSpellDef } from '@/core/data/MonsterSpellRegistry';
import { rollDiceExpression } from '@/core/systems/effects/diceUtils';

/**
 * Context required for executing a monster spell
 */
export interface MonsterSpellContext {
  /** The monster casting the spell */
  monster: Monster;
  /** The dungeon level */
  level: ILevel;
  /** The player being targeted */
  player: Player;
  /** Random number generator */
  rng: typeof RNG;
}

/**
 * Result of attempting to cast a monster spell
 */
export interface MonsterSpellResult extends GPEffectResult {
  /** The spell that was cast (flag name) */
  spell?: string;
  /** Cast message (e.g., "breathes fire") */
  castMessage?: string;
}

/**
 * Executes monster spells by translating them to GPEffects
 */
export class MonsterSpellExecutor {
  private effectManager: EffectManager;

  constructor(effectManager: EffectManager) {
    this.effectManager = effectManager;
  }

  /**
   * Calculate damage for a spell based on its damage formula
   */
  calculateDamage(formula: DamageFormula, monster: Monster, rng: typeof RNG): number {
    switch (formula.type) {
      case 'hp_divisor':
        // Breath damage: hp / divisor, capped
        return Math.min(Math.floor(monster.hp / formula.divisor), formula.cap);

      case 'level_mult':
        // Ball damage: random portion of (depth * mult) + bonus
        // In C: randint1(rlev * mult) + bonus
        const depth = monster.def.depth;
        const maxDamage = Math.floor(depth * formula.mult);
        return rng.getUniformInt(1, Math.max(1, maxDamage)) + formula.bonus;

      case 'dice':
        // Bolt damage: dice roll + optional level bonus
        const baseDamage = rollDiceExpression(formula.dice, rng);
        if (formula.levelBonus) {
          return baseDamage + Math.floor(monster.def.depth / formula.levelBonus);
        }
        return baseDamage;

      case 'fixed':
        return formula.value;
    }
  }

  /**
   * Execute a monster spell by flag name
   */
  executeSpell(spellFlag: string, ctx: MonsterSpellContext): MonsterSpellResult {
    const spellDef = getMonsterSpell(spellFlag);
    if (!spellDef) {
      return {
        success: false,
        messages: [`Unknown spell: ${spellFlag}`],
        turnConsumed: false,
      };
    }

    // Calculate damage if applicable
    const damage = this.calculateDamage(spellDef.damageFormula, ctx.monster, ctx.rng);

    // Build cast message
    const monsterName = ctx.monster.def.name;
    const castMessage = spellDef.message
      ? `The ${monsterName} ${spellDef.message}!`
      : `The ${monsterName} casts a spell!`;

    // Handle special effect types that don't map directly to GPEffects
    if (spellDef.effectType.startsWith('monster')) {
      return this.executeMonsterSpecificSpell(spellDef, damage, ctx, castMessage, spellFlag);
    }

    // Standard damage effects (breath, ball, bolt)
    return this.executeStandardDamageSpell(spellDef, damage, ctx, castMessage, spellFlag);
  }

  /**
   * Execute standard damage spells (breath, ball, bolt) via EffectManager
   */
  private executeStandardDamageSpell(
    spellDef: MonsterSpellDef,
    damage: number,
    ctx: MonsterSpellContext,
    castMessage: string,
    spellFlag: string
  ): MonsterSpellResult {
    // Build effect definition
    const effectDef: GPEffectDef = {
      type: spellDef.effectType as 'breath' | 'ball' | 'bolt',
      damage,
      element: spellDef.element,
      radius: spellDef.radius,
      target: 'position',
    };

    // Build effect context
    const effectContext: GPEffectContext = {
      actor: ctx.monster,
      level: ctx.level,
      rng: ctx.rng,
      targetPosition: ctx.player.position,
      targetActor: ctx.player,
    };

    // Execute via EffectManager
    const result = this.effectManager.executeEffects([effectDef], effectContext);

    return {
      ...result,
      spell: spellFlag,
      castMessage,
      messages: [castMessage, ...result.messages],
    };
  }

  /**
   * Execute monster-specific spells (heal, teleport, status effects, etc.)
   * These need custom handling as they don't map to existing player effects.
   */
  private executeMonsterSpecificSpell(
    spellDef: MonsterSpellDef,
    damage: number,
    ctx: MonsterSpellContext,
    castMessage: string,
    spellFlag: string
  ): MonsterSpellResult {
    const messages: string[] = [castMessage];

    switch (spellDef.effectType) {
      case 'monsterHeal': {
        // Heal the monster
        const healAmount = Math.min(ctx.monster.maxHp - ctx.monster.hp, ctx.monster.maxHp / 3);
        if (healAmount > 0) {
          ctx.monster.heal(healAmount);
          messages.push(`The ${ctx.monster.def.name} looks healthier.`);
        }
        break;
      }

      case 'monsterHaste': {
        // Give monster haste status
        // TODO: Implement monster haste when status system supports it
        messages.push(`The ${ctx.monster.def.name} starts moving faster.`);
        break;
      }

      case 'monsterBlink': {
        // Short-range teleport (up to 10 tiles)
        const newPos = this.findTeleportDestination(ctx, 10);
        if (newPos) {
          ctx.monster.position = newPos;
          messages.push(`The ${ctx.monster.def.name} blinks away.`);
        }
        break;
      }

      case 'monsterTeleport': {
        // Long-range teleport
        const newPos = this.findTeleportDestination(ctx, 50);
        if (newPos) {
          ctx.monster.position = newPos;
          messages.push(`The ${ctx.monster.def.name} teleports away.`);
        }
        break;
      }

      case 'monsterBlind':
      case 'monsterConfuse':
      case 'monsterScare':
      case 'monsterSlow':
      case 'monsterHold': {
        // Status effects on player - TODO: implement player status affliction
        // For now, just show the message
        messages.push(`You feel ${this.getStatusEffectDescription(spellDef.effectType)}.`);
        break;
      }

      case 'monsterCause': {
        // Direct damage to player
        const { damage: finalDamage } = ctx.player.resistDamage('magic', damage, ctx.rng);
        ctx.player.takeDamage(finalDamage);
        messages.push(`You take ${finalDamage} damage!`);
        break;
      }

      case 'monsterDrainMana': {
        // Drain player mana
        const drainAmount = Math.min(ctx.player.currentMana, Math.floor(ctx.player.maxMana / 4));
        if (drainAmount > 0) {
          ctx.player.spendMana(drainAmount);
          messages.push(`${drainAmount} mana drained!`);
          // Monster might heal from this
          ctx.monster.heal(Math.floor(drainAmount * 2));
        }
        break;
      }

      case 'monsterSummon':
      case 'monsterSummonMany':
      case 'monsterSummonKin': {
        // Summoning - TODO: implement monster summoning
        messages.push(`Monsters appear nearby!`);
        break;
      }

      case 'monsterShriek': {
        // Alert nearby monsters
        messages.push(`The ${ctx.monster.def.name} makes a high-pitched shriek.`);
        // TODO: Wake up nearby monsters
        break;
      }

      case 'monsterTeleportAway': {
        // Teleport player away
        messages.push(`You are teleported away!`);
        // TODO: implement player teleportation
        break;
      }

      case 'monsterTeleportTo': {
        // Teleport player to monster
        messages.push(`You are dragged toward the monster!`);
        // TODO: implement player teleportation
        break;
      }

      default:
        messages.push(`The ${ctx.monster.def.name} casts a spell.`);
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      spell: spellFlag,
      castMessage,
    };
  }

  /**
   * Find a valid teleport destination for the monster
   */
  private findTeleportDestination(
    ctx: MonsterSpellContext,
    maxDistance: number
  ): { x: number; y: number } | null {
    const { monster, level, rng } = ctx;

    // Try to find a valid destination
    for (let attempts = 0; attempts < 100; attempts++) {
      const dx = rng.getUniformInt(-maxDistance, maxDistance);
      const dy = rng.getUniformInt(-maxDistance, maxDistance);
      const newX = monster.position.x + dx;
      const newY = monster.position.y + dy;

      // Check bounds
      if (newX < 0 || newX >= level.width || newY < 0 || newY >= level.height) {
        continue;
      }

      // Check walkability
      const newPos = { x: newX, y: newY };
      if (!level.isWalkable(newPos)) {
        continue;
      }

      // Check for occupancy
      if (level.getMonsterAt(newPos)) {
        continue;
      }

      // Don't teleport onto player
      if (newX === ctx.player.position.x && newY === ctx.player.position.y) {
        continue;
      }

      return newPos;
    }

    return null;
  }

  /**
   * Get description for status effect types
   */
  private getStatusEffectDescription(effectType: string): string {
    switch (effectType) {
      case 'monsterBlind':
        return 'your vision blur';
      case 'monsterConfuse':
        return 'confused';
      case 'monsterScare':
        return 'terrified';
      case 'monsterSlow':
        return 'your muscles stiffen';
      case 'monsterHold':
        return 'paralyzed';
      default:
        return 'strange';
    }
  }
}
