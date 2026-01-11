/**
 * Item Spawner
 *
 * Handles spawning items into the dungeon level.
 * Uses ItemGeneration for item creation and places
 * items on valid floor tiles.
 */

import { RNG } from 'rot-js';
import { Item } from '@/core/entities/Item';
import type { ILevel } from '@/core/world/Level';
import type { Position } from '@/core/types';
import type { ItemGeneration, GeneratedItem } from './ItemGeneration';

let itemIdCounter = 0;

function generateItemId(): string {
  return `item_${++itemIdCounter}`;
}

export class ItemSpawner {
  private itemGen: ItemGeneration;
  private rng: typeof RNG;

  constructor(itemGen: ItemGeneration, rng: typeof RNG = RNG) {
    this.itemGen = itemGen;
    this.rng = rng;
  }

  /**
   * Spawn a specific item by key at a position
   */
  spawnItem(level: ILevel, pos: Position, itemKey: string): Item | null {
    const itemDef = this.itemGen.getItemDef(itemKey);
    if (!itemDef) return null;

    // Check position is valid (walkable, unlike monsters can stack)
    if (!level.isWalkable(pos)) {
      return null;
    }

    // Create a simple generated item from the definition
    const generated: GeneratedItem = {
      baseItem: itemDef,
      toHit: itemDef.toHit,
      toDam: itemDef.toDam,
      toAc: itemDef.toAc,
      pval: itemDef.pval,
      flags: [...itemDef.flags],
      cost: itemDef.cost,
    };

    const item = this.createItem(generated, pos);
    level.addItem(item);

    return item;
  }

  /**
   * Spawn a random depth-appropriate item at a position
   */
  spawnRandomItem(level: ILevel, pos: Position, depth: number, deltaLevel: number = 0): Item | null {
    // Check position is valid
    if (!level.isWalkable(pos)) {
      return null;
    }

    const generated = this.itemGen.generateItem(depth, deltaLevel);
    if (!generated) return null;

    const item = this.createItem(generated, pos);
    level.addItem(item);

    return item;
  }

  /**
   * Spawn multiple items throughout the level
   */
  spawnItemsForLevel(level: ILevel, depth: number, count: number): number {
    let spawned = 0;
    let attempts = 0;
    const maxAttempts = count * 100;

    while (spawned < count && attempts < maxAttempts) {
      attempts++;

      // Find a random floor position
      const pos = this.findRandomFloorPosition(level);
      if (!pos) continue;

      const item = this.spawnRandomItem(level, pos, depth);
      if (item) {
        spawned++;
      }
    }

    return spawned;
  }

  /**
   * Find a random walkable position
   */
  private findRandomFloorPosition(level: ILevel): Position | null {
    const maxAttempts = 1000;

    for (let i = 0; i < maxAttempts; i++) {
      const x = this.rng.getUniformInt(1, level.width - 2);
      const y = this.rng.getUniformInt(1, level.height - 2);
      const pos = { x, y };

      if (level.isWalkable(pos)) {
        return pos;
      }
    }

    return null;
  }

  /**
   * Create an Item instance from generated item data
   */
  private createItem(generated: GeneratedItem, pos: Position): Item {
    const baseItem = generated.baseItem;

    return new Item({
      id: generateItemId(),
      position: pos,
      symbol: baseItem.symbol,
      color: baseItem.color,
      generated,
    });
  }
}
