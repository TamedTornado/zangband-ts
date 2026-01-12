/**
 * InvokeSpiritsEffect - Call upon the power of the dead
 *
 * From Zangband's cmd5.c case 17 (Invoke Spirits):
 * - Die roll: 1d100 + level/5
 * - Outcomes range from bad (summon undead, fear, confusion) to powerful
 * - Higher rolls = better outcomes
 *
 * Outcomes by die roll:
 * - < 8: Summon hostile undead (bad)
 * - < 14: Player becomes afraid (bad)
 * - < 26: Player becomes confused (bad)
 * - < 31: Polymorph monster in direction
 * - < 36: Missile bolt
 * - < 41: Confuse monster
 * - < 46: Poison ball radius 3
 * - < 51: Light line
 * - < 56: Electric bolt
 * - < 61: Cold bolt
 * - < 66: Acid bolt
 * - < 71: Fire bolt
 * - < 76: Drain life 75
 * - < 81: Electric ball radius 2
 * - < 86: Acid ball radius 2
 * - < 91: Ice ball radius 3
 * - < 96: Fire ball radius 3
 * - < 101: Drain life 100+level
 * - < 104: Earthquake
 * - < 106: Destroy area
 * - < 108: Genocide (spirits pick most numerous monster type)
 * - < 110: Dispel monsters 120
 * - >= 110: Ultimate combo (dispel 150, slow, sleep, heal 300)
 *
 * Used by: Invoke Spirits (death realm)
 */

import { PositionGPEffect } from './PositionGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Monster } from '@/core/entities/Monster';

export interface InvokeSpiritsEffectDef extends GPEffectDef {
  type: 'invokeSpirits';
}

export class InvokeSpiritsEffect extends PositionGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, rng, createEffect } = context;
    const messages: string[] = [];
    const playerLevel = (actor as any).level ?? 1;

    // Die roll: 1d100 + level/5
    const dieRoll = rng.getUniformInt(1, 100) + Math.floor(playerLevel / 5);

    messages.push('You call on the power of the dead...');

    // Show surge message for high rolls
    if (dieRoll > 100) {
      messages.push('You feel a surge of eldritch force!');
    }

    // Execute the appropriate outcome
    const result = this.executeOutcome(dieRoll, playerLevel, context, messages);

    // Show chuckle message for low rolls
    if (dieRoll < 31) {
      messages.push("Sepulchral voices chuckle. 'Soon you will join us, mortal.'");
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      damageDealt: result.damageDealt,
      data: {
        dieRoll,
        outcome: result.outcome,
        ...result.extraData,
      },
    };
  }

  private executeOutcome(
    die: number,
    playerLevel: number,
    context: GPEffectContext,
    messages: string[]
  ): { outcome: string; damageDealt?: number; extraData?: Record<string, any> } {
    const { actor, level, rng, createEffect } = context;

    // Very bad: Summon hostile undead
    if (die < 8) {
      messages.push('Oh no! Mouldering forms rise from the earth around you!');
      if (createEffect) {
        const summonEffect = createEffect({
          type: 'summon',
          summonType: 'undead',
          count: 1,
          hostile: true,
        });
        summonEffect.execute(context);
      }
      return { outcome: 'summonUndead' };
    }

    // Bad: Player becomes afraid
    if (die < 14) {
      messages.push('An unnamable evil brushes against your mind...');
      const duration = rng.getUniformInt(4, 8);
      // Apply fear to player
      if ((actor as any).applyStatus) {
        (actor as any).applyStatus('afraid', duration, rng);
      }
      return { outcome: 'fear', extraData: { duration } };
    }

    // Bad: Player becomes confused
    if (die < 26) {
      messages.push('Your head is invaded by a horde of gibbering spectral voices...');
      const duration = rng.getUniformInt(4, 8);
      // Apply confusion to player
      if ((actor as any).applyStatus) {
        (actor as any).applyStatus('confused', duration, rng);
      }
      return { outcome: 'confusion', extraData: { duration } };
    }

    // Polymorph monster
    if (die < 31) {
      return this.executeCreatedEffect(context, messages, {
        type: 'polymorph',
        target: 'position',
      }, 'polymorph');
    }

    // Missile bolt: 3+(lvl-1)/5 d4
    if (die < 36) {
      const dice = 3 + Math.floor((playerLevel - 1) / 5);
      return this.executeCreatedEffect(context, messages, {
        type: 'bolt',
        target: 'position',
        damage: `${dice}d4`,
        element: 'magic',
      }, 'missileBolt');
    }

    // Confuse monster
    if (die < 41) {
      return this.executeCreatedEffect(context, messages, {
        type: 'applyStatus',
        target: 'position',
        status: 'confused',
        duration: `${playerLevel}`,
      }, 'confuseMonster');
    }

    // Poison ball: 20 + lvl/2 damage, radius 3
    if (die < 46) {
      return this.executeCreatedEffect(context, messages, {
        type: 'ball',
        target: 'position',
        damage: 20 + Math.floor(playerLevel / 2),
        element: 'poison',
        radius: 3,
      }, 'poisonBall');
    }

    // Light line (beam of light)
    if (die < 51) {
      return this.executeCreatedEffect(context, messages, {
        type: 'beam',
        target: 'position',
        damage: '6d8',
        element: 'light',
      }, 'lightLine');
    }

    // Electric bolt: 3+(lvl-5)/4 d8
    if (die < 56) {
      const dice = 3 + Math.floor((playerLevel - 5) / 4);
      return this.executeCreatedEffect(context, messages, {
        type: 'bolt',
        target: 'position',
        damage: `${dice}d8`,
        element: 'electricity',
      }, 'electricBolt');
    }

    // Cold bolt: 5+(lvl-5)/4 d8
    if (die < 61) {
      const dice = 5 + Math.floor((playerLevel - 5) / 4);
      return this.executeCreatedEffect(context, messages, {
        type: 'bolt',
        target: 'position',
        damage: `${dice}d8`,
        element: 'cold',
      }, 'coldBolt');
    }

    // Acid bolt: 6+(lvl-5)/4 d8
    if (die < 66) {
      const dice = 6 + Math.floor((playerLevel - 5) / 4);
      return this.executeCreatedEffect(context, messages, {
        type: 'bolt',
        target: 'position',
        damage: `${dice}d8`,
        element: 'acid',
      }, 'acidBolt');
    }

    // Fire bolt: 8+(lvl-5)/4 d8
    if (die < 71) {
      const dice = 8 + Math.floor((playerLevel - 5) / 4);
      return this.executeCreatedEffect(context, messages, {
        type: 'bolt',
        target: 'position',
        damage: `${dice}d8`,
        element: 'fire',
      }, 'fireBolt');
    }

    // Drain life 75
    if (die < 76) {
      return this.executeCreatedEffect(context, messages, {
        type: 'drainLife',
        target: 'position',
        damage: 75,
      }, 'drainLife75');
    }

    // Electric ball: 30 + lvl/2 damage, radius 2
    if (die < 81) {
      return this.executeCreatedEffect(context, messages, {
        type: 'ball',
        target: 'position',
        damage: 30 + Math.floor(playerLevel / 2),
        element: 'electricity',
        radius: 2,
      }, 'electricBall');
    }

    // Acid ball: 40 + lvl damage, radius 2
    if (die < 86) {
      return this.executeCreatedEffect(context, messages, {
        type: 'ball',
        target: 'position',
        damage: 40 + playerLevel,
        element: 'acid',
        radius: 2,
      }, 'acidBall');
    }

    // Ice ball: 70 + lvl damage, radius 3
    if (die < 91) {
      return this.executeCreatedEffect(context, messages, {
        type: 'ball',
        target: 'position',
        damage: 70 + playerLevel,
        element: 'cold',
        radius: 3,
      }, 'iceBall');
    }

    // Fire ball: 80 + lvl damage, radius 3
    if (die < 96) {
      return this.executeCreatedEffect(context, messages, {
        type: 'ball',
        target: 'position',
        damage: 80 + playerLevel,
        element: 'fire',
        radius: 3,
      }, 'fireBall');
    }

    // Drain life 100 + lvl
    if (die < 101) {
      return this.executeCreatedEffect(context, messages, {
        type: 'drainLife',
        target: 'position',
        damage: 100 + playerLevel,
      }, 'drainLifeMajor');
    }

    // Earthquake radius 12
    if (die < 104) {
      return this.executeCreatedEffect(context, messages, {
        type: 'earthquake',
        radius: 12,
      }, 'earthquake');
    }

    // Destroy area radius 15
    if (die < 106) {
      return this.executeCreatedEffect(context, messages, {
        type: 'destroyArea',
        radius: 15,
      }, 'destroyArea');
    }

    // Genocide - spirits pick the most numerous monster type
    if (die < 108) {
      messages.push('The spirits grant you the power of death!');

      // Find the most numerous monster symbol on the level
      const monsters = level.getMonsters().filter(m => !m.isDead);
      if (monsters.length === 0) {
        messages.push('But there are no creatures to destroy.');
        return { outcome: 'genocide' };
      }

      // Count monsters by symbol
      const symbolCounts = new Map<string, number>();
      for (const monster of monsters) {
        // Skip uniques - genocide doesn't affect them
        if (monster.def?.flags?.includes('UNIQUE')) continue;
        const count = symbolCounts.get(monster.symbol) || 0;
        symbolCounts.set(monster.symbol, count + 1);
      }

      if (symbolCounts.size === 0) {
        messages.push('But there are no suitable creatures to destroy.');
        return { outcome: 'genocide' };
      }

      // Find the most common symbol
      let maxSymbol = '';
      let maxCount = 0;
      for (const [symbol, count] of symbolCounts) {
        if (count > maxCount) {
          maxCount = count;
          maxSymbol = symbol;
        }
      }

      // Execute genocide on that symbol
      let killed = 0;
      for (const monster of monsters) {
        if (monster.symbol === maxSymbol && !monster.def?.flags?.includes('UNIQUE')) {
          monster.takeDamage(monster.hp + 1);
          killed++;
        }
      }

      messages.push(`The spirits choose '${maxSymbol}' - ${killed} creature${killed !== 1 ? 's' : ''} destroyed!`);
      return { outcome: 'genocide', extraData: { symbol: maxSymbol, killed } };
    }

    // Dispel monsters 120
    if (die < 110) {
      return this.executeCreatedEffect(context, messages, {
        type: 'dispel',
        damage: 120,
      }, 'dispel');
    }

    // Ultimate combo: Dispel 150, slow, sleep, heal 300
    messages.push('The spirits unleash their full power!');
    let totalDamage = 0;

    if (createEffect) {
      // Dispel monsters 150
      const dispelEffect = createEffect({
        type: 'dispel',
        damage: 150,
      });
      const dispelResult = dispelEffect.execute(context);
      totalDamage += dispelResult.damageDealt ?? 0;

      // Slow monsters
      const slowEffect = createEffect({
        type: 'areaStatus',
        status: 'slow',
        duration: 20,
      });
      slowEffect.execute(context);

      // Sleep monsters
      const sleepEffect = createEffect({
        type: 'areaStatus',
        status: 'sleeping',
        duration: 20,
      });
      sleepEffect.execute(context);

      // Heal player 300
      const healEffect = createEffect({
        type: 'heal',
        amount: 300,
      });
      healEffect.execute(context);
    }

    return {
      outcome: 'ultimate',
      damageDealt: totalDamage,
    };
  }

  private executeCreatedEffect(
    context: GPEffectContext,
    messages: string[],
    effectDef: GPEffectDef,
    outcome: string
  ): { outcome: string; damageDealt?: number; extraData?: Record<string, any> } {
    const { createEffect } = context;

    if (!createEffect) {
      return { outcome };
    }

    const effect = createEffect(effectDef);
    if (effect.canExecute(context)) {
      const result = effect.execute(context);
      messages.push(...result.messages);
      return {
        outcome,
        damageDealt: result.damageDealt,
      };
    }

    return { outcome };
  }
}
