import type { Player } from '../entities/Player';
import type { ILevel } from './Level';

export class GameWorld {
  private _player: Player;
  private _currentLevel: ILevel;
  private _turn: number = 0;

  constructor(player: Player, initialLevel: ILevel) {
    this._player = player;
    this._currentLevel = initialLevel;
    // Set level.player so the player is in the level's actors list
    // This is required for getActorAt() to find the player
    this._currentLevel.player = player;
  }

  get player(): Player {
    return this._player;
  }

  get currentLevel(): ILevel {
    return this._currentLevel;
  }

  get turn(): number {
    return this._turn;
  }

  advanceTurn(): void {
    this._turn++;
  }

  changeLevel(level: ILevel): void {
    this._currentLevel = level;
    // Ensure the new level has the player reference
    this._currentLevel.player = this._player;
  }
}
