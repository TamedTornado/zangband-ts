import type { Position } from '../types.ts';

export class Level {
  readonly width: number;
  readonly height: number;
  private blocked: Set<string>;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.blocked = new Set();
  }

  private key(pos: Position): string {
    return `${pos.x},${pos.y}`;
  }

  isInBounds(pos: Position): boolean {
    return pos.x >= 0 && pos.x < this.width && pos.y >= 0 && pos.y < this.height;
  }

  isWalkable(pos: Position): boolean {
    if (!this.isInBounds(pos)) {
      return false;
    }
    return !this.blocked.has(this.key(pos));
  }

  setWalkable(pos: Position, walkable: boolean): void {
    const k = this.key(pos);
    if (walkable) {
      this.blocked.delete(k);
    } else {
      this.blocked.add(k);
    }
  }
}
