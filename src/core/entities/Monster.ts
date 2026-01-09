import { Actor, type ActorConfig } from './Actor';
import type { MonsterDef } from '@/core/data/monsters';
import type { Element } from '@/core/types';
import type { RNG } from 'rot-js';
import { getMonsterResistStatus, applyMonsterResistance } from '@/core/systems/Damage';

export interface MonsterConfig extends ActorConfig {
  /** Monster definition reference - provides flags, spells, etc. */
  def: MonsterDef;
}

export class Monster extends Actor {
  /** Monster definition - provides flags, spells, attacks, etc. */
  readonly def: MonsterDef;
  /** @deprecated Use def.key instead */
  readonly definitionKey: string;
  private _isAwake: boolean = false;
  private _isTamed: boolean = false;

  constructor(config: MonsterConfig) {
    super(config);
    this.def = config.def;
    this.definitionKey = config.def.key;
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

  get isTamed(): boolean {
    return this._isTamed;
  }

  tame(): void {
    this._isTamed = true;
  }

  /**
   * Check if this monster can be tamed.
   * UNIQUE monsters cannot be tamed.
   */
  canBeTamed(): boolean {
    return !this.def.flags.includes('UNIQUE');
  }

  /**
   * Check if this monster can receive a status effect.
   * Uses monster's definition flags for immunity checks.
   */
  override canReceiveStatus(statusId: string, _flags?: string[]): boolean {
    // Map status IDs to resistance flags
    const immunityMap: Record<string, string> = {
      confused: 'NO_CONF',
      afraid: 'NO_FEAR',
      sleeping: 'NO_SLEEP',
      stunned: 'NO_STUN',
      slow: 'NO_SLOW',
    };

    const immunityFlag = immunityMap[statusId];
    if (immunityFlag && this.def.flags.includes(immunityFlag)) {
      return false;
    }

    return true;
  }

  /**
   * Apply resistance to elemental damage using monster's flags.
   * Uses def.flags for immunity/resistance/vulnerability checks.
   */
  override resistDamage(
    element: Element,
    damage: number,
    rng: typeof RNG
  ): { damage: number; status: string } {
    const status = getMonsterResistStatus(this.def.flags, element);
    const finalDamage = applyMonsterResistance(damage, status, rng);
    return { damage: finalDamage, status };
  }
}
