/**
 * RemoveCurseEffect - Removes curses from equipped items
 *
 * From Zangband: remove_curse() removes light curses,
 * remove_all_curse() removes all curses including heavy curses.
 * Perma-curse can NEVER be removed.
 *
 * Used by: Remove Curse scroll, Dispel Curse scroll, Life realm spells
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Player } from '@/core/entities/Player';

export interface RemoveCurseEffectDef extends GPEffectDef {
  type: 'removeCurse';
  removeAll?: boolean; // true = Dispel Curse (removes heavy), false = Remove Curse
}

interface RemoveCurseData {
  uncursedCount: number;
  uncursedItems: string[];
}

export class RemoveCurseEffect extends SelfGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const { actor } = context;
    if (!actor) {
      return { success: false, messages: ['No valid target.'], turnConsumed: false };
    }

    const removeAll = this.def['removeAll'] === true;
    const messages: string[] = [];
    const uncursedItems: string[] = [];

    // Get player's equipped items
    const player = actor as Player;
    if (!('getAllEquipment' in player)) {
      // Not a player, just return success with no effect
      messages.push('You feel as if someone is watching over you.');
      return {
        success: true,
        messages,
        turnConsumed: true,
        data: { uncursedCount: 0, uncursedItems: [] },
      };
    }

    const equipment = player.getAllEquipment();

    // Iterate through all equipped items
    for (const item of Object.values(equipment)) {
      if (!item?.generated) continue;

      const generated = item.generated as any;
      const flags: string[] = generated.flags ?? [];

      // Check if cursed
      const isCursed = flags.includes('CURSED');
      if (!isCursed) continue;

      // Check for perma-curse - NEVER removable
      const isPermaCursed = flags.includes('PERMA_CURSE');
      if (isPermaCursed) continue;

      // Check for heavy curse - only removable with removeAll
      const isHeavyCursed = flags.includes('HEAVY_CURSE');
      if (isHeavyCursed && !removeAll) continue;

      // Remove curse flags
      generated.flags = flags.filter(
        (f: string) => !['CURSED', 'HEAVY_CURSE'].includes(f)
      );

      const itemName = item.name || 'item';
      uncursedItems.push(itemName);
    }

    // Build result
    const data: RemoveCurseData = {
      uncursedCount: uncursedItems.length,
      uncursedItems,
    };

    if (uncursedItems.length === 0) {
      messages.push('You feel as if someone is watching over you.');
    } else if (removeAll) {
      messages.push('A heavy curse is lifted from your equipment!');
    } else {
      messages.push('A curse is lifted from your equipment!');
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      data,
    };
  }
}
