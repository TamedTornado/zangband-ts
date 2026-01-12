/**
 * EsoteriaEffect - Esoteric identification spell from the Death realm
 *
 * Identifies an item with a level-based chance for full identification.
 * - If random(1, 50) > playerLevel: regular identify
 * - Otherwise: full identify (reveals all properties)
 *
 * Based on Zangband cmd5.c case 26 (Esoteria):
 *   if (randint1(50) > plev)
 *       return ident_spell();
 *   else
 *       return identify_fully();
 *
 * Used by: Esoteria (death realm)
 */

import { ItemTargetGPEffect } from './ItemTargetGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Player } from '@/core/entities/Player';

export interface EsoteriaEffectDef extends GPEffectDef {
  type: 'esoteria';
}

interface EsoteriaData {
  fullyIdentified: boolean;
}

export class EsoteriaEffect extends ItemTargetGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, rng } = context;
    const item = this.getTargetItem(context);
    const messages: string[] = [];

    // Check if item can be identified
    if (!item.generated) {
      return this.noEffect('That item has no hidden properties.');
    }

    // Check if already identified
    if (item.generated.identified) {
      return this.success([`${item.name} is already identified.`]);
    }

    // Identify the item
    item.generated.identified = true;

    // Determine if we get full identification based on player level
    // Higher level = better chance for full identify
    // random(1, 50) > plev means regular, otherwise full
    const player = actor as Player;
    const playerLevel = player.level ?? 1;
    const roll = rng.getUniformInt(1, 50);
    const fullyIdentified = roll <= playerLevel;

    if (fullyIdentified) {
      // Full identification - reveals all hidden properties
      // In a full implementation, this would also reveal ego properties, curses, etc.
      messages.push(`You have fully identified: ${item.name}`);
      messages.push('You learn all of its secrets!');
    } else {
      // Regular identification
      messages.push(`You have identified: ${item.name}`);
    }

    const data: EsoteriaData = {
      fullyIdentified,
    };

    return {
      success: true,
      messages,
      turnConsumed: true,
      data,
    };
  }
}
