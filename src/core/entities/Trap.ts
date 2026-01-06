import { Entity, type EntityConfig } from './Entity';
import type { TrapDef } from '../data/traps';

export interface TrapConfig extends Omit<EntityConfig, 'symbol' | 'color'> {
  definition: TrapDef;
}

/**
 * Trap entity - represents a trap placed in the dungeon
 */
export class Trap extends Entity {
  readonly definition: TrapDef;
  private _isRevealed: boolean = false;
  private _isDisarmed: boolean = false;

  constructor(config: TrapConfig) {
    super({
      ...config,
      symbol: config.definition.symbol,
      color: config.definition.color,
    });
    this.definition = config.definition;
    // Traps with HIDDEN flag start hidden
    this._isRevealed = !config.definition.flags.includes('HIDDEN');
  }

  /** Key from the trap definition */
  get key(): string {
    return this.definition.key;
  }

  /** Display name */
  get name(): string {
    return this.definition.name;
  }

  /** Whether the trap is visible to the player */
  get isRevealed(): boolean {
    return this._isRevealed;
  }

  /** Whether the trap has been disarmed */
  get isDisarmed(): boolean {
    return this._isDisarmed;
  }

  /** Whether the trap is active (not disarmed) */
  get isActive(): boolean {
    return !this._isDisarmed;
  }

  /** Reveal the trap (from detection or triggering) */
  reveal(): void {
    this._isRevealed = true;
  }

  /** Disarm the trap */
  disarm(): void {
    this._isDisarmed = true;
    this._isRevealed = true;
  }

  /** Reset trap (for re-arming) */
  rearm(): void {
    this._isDisarmed = false;
  }
}
