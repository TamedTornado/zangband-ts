import { type Position, type Direction, movePosition } from '../types.ts';
import type { Level } from '../world/Level.ts';

export class Player {
  private _position: Position;

  constructor(position: Position) {
    this._position = { ...position };
  }

  get position(): Position {
    return { ...this._position };
  }

  tryMove(direction: Direction, level: Level): boolean {
    const newPos = movePosition(this._position, direction);
    if (!level.isWalkable(newPos)) {
      return false;
    }
    this._position = newPos;
    return true;
  }
}
