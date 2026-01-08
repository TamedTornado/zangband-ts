import { Actor } from './Actor';
import type { Item } from './Item';
import type { Level } from '../world/Level';
import type { ItemGeneration } from '../systems/ItemGeneration';
import { type Position, type Direction, movePosition } from '../types';

export interface Stats {
  str: number;
  int: number;
  wis: number;
  dex: number;
  con: number;
  chr: number;
}

/** Equipment slot names */
export type EquipmentSlot =
  | 'weapon'
  | 'bow'
  | 'armor'
  | 'cloak'
  | 'shield'
  | 'helmet'
  | 'gloves'
  | 'boots'
  | 'ring1'
  | 'ring2'
  | 'amulet'
  | 'light';

/** Item types for equipment slots */
const SLOT_TYPES: Record<EquipmentSlot, string[]> = {
  weapon: ['digging', 'hafted', 'polearm', 'sword'],
  bow: ['bow'],
  armor: ['soft_armor', 'hard_armor', 'dragon_armor'],
  cloak: ['cloak'],
  shield: ['shield'],
  helmet: ['helm', 'crown'],
  gloves: ['gloves'],
  boots: ['boots'],
  ring1: ['ring'],
  ring2: ['ring'],
  amulet: ['amulet'],
  light: ['light'],
};

export interface PlayerConfig {
  id: string;
  position: Position;
  maxHp: number;
  speed: number;
  stats: Stats;
  className?: string;
}

export class Player extends Actor {
  readonly stats: Stats;
  readonly className: string;
  private _inventory: Item[] = [];
  private _knownSpells: string[] = [];
  private _equipment: Partial<Record<EquipmentSlot, Item>> = {};

  constructor(config: PlayerConfig) {
    super({
      id: config.id,
      position: config.position,
      symbol: '@',
      color: '#fff',
      maxHp: config.maxHp,
      speed: config.speed,
    });
    this.stats = { ...config.stats };
    this.className = config.className ?? 'Warrior';
  }

  get inventory(): Item[] {
    return [...this._inventory];
  }

  get knownSpells(): string[] {
    return [...this._knownSpells];
  }

  /**
   * Add an item to inventory, attempting to stack with existing items first.
   * @returns true if the item was stacked, false if added as a new slot
   */
  addItem(item: Item): boolean {
    // Try to stack with existing items
    for (const existing of this._inventory) {
      if (existing.canStack(item)) {
        existing.absorb(item);
        return true;
      }
    }
    // No stackable item found, add as new
    this._inventory.push(item);
    return false;
  }

  removeItem(itemId: string): Item | undefined {
    const idx = this._inventory.findIndex(i => i.id === itemId);
    if (idx >= 0) {
      return this._inventory.splice(idx, 1)[0];
    }
    return undefined;
  }

  learnSpell(spellId: string): void {
    if (!this._knownSpells.includes(spellId)) {
      this._knownSpells.push(spellId);
    }
  }

  // Equipment methods

  /** Get equipped item in a slot */
  getEquipped(slot: EquipmentSlot): Item | undefined {
    return this._equipment[slot];
  }

  /** Get all equipped items */
  getAllEquipment(): Partial<Record<EquipmentSlot, Item>> {
    return { ...this._equipment };
  }

  /** Check if an item can be equipped in a slot */
  canEquip(item: Item, slot: EquipmentSlot): boolean {
    const type = item.generated?.baseItem.type;
    if (type === undefined) return false;
    return SLOT_TYPES[slot].includes(type);
  }

  /** Find the appropriate slot for an item */
  findSlotForItem(item: Item): EquipmentSlot | null {
    const type = item.generated?.baseItem.type;
    if (type === undefined) return null;

    for (const [slot, types] of Object.entries(SLOT_TYPES)) {
      if (types.includes(type)) {
        // For rings, use ring1 if empty, else ring2
        if (slot === 'ring1' || slot === 'ring2') {
          if (!this._equipment.ring1) return 'ring1';
          if (!this._equipment.ring2) return 'ring2';
          return 'ring1'; // Default to replacing ring1
        }
        return slot as EquipmentSlot;
      }
    }
    return null;
  }

  /** Equip an item in the appropriate slot */
  equip(item: Item): { equipped: boolean; unequipped: Item | undefined; slot: EquipmentSlot | undefined } {
    const slot = this.findSlotForItem(item);
    if (!slot) return { equipped: false, unequipped: undefined, slot: undefined };

    // Remove from inventory if present
    this.removeItem(item.id);

    // Unequip current item if any
    const current = this._equipment[slot];
    if (current) {
      this._inventory.push(current);
    }

    this._equipment[slot] = item;
    return { equipped: true, unequipped: current, slot };
  }

  /** Unequip an item from a slot */
  unequip(slot: EquipmentSlot): Item | undefined {
    const item = this._equipment[slot];
    if (item) {
      delete this._equipment[slot];
      this._inventory.push(item);
    }
    return item;
  }

  /** Calculate total AC from equipment */
  get totalAc(): number {
    let ac = 0;
    for (const item of Object.values(this._equipment)) {
      if (item) {
        ac += item.baseAc + item.toAc;
      }
    }
    return ac;
  }

  /** Get the weapon's damage dice string */
  get weaponDamage(): string {
    const weapon = this._equipment.weapon;
    return weapon?.damage ?? '1d1'; // Bare hands
  }

  /** Get weapon to-hit bonus */
  get weaponToHit(): number {
    return this._equipment.weapon?.toHit ?? 0;
  }

  /** Get weapon to-damage bonus */
  get weaponToDam(): number {
    return this._equipment.weapon?.toDam ?? 0;
  }

  tryMove(direction: Direction, level: Level): boolean {
    const newPos = movePosition(this.position, direction);
    if (!level.isWalkable(newPos)) {
      return false;
    }
    this.position = newPos;
    return true;
  }

  /**
   * Equip starting items from a list of item keys
   */
  equipStartingItems(itemGen: ItemGeneration, itemKeys: string[]): void {
    for (const key of itemKeys) {
      const item = itemGen.createItemByKey(key);
      if (item) {
        this.equip(item);
      }
    }
  }
}
