/**
 * Debug setup for testing - creates a mage character with spell books and devices
 *
 * Toggle DEBUG_MODE to enable/disable.
 */

import type { Player } from '../entities/Player';
import type { ItemGeneration } from '../systems/ItemGeneration';
import classesData from '@/data/classes/classes.json';
import type { ClassDef } from '../data/classes';

/** Set to true to start with debug mage setup */
export const DEBUG_MODE = true;

/** Items for debug mage character */
const DEBUG_STARTING_ITEMS = [
  // Sorcery books (primary realm)
  'beginners_handbook',
  'master_sorcerers_handbook',
  // Chaos books (secondary realm)
  'sign_of_chaos',
  'chaos_mastery',
  // Wands (various effects)
  'magic_missile',
  'wand_of_frost_bolts',
  'wand_of_fire_bolts',
  'wand_of_slow_monster',
  'wand_of_drain_life',
  'stone_to_mud',
  // Rods (recharge automatically)
  'rod_of_light',
  'lightning_bolts',
  'rod_of_fire_bolts',
  'rod_of_teleport_other',
  // Staff
  'staff_of_teleportation',
  // Basic equipment
  'wooden_torch',
];

/**
 * Apply debug setup to player - makes them a mage with items and spells
 */
export function applyDebugSetup(player: Player, itemGen: ItemGeneration): void {
  if (!DEBUG_MODE) return;

  const mageClass = (classesData as unknown as Record<string, ClassDef>)['mage'];
  if (!mageClass) {
    console.warn('Debug setup: mage class not found');
    return;
  }

  // Set class
  player.setClass(mageClass);

  // Set higher stats for a mage (base 10 + class bonus + some extra for testing)
  player.stats.str = 10;
  player.stats.int = 18; // High INT for spellcasting
  player.stats.wis = 12;
  player.stats.dex = 14;
  player.stats.con = 12;
  player.stats.chr = 12;

  // Set realms (sorcery primary, chaos secondary)
  player.setPrimaryRealm('sorcery');
  player.setSecondaryRealm('chaos');

  // Set level higher for more mana and spell access
  // (HP is determined by baseMaxHp from player creation)
  player.setLevel(1);

  // Restore mana to full (recalculateMana doesn't increase current mana)
  player.restoreMana(player.maxMana);

  // Grant telepathy for testing monster awareness
  player.hasTelepathy = true;

  // Give starting items
  for (const itemKey of DEBUG_STARTING_ITEMS) {
    const item = itemGen.createItemByKey(itemKey);
    if (item) {
      // Pre-identify devices so we can see what they are
      if (item.generated) {
        item.generated.identified = true;
      }
      player.addItem(item);

      // Auto-equip torch
      if (itemKey === 'wooden_torch') {
        player.equip(item);
      }
    }
  }

  // No pre-learned spells - test the study flow to learn them
}
