/**
 * AlchemyEffect - Converts an item to gold
 *
 * From Zangband's alchemy() which destroys an item and gives
 * the player gold based on the item's value (typically 1/3).
 *
 * Used by: Alchemy (sorcery realm)
 */

import { ItemTargetGPEffect } from './ItemTargetGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';

export interface AlchemyEffectDef extends GPEffectDef {
  type: 'alchemy';
}

interface AlchemyData {
  goldGained: number;
  destroyItem: boolean;
  itemId: string;
}

export class AlchemyEffect extends ItemTargetGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const item = this.getTargetItem(context);
    const messages: string[] = [];

    // Calculate gold gained (approximately 1/3 of item value)
    // Base cost from generated item, default to 10 if not available
    const baseCost = item.generated?.baseItem?.cost ?? 10;
    const goldGained = Math.max(1, Math.floor(baseCost / 3));

    messages.push(`The ${item.name} turns to gold!`);
    messages.push(`You gain ${goldGained} gold pieces.`);

    const data: AlchemyData = {
      goldGained,
      destroyItem: true,
      itemId: item.id,
    };

    return {
      success: true,
      messages,
      turnConsumed: true,
      data,
    };
  }
}
