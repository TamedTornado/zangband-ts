/**
 * Vision System
 *
 * Handles visibility calculations including:
 * - Light radius from equipment
 * - Infravision
 * - Telepathy
 * - See invisible
 * - Monster visibility checks
 *
 * Based on Zangband's xtra1.c (calc_torch) and monster2.c (update_mon)
 */

import { FOV } from 'rot-js';
import type { Position } from '@/core/types';

/** Maximum sight distance */
const MAX_SIGHT = 16;

/** Equipment item for vision calculations */
export interface VisionEquipment {
  type: 'torch' | 'lantern' | 'artifact_light' | 'glowing_item' | 'ring' | 'helm' | 'other';
  hasFuel?: boolean;
  infravisionBonus?: number;
}

/** Configuration for vision calculations */
export interface VisionConfig {
  equipment?: VisionEquipment[];
  raceInfravision?: number;
  timedInfravision?: boolean;
  intrinsicLight?: boolean;
  isBlind?: boolean;
  telepathy?: boolean;
  seeInvisible?: boolean;
}

/** Monster flags relevant to visibility */
export interface MonsterVisibilityFlags {
  invisible?: boolean;
  coldBlooded?: boolean;
  emptyMind?: boolean;
  weirdMind?: boolean;
  glows?: boolean;
}

/** Monster for visibility checks */
export interface VisibleMonster {
  position: Position;
  flags: MonsterVisibilityFlags;
  id: number;
}

/** Result of monster visibility check */
export interface MonsterVisibility {
  visible: boolean;
  method?: 'normal' | 'infravision' | 'telepathy';
}

/** Level interface for vision calculations */
export interface VisionLevel {
  isInBounds(pos: Position): boolean;
  isTransparent(pos: Position): boolean;
  isLit(pos: Position): boolean;
}

export class VisionSystem {
  /**
   * Calculate light radius from equipment
   * Based on calc_torch() in xtra1.c
   */
  getLightRadius(config: VisionConfig): number {
    if (config.isBlind) {
      return 0;
    }

    let light = 0;

    // Calculate light from equipment
    if (config.equipment) {
      for (const item of config.equipment) {
        switch (item.type) {
          case 'artifact_light':
            light += 3;
            break;
          case 'lantern':
            if (item.hasFuel) {
              light += 2;
            }
            break;
          case 'torch':
            if (item.hasFuel) {
              light += 1;
            }
            break;
          case 'glowing_item':
            light += 1;
            break;
        }
      }
    }

    // Intrinsic light provides minimum 1 if no other light
    if (light === 0 && config.intrinsicLight) {
      light = 1;
    }

    return light;
  }

  /**
   * Calculate infravision range
   * Based on bonuses in xtra1.c
   */
  getInfravision(config: VisionConfig): number {
    let infra = config.raceInfravision ?? 0;

    // Add equipment bonuses
    if (config.equipment) {
      for (const item of config.equipment) {
        if (item.infravisionBonus) {
          infra += item.infravisionBonus;
        }
      }
    }

    // Temporary infravision boost
    if (config.timedInfravision) {
      infra += 1;
    }

    return infra;
  }

  /**
   * Calculate Euclidean distance between two points
   * Based on distance() in cave.c
   */
  distance(a: Position, b: Position): number {
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);

    if (dx === 0) return dy;
    if (dy === 0) return dx;

    // Euclidean distance
    return Math.round(Math.sqrt(dx * dx + dy * dy));
  }

  /**
   * Check if there's line of sight between two points
   */
  hasLOS(origin: Position, target: Position, level: VisionLevel): boolean {
    // Use Bresenham's line algorithm
    let x0 = origin.x;
    let y0 = origin.y;
    const x1 = target.x;
    const y1 = target.y;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      // Don't check origin or destination
      if ((x0 !== origin.x || y0 !== origin.y) && (x0 !== target.x || y0 !== target.y)) {
        if (!level.isTransparent({ x: x0, y: y0 })) {
          return false;
        }
      }

      if (x0 === x1 && y0 === y1) break;

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
   * Check if a monster is visible to the player
   * Based on update_mon() in monster2.c
   */
  canSeeMonster(
    playerPos: Position,
    monster: VisibleMonster,
    level: VisionLevel,
    config: VisionConfig
  ): MonsterVisibility {
    const dist = this.distance(playerPos, monster.position);

    // Too far to see anything
    if (dist > MAX_SIGHT) {
      return { visible: false };
    }

    // Check telepathy first (works through walls)
    if (config.telepathy) {
      // Empty mind blocks telepathy
      if (monster.flags.emptyMind) {
        // Can't detect via telepathy
      }
      // Weird mind only 10% detectable
      else if (monster.flags.weirdMind) {
        if (monster.id % 10 === 5) {
          return { visible: true, method: 'telepathy' };
        }
      }
      // Normal mind - detectable
      else {
        return { visible: true, method: 'telepathy' };
      }
    }

    // Need LOS for other detection methods
    if (!this.hasLOS(playerPos, monster.position, level)) {
      return { visible: false };
    }

    // Check infravision for warm-blooded monsters
    const infra = this.getInfravision(config);
    if (infra > 0 && dist <= infra) {
      if (!monster.flags.coldBlooded) {
        return { visible: true, method: 'infravision' };
      }
    }

    // Check if tile is illuminated (player light, level lighting, or monster glow)
    const isIlluminated = level.isLit(monster.position) || monster.flags.glows;

    if (isIlluminated) {
      // Invisible monsters need see_invis
      if (monster.flags.invisible) {
        if (config.seeInvisible) {
          return { visible: true, method: 'normal' };
        }
        return { visible: false };
      }

      // Normal visible monster
      return { visible: true, method: 'normal' };
    }

    return { visible: false };
  }

  /**
   * Compute FOV from a position
   */
  computeFOV(level: VisionLevel, origin: Position, config: VisionConfig): Set<string> {
    const visible = new Set<string>();
    const radius = this.getLightRadius(config);

    // Always see origin
    visible.add(`${origin.x},${origin.y}`);

    // With no light, can only see self (unless other conditions apply)
    if (radius === 0) {
      return visible;
    }

    const fov = new FOV.PreciseShadowcasting((x, y) => {
      return level.isTransparent({ x, y });
    });

    fov.compute(origin.x, origin.y, radius, (x, y, _r, _visibility) => {
      if (level.isInBounds({ x, y })) {
        visible.add(`${x},${y}`);
      }
    });

    return visible;
  }

  /**
   * Compute FOV and mark tiles as explored
   */
  computeAndMarkExplored(
    level: VisionLevel,
    origin: Position,
    config: VisionConfig,
    explored: Set<string>
  ): Set<string> {
    const visible = this.computeFOV(level, origin, config);

    for (const key of visible) {
      explored.add(key);
    }

    return visible;
  }
}
