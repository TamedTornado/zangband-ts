/**
 * Flavor System - Handles unidentified item appearances
 *
 * In roguelikes, potions/scrolls have random appearances (colors/titles)
 * that are shuffled each game. Once you identify one Blue Potion,
 * you know all Blue Potions are (e.g.) Potions of Healing.
 *
 * Ported from Zangband's flavor.c
 */

import { RNG } from 'rot-js';
import type { Item } from '@/core/entities/Item';

/**
 * Pluralize a name based on Zangband's ~ marker convention.
 * The ~ in names like "& Set~ of Gauntlets" marks where 's' or 'es' goes.
 * Rules from flavor.c:
 * - If quantity is 1, just remove the ~
 * - If quantity > 1 and char before ~ is 's' or 'h', add 'es'
 * - Otherwise add 's'
 */
function pluralizeName(rawName: string, quantity: number): string {
  // Remove leading "& " if present
  let name = rawName.replace(/^& /, '');

  if (quantity === 1) {
    // Just remove tildes for singular
    return name.replace(/~/g, '');
  }

  // For plural, replace each ~ with appropriate suffix
  let result = '';
  for (let i = 0; i < name.length; i++) {
    if (name[i] === '~') {
      // Look at previous character
      const prev = i > 0 ? name[i - 1] : '';
      if (prev === 's' || prev === 'h') {
        result += 'es';
      } else {
        result += 's';
      }
    } else {
      result += name[i];
    }
  }
  return result;
}

/**
 * Potion color adjectives (from Zangband flavor.c)
 * These are shuffled at game start to assign random colors to potions.
 */
const POTION_COLORS = [
  // Fixed colors for specific potions (indices 0-3 in Zangband)
  // We skip these and let them be shuffled too for simplicity
  'Azure', 'Blue', 'Blue Speckled', 'Black', 'Brown', 'Brown Speckled',
  'Bubbling', 'Chartreuse', 'Cloudy', 'Copper Speckled', 'Crimson',
  'Cyan', 'Dark Blue', 'Dark Green', 'Dark Red', 'Gold Speckled',
  'Green', 'Green Speckled', 'Grey', 'Grey Speckled', 'Hazy',
  'Indigo', 'Light Blue', 'Light Green', 'Magenta', 'Metallic Blue',
  'Metallic Red', 'Metallic Green', 'Metallic Purple', 'Misty', 'Orange',
  'Orange Speckled', 'Pink', 'Pink Speckled', 'Puce', 'Purple',
  'Purple Speckled', 'Red', 'Red Speckled', 'Silver Speckled', 'Smoky',
  'Tangerine', 'Violet', 'Vermilion', 'White', 'Yellow',
  'Violet Speckled', 'Pungent', 'Clotted Red', 'Viscous Pink', 'Oily Yellow',
  'Gloopy Green', 'Shimmering', 'Coagulated Crimson', 'Yellow Speckled',
  'Gold', 'Manly', 'Stinking', 'Oily Black', 'Ichor', 'Ivory White',
  'Sky Blue', 'Bloody', 'Inky Black', 'Silver Flecked', 'Red Flecked',
  'Green Flecked', 'Sea Green', 'Umber', 'Layered', 'Fizzy Yellow',
  'Fizzy Green', 'Clear', 'Light Brown', 'Icky Green', 'Murky',
];

/**
 * Scroll title syllables (from Zangband flavor.c)
 * Combined to create random scroll titles like "BLAA JU XUXU"
 */
const SCROLL_SYLLABLES = [
  'a', 'ab', 'ag', 'aks', 'ala', 'an', 'ankh', 'app',
  'arg', 'arze', 'ash', 'aus', 'ban', 'bar', 'bat', 'bek',
  'bie', 'bin', 'bit', 'bjor', 'blu', 'bot', 'bu',
  'byt', 'comp', 'con', 'cos', 'cre', 'dalf', 'dan',
  'den', 'der', 'doe', 'dok', 'eep', 'el', 'eng', 'er', 'ere', 'erk',
  'esh', 'evs', 'fa', 'fid', 'flit', 'for', 'fri', 'fu', 'gan',
  'gar', 'glen', 'gop', 'gre', 'ha', 'he', 'hyd', 'i',
  'ing', 'ion', 'ip', 'ish', 'it', 'ite', 'iv', 'jo',
  'kho', 'kli', 'klis', 'la', 'lech', 'man', 'mar',
  'me', 'mi', 'mic', 'mik', 'mon', 'mung', 'mur', 'nag', 'nej',
  'nelg', 'nep', 'ner', 'nes', 'nis', 'nih', 'nin', 'o',
  'od', 'ood', 'org', 'orn', 'ox', 'oxy', 'pay', 'pet',
  'ple', 'plu', 'po', 'pot', 'prok', 're', 'rea', 'rhov',
  'ri', 'ro', 'rog', 'rok', 'rol', 'sa', 'san', 'sat',
  'see', 'sef', 'seh', 'shu', 'ski', 'sna', 'sne', 'snik',
  'sno', 'so', 'sol', 'sri', 'sta', 'sun', 'ta', 'tab',
  'tem', 'ther', 'ti', 'tox', 'trol', 'tue', 'turs', 'u',
  'ulk', 'um', 'un', 'uni', 'ur', 'val', 'viv', 'vly',
  'vom', 'wah', 'wed', 'werg', 'wex', 'whon', 'wun', 'xi',
  'yerg', 'yp', 'zun', 'tri', 'blaa', 'jah', 'bul', 'on',
  'foo', 'ju', 'xuxu',
];

/**
 * Check if a character is a vowel
 */
function isVowel(char: string): boolean {
  return 'aeiouAEIOU'.includes(char);
}

/**
 * Get the appropriate article for a word
 */
export function getArticle(word: string, quantity: number = 1): string {
  if (quantity <= 0) return 'no more';
  if (quantity > 1) return `${quantity}`;
  return isVowel(word[0] ?? '') ? 'an' : 'a';
}

/**
 * Fisher-Yates shuffle
 */
function shuffle<T>(array: T[], rng: typeof RNG): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.getUniformInt(0, i);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * Generate a random scroll title from syllables
 */
function generateScrollTitle(rng: typeof RNG): string {
  const numWords = rng.getUniformInt(2, 4);
  const words: string[] = [];

  for (let w = 0; w < numWords; w++) {
    const numSyllables = rng.getUniformInt(1, 3);
    let word = '';
    for (let s = 0; s < numSyllables; s++) {
      const idx = rng.getUniformInt(0, SCROLL_SYLLABLES.length - 1);
      word += SCROLL_SYLLABLES[idx];
    }
    words.push(word.toUpperCase());
  }

  return words.join(' ');
}

export interface FlavorData {
  potionColors: Map<number, string>;   // sval -> color
  scrollTitles: Map<number, string>;   // sval -> title
  awareness: Set<string>;              // "type:sval" of items player knows
}

/**
 * Flavor System
 *
 * Manages random appearances for potions/scrolls and tracks
 * which item types the player has identified.
 */
export class FlavorSystem {
  private potionColors: Map<number, string> = new Map();
  private scrollTitles: Map<number, string> = new Map();
  private awareness: Set<string> = new Set();
  private rng: typeof RNG;

  constructor(rng: typeof RNG = RNG) {
    this.rng = rng;
    this.initialize();
  }

  /**
   * Initialize flavor assignments (call at game start)
   */
  initialize(): void {
    this.potionColors.clear();
    this.scrollTitles.clear();
    this.awareness.clear();

    // Shuffle potion colors and assign to svals
    const shuffledColors = shuffle(POTION_COLORS, this.rng);
    for (let sval = 0; sval < 64; sval++) {
      this.potionColors.set(sval, shuffledColors[sval % shuffledColors.length]!);
    }

    // Generate scroll titles for each sval
    for (let sval = 0; sval < 64; sval++) {
      this.scrollTitles.set(sval, generateScrollTitle(this.rng));
    }
  }

  /**
   * Get the flavor description for an item
   * Returns the color/title or null if not a flavored item type
   */
  getFlavor(type: string, sval: number): string | null {
    if (type === 'potion') {
      return this.potionColors.get(sval) ?? null;
    }
    if (type === 'scroll') {
      return this.scrollTitles.get(sval) ?? null;
    }
    return null;
  }

  /**
   * Check if the player knows what this item type is
   */
  isAware(type: string, sval: number): boolean {
    return this.awareness.has(`${type}:${sval}`);
  }

  /**
   * Mark an item type as known (e.g., after using it or identifying it)
   */
  setAware(type: string, sval: number): void {
    this.awareness.add(`${type}:${sval}`);
  }

  /**
   * Get unidentified display name for a potion
   */
  getPotionFlavorName(sval: number): string {
    const color = this.potionColors.get(sval) ?? 'Strange';
    return `${color} Potion`;
  }

  /**
   * Get unidentified display name for a scroll
   */
  getScrollFlavorName(sval: number): string {
    const title = this.scrollTitles.get(sval) ?? 'UNKNOWN';
    return `Scroll titled "${title}"`;
  }

  /**
   * Mark an item as known (after identifying, using, etc.)
   */
  makeAware(item: Item): void {
    if (item.generated) {
      const { type, sval } = item.generated.baseItem;
      this.setAware(type, sval);
    }
  }

  /**
   * Get the display name for an item with proper article and flavor.
   */
  getItemDisplayName(
    item: Item,
    options: { article?: boolean; quantity?: number } = {},
  ): string {
    const { article = true, quantity = item.quantity } = options;

    if (!item.generated) {
      return article ? 'an unknown item' : 'unknown item';
    }

    const base = item.generated.baseItem;
    const type = base.type;
    const sval = base.sval;
    const rawName = base.name; // Raw name with ~ markers for pluralization

    // Artifacts always show their name
    if (item.generated.artifact?.name) {
      const name = item.generated.artifact.name;
      if (!article) return name;
      return `The ${name}`;
    }

    // Check if this item type has flavors (potions, scrolls)
    const hasFlavor = type === 'potion' || type === 'scroll';
    const isAware = this.isAware(type, sval);

    let name: string;

    if (hasFlavor && !isAware) {
      // Show flavor name (e.g., "Icky Green Potion", "Scroll titled \"BLAA JU\"")
      if (type === 'potion') {
        name = this.getPotionFlavorName(sval);
      } else {
        name = this.getScrollFlavorName(sval);
      }
    } else {
      // Show real name - use raw name for proper pluralization
      name = this.buildDisplayName(rawName, type, quantity);
    }

    // Add ego item suffix if identified
    if (item.generated.egoItem?.name && item.generated.identified) {
      name = `${name} ${item.generated.egoItem.name}`;
    }

    if (!article) return name;

    // Add quantity or article prefix
    if (quantity > 1) {
      return `${quantity} ${name}`;
    }

    // Get the appropriate article (a/an)
    const art = getArticle(name, quantity);
    return `${art} ${name}`;
  }

  /**
   * Build the display name with proper pluralization
   */
  private buildDisplayName(rawName: string, type: string, quantity: number): string {
    // Use pluralizeName to handle ~ markers
    const baseName = pluralizeName(rawName, quantity);

    // Add type prefix for consumables/devices
    switch (type) {
      case 'potion':
        return quantity > 1 ? `Potions of ${baseName}` : `Potion of ${baseName}`;
      case 'scroll':
        return quantity > 1 ? `Scrolls of ${baseName}` : `Scroll of ${baseName}`;
      case 'ring':
        return quantity > 1 ? `Rings of ${baseName}` : `Ring of ${baseName}`;
      case 'amulet':
        return quantity > 1 ? `Amulets of ${baseName}` : `Amulet of ${baseName}`;
      case 'wand':
        return quantity > 1 ? `Wands of ${baseName}` : `Wand of ${baseName}`;
      case 'staff':
        return quantity > 1 ? `Staves of ${baseName}` : `Staff of ${baseName}`;
      case 'rod':
        return quantity > 1 ? `Rods of ${baseName}` : `Rod of ${baseName}`;
      default:
        return baseName;
    }
  }

  /**
   * Export flavor data for save/restore
   */
  export(): FlavorData {
    return {
      potionColors: new Map(this.potionColors),
      scrollTitles: new Map(this.scrollTitles),
      awareness: new Set(this.awareness),
    };
  }

  /**
   * Import flavor data from save
   */
  import(data: FlavorData): void {
    this.potionColors = new Map(data.potionColors);
    this.scrollTitles = new Map(data.scrollTitles);
    this.awareness = new Set(data.awareness);
  }
}
