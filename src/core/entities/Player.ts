import { Actor } from './Actor';
import type { Item } from './Item';
import type { Level } from '../world/Level';
import { type Position, type Direction, movePosition } from '../types';

export interface Stats {
  str: number;
  int: number;
  wis: number;
  dex: number;
  con: number;
  chr: number;
}

export interface PlayerConfig {
  id: string;
  position: Position;
  maxHp: number;
  speed: number;
  stats: Stats;
}

export class Player extends Actor {
  readonly stats: Stats;
  private _inventory: Item[] = [];
  private _knownSpells: string[] = [];

  constructor(config: PlayerConfig) {
    super({
      id: config.id,
      position: config.position,
      symbol: '@',
      color: '#fff',
      maxHp: config.maxHp,
      speed: config.speed,
    });
    this.stats = { ...config.stats };
  }

  get inventory(): Item[] {
    return [...this._inventory];
  }

  get knownSpells(): string[] {
    return [...this._knownSpells];
  }

  addItem(item: Item): void {
    this._inventory.push(item);
  }

  removeItem(itemId: string): Item | undefined {
    const idx = this._inventory.findIndex(i => i.id === itemId);
    if (idx >= 0) {
      return this._inventory.splice(idx, 1)[0];
    }
    return undefined;
  }

  learnSpell(spellId: string): void {
    if (!this._knownSpells.includes(spellId)) {
      this._knownSpells.push(spellId);
    }
  }

  tryMove(direction: Direction, level: Level): boolean {
    const newPos = movePosition(this.position, direction);
    if (!level.isWalkable(newPos)) {
      return false;
    }
    this.position = newPos;
    return true;
  }
}
