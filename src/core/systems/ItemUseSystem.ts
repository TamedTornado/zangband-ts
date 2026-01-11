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
import type { ILevel } from '../world/Level';
import type { MonsterDataManager } from '../data/MonsterDataManager';
import { getEffectManager, type GPEffectContext, type GPEffectDef } from './effects';
import { calculateDeviceEnergyCost } from './Energy';
import { ENERGY_PER_TURN } from '../constants';

export interface ItemUseContext {
  player: Player;
  level: ILevel;
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

/** Minimum chance to activate a device (5%) */
const MIN_DEVICE_CHANCE = 5;

/** Multiplier for item depth in device check */
const DEVICE_DEPTH_MULTIPLIER = 2;

/**
 * Use a device (wand, rod, staff) - executes effects and uses charges
 * Includes a skill check: success = roll < deviceSkill - itemDepth * 2
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

  // Device skill check: success = roll < deviceSkill - itemDepth * 2
  const deviceSkill = player.skills.device;
  const itemDepth = item.generated?.baseItem.depth ?? 1;
  const successChance = Math.max(MIN_DEVICE_CHANCE, deviceSkill - itemDepth * DEVICE_DEPTH_MULTIPLIER);

  const roll = RNG.getUniformInt(0, 99);
  if (roll >= successChance) {
    // Failed to activate the device
    const energyCost = calculateDeviceEnergyCost(deviceSkill);
    return {
      success: true, // Turn was consumed, just failed to activate
      messages: ['You fail to use the device properly.'],
      energyCost,
      itemConsumed: false, // Don't consume charge on failure
    };
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
