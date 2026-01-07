/**
 * Effects System
 *
 * Data-driven effect execution for potions, scrolls, wands, etc.
 * Effects are defined on item data in items.json.
 */

export {
  type Effect,
  type EffectResult,
  rollDiceExpression,
  executeEffects,
} from './EffectExecutor';
