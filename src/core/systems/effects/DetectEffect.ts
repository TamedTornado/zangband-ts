/**
 * DetectEffect - Reveals things on the map
 *
 * Detect types:
 * - monsters: Reveal all monsters
 * - evil: Reveal evil monsters (monsters with EVIL flag)
 * - invisible: Reveal invisible monsters (monsters with INVISIBLE flag)
 * - undead: Reveal undead monsters (monsters with UNDEAD flag)
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
import type { Item } from '@/core/entities/Item';
import { DETECT_RADIUS } from '@/core/constants';

export type DetectType =
  | 'monsters'
  | 'evil'
  | 'invisible'
  | 'undead'
  | 'items'
  | 'treasure'
  | 'traps'
  | 'doors'
  | 'stairs'
  | 'all';

export interface DetectEffectDef extends GPEffectDef {
  type: 'detect';
  detectType: DetectType | DetectType[];
  radius?: number; // Default: entire level
}

interface DetectData {
  treasureCount?: number;
  evilCount?: number;
  invisibleCount?: number;
  undeadCount?: number;
  monsterCount?: number;
  itemCount?: number;
  trapCount?: number;
  doorCount?: number;
  stairCount?: number;
}

interface LevelInterface {
  getTile: (pos: { x: number; y: number }) => any;
  width: number;
  height: number;
  getMonsters: () => Monster[];
  getItemsAt?: (pos: { x: number; y: number }) => Item[];
  getAllItems?: () => Item[];
}

export class DetectEffect extends SelfGPEffect {
  readonly detectTypes: DetectType[];
  readonly radius: number | null;

  constructor(def: GPEffectDef) {
    super(def);
    const detectDef = def as DetectEffectDef;
    this.detectTypes = Array.isArray(detectDef.detectType)
      ? detectDef.detectType
      : [detectDef.detectType];
    this.radius = detectDef.radius ?? DETECT_RADIUS;
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level } = context;
    if (!actor || !level) {
      return { success: false, messages: ['No valid target.'], turnConsumed: false };
    }

    const messages: string[] = [];
    const pos = actor.position;
    const data: DetectData = {};

    for (const detectType of this.detectTypes) {
      const result = this.detectType(detectType, level as LevelInterface, pos, data);
      if (result) messages.push(result);
    }

    if (messages.length === 0) {
      messages.push('You sense nothing unusual.');
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      data,
    };
  }

  private detectType(
    detectType: DetectType,
    level: LevelInterface,
    playerPos: { x: number; y: number },
    data: DetectData
  ): string | null {
    switch (detectType) {
      case 'monsters': {
        const monsters = level.getMonsters();
        let found = 0;
        for (const monster of monsters) {
          if (monster.isDead) continue;
          if (this.inRange(monster.position, playerPos)) {
            // Remember monster appearance on the tile and mark as explored
            const tile = level.getTile(monster.position);
            if (tile) {
              tile.explored = true;
              tile.rememberMonster(monster.symbol, monster.color);
            }
            found++;
          }
        }
        data.monsterCount = found;
        return found > 0
          ? `You sense the presence of ${found} creature${found > 1 ? 's' : ''}.`
          : null;
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
        data.itemCount = found;
        return found > 0 ? `You sense the presence of objects.` : null;
      }

      case 'treasure': {
        // Scan for gold items
        let found = 0;
        if (level.getAllItems) {
          for (const item of level.getAllItems()) {
            if (!this.inRange(item.position, playerPos)) continue;
            const itemType = item.generated?.baseItem?.type ?? item.type;
            if (itemType === 'gold') {
              const tile = level.getTile(item.position);
              if (tile) {
                tile.explored = true;
                found++;
              }
            }
          }
        } else {
          // Fallback: scan tiles for gold
          for (let y = 0; y < level.height; y++) {
            for (let x = 0; x < level.width; x++) {
              if (!this.inRange({ x, y }, playerPos)) continue;
              const items = level.getItemsAt?.({ x, y }) ?? [];
              for (const item of items) {
                const itemType = item.generated?.baseItem?.type ?? item.type;
                if (itemType === 'gold') {
                  const tile = level.getTile({ x, y });
                  if (tile) {
                    tile.explored = true;
                    found++;
                  }
                }
              }
            }
          }
        }
        data.treasureCount = found;
        return found > 0 ? `You sense the presence of ${found} treasure pile${found > 1 ? 's' : ''}.` : null;
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
        data.trapCount = found;
        return found > 0
          ? `You sense the presence of ${found} trap${found > 1 ? 's' : ''}.`
          : null;
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
        data.doorCount = found;
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
        data.stairCount = found;
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

      case 'evil': {
        return this.detectMonstersByFlag(level, playerPos, 'EVIL', 'evil', data);
      }

      case 'invisible': {
        return this.detectMonstersByFlag(level, playerPos, 'INVISIBLE', 'invisible', data);
      }

      case 'undead': {
        return this.detectMonstersByFlag(level, playerPos, 'UNDEAD', 'undead', data);
      }

      default:
        return null;
    }
  }

  private detectMonstersByFlag(
    level: LevelInterface,
    playerPos: { x: number; y: number },
    flag: string,
    name: string,
    data: DetectData
  ): string | null {
    const monsters = level.getMonsters();
    let found = 0;

    for (const monster of monsters) {
      if (monster.isDead) continue;
      if (!this.inRange(monster.position, playerPos)) continue;

      // Check if monster has the flag
      const monsterFlags = monster.def?.flags ?? [];
      if (!monsterFlags.includes(flag)) continue;

      // Mark tile as explored and remember monster
      const tile = level.getTile(monster.position);
      if (tile) {
        tile.explored = true;
        tile.rememberMonster(monster.symbol, monster.color);
      }
      found++;
    }

    // Store count in data
    if (name === 'evil') data.evilCount = found;
    else if (name === 'invisible') data.invisibleCount = found;
    else if (name === 'undead') data.undeadCount = found;

    return found > 0
      ? `You sense the presence of ${found} ${name} creature${found > 1 ? 's' : ''}.`
      : null;
  }

  private inRange(
    pos: { x: number; y: number },
    center: { x: number; y: number }
  ): boolean {
    if (this.radius === null) return true;
    const dx = pos.x - center.x;
    const dy = pos.y - center.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }
}
