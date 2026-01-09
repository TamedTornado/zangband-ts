import { Actor, type ActorConfig } from './Actor';
import type { MonsterDef } from '@/core/data/monsters';
import type { Element, Position } from '@/core/types';
import { RNG } from 'rot-js';
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
  private _sleepCounter: number;
  private _isTamed: boolean = false;
  private _lastKnownPlayerPos: Position | null = null;

  constructor(config: MonsterConfig) {
    super(config);
    this.def = config.def;
    this.definitionKey = config.def.key;

    // Initialize sleep counter based on alertness
    // NO_SLEEP monsters are always awake
    // Higher alertness = lower sleep counter (more alert = lighter sleeper)
    // alertness 0 = instant wake, alertness 255 = deep sleep
    const alertness = config.def.alertness ?? 0;
    if (config.def.flags.includes('NO_SLEEP') || alertness === 0) {
      this._sleepCounter = 0;
    } else {
      // Sleep counter in range [alertness, alertness * 3]
      this._sleepCounter = RNG.getUniformInt(alertness, alertness * 3);
    }
  }

  /** Current sleep counter - 0 means awake */
  get sleepCounter(): number {
    return this._sleepCounter;
  }

  /** Monster is awake when sleep counter is 0 */
  get isAwake(): boolean {
    return this._sleepCounter === 0;
  }

  /** Wake the monster immediately */
  wake(): void {
    this._sleepCounter = 0;
  }

  /** Taking damage wakes the monster */
  override takeDamage(amount: number): void {
    super.takeDamage(amount);
    this.wake();
  }

  /** Reduce sleep counter by amount (gradual wake) */
  reduceSleep(amount: number): void {
    this._sleepCounter = Math.max(0, this._sleepCounter - amount);
  }

  /** Put the monster to sleep with a new sleep counter */
  sleep(): void {
    const alertness = this.def.alertness ?? 0;
    if (!this.def.flags.includes('NO_SLEEP') && alertness > 0) {
      this._sleepCounter = RNG.getUniformInt(alertness, alertness * 3);
    }
  }

  get isTamed(): boolean {
    return this._isTamed;
  }

  tame(): void {
    this._isTamed = true;
  }

  /** Last position where monster saw the player (null = never seen) */
  get lastKnownPlayerPos(): Position | null {
    return this._lastKnownPlayerPos;
  }

  /** Update monster's memory of player location */
  updatePlayerLocation(pos: Position): void {
    this._lastKnownPlayerPos = { x: pos.x, y: pos.y };
  }

  /** Clear memory when monster reaches last known position and player isn't there */
  clearPlayerLocation(): void {
    this._lastKnownPlayerPos = null;
  }

  /**
   * Check if this monster can be tamed.
   * UNIQUE monsters cannot be tamed.
   */
  canBeTamed(): boolean {
    return !this.def.flags.includes('UNIQUE');
  }

  /**
   * Get health description based on HP percentage.
   * Returns null if unhurt, otherwise "wounded", "badly wounded", etc.
   * Non-living monsters use "damaged" terminology.
   */
  get healthDesc(): string | null {
    const pct = (this.hp / this.maxHp) * 100;
    const isNonLiving = this.def.flags.includes('NONLIVING') || this.def.flags.includes('UNDEAD');

    if (pct >= 100) return null;
    if (pct >= 60) return isNonLiving ? 'somewhat damaged' : 'somewhat wounded';
    if (pct >= 25) return isNonLiving ? 'damaged' : 'wounded';
    if (pct >= 10) return isNonLiving ? 'badly damaged' : 'badly wounded';
    return isNonLiving ? 'almost destroyed' : 'almost dead';
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
