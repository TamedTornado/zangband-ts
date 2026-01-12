/**
 * RestoreStatsEffect - Restores all drained stats at once
 *
 * Used by: Restoration (life)
 *
 * Unlike RestoreStatEffect which can restore individual stats,
 * this effect restores ALL drained stats simultaneously.
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Player, Stats } from '@/core/entities/Player';

export interface RestoreStatsEffectDef extends GPEffectDef {
  type: 'restoreStats';
}

const STAT_NAMES: Record<keyof Stats, string> = {
  str: 'strength',
  int: 'intelligence',
  wis: 'wisdom',
  dex: 'dexterity',
  con: 'constitution',
  chr: 'charisma',
};

export class RestoreStatsEffect extends SelfGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor } = context;

    // Only players have stats to restore
    if (!('restoreAllStats' in actor)) {
      return {
        success: false,
        messages: ['This effect only works on the player.'],
        turnConsumed: false,
      };
    }

    const player = actor as Player;
    const restoredStats = player.restoreAllStats();

    if (restoredStats.length === 0) {
      return {
        success: true,
        messages: ['Your stats are already normal.'],
        turnConsumed: true,
      };
    }

    // Build message listing restored stats
    const statNames = restoredStats.map(s => STAT_NAMES[s]);
    const messages: string[] = [];

    if (restoredStats.length === 6) {
      messages.push('You feel your stats returning to normal.');
    } else {
      messages.push(`You feel your ${statNames.join(', ')} returning to normal.`);
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
    };
  }
}
