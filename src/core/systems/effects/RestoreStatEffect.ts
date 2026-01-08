/**
 * RestoreStatEffect - Restores drained stats
 *
 * Used by: Staff of Restoration, Rod of Restoration
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';

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

    // For now, stats aren't drainable in the current implementation
    // This effect would restore drained stats back to their base values
    // When stat draining is implemented, this will be functional

    if (this.stats.includes('all')) {
      messages.push('You feel your stats returning to normal.');
    } else {
      for (const stat of this.stats) {
        const statName = STAT_NAMES[stat] ?? stat;
        messages.push(`You feel your ${statName} returning.`);
      }
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
    };
  }
}
