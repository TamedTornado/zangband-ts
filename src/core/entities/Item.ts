import { Entity, type EntityConfig } from './Entity';

export interface ItemConfig extends EntityConfig {
  name: string;
  itemType: string;
  quantity?: number;
}

export class Item extends Entity {
  readonly name: string;
  readonly itemType: string;
  quantity: number;

  constructor(config: ItemConfig) {
    super(config);
    this.name = config.name;
    this.itemType = config.itemType;
    this.quantity = config.quantity ?? 1;
  }
}
