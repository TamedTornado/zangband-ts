/**
 * TickSystem - Handles all per-turn time-based effects
 *
 * Centralizes ticking logic for:
 * - Rod timeout recharging
 * - Status effect durations
 * - Light source fuel (future)
 * - Hunger/food clock (future)
 */

import { RNG } from 'rot-js';
import type { Player } from '../entities/Player';

export interface TickResult {
  messages: string[];
}

export class TickSystem {
  /**
   * Process one turn's worth of time-based effects
   */
  tick(player: Player, rng: typeof RNG = RNG): TickResult {
    const messages: string[] = [];

    // Tick rod timeouts
    this.tickRods(player);

    // Tick mana regeneration
    this.tickMana(player);

    // Tick status effects
    const statusMessages = player.statuses.tick(player, rng);
    messages.push(...statusMessages);

    return { messages };
  }

  /**
   * Tick rod timeout counters - rods recharge over time
   */
  private tickRods(player: Player): void {
    for (const item of player.inventory) {
      if (item.isRod) {
        item.tickTimeout();
      }
    }
  }

  /**
   * Tick mana regeneration for spellcasters
   */
  private tickMana(player: Player): void {
    player.regenerateMana();
  }
}
