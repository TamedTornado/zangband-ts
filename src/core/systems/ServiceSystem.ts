/**
 * Service System - handles service building interactions
 *
 * Service buildings (Inn, Healer, Library, etc.) provide services
 * instead of inventory-based trading.
 */

import { PricingSystem } from './Pricing';
import { ServiceType } from '@/core/data/services';
import type { ServiceDef } from '@/core/data/services';
import type { Player } from '@/core/entities/Player';

/**
 * Context for service execution
 */
export interface ServiceContext {
  /** Whether it's currently night time */
  isNight?: boolean;
  /** Selected item index (for item-requiring services) */
  selectedItemIndex?: number;
}

/**
 * Result of checking if service can be used
 */
export interface CanUseResult {
  canUse: boolean;
  reason?: string;
}

/**
 * Result of service execution
 */
export interface ServiceResult {
  success: boolean;
  message: string;
  goldSpent: number;
}

/**
 * Service System
 *
 * Handles cost calculation and service execution for service buildings.
 */
export class ServiceSystem {
  /**
   * Calculate service cost with charisma modifier.
   *
   * Uses the same charisma factor as store pricing.
   *
   * @param baseCost Base cost from service definition
   * @param charisma Player's charisma stat
   * @returns Adjusted cost in gold
   */
  static getServiceCost(baseCost: number, charisma: number): number {
    if (baseCost === 0) return 0;

    const factor = PricingSystem.getCharismaFactor(charisma);
    // Apply charisma factor (same formula as store sell prices)
    const cost = Math.round((baseCost * factor) / 100);
    return Math.max(1, cost);
  }

  /**
   * Check if player can use a service.
   *
   * @param player The player
   * @param service Service definition
   * @param context Optional context (time of day, etc.)
   * @returns Result with canUse flag and reason if not
   */
  static canUseService(
    player: Player,
    service: ServiceDef,
    context: ServiceContext = {}
  ): CanUseResult {
    // Get charisma from player stats
    const charisma = (player as any).stats?.chr?.current ?? 10;
    const cost = this.getServiceCost(service.baseCost, charisma);

    // Check gold
    if (cost > 0 && player.gold < cost) {
      return {
        canUse: false,
        reason: `You need ${cost} gold for this service.`,
      };
    }

    // Check night-only services
    if (service.nightOnly && !context.isNight) {
      return {
        canUse: false,
        reason: 'This service is only available at night.',
      };
    }

    return { canUse: true };
  }

  /**
   * Execute a service.
   *
   * @param player The player
   * @param service Service definition
   * @param context Optional context
   * @returns Result with success flag, message, and gold spent
   */
  static executeService(
    player: Player,
    service: ServiceDef,
    context: ServiceContext = {}
  ): ServiceResult {
    // Check if can use
    const canUse = this.canUseService(player, service, context);
    if (!canUse.canUse) {
      return {
        success: false,
        message: canUse.reason || 'Cannot use this service.',
        goldSpent: 0,
      };
    }

    // Get cost
    const charisma = (player as any).stats?.chr?.current ?? 10;
    const cost = this.getServiceCost(service.baseCost, charisma);

    // Execute based on service type
    switch (service.type) {
      case ServiceType.INN_EAT:
        return this.executeInnEat(player, cost);

      case ServiceType.INN_REST:
        return this.executeInnRest(player, cost, context);

      case ServiceType.HEALER_RESTORE:
        return this.executeHealerRestore(player, cost);

      case ServiceType.LIBRARY_RESEARCH:
        return this.executeLibraryResearch(player, cost);

      case ServiceType.RECHARGE:
        return this.executeRecharge(player, cost, context);

      case ServiceType.IDENTIFY_ALL:
        return this.executeIdentifyAll(player, cost);

      case ServiceType.ENCHANT_WEAPON:
        return this.executeEnchantWeapon(player, cost, context);

      case ServiceType.ENCHANT_ARMOR:
        return this.executeEnchantArmor(player, cost, context);

      case ServiceType.QUEST_VIEW:
        return this.executeQuestView(player);

      default:
        return {
          success: false,
          message: 'Unknown service type.',
          goldSpent: 0,
        };
    }
  }

  /**
   * Get enchantment cap based on player level.
   *
   * @param level Player level
   * @param type Type of enchantment ('hit', 'dam', or 'ac')
   * @returns Maximum enchantment value
   */
  static getEnchantCap(level: number, type: 'hit' | 'dam' | 'ac'): number {
    switch (type) {
      case 'hit':
        return Math.floor(level / 5);
      case 'dam':
        return Math.floor(level / 3);
      case 'ac':
        return Math.floor(level / 5);
      default:
        return 0;
    }
  }

  // ===== Service Implementations =====

  private static executeInnEat(player: Player, cost: number): ServiceResult {
    // Restore food to max
    const maxFood = (player as any).maxFood ?? 15000;
    (player as any).food = maxFood;

    // Deduct cost
    player.spendGold(cost);

    return {
      success: true,
      message: 'The innkeeper serves you a hearty meal. You feel full!',
      goldSpent: cost,
    };
  }

  private static executeInnRest(
    player: Player,
    cost: number,
    context: ServiceContext
  ): ServiceResult {
    if (!context.isNight) {
      return {
        success: false,
        message: 'You can only rest at night.',
        goldSpent: 0,
      };
    }

    // Restore HP to max
    const maxHp = (player as any).maxHp ?? 100;
    (player as any).hp = maxHp;

    // Restore MP to max
    const maxMp = (player as any).maxMp ?? 50;
    (player as any).mp = maxMp;

    // Deduct cost
    player.spendGold(cost);

    return {
      success: true,
      message: 'You rest through the night. You feel refreshed!',
      goldSpent: cost,
    };
  }

  private static executeHealerRestore(player: Player, cost: number): ServiceResult {
    const stats = (player as any).stats;
    if (!stats) {
      return {
        success: false,
        message: 'Nothing to restore.',
        goldSpent: 0,
      };
    }

    // Check if any stats are drained
    let restored = false;
    const statNames = ['str', 'int', 'wis', 'dex', 'con', 'chr'];

    for (const stat of statNames) {
      if (stats[stat] && stats[stat].current < stats[stat].base) {
        stats[stat].current = stats[stat].base;
        restored = true;
      }
    }

    if (!restored) {
      return {
        success: false,
        message: 'You have nothing that needs restoring.',
        goldSpent: 0,
      };
    }

    // Deduct cost only if something was restored
    player.spendGold(cost);

    return {
      success: true,
      message: 'The healer restores your drained abilities!',
      goldSpent: cost,
    };
  }

  private static executeLibraryResearch(player: Player, cost: number): ServiceResult {
    // TODO: Implement monster research when monster memory system exists
    player.spendGold(cost);

    return {
      success: true,
      message: 'You spend time researching in the library.',
      goldSpent: cost,
    };
  }

  private static executeRecharge(
    player: Player,
    cost: number,
    context: ServiceContext
  ): ServiceResult {
    if (context.selectedItemIndex === undefined) {
      return {
        success: false,
        message: 'Select an item to recharge.',
        goldSpent: 0,
      };
    }

    const inventory = player.inventory;
    const item = inventory[context.selectedItemIndex];
    if (!item) {
      return {
        success: false,
        message: 'Invalid item.',
        goldSpent: 0,
      };
    }

    // Check if item can be recharged (rods recharge automatically over time)
    if (!item.isWand && !item.isStaff) {
      return {
        success: false,
        message: 'That item cannot be recharged.',
        goldSpent: 0,
      };
    }

    // For wands/staffs, add charges
    const currentCharges = item.charges;
    const maxCharges = item.maxCharges || 10;

    if (currentCharges >= maxCharges) {
      return {
        success: false,
        message: 'That item is already fully charged.',
        goldSpent: 0,
      };
    }

    // Recharge to max
    const chargesToAdd = maxCharges - currentCharges;
    item.recharge(chargesToAdd);
    player.spendGold(cost);

    return {
      success: true,
      message: `Your ${item.name} now has ${item.charges} charges!`,
      goldSpent: cost,
    };
  }

  private static executeIdentifyAll(player: Player, cost: number): ServiceResult {
    const inventory = (player as any).inventory;
    let identifiedCount = 0;

    if (inventory?.items) {
      for (const item of inventory.items) {
        if (item && !item.identified) {
          item.identified = true;
          identifiedCount++;
        }
      }
    }

    // Deduct cost (even if nothing to identify)
    player.spendGold(cost);

    if (identifiedCount === 0) {
      return {
        success: true,
        message: 'All your items were already identified.',
        goldSpent: cost,
      };
    }

    return {
      success: true,
      message: `${identifiedCount} item${identifiedCount > 1 ? 's' : ''} identified!`,
      goldSpent: cost,
    };
  }

  private static executeEnchantWeapon(
    player: Player,
    cost: number,
    context: ServiceContext
  ): ServiceResult {
    // TODO: Implement weapon enchanting when item system supports it
    if (context.selectedItemIndex === undefined) {
      return {
        success: false,
        message: 'Select a weapon to enchant.',
        goldSpent: 0,
      };
    }

    player.spendGold(cost);

    // Random chance of failure (about 20%)
    if (Math.random() < 0.2) {
      return {
        success: false,
        message: 'The enchantment failed!',
        goldSpent: cost,
      };
    }

    return {
      success: true,
      message: 'Your weapon glows with magical energy!',
      goldSpent: cost,
    };
  }

  private static executeEnchantArmor(
    player: Player,
    cost: number,
    context: ServiceContext
  ): ServiceResult {
    // TODO: Implement armor enchanting when item system supports it
    if (context.selectedItemIndex === undefined) {
      return {
        success: false,
        message: 'Select armor to enchant.',
        goldSpent: 0,
      };
    }

    player.spendGold(cost);

    // Random chance of failure (about 20%)
    if (Math.random() < 0.2) {
      return {
        success: false,
        message: 'The enchantment failed!',
        goldSpent: cost,
      };
    }

    return {
      success: true,
      message: 'Your armor shimmers with protective magic!',
      goldSpent: cost,
    };
  }

  private static executeQuestView(_player: Player): ServiceResult {
    return {
      success: true,
      message: 'Quests are coming soon! Check back later.',
      goldSpent: 0,
    };
  }
}
