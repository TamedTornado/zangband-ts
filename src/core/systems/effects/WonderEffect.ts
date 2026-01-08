/**
 * WonderEffect - Random effect from a pool
 *
 * Position-targeted effect that randomly selects and executes one of many
 * possible effects. Used by Wand of Wonder.
 *
 * Possible effects include: bolts, balls, status effects, healing, etc.
 *
 * Example: { type: "wonder", target: "position" }
 */

import { PositionGPEffect } from './PositionGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import { getEffectManager } from './EffectManager';

/**
 * Pool of possible effects for Wand of Wonder
 * Based on Zangband's wand_of_wonder() function
 */
const WONDER_EFFECTS: GPEffectDef[] = [
  // Cursed/negative effects (for player, good against monsters)
  { type: 'healMonster', target: 'position' },
  { type: 'hasteMonster', target: 'position', duration: 20 },
  { type: 'cloneMonster', target: 'position' },

  // Utility effects
  { type: 'teleportOther', target: 'position', distance: 45 },
  { type: 'lightArea', radius: 2 },

  // Status effects on monsters
  { type: 'applyStatus', target: 'position', status: 'sleeping', duration: '5+1d10' },
  { type: 'applyStatus', target: 'position', status: 'slow', duration: '10+1d10' },
  { type: 'applyStatus', target: 'position', status: 'confused', duration: '5+1d10' },
  { type: 'applyStatus', target: 'position', status: 'afraid', duration: '5+1d10' },

  // Drain life
  { type: 'drainLife', target: 'position', damage: 150 },

  // Polymorph
  { type: 'polymorph', target: 'position' },

  // Bolts
  { type: 'bolt', target: 'position', damage: '2d6', element: 'magic' },  // Magic missile
  { type: 'bolt', target: 'position', damage: '6d8', element: 'acid' },
  { type: 'bolt', target: 'position', damage: '10d8', element: 'fire' },
  { type: 'bolt', target: 'position', damage: '6d8', element: 'cold' },

  // Balls
  { type: 'ball', target: 'position', damage: 15, element: 'poison', radius: 2 },  // Stinking cloud
  { type: 'ball', target: 'position', damage: 125, element: 'acid', radius: 2 },
  { type: 'ball', target: 'position', damage: 75, element: 'lightning', radius: 2 },
  { type: 'ball', target: 'position', damage: 150, element: 'fire', radius: 2 },
  { type: 'ball', target: 'position', damage: 100, element: 'cold', radius: 2 },

  // Charm (tame)
  { type: 'tameMonster', target: 'position' },
];

export class WonderEffect extends PositionGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const { rng } = context;

    // Randomly select an effect from the pool
    const effectIndex = rng.getUniformInt(0, WONDER_EFFECTS.length - 1);
    const selectedDef = WONDER_EFFECTS[effectIndex];

    // Create and execute the selected effect
    const effectManager = getEffectManager();
    const effect = effectManager.createEffect(selectedDef);

    // Check if the selected effect can execute
    if (!effect.canExecute(context)) {
      // Fall back to a simple message if effect can't execute
      return this.success(['The wand sparkles but nothing happens.']);
    }

    // Execute the selected effect
    const result = effect.execute(context);

    // Prepend a message indicating it was a wand of wonder
    const messages = ['The wand flashes!', ...result.messages];

    return {
      ...result,
      messages,
    };
  }
}
