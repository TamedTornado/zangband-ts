import { Entity, type EntityConfig } from './Entity';
import { StatusManager } from '@/core/systems/status';

export interface ActorConfig extends EntityConfig {
  maxHp: number;
  speed: number;
}

export class Actor extends Entity {
  readonly baseMaxHp: number;
  private _hp: number;
  readonly baseSpeed: number;
  private _energy: number;
  readonly statuses: StatusManager;

  constructor(config: ActorConfig) {
    super(config);
    this.baseMaxHp = config.maxHp;
    this._hp = config.maxHp;
    this.baseSpeed = config.speed;
    this._energy = 0;
    this.statuses = new StatusManager();
  }

  /** Effective max HP including status modifiers */
  get maxHp(): number {
    return this.baseMaxHp + this.statuses.getModifier('maxHp');
  }

  /** Effective speed including status modifiers */
  get speed(): number {
    return this.baseSpeed + this.statuses.getModifier('speed');
  }

  get hp(): number {
    return this._hp;
  }

  set hp(value: number) {
    this._hp = Math.max(0, Math.min(value, this.maxHp));
  }

  get isDead(): boolean {
    return this._hp <= 0;
  }

  get energy(): number {
    return this._energy;
  }

  get canAct(): boolean {
    return this._energy >= 100;
  }

  gainEnergy(): void {
    this._energy += this.speed;
  }

  spendEnergy(amount: number): void {
    this._energy -= amount;
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
  }

  heal(amount: number): void {
    this.hp += amount;
  }

  /**
   * Check if this actor can receive a status effect.
   * Override in subclasses to implement immunity checks.
   * @param _statusId The status being applied
   * @param _flags Optional flags (e.g., monster flags) for resistance checks
   */
  canReceiveStatus(_statusId: string, _flags?: string[]): boolean {
    return true;
  }
}
