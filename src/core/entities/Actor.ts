import { Entity, type EntityConfig } from './Entity';

export interface ActorConfig extends EntityConfig {
  maxHp: number;
  speed: number;
}

export class Actor extends Entity {
  readonly maxHp: number;
  private _hp: number;
  readonly speed: number;
  private _energy: number;

  constructor(config: ActorConfig) {
    super(config);
    this.maxHp = config.maxHp;
    this._hp = config.maxHp;
    this.speed = config.speed;
    this._energy = 0;
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
}
