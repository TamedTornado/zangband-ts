import { toSlug } from './slug';

export interface EgoItemDef {
  key: string;
  index: number;
  name: string;
  slot: number;
  rating: number;
  depth: number;
  rarity: number;
  weight: number;
  cost: number;
  maxToHit: number;
  maxToDam: number;
  maxToAc: number;
  pval: number;
  flags: string[];
}

export type EgoItemRecord = Record<string, EgoItemDef>;

interface RawEgoItem {
  index: number;
  name: string;
  slug: string;
  slot: number;
  rating: number;
  depth: number;
  rarity: number;
  weight: number;
  cost: number;
  maxToHit: number;
  maxToDam: number;
  maxToAc: number;
  pval: number;
  flags: string[];
}

function createEmptyRaw(index: number, name: string): RawEgoItem {
  return {
    index,
    name,
    slug: toSlug(name),
    slot: 0,
    rating: 0,
    depth: 0,
    rarity: 0,
    weight: 0,
    cost: 0,
    maxToHit: 0,
    maxToDam: 0,
    maxToAc: 0,
    pval: 0,
    flags: [],
  };
}

export function parseEgoItems(text: string): EgoItemRecord {
  const lines = text.split('\n');
  const entries: RawEgoItem[] = [];
  let current: RawEgoItem | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('V:')) {
      continue;
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const prefix = trimmed.substring(0, colonIndex);
    const value = trimmed.substring(colonIndex + 1);

    switch (prefix) {
      case 'N': {
        if (current) {
          entries.push(current);
        }
        const [indexStr, ...nameParts] = value.split(':');
        const name = nameParts.join(':');
        current = createEmptyRaw(parseInt(indexStr ?? '0', 10), name);
        break;
      }
      case 'X': {
        if (current) {
          const [slot, rating] = value.split(':');
          current.slot = parseInt(slot ?? '0', 10);
          current.rating = parseInt(rating ?? '0', 10);
        }
        break;
      }
      case 'W': {
        if (current) {
          const [depth, rarity, weight, cost] = value.split(':');
          current.depth = parseInt(depth ?? '0', 10);
          current.rarity = parseInt(rarity ?? '0', 10);
          current.weight = parseInt(weight ?? '0', 10);
          current.cost = parseInt(cost ?? '0', 10);
        }
        break;
      }
      case 'C': {
        if (current) {
          const [toHit, toDam, toAc, pval] = value.split(':');
          current.maxToHit = parseInt(toHit ?? '0', 10);
          current.maxToDam = parseInt(toDam ?? '0', 10);
          current.maxToAc = parseInt(toAc ?? '0', 10);
          current.pval = parseInt(pval ?? '0', 10);
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
  const egoItems: EgoItemRecord = {};
  for (const entry of entries) {
    const hasCollision = (slugCounts.get(entry.slug) ?? 0) > 1;
    const key = hasCollision ? `${entry.slug}_${entry.index}` : entry.slug;

    if (egoItems[key]) {
      throw new Error(`Duplicate ego item key: ${key}`);
    }

    egoItems[key] = {
      key,
      index: entry.index,
      name: entry.name,
      slot: entry.slot,
      rating: entry.rating,
      depth: entry.depth,
      rarity: entry.rarity,
      weight: entry.weight,
      cost: entry.cost,
      maxToHit: entry.maxToHit,
      maxToDam: entry.maxToDam,
      maxToAc: entry.maxToAc,
      pval: entry.pval,
      flags: entry.flags,
    };
  }

  return egoItems;
}
