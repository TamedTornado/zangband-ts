import { toSlug } from './slug';

export interface TerrainDef {
  key: string;
  index: number;
  name: string;
  symbol: string;
  color: string;
  flags: string[];
}

export type TerrainRecord = Record<string, TerrainDef>;

interface RawTerrain {
  index: number;
  name: string;
  slug: string;
  symbol: string;
  color: string;
  flags: string[];
}

export function parseTerrain(text: string): TerrainRecord {
  const lines = text.split('\n');
  const entries: RawTerrain[] = [];
  let current: RawTerrain | null = null;

  // First pass: parse all entries
  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('V:')) {
      continue;
    }

    const [prefix, ...rest] = trimmed.split(':');
    const value = rest.join(':');

    switch (prefix) {
      case 'N': {
        if (current) {
          entries.push(current);
        }
        const [indexStr, name] = value.split(':');
        current = {
          index: parseInt(indexStr ?? '0', 10),
          name: name ?? '',
          slug: toSlug(name ?? ''),
          symbol: ' ',
          color: 'w',
          flags: [],
        };
        break;
      }
      case 'G': {
        if (current) {
          const [symbol, color] = value.split(':');
          current.symbol = symbol ?? ' ';
          current.color = color ?? 'w';
        }
        break;
      }
      case 'F': {
        if (current) {
          const newFlags = value
            .split('|')
            .map((f) => f.trim())
            .filter((f) => f.length > 0);
          current.flags.push(...newFlags);
        }
        break;
      }
    }
  }

  if (current) {
    entries.push(current);
  }

  // Detect collisions
  const slugCounts = new Map<string, number>();
  for (const entry of entries) {
    slugCounts.set(entry.slug, (slugCounts.get(entry.slug) ?? 0) + 1);
  }

  // Build record with collision-aware keys
  const terrain: TerrainRecord = {};
  for (const entry of entries) {
    const hasCollision = (slugCounts.get(entry.slug) ?? 0) > 1;
    const key = hasCollision ? `${entry.slug}_${entry.index}` : entry.slug;

    if (terrain[key]) {
      throw new Error(`Duplicate terrain key: ${key}`);
    }

    terrain[key] = {
      key,
      index: entry.index,
      name: entry.name,
      symbol: entry.symbol,
      color: entry.color,
      flags: entry.flags,
    };
  }

  return terrain;
}
