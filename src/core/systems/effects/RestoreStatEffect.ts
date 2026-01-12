/**
 * RestoreStatEffect - Restores drained stats
 *
 * Used by: Staff of Restoration, Rod of Restoration
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Player, Stats } from '@/core/entities/Player';

export type StatName = 'str' | 'int' | 'wis' | 'dex' | 'con' | 'chr' | 'all';

export interface RestoreStatEffectDef extends GPEffectDef {
  type: 'restoreStat';
  stat: StatName | StatName[];
}

const STAT_NAMES: Record<string, string> = {
  str: 'strength',
  int: 'intelligence',
  wis: 'wisdom',
  dex: 'dexterity',
  con: 'constitution',
  chr: 'charisma',
};

export class RestoreStatEffect extends SelfGPEffect {
  readonly stats: StatName[];

  constructor(def: GPEffectDef) {
    super(def);
    const restoreDef = def as RestoreStatEffectDef;
    this.stats = Array.isArray(restoreDef.stat) ? restoreDef.stat : [restoreDef.stat ?? 'all'];
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor } = context;
    if (!actor) {
      return { success: false, messages: ['No valid target.'], turnConsumed: false };
    }

    const messages: string[] = [];
    const player = actor as Player;

    // Check if player has stat restoration methods
    if (!('restoreStat' in player)) {
      messages.push('You feel your stats returning to normal.');
      return { success: true, messages, turnConsumed: true };
    }

    let anyRestored = false;

    if (this.stats.includes('all')) {
      // Restore all stats
      const restored = player.restoreAllStats();
      if (restored.length > 0) {
        anyRestored = true;
        messages.push('You feel your stats returning to normal.');
      } else {
        messages.push('Your stats are already normal.');
      }
    } else {
      // Restore specific stats
      const validStats: (keyof Stats)[] = ['str', 'int', 'wis', 'dex', 'con', 'chr'];
      for (const stat of this.stats) {
        if (stat === 'all') continue;
        if (!validStats.includes(stat as keyof Stats)) continue;
        const wasRestored = player.restoreStat(stat as keyof Stats);
        if (wasRestored) {
          anyRestored = true;
          const statName = STAT_NAMES[stat] ?? stat;
          messages.push(`You feel your ${statName} returning.`);
        }
      }

      if (!anyRestored) {
        messages.push('Your stats are already normal.');
      }
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
    };
  }
}
