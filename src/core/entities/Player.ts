import { Actor } from './Actor';
import type { Item } from './Item';
import type { Level } from '../world/Level';
import type { ItemGeneration } from '../systems/ItemGeneration';
import { type Position, type Direction, movePosition } from '../types';
import type { ClassDef } from '../data/classes';

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
  classDef?: ClassDef;
  level?: number;
  primaryRealm?: string;
  secondaryRealm?: string;
}

export class Player extends Actor {
  readonly stats: Stats;
  readonly className: string;
  readonly classDef: ClassDef | undefined;
  private _inventory: Item[] = [];
  private _knownSpells: Map<string, Set<string>> = new Map(); // realm -> spell keys
  private _equipment: Partial<Record<EquipmentSlot, Item>> = {};

  // Character progression
  private _level: number = 1;

  // Mana pool
  private _currentMana: number = 0;
  private _maxMana: number = 0;

  // Magic realms (chosen at character creation)
  private _primaryRealm: string | null = null;
  private _secondaryRealm: string | null = null;

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
    this.classDef = config.classDef;
    this._level = config.level ?? 1;
    this._primaryRealm = config.primaryRealm ?? null;
    this._secondaryRealm = config.secondaryRealm ?? null;

    // Initialize mana pool
    this._maxMana = this.calculateMaxMana();
    this._currentMana = this._maxMana;
  }

  // Character level
  get level(): number {
    return this._level;
  }

  set level(value: number) {
    this._level = value;
    // Recalculate max mana when level changes
    const oldMax = this._maxMana;
    this._maxMana = this.calculateMaxMana();
    // Restore the mana gained from leveling
    this._currentMana = Math.min(this._currentMana + (this._maxMana - oldMax), this._maxMana);
  }

  // Mana pool accessors
  get maxMana(): number {
    return this._maxMana;
  }

  get currentMana(): number {
    return this._currentMana;
  }

  // Magic realm accessors
  get primaryRealm(): string | null {
    return this._primaryRealm;
  }

  get secondaryRealm(): string | null {
    return this._secondaryRealm;
  }

  /**
   * Calculate maximum mana based on class, level, and casting stat
   * Formula: (base from level) * stat_modifier * class_bonus
   */
  calculateMaxMana(): number {
    if (!this.classDef || !this.classDef.spellStat) {
      return 0; // Non-caster class
    }

    const spellStat = this.classDef.spellStat;
    const statValue = this.stats[spellStat];

    // Stat modifier: (stat - 10) / 2, similar to D&D
    // But we'll use Zangband-style: higher stats give more mana
    const statMod = Math.floor((statValue - 8) / 2);

    // Base mana from level: roughly level * 2-3 depending on class
    // Mages get more base mana than hybrid classes
    const levelMana = this._level * 3;

    // Stat contribution: stat_mod * level / 2
    const statMana = Math.max(0, statMod * this._level / 2);

    // Total before class bonus
    let totalMana = Math.floor(levelMana + statMana);

    // Apply class mana bonus (e.g., high_mage gets 1.25x)
    if (this.classDef.manaBonus) {
      totalMana = Math.floor(totalMana * this.classDef.manaBonus);
    }

    // Minimum 1 mana for casters
    return Math.max(1, totalMana);
  }

  /**
   * Spend mana for casting a spell
   * @returns true if mana was spent, false if not enough mana
   */
  spendMana(amount: number): boolean {
    if (this._currentMana < amount) {
      return false;
    }
    this._currentMana -= amount;
    return true;
  }

  /**
   * Restore mana (from regeneration, potions, etc.)
   */
  restoreMana(amount: number): void {
    this._currentMana = Math.min(this._currentMana + amount, this._maxMana);
  }

  /**
   * Regenerate mana (called each turn)
   * Rate: maxMana / 100 per turn (roughly 100 turns to full)
   */
  regenerateMana(): void {
    if (this._maxMana <= 0) return;
    const regenRate = Math.max(1, Math.floor(this._maxMana / 100));
    this.restoreMana(regenRate);
  }

  /**
   * Recalculate max mana (call after stat changes)
   */
  recalculateMana(): void {
    this._maxMana = this.calculateMaxMana();
    this._currentMana = Math.min(this._currentMana, this._maxMana);
  }

  get inventory(): Item[] {
    return [...this._inventory];
  }

  /**
   * Get all known spell keys across all realms
   */
  get knownSpells(): string[] {
    const allSpells: string[] = [];
    for (const spells of this._knownSpells.values()) {
      allSpells.push(...spells);
    }
    return allSpells;
  }

  /**
   * Get known spells for a specific realm
   */
  getKnownSpellsInRealm(realm: string): string[] {
    const spells = this._knownSpells.get(realm);
    return spells ? [...spells] : [];
  }

  /**
   * Check if a spell is known
   */
  knowsSpell(realm: string, spellKey: string): boolean {
    const spells = this._knownSpells.get(realm);
    return spells?.has(spellKey) ?? false;
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

  /**
   * Learn a spell in a specific realm
   */
  learnSpell(realm: string, spellKey: string): void {
    let realmSpells = this._knownSpells.get(realm);
    if (!realmSpells) {
      realmSpells = new Set();
      this._knownSpells.set(realm, realmSpells);
    }
    realmSpells.add(spellKey);
  }

  /**
   * Get count of known spells (for spell slot tracking)
   */
  get knownSpellCount(): number {
    let count = 0;
    for (const spells of this._knownSpells.values()) {
      count += spells.size;
    }
    return count;
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
