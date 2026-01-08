/**
 * DetectEffect - Reveals things on the map
 *
 * Detect types:
 * - monsters: Reveal all monsters
 * - evil: Reveal evil monsters
 * - invisible: Reveal invisible monsters
 * - items: Reveal items on floor
 * - treasure: Reveal gold/treasure
 * - traps: Reveal traps
 * - doors: Reveal doors
 * - stairs: Reveal stairs
 * - all: Enlightenment - reveal everything
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Monster } from '@/core/entities/Monster';
import { DETECT_RADIUS } from '@/core/constants';

export type DetectType =
  | 'monsters'
  | 'evil'
  | 'invisible'
  | 'items'
  | 'treasure'
  | 'traps'
  | 'doors'
  | 'stairs'
  | 'all';

export interface DetectEffectDef extends GPEffectDef {
  type: 'detect';
  detectType: DetectType | DetectType[];
  radius?: number;  // Default: entire level
}

export class DetectEffect extends SelfGPEffect {
  readonly detectTypes: DetectType[];
  readonly radius: number | null;

  constructor(def: GPEffectDef) {
    super(def);
    const detectDef = def as DetectEffectDef;
    this.detectTypes = Array.isArray(detectDef.detectType) ? detectDef.detectType : [detectDef.detectType];
    this.radius = detectDef.radius ?? DETECT_RADIUS;
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level } = context;
    if (!actor || !level) {
      return { success: false, messages: ['No valid target.'], turnConsumed: false };
    }

    const messages: string[] = [];
    const pos = actor.position;

    for (const detectType of this.detectTypes) {
      const msg = this.detectType(detectType, level, pos);
      if (msg) messages.push(msg);
    }

    if (messages.length === 0) {
      messages.push('You sense nothing unusual.');
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
    };
  }

  private detectType(
    detectType: DetectType,
    level: { getTile: (pos: { x: number; y: number }) => any; width: number; height: number; getMonsters: () => Monster[] },
    playerPos: { x: number; y: number }
  ): string | null {
    switch (detectType) {
      case 'monsters': {
        const monsters = level.getMonsters();
        let found = 0;
        for (const monster of monsters) {
          if (monster.isDead) continue;
          if (this.inRange(monster.position, playerPos)) {
            // Remember monster appearance on the tile
            const tile = level.getTile(monster.position);
            if (tile) {
              tile.rememberMonster(monster.symbol, monster.color);
            }
            found++;
          }
        }
        return found > 0 ? `You sense the presence of ${found} creature${found > 1 ? 's' : ''}.` : null;
      }

      case 'items': {
        let found = 0;
        for (let y = 0; y < level.height; y++) {
          for (let x = 0; x < level.width; x++) {
            if (!this.inRange({ x, y }, playerPos)) continue;
            const tile = level.getTile({ x, y });
            if (tile?.explored === false && tile?.items?.length > 0) {
              tile.explored = true;
              found++;
            }
          }
        }
        return found > 0 ? `You sense the presence of objects.` : null;
      }

      case 'treasure': {
        // For now, same as items
        return 'You sense the presence of treasure.';
      }

      case 'traps': {
        let found = 0;
        for (let y = 0; y < level.height; y++) {
          for (let x = 0; x < level.width; x++) {
            if (!this.inRange({ x, y }, playerPos)) continue;
            const tile = level.getTile({ x, y });
            if (tile?.terrain?.flags?.includes('TRAP')) {
              tile.explored = true;
              found++;
            }
          }
        }
        return found > 0 ? `You sense the presence of ${found} trap${found > 1 ? 's' : ''}.` : null;
      }

      case 'doors': {
        let found = 0;
        for (let y = 0; y < level.height; y++) {
          for (let x = 0; x < level.width; x++) {
            if (!this.inRange({ x, y }, playerPos)) continue;
            const tile = level.getTile({ x, y });
            if (tile?.terrain?.flags?.includes('DOOR')) {
              tile.explored = true;
              found++;
            }
          }
        }
        return found > 0 ? `You sense the presence of doors.` : null;
      }

      case 'stairs': {
        let found = 0;
        for (let y = 0; y < level.height; y++) {
          for (let x = 0; x < level.width; x++) {
            if (!this.inRange({ x, y }, playerPos)) continue;
            const tile = level.getTile({ x, y });
            if (tile?.terrain?.flags?.includes('STAIR')) {
              tile.explored = true;
              found++;
            }
          }
        }
        return found > 0 ? 'You sense the presence of stairs.' : null;
      }

      case 'all': {
        // Enlightenment - reveal entire map
        for (let y = 0; y < level.height; y++) {
          for (let x = 0; x < level.width; x++) {
            const tile = level.getTile({ x, y });
            if (tile) tile.explored = true;
          }
        }
        return 'An image of your surroundings forms in your mind.';
      }

      case 'evil':
      case 'invisible':
        // Would need monster flags to implement properly
        return `You sense the presence of ${detectType} creatures.`;

      default:
        return null;
    }
  }

  private inRange(pos: { x: number; y: number }, center: { x: number; y: number }): boolean {
    if (this.radius === null) return true;
    const dx = pos.x - center.x;
    const dy = pos.y - center.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }
}
