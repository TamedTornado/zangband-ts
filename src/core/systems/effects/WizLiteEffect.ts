/**
 * WizLiteEffect - Complete dungeon enlightenment
 *
 * Used by: Clairvoyance (sorcery, arcane), Call Sunlight (nature)
 *
 * From Zangband's wiz_lite():
 * - Reveals the entire map
 * - Detects all monsters
 * - Reveals all items on the floor
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';

export class WizLiteEffect extends SelfGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const { level } = context;
    const messages: string[] = [];

    // Reveal entire map
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const tile = level.getTile({ x, y });
        if (tile) {
          tile.explored = true;
        }
      }
    }
    messages.push('An image of your surroundings forms in your mind.');

    // Detect all monsters
    const monsters = level.getMonsters();
    let monsterCount = 0;
    for (const monster of monsters) {
      if (monster.isDead) continue;
      const tile = level.getTile(monster.position);
      if (tile) {
        tile.rememberMonster(monster.symbol, monster.color, monster.def.index);
      }
      monsterCount++;
    }

    if (monsterCount > 0) {
      messages.push(`You sense the presence of ${monsterCount} creature${monsterCount > 1 ? 's' : ''}.`);
    }

    // Items are automatically visible when tiles are explored
    // (Items on explored tiles are rendered by the display system)

    return {
      success: true,
      messages,
      turnConsumed: true,
    };
  }
}
