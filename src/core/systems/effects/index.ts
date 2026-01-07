/**
 * Effects System
 *
 * Data-driven effect execution for potions, scrolls, wands, etc.
 */

export {
  type Effect,
  type EffectResult,
  rollDiceExpression,
  executeEffects,
} from './EffectExecutor';

export {
  loadPotionDefs,
  getPotionEffects,
  getPotionDef,
  hasPotionEffects,
} from './PotionEffects';
