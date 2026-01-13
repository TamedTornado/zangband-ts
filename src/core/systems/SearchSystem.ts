/**
 * Search System
 *
 * Handles passive and active searching for hidden traps (and eventually secret doors).
 * Based on Zangband C implementation from cmd1.c and cmd2.c.
 *
 * Two skills work together:
 * - searching (SKILL_FOS): How often passive search triggers each turn
 * - perception (SKILL_SNS): Success chance when searching
 */

import { RNG } from 'rot-js';
import type { Player } from '@/core/entities/Player';
import type { ILevel } from '@/core/world/Level';

export interface SearchResult {
  searched: boolean;
  trapsFound: number;
  secretDoorsFound: number;
  messages: Array<{ text: string; type: 'info' | 'normal' }>;
}

/**
 * Check if passive search triggers this turn.
 *
 * Zangband C formula (cmd2.c:2027):
 *   if ((p_ptr->skills[SKILL_FOS] >= 50) || one_in_(50 - p_ptr->skills[SKILL_FOS]))
 *
 * - FOS >= 50: triggers every turn (100%)
 * - FOS < 50: 1-in-(50-FOS) chance per turn
 *   - FOS=2: 1/48 chance (~2%)
 *   - FOS=24: 1/26 chance (~4%)
 *   - FOS=49: 1/1 chance (100%)
 */
export function shouldTriggerPassiveSearch(searching: number, rng: typeof RNG): boolean {
  if (searching >= 50) return true;
  if (searching <= 0) return false;
  // one_in_(n) = 1/n chance = roll 1 to n, trigger on 1
  return rng.getUniformInt(1, 50 - searching) === 1;
}

/**
 * Get effective perception after status penalties.
 *
 * Zangband C formula (cmd1.c:513-514):
 *   if (p_ptr->tim.blind || no_lite()) chance = chance / 10;
 *   if (p_ptr->tim.confused || p_ptr->tim.image) chance = chance / 10;
 *
 * Penalties stack multiplicatively.
 */
function getEffectivePerception(player: Player): number {
  let perception = player.skills.perception;
  if (player.statuses.has('blind')) perception = Math.floor(perception / 10);
  if (player.statuses.has('confused')) perception = Math.floor(perception / 10);
  // Note: no_lite() and image (hallucination) not yet implemented
  return perception;
}

/**
 * Search 3x3 grid around player for hidden traps (and eventually secret doors).
 *
 * Zangband C formula (cmd1.c:517-591):
 *   For each cell in 3x3 grid around player:
 *     if (randint0(100) < chance)
 *       // Check for hidden traps, secret doors, trapped chests
 *
 * @param player - The player performing the search
 * @param level - The current level
 * @param rng - Random number generator
 * @returns Search result with count of traps found and messages
 */
export function search(player: Player, level: ILevel, rng: typeof RNG): SearchResult {
  const messages: SearchResult['messages'] = [];
  let trapsFound = 0;
  let secretDoorsFound = 0;
  const chance = getEffectivePerception(player);

  // Check 3x3 grid around player (Zangband C: cmd1.c:517-519)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const pos = { x: player.position.x + dx, y: player.position.y + dy };

      // Skip out of bounds
      if (!level.isInBounds(pos)) continue;

      // Roll for this cell: randint0(100) < chance (cmd1.c:522)
      if (rng.getUniformInt(0, 99) >= chance) continue;

      // Check for hidden trap (cmd1.c:537-552)
      const trap = level.getTrapAt(pos);
      if (trap && !trap.isRevealed) {
        trap.reveal();
        trapsFound++;
        messages.push({ text: 'You have found a trap.', type: 'info' });
      }

      // Check for secret door (cmd1.c:555-566)
      const tile = level.getTile(pos);
      if (tile?.terrain.flags?.includes('SECRET')) {
        // Convert secret door to closed door
        level.setTerrain(pos, 'door');
        secretDoorsFound++;
        messages.push({ text: 'You have found a secret door.', type: 'info' });
      }

      // TODO: Check for trapped chests when implemented (cmd1.c:568-589)
    }
  }

  return { searched: true, trapsFound, secretDoorsFound, messages };
}
