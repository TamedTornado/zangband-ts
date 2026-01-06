/**
 * Item type values (tval) from Zangband
 * These determine the category of an item
 */

// Consumables
export const TV_FOOD = 80;
export const TV_POTION = 75;
export const TV_SCROLL = 70;

// Equipment
export const TV_SWORD = 23;
export const TV_POLEARM = 22;
export const TV_HAFTED = 21;
export const TV_BOW = 19;
export const TV_ARROW = 17;
export const TV_BOLT = 18;
export const TV_SHOT = 16;

// Armor
export const TV_SOFT_ARMOR = 36;
export const TV_HARD_ARMOR = 37;
export const TV_DRAG_ARMOR = 38;
export const TV_BOOTS = 30;
export const TV_GLOVES = 31;
export const TV_HELM = 32;
export const TV_CROWN = 33;
export const TV_SHIELD = 34;
export const TV_CLOAK = 35;

// Accessories
export const TV_AMULET = 40;
export const TV_RING = 45;
export const TV_LIGHT = 39;

// Magic
export const TV_WAND = 65;
export const TV_STAFF = 55;
export const TV_ROD = 66;

// Special
export const TV_GOLD = 100;
export const TV_SKELETON = 1;
export const TV_CORPSE = 2;
export const TV_SPIKE = 5;

/**
 * Check if tval is a weapon type
 */
export function isWeaponTval(tval: number): boolean {
  return tval >= TV_SHOT && tval <= TV_SWORD;
}

/**
 * Check if tval is an armor type
 */
export function isArmorTval(tval: number): boolean {
  return tval >= TV_BOOTS && tval <= TV_DRAG_ARMOR;
}

/**
 * Check if tval is a consumable type
 */
export function isConsumableTval(tval: number): boolean {
  return tval === TV_FOOD || tval === TV_POTION || tval === TV_SCROLL;
}
