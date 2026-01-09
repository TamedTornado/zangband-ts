/**
 * Monster awareness and detection system.
 * Based on Zangband's melee2.c awareness mechanics.
 */

import type { RNG } from 'rot-js';
import type { Position } from '../types';
import type { Monster } from '../entities/Monster';
import type { Player } from '../entities/Player';
import type { ILevel } from '../world/Level';
import { VIEW_RADIUS } from '../constants';

/**
 * Check if there's a clear line of sight between two positions.
 * Uses Bresenham's line algorithm to check for walls.
 * Returns false if distance exceeds VIEW_RADIUS.
 */
export function hasLineOfSight(from: Position, to: Position, level: ILevel): boolean {
  // Same position always has LOS
  if (from.x === to.x && from.y === to.y) {
    return true;
  }

  // Beyond view radius = no LOS
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  if (dx > VIEW_RADIUS || dy > VIEW_RADIUS) {
    return false;
  }

  // Bresenham's line algorithm
  let x0 = from.x;
  let y0 = from.y;
  const x1 = to.x;
  const y1 = to.y;
  // dx, dy already calculated above for distance check
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    // Check intermediate tiles (not start or end) for blocking terrain
    if ((x0 !== from.x || y0 !== from.y) && (x0 !== to.x || y0 !== to.y)) {
      // Use isTransparent which handles walls, closed doors, etc.
      if (!level.isTransparent({ x: x0, y: y0 })) {
        return false;
      }
    }

    // Reached destination
    if (x0 === x1 && y0 === y1) {
      break;
    }

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }

  return true;
}

/**
 * Calculate Euclidean distance between two positions.
 */
function getDistance(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check monster awareness and potentially wake them.
 * Based on Zangband's monster detection mechanics from melee2.c.
 *
 * Sleeping monsters wake gradually based on player noise and distance.
 * This allows stealthy players to sneak past or approach sleeping monsters.
 */
export function checkAwareness(
  monster: Monster,
  player: Player,
  _level: ILevel,
  rng: typeof RNG
): void {
  // Already awake - nothing to do
  if (monster.isAwake) {
    return;
  }

  const distance = getDistance(monster.position, player.position);

  // Noise-based gradual wake check
  // From Zangband: (notice^3) <= player_noise
  // notice is 0-1023, so notice^3 ranges from 0 to ~1 billion
  // player_noise with stealth 0 is 2^30 (~1 billion), stealth 30 is 1
  //
  // Note: The probability check is distance-independent (matches Zangband).
  // Only the wake AMOUNT is attenuated by distance, floored at 1.
  // This means distant monsters still "hear" you, they just wake more slowly.
  const notice = rng.getUniformInt(0, 1023);
  if (notice * notice * notice <= player.noise) {
    // Wake amount attenuated by distance, floored at 1
    // At distance >= 50: wakeAmount = 1
    // At distance < 50: wakeAmount = 100/distance (e.g., distance 5 = 20)
    let wakeAmount = 1;
    if (distance < 50) {
      wakeAmount = Math.floor(100 / Math.max(1, distance));
    }
    monster.reduceSleep(wakeAmount);
  }
}
