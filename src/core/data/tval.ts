/**
 * Item display name utilities
 *
 * Zangband naming conventions:
 * - `&` is replaced with article (a/an) or quantity
 * - `~` marks where to add 's' for pluralization
 *
 * Examples:
 * - "& Set~ of Gauntlets" -> singular: "Set of Gauntlets", plural: "Sets of Gauntlets"
 * - "& Cloak~" -> singular: "Cloak", plural: "Cloaks"
 */

/**
 * Build singular display name for an item based on its type
 * The ~ marker is removed for singular form.
 * e.g., "& Set~ of Gauntlets" -> "Set of Gauntlets"
 */
export function buildItemDisplayName(baseName: string, type: string): string {
  // Clean the base name (remove & prefix and ~ markers)
  const name = baseName.replace(/^& /, '').replace(/~/g, '');

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

/**
 * Pluralize a name using the ~ marker from raw name
 * e.g., "& Set~ of Gauntlets" with quantity 5 -> "5 Sets of Gauntlets"
 */
export function pluralizeName(rawName: string, quantity: number): string {
  // Remove the & prefix
  let name = rawName.replace(/^& /, '');

  if (quantity <= 1) {
    // Singular: just remove the ~ marker
    return name.replace(/~/g, '');
  }

  // Plural: replace ~ with 's'
  if (name.includes('~')) {
    return name.replace(/~/g, 's');
  }

  // No ~ marker - use simple pluralization rules
  // Handle special cases
  if (name.endsWith('s') || name.endsWith('x') || name.endsWith('ch') || name.endsWith('sh')) {
    return `${name}es`;
  }
  if (name.endsWith('y') && !isVowel(name.charAt(name.length - 2))) {
    return `${name.slice(0, -1)}ies`;
  }
  return `${name}s`;
}

function isVowel(char: string): boolean {
  return 'aeiouAEIOU'.includes(char);
}
