/**
 * HavocEffect - Chaotic elemental destruction (call_chaos)
 *
 * Self-targeted effect that unleashes chaotic elemental energy.
 * Used by Rod of Havoc.
 *
 * Three possible patterns:
 * - 16.7%: Omnidirectional (8 directions, 75 damage each)
 * - 33.3%: Large ball radius 8 centered on caster (300 damage)
 * - 50%: Directed ball at random nearby target (150 damage, radius 3)
 *
 * Randomly selects from available elemental types.
 *
 * Example: { type: "havoc" }
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import { getEffectManager } from './EffectManager';

// Available chaos elements (subset of Zangband's 30 types)
const CHAOS_ELEMENTS = [
  'fire', 'cold', 'lightning', 'acid', 'poison',
  'magic', 'nether', 'chaos', 'disenchant', 'sound',
];

// Directional offsets for omnidirectional pattern
const DIRECTIONS = [
  { x: 0, y: -1 },   // N
  { x: 1, y: -1 },   // NE
  { x: 1, y: 0 },    // E
  { x: 1, y: 1 },    // SE
  { x: 0, y: 1 },    // S
  { x: -1, y: 1 },   // SW
  { x: -1, y: 0 },   // W
  { x: -1, y: -1 },  // NW
];

export class HavocEffect extends SelfGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const { actor, rng } = context;

    // Select random chaos element
    const element = CHAOS_ELEMENTS[rng.getUniformInt(0, CHAOS_ELEMENTS.length - 1)];

    // Determine which chaos pattern to use
    const patternRoll = rng.getUniform();
    let pattern: 'omnidirectional' | 'large_ball' | 'directed';

    if (patternRoll < 0.167) {
      pattern = 'omnidirectional';
    } else if (patternRoll < 0.5) {
      pattern = 'large_ball';
    } else {
      pattern = 'directed';
    }

    const messages: string[] = [`You unleash chaotic ${element} energy!`];
    let totalDamage = 0;

    const effectManager = getEffectManager();

    switch (pattern) {
      case 'omnidirectional': {
        // Fire in all 8 directions
        for (const dir of DIRECTIONS) {
          const targetPos = {
            x: actor.position.x + dir.x * 10,
            y: actor.position.y + dir.y * 10,
          };

          const ballDef: GPEffectDef = {
            type: 'ball',
            target: 'position',
            damage: 75,
            element,
            radius: 2,
          };

          const ballEffect = effectManager.createEffect(ballDef);
          const ballContext = { ...context, targetPosition: targetPos };

          if (ballEffect.canExecute(ballContext)) {
            const result = ballEffect.execute(ballContext);
            totalDamage += result.damageDealt ?? 0;
          }
        }
        messages.push('Chaos explodes in all directions!');
        break;
      }

      case 'large_ball': {
        // Large ball centered on caster (dangerous!)
        const ballDef: GPEffectDef = {
          type: 'ball',
          target: 'position',
          damage: 300,
          element,
          radius: 8,
        };

        const ballEffect = effectManager.createEffect(ballDef);
        const ballContext = { ...context, targetPosition: actor.position };

        if (ballEffect.canExecute(ballContext)) {
          const result = ballEffect.execute(ballContext);
          totalDamage += result.damageDealt ?? 0;
          messages.push(...result.messages);
        }
        messages.push('A massive ball of chaos engulfs the area!');
        break;
      }

      case 'directed': {
        // Fire at a random nearby location
        const offsetX = rng.getUniformInt(-5, 5);
        const offsetY = rng.getUniformInt(-5, 5);
        const targetPos = {
          x: actor.position.x + offsetX,
          y: actor.position.y + offsetY,
        };

        const ballDef: GPEffectDef = {
          type: 'ball',
          target: 'position',
          damage: 150,
          element,
          radius: 3,
        };

        const ballEffect = effectManager.createEffect(ballDef);
        const ballContext = { ...context, targetPosition: targetPos };

        if (ballEffect.canExecute(ballContext)) {
          const result = ballEffect.execute(ballContext);
          totalDamage += result.damageDealt ?? 0;
          messages.push(...result.messages);
        }
        break;
      }
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      damageDealt: totalDamage,
    };
  }
}
