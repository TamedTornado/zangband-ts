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

  /**
   * Check if this monster can receive a status effect.
   * Checks monster flags for immunity.
   */
  override canReceiveStatus(statusId: string, flags?: string[]): boolean {
    if (!flags) return true;

    // Map status IDs to resistance flags
    const immunityMap: Record<string, string> = {
      confused: 'NO_CONF',
      afraid: 'NO_FEAR',
      sleeping: 'NO_SLEEP',
      stunned: 'NO_STUN',
      slow: 'NO_SLOW',
    };

    const immunityFlag = immunityMap[statusId];
    if (immunityFlag && flags.includes(immunityFlag)) {
      return false;
    }

    return true;
  }
}
