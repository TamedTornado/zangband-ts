/**
 * Convert a name to a URL/key-safe slug.
 * Removes special characters, lowercases, replaces spaces with underscores.
 */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[&~']/g, '') // Remove Angband grammar markers and apostrophes
    .replace(/[^a-z0-9\s]/g, '') // Remove other special chars
    .trim()
    .replace(/\s+/g, '_') // Spaces to underscores
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, ''); // Trim leading/trailing underscores
}

