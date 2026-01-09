/**
 * ItemUseSystem - Handles the execution of item usage
 *
 * Responsible for:
 * - Executing item effects
 * - Using charges (devices)
 * - Returning the energy cost for the caller to spend via fsm.completeTurn()
 *
 * NOTE: This system does NOT spend energy. The FSM state is responsible for
 * calling fsm.completeTurn(result.energyCost) after using this system.
 */

import { RNG } from 'rot-js';
import type { Player } from '../entities/Player';
import type { Item } from '../entities/Item';
import type { Level } from '../world/Level';
import type { MonsterDataManager } from '../data/MonsterDataManager';
import { getEffectManager, type GPEffectContext, type GPEffectDef } from './effects';
import { calculateDeviceEnergyCost } from './Energy';
import { ENERGY_PER_TURN } from '../constants';

export interface ItemUseContext {
  player: Player;
  level: Level;
  monsterDataManager?: MonsterDataManager;
  targetPosition?: { x: number; y: number };
  // For scrolls that target items, symbols, or directions
  targetItem?: import('../entities/Item').Item;
  targetSymbol?: string;
  targetDirection?: import('../types').Direction;
}

export interface ItemUseResult {
  success: boolean;
  messages: string[];
  energyCost: number;      // Cost to be spent by caller via fsm.completeTurn()
  itemConsumed: boolean;
}

/**
 * Use a potion - executes effects
 */
export function usePotion(item: Item, context: ItemUseContext): ItemUseResult {
  const { player, level } = context;
  const messages: string[] = [];

  const effects = item.generated?.baseItem.effects as GPEffectDef[] | undefined;
  if (effects && effects.length > 0) {
    const effectContext: GPEffectContext = {
      actor: player,
      level,
      rng: RNG,
    };
    const effectResult = getEffectManager().executeEffects(effects, effectContext);
    messages.push(...effectResult.messages);
  } else {
    messages.push('That tasted... interesting.');
  }

  return {
    success: true,
    messages,
    energyCost: ENERGY_PER_TURN,
    itemConsumed: true,
  };
}

/**
 * Use a scroll - executes effects
 */
export function useScroll(item: Item, context: ItemUseContext): ItemUseResult {
  const { player, level, targetItem, targetSymbol, targetDirection } = context;
  const messages: string[] = [];

  const effects = item.generated?.baseItem.effects as GPEffectDef[] | undefined;
  if (effects && effects.length > 0) {
    const effectContext: GPEffectContext = {
      actor: player,
      level,
      rng: RNG,
      ...(targetItem && { targetItem }),
      ...(targetSymbol && { targetSymbol }),
      ...(targetDirection && { targetDirection }),
    };
    const effectResult = getEffectManager().executeEffects(effects, effectContext);
    messages.push(...effectResult.messages);
  } else {
    messages.push('The scroll crumbles to dust.');
  }

  return {
    success: true,
    messages,
    energyCost: ENERGY_PER_TURN,
    itemConsumed: true,
  };
}

/**
 * Use food - executes effects
 */
export function useFood(item: Item, context: ItemUseContext): ItemUseResult {
  const { player, level } = context;
  const messages: string[] = [];

  const effects = item.generated?.baseItem.effects as GPEffectDef[] | undefined;
  if (effects && effects.length > 0) {
    const effectContext: GPEffectContext = {
      actor: player,
      level,
      rng: RNG,
    };
    const effectResult = getEffectManager().executeEffects(effects, effectContext);
    messages.push(...effectResult.messages);
  }

  return {
    success: true,
    messages,
    energyCost: ENERGY_PER_TURN,
    itemConsumed: true,
  };
}

/**
 * Use a device (wand, rod, staff) - executes effects and uses charges
 */
export function useDevice(item: Item, context: ItemUseContext): ItemUseResult {
  const { player, level, monsterDataManager, targetPosition, targetDirection } = context;
  const messages: string[] = [];

  // Check if device can be used
  if (item.isWand || item.isStaff) {
    if (item.charges <= 0) {
      return {
        success: false,
        messages: [`The ${item.isWand ? 'wand' : 'staff'} has no charges left.`],
        energyCost: 0,
        itemConsumed: false,
      };
    }
  } else if (item.isRod) {
    if (!item.isReady) {
      return {
        success: false,
        messages: [`The rod is still recharging (${item.timeout} turns left).`],
        energyCost: 0,
        itemConsumed: false,
      };
    }
  }

  const effects = item.generated?.baseItem.effects as GPEffectDef[] | undefined;
  if (effects && effects.length > 0) {
    const effectContext: GPEffectContext = {
      actor: player,
      level,
      rng: RNG,
    };

    if (monsterDataManager) {
      effectContext.monsterDataManager = monsterDataManager;
      effectContext.getMonsterInfo = (monster) => {
        const def = monsterDataManager.getMonsterDef(monster.definitionKey);
        return {
          name: def?.name ?? 'creature',
          flags: def?.flags ?? [],
        };
      };
    }

    if (targetPosition) {
      effectContext.targetPosition = targetPosition;
    }
    if (targetDirection) {
      effectContext.targetDirection = targetDirection;
    }

    const effectResult = getEffectManager().executeEffects(effects, effectContext);
    messages.push(...effectResult.messages);
  } else {
    messages.push('Nothing happens.');
  }

  // Use a charge / start timeout
  item.useCharge();

  // Calculate energy cost based on device skill
  const energyCost = calculateDeviceEnergyCost(player.skills.device);

  return {
    success: true,
    messages,
    energyCost,
    itemConsumed: false, // Devices are not consumed
  };
}

/**
 * Get the energy cost for using an item type (without spending it)
 */
export function getItemEnergyCost(item: Item, player: Player): number {
  if (item.isDevice) {
    return calculateDeviceEnergyCost(player.skills.device);
  }
  // Potions, scrolls, food all cost standard energy
  return ENERGY_PER_TURN;
}
