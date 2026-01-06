import type { Position } from '../types';

export interface EntityConfig {
  id: string;
  position: Position;
  symbol: string;
  color: string;
}

export class Entity {
  readonly id: string;
  private _position: Position;
  readonly symbol: string;
  readonly color: string;

  constructor(config: EntityConfig) {
    this.id = config.id;
    this._position = { ...config.position };
    this.symbol = config.symbol;
    this.color = config.color;
  }

  get position(): Position {
    return { ...this._position };
  }

  set position(pos: Position) {
    this._position = { ...pos };
  }
}
