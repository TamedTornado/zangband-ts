import { Entity, type EntityConfig } from './Entity';
import type { GeneratedItem } from '../systems/ItemGeneration';
import { buildItemDisplayName } from '../data/tval';

export interface ItemConfig extends EntityConfig {
  quantity?: number;
  generated?: GeneratedItem;
}

export class Item extends Entity {
  quantity: number;
  readonly generated: GeneratedItem | undefined;

  constructor(config: ItemConfig) {
    super(config);
    this.quantity = config.quantity ?? 1;
    this.generated = config.generated;
  }

  /** Get the item's type */
  get type(): string {
    return this.generated?.baseItem.type ?? 'unknown';
  }

  /** Display name computed from type and base name */
  get name(): string {
    if (!this.generated) return 'unknown item';
    const base = this.generated.baseItem;
    // Artifacts have their own names
    if (this.generated.artifact?.name) {
      return this.generated.artifact.name;
    }
    // Build name from type + base name + ego
    let name = buildItemDisplayName(base.name, base.type);
    if (this.generated.egoItem?.name) {
      name = `${name} ${this.generated.egoItem.name}`;
    }
    // Append charge/timeout info for devices when identified
    if (this.generated.identified !== false) {
      if (this.isWand || this.isStaff) {
        const charges = this.generated.charges ?? 0;
        const max = this.generated.maxCharges ?? charges;
        name = `${name} (${charges}/${max} charges)`;
      } else if (this.isRod) {
        const timeout = this.generated.timeout ?? 0;
        if (timeout > 0) {
          name = `${name} (${timeout} turns to recharge)`;
        } else {
          name = `${name} (ready)`;
        }
      }
    }
    return name;
  }

  /** Get the item's base key if from generation */
  get baseKey(): string | undefined {
    return this.generated?.baseItem.key;
  }

  /** Get the item's damage dice string */
  get damage(): string {
    return this.generated?.baseItem.damage ?? '0d0';
  }

  /** Get the item's to-hit bonus */
  get toHit(): number {
    return this.generated?.toHit ?? 0;
  }

  /** Get the item's to-damage bonus */
  get toDam(): number {
    return this.generated?.toDam ?? 0;
  }

  /** Get the item's AC bonus */
  get toAc(): number {
    return this.generated?.toAc ?? 0;
  }

  /** Get the item's base AC */
  get baseAc(): number {
    return this.generated?.baseItem.baseAc ?? 0;
  }

  /** Check if item has a specific flag */
  hasFlag(flag: string): boolean {
    return this.generated?.flags.includes(flag) ?? false;
  }

  /** Get the item's sval (subtype value) - used for stacking same item types */
  get sval(): number {
    return this.generated?.baseItem.sval ?? 0;
  }

  // Consumable type checks
  get isFood(): boolean {
    return this.type === 'food';
  }

  get isPotion(): boolean {
    return this.type === 'potion';
  }

  get isScroll(): boolean {
    return this.type === 'scroll';
  }

  // Device type checks
  get isWand(): boolean {
    return this.type === 'wand';
  }

  get isStaff(): boolean {
    return this.type === 'staff';
  }

  get isRod(): boolean {
    return this.type === 'rod';
  }

  get isDevice(): boolean {
    return this.isWand || this.isStaff || this.isRod;
  }

  // Device charge/timeout tracking

  /** Current charges for wands/staffs */
  get charges(): number {
    return this.generated?.charges ?? 0;
  }

  /** Maximum charges (for display) */
  get maxCharges(): number {
    return this.generated?.maxCharges ?? 0;
  }

  /** Current timeout for rods (0 = ready) */
  get timeout(): number {
    return this.generated?.timeout ?? 0;
  }

  /** Check if a rod is ready to use */
  get isReady(): boolean {
    return !this.isRod || this.timeout === 0;
  }

  /**
   * Use one charge from this item
   * For wands/staffs: decrements charges
   * For rods: sets timeout to recharge time (pval)
   */
  useCharge(): void {
    if (!this.generated) return;

    if (this.isWand || this.isStaff) {
      if (this.generated.charges !== undefined && this.generated.charges > 0) {
        this.generated.charges--;
      }
    } else if (this.isRod) {
      // Set timeout to the recharge time (pval)
      this.generated.timeout = this.generated.baseItem.pval;
    }
  }

  /**
   * Recharge a device
   * @param amount Number of charges to add (wands/staffs) or timeout to reduce (rods)
   */
  recharge(amount: number): void {
    if (!this.generated) return;

    if (this.isWand || this.isStaff) {
      const newCharges = (this.generated.charges ?? 0) + amount;
      this.generated.charges = newCharges;
      // Update max if we've exceeded it (recharging can add beyond original max)
      if (newCharges > (this.generated.maxCharges ?? 0)) {
        this.generated.maxCharges = newCharges;
      }
    } else if (this.isRod) {
      // Reduce timeout for rods
      const timeout = this.generated.timeout ?? 0;
      this.generated.timeout = Math.max(0, timeout - amount);
    }
  }

  /**
   * Reduce rod timeout by elapsed time (called each turn)
   * @param time Amount of time elapsed (usually 1 turn)
   */
  tickTimeout(time: number = 1): void {
    if (!this.generated) return;
    if (this.isRod && this.generated.timeout !== undefined && this.generated.timeout > 0) {
      this.generated.timeout = Math.max(0, this.generated.timeout - time);
    }
  }

  /**
   * Check if this item can stack with another item
   * Devices stack differently than regular items:
   * - Wands of same type: always stack, charges add together
   * - Staffs of same type: only stack if both have same charges (ZTK behavior)
   * - Rods: stack if same type (timeout tracked per rod in stack)
   * - Other items: stack if same base item and ego item
   */
  canStack(other: Item): boolean {
    // Must have generated data
    if (!this.generated || !other.generated) return false;

    // Must be same base item
    if (this.generated.baseItem.key !== other.generated.baseItem.key) return false;

    // Artifacts never stack
    if (this.generated.artifact || other.generated.artifact) return false;

    // Must have same ego item (or both none)
    const thisEgo = this.generated.egoItem?.key;
    const otherEgo = other.generated.egoItem?.key;
    if (thisEgo !== otherEgo) return false;

    // Device-specific stacking rules
    if (this.isWand) {
      // Wands always stack
      return true;
    }

    if (this.isStaff) {
      // ZTK: Staffs only stack if they have same number of charges
      return this.charges === other.charges;
    }

    if (this.isRod) {
      // Rods stack by type (we'd need array of timeouts for proper tracking)
      // For simplicity, only stack if both are ready
      return this.timeout === 0 && other.timeout === 0;
    }

    // Regular stackable items (potions, scrolls, etc.)
    return true;
  }

  /**
   * Absorb another item into this one (for stacking)
   * Combines quantities and charges appropriately
   * @returns true if absorption succeeded
   */
  absorb(other: Item): boolean {
    if (!this.canStack(other)) return false;
    if (!this.generated || !other.generated) return false;

    // Add quantity
    this.quantity += other.quantity;

    // Handle device charges
    if (this.isWand) {
      // Wands: add charges together
      this.generated.charges = (this.generated.charges ?? 0) + (other.generated.charges ?? 0);
      this.generated.maxCharges = (this.generated.maxCharges ?? 0) + (other.generated.maxCharges ?? 0);
    }
    // Staffs: charges stay the same since we only stack identical charges
    // Rods: would need array tracking for multiple rods

    return true;
  }
}
