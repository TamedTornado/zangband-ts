/**
 * Service type definitions for service buildings
 *
 * Service buildings (Inn, Healer, Library, etc.) provide services
 * instead of inventory-based trading. Each service has a type,
 * cost, and effect.
 */

/**
 * Service type constants
 */
export const ServiceType = {
  /** Inn: Restore food to full */
  INN_EAT: 'inn_eat',
  /** Inn: Rest overnight to restore HP/MP (night only) */
  INN_REST: 'inn_rest',
  /** Healer: Restore drained stats */
  HEALER_RESTORE: 'healer_restore',
  /** Library: Research monster information */
  LIBRARY_RESEARCH: 'library_research',
  /** Recharge shop: Recharge wands/staves/rods */
  RECHARGE: 'recharge',
  /** Recharge shop: Identify all items in inventory */
  IDENTIFY_ALL: 'identify_all',
  /** Weaponsmith: Enchant weapon (+hit/+dam) */
  ENCHANT_WEAPON: 'enchant_weapon',
  /** Armorer: Enchant armor (+AC) */
  ENCHANT_ARMOR: 'enchant_armor',
  /** Castle: View/request quests */
  QUEST_VIEW: 'quest_view',
} as const;

export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

/**
 * Service definition
 *
 * Defines a single service offered by a building.
 */
export interface ServiceDef {
  /** Unique service identifier */
  key: string;

  /** Service type (determines execution logic) */
  type: ServiceType;

  /** Display name shown in UI */
  name: string;

  /** Help text describing the service */
  description: string;

  /** Base cost in gold (modified by charisma) */
  baseCost: number;

  /** Action string from input bindings (e.g., 'action:service_eat') */
  action: string;

  /** Whether service requires selecting an item */
  requiresItem?: boolean;

  /** Filter for item types when requiresItem is true */
  itemFilter?: string[];

  /** Whether service is only available at night */
  nightOnly?: boolean;
}
