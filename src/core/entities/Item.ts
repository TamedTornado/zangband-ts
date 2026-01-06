import { Entity, type EntityConfig } from './Entity';
import type { GeneratedItem } from '../systems/ItemGeneration';

export interface ItemConfig extends EntityConfig {
  name: string;
  itemType: string;
  quantity?: number;
  generated?: GeneratedItem;
}

export class Item extends Entity {
  readonly name: string;
  readonly itemType: string;
  quantity: number;
  readonly generated: GeneratedItem | undefined;

  constructor(config: ItemConfig) {
    super(config);
    this.name = config.name;
    this.itemType = config.itemType;
    this.quantity = config.quantity ?? 1;
    this.generated = config.generated;
  }

  /** Get the item's base key if from generation */
  get baseKey(): string | undefined {
    return this.generated?.baseItem.key;
  }

  /** Get the item's damage dice string */
  get damage(): string {
    return this.generated?.baseItem.damage ?? '0d0';
  }

  /** Get the item's to-hit bonus */
  get toHit(): number {
    return this.generated?.toHit ?? 0;
  }

  /** Get the item's to-damage bonus */
  get toDam(): number {
    return this.generated?.toDam ?? 0;
  }

  /** Get the item's AC bonus */
  get toAc(): number {
    return this.generated?.toAc ?? 0;
  }

  /** Get the item's base AC */
  get baseAc(): number {
    return this.generated?.baseItem.baseAc ?? 0;
  }

  /** Check if item has a specific flag */
  hasFlag(flag: string): boolean {
    return this.generated?.flags.includes(flag) ?? false;
  }
}
