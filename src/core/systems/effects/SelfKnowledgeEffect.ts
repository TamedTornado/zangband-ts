/**
 * SelfKnowledgeEffect - Reveal detailed information about the player
 *
 * Provides comprehensive information about the player's current state:
 * - Health and life rating
 * - Stats (STR, INT, WIS, DEX, CON, CHR)
 * - Speed
 * - Active status effects
 * - Equipment abilities (if available)
 *
 * Based on Zangband's self_knowledge() function.
 *
 * Used by: Self Knowledge (sorcery realm)
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Player } from '@/core/entities/Player';

export interface SelfKnowledgeEffectDef extends GPEffectDef {
  type: 'selfKnowledge';
}

interface SelfKnowledgeData {
  type: 'selfKnowledge';
  hp: { current: number; max: number };
  speed: number;
  stats: Record<string, number>;
  statuses: string[];
  abilities: string[];
}

export class SelfKnowledgeEffect extends SelfGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor } = context;

    // Check if actor is a Player
    if (!('stats' in actor)) {
      return {
        success: false,
        messages: ['Only players can gain self knowledge.'],
        turnConsumed: false,
      };
    }

    const player = actor as Player;
    const messages: string[] = [];
    const abilities: string[] = [];
    const statuses: string[] = [];

    // Header
    messages.push('=== Self Knowledge ===');

    // HP info
    const hpPercent = Math.round((player.hp / player.maxHp) * 100);
    messages.push(`Your current HP: ${player.hp}/${player.maxHp} (${hpPercent}%)`);

    // Speed info
    const speedMod = player.speed - 110;
    if (speedMod > 0) {
      messages.push(`Speed: +${speedMod} (Fast)`);
    } else if (speedMod < 0) {
      messages.push(`Speed: ${speedMod} (Slow)`);
    } else {
      messages.push(`Speed: Normal`);
    }

    // Stats info
    messages.push('--- Stats ---');
    const stats = player.stats;
    messages.push(`STR: ${stats.str}  INT: ${stats.int}  WIS: ${stats.wis}`);
    messages.push(`DEX: ${stats.dex}  CON: ${stats.con}  CHR: ${stats.chr}`);

    // Active statuses
    const activeStatuses = player.statuses.getAll();
    if (activeStatuses.length > 0) {
      messages.push('--- Active Effects ---');
      for (const status of activeStatuses) {
        const statusId = status.id;
        statuses.push(statusId);

        // Format status messages based on type
        switch (statusId) {
          case 'blessed':
            messages.push(`You feel righteous.`);
            break;
          case 'heroism':
            messages.push(`You feel heroic.`);
            break;
          case 'berserk':
            messages.push(`You are in a battle rage.`);
            break;
          case 'haste':
            messages.push(`You are moving faster.`);
            break;
          case 'slow':
            messages.push(`You are moving slowly.`);
            break;
          case 'blind':
            messages.push(`You cannot see.`);
            break;
          case 'confused':
            messages.push(`You are confused.`);
            break;
          case 'afraid':
            messages.push(`You are terrified.`);
            break;
          case 'poisoned':
            messages.push(`You are poisoned.`);
            break;
          case 'stunned':
            messages.push(`You are stunned.`);
            break;
          case 'protevil':
            messages.push(`You are protected from evil.`);
            break;
          case 'telepathy':
            messages.push(`You can sense minds.`);
            break;
          case 'seeInvisible':
            messages.push(`You can see invisible creatures.`);
            break;
          case 'invulnerable':
            messages.push(`You are invulnerable.`);
            break;
          case 'resistFire':
            messages.push(`You resist fire.`);
            break;
          case 'resistCold':
            messages.push(`You resist cold.`);
            break;
          case 'resistElec':
            messages.push(`You resist electricity.`);
            break;
          case 'resistAcid':
            messages.push(`You resist acid.`);
            break;
          case 'resistPois':
            messages.push(`You resist poison.`);
            break;
          default:
            // Generic status message
            const formattedName = statusId.replace(/([A-Z])/g, ' $1').trim();
            messages.push(`You have ${formattedName}.`);
        }
      }
    } else {
      messages.push('--- No Active Effects ---');
    }

    // Build the knowledge data for UI
    const knowledgeData: SelfKnowledgeData = {
      type: 'selfKnowledge',
      hp: { current: player.hp, max: player.maxHp },
      speed: player.speed,
      stats: { ...stats },
      statuses,
      abilities,
    };

    return {
      success: true,
      messages,
      turnConsumed: true,
      data: knowledgeData,
    };
  }
}
