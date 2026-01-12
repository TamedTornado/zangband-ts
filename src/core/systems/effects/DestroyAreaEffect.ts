/**
 * DestroyAreaEffect - Massive destruction of an area
 *
 * From Zangband's destroy_area() which:
 * - Kills all non-unique monsters in radius (not just damage)
 * - Deletes all objects in the area
 * - Removes light from the area
 * - Converts all terrain to floor/rubble
 *
 * More destructive than earthquake - used by powerful chaos/death spells.
 *
 * Example: { type: "destroyArea", radius: 15 }
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Monster } from '@/core/entities/Monster';

export interface DestroyAreaEffectDef extends GPEffectDef {
  type: 'destroyArea';
  radius?: number;
}

export class DestroyAreaEffect extends SelfGPEffect {
  readonly radius: number;

  constructor(def: GPEffectDef) {
    super(def);
    const typed = def as DestroyAreaEffectDef;
    this.radius = typed.radius ?? 15;
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng } = context;
    const center = actor.position;
    const messages: string[] = [];

    messages.push('There is a searing blast of light!');
    messages.push('The dungeon collapses around you!');

    let monstersKilled = 0;
    let objectsDestroyed = 0;
    let tilesDestroyed = 0;

    // Process each tile in radius
    for (let dx = -this.radius; dx <= this.radius; dx++) {
      for (let dy = -this.radius; dy <= this.radius; dy++) {
        const pos = { x: center.x + dx, y: center.y + dy };

        // Skip center (player's position)
        if (dx === 0 && dy === 0) continue;

        // Check circular distance
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this.radius) continue;

        const tile = level.getTile(pos);
        if (!tile) continue;

        const terrain = tile.terrain;

        // Skip permanent walls
        if (terrain.flags?.includes('PERMANENT')) continue;

        // Kill monsters (not just damage - outright kill non-uniques)
        const monster = level.getMonsterAt?.(pos) as Monster | undefined;
        if (monster && !monster.isDead) {
          // Check if unique (don't kill uniques, teleport them instead)
          const isUnique = monster.def?.flags?.includes('UNIQUE');
          if (isUnique) {
            // Teleport unique away
            if (level.teleportMonster) {
              level.teleportMonster(monster, this.radius * 2);
              messages.push(`${monster.def?.name ?? 'A creature'} is teleported away!`);
            }
          } else {
            // Kill non-unique monsters outright
            monster.takeDamage(monster.hp + 100);
            monstersKilled++;
          }
        }

        // Delete objects at this position
        if (level.removeItemsAt) {
          const removed = level.removeItemsAt(pos);
          objectsDestroyed += removed;
        }

        // Remove light from tile
        if (level.setTileLit) {
          level.setTileLit(pos, false);
        }

        // Destroy terrain - convert to floor or rubble
        if (terrain.flags?.includes('BLOCK') || terrain.flags?.includes('WALL')) {
          // Walls become floor
          level.setTerrain(pos, 'floor');
          tilesDestroyed++;
        } else if (!terrain.flags?.includes('PERMANENT')) {
          // Small chance for floor to become rubble
          if (rng.getUniform() < 0.1) {
            level.setTerrain(pos, 'rubble');
          }
        }
      }
    }

    if (monstersKilled > 0) {
      messages.push(`${monstersKilled} creature${monstersKilled > 1 ? 's are' : ' is'} destroyed!`);
    }

    if (objectsDestroyed > 0) {
      messages.push(`${objectsDestroyed} object${objectsDestroyed > 1 ? 's are' : ' is'} destroyed!`);
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      data: {
        monstersKilled,
        objectsDestroyed,
        tilesDestroyed,
      },
    };
  }
}
