import { Actor, type ActorConfig } from './Actor';

export interface MonsterConfig extends ActorConfig {
  definitionKey: string;
}

export class Monster extends Actor {
  readonly definitionKey: string;
  private _isAwake: boolean = false;

  constructor(config: MonsterConfig) {
    super(config);
    this.definitionKey = config.definitionKey;
  }

  get isAwake(): boolean {
    return this._isAwake;
  }

  wake(): void {
    this._isAwake = true;
  }

  sleep(): void {
    this._isAwake = false;
  }
}
