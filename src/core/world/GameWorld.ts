import type { Player } from '../entities/Player';
import type { Level } from './Level';

export class GameWorld {
  private _player: Player;
  private _currentLevel: Level;
  private _turn: number = 0;

  constructor(player: Player, initialLevel: Level) {
    this._player = player;
    this._currentLevel = initialLevel;
  }

  get player(): Player {
    return this._player;
  }

  get currentLevel(): Level {
    return this._currentLevel;
  }

  get turn(): number {
    return this._turn;
  }

  advanceTurn(): void {
    this._turn++;
  }

  changeLevel(level: Level): void {
    this._currentLevel = level;
  }
}
