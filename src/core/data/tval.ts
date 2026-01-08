/**
 * Item display name utilities
 */

/**
 * Build proper display name for an item based on its type
 * e.g., "Heroism" -> "Potion of Heroism"
 */
export function buildItemDisplayName(baseName: string, type: string): string {
  // Clean the base name (remove & prefix and ~ suffix from raw data)
  const name = baseName.replace(/^& /, '').replace(/~$/, '');

  switch (type) {
    case 'potion':
      return `Potion of ${name}`;
    case 'scroll':
      return `Scroll of ${name}`;
    case 'ring':
      return `Ring of ${name}`;
    case 'amulet':
      return `Amulet of ${name}`;
    case 'wand':
      return `Wand of ${name}`;
    case 'staff':
      return `Staff of ${name}`;
    case 'rod':
      return `Rod of ${name}`;
    default:
      return name;
  }
}
