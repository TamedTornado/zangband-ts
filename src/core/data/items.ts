import { toSlug } from './slug';

export interface Allocation {
  depth: number;
  rarity: number;
}

export interface ItemDef {
  key: string;
  index: number;
  name: string;
  symbol: string;
  color: string;
  tval: number;
  sval: number;
  pval: number;
  depth: number;
  rarity: number;
  weight: number;
  cost: number;
  allocation: Allocation[];
  baseAc: number;
  damage: string;
  toHit: number;
  toDam: number;
  toAc: number;
  flags: string[];
}

export type ItemRecord = Record<string, ItemDef>;

interface RawItem {
  index: number;
  name: string;
  slug: string;
  symbol: string;
  color: string;
  tval: number;
  sval: number;
  pval: number;
  depth: number;
  rarity: number;
  weight: number;
  cost: number;
  allocation: Allocation[];
  baseAc: number;
  damage: string;
  toHit: number;
  toDam: number;
  toAc: number;
  flags: string[];
}

function createEmptyRaw(index: number, name: string): RawItem {
  return {
    index,
    name,
    slug: toSlug(name),
    symbol: '?',
    color: 'w',
    tval: 0,
    sval: 0,
    pval: 0,
    depth: 0,
    rarity: 0,
    weight: 0,
    cost: 0,
    allocation: [],
    baseAc: 0,
    damage: '0d0',
    toHit: 0,
    toDam: 0,
    toAc: 0,
    flags: [],
  };
}

export function parseItems(text: string): ItemRecord {
  const lines = text.split('\n');
  const entries: RawItem[] = [];
  let current: RawItem | null = null;

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
      case 'G': {
        if (current) {
          const [symbol, color] = value.split(':');
          current.symbol = symbol ?? '?';
          current.color = color ?? 'w';
        }
        break;
      }
      case 'I': {
        if (current) {
          const [tval, sval, pval] = value.split(':');
          current.tval = parseInt(tval ?? '0', 10);
          current.sval = parseInt(sval ?? '0', 10);
          current.pval = parseInt(pval ?? '0', 10);
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
      case 'A': {
        if (current) {
          const pairs = value.split(':');
          for (const pair of pairs) {
            const [d, r] = pair.split('/');
            if (d && r) {
              current.allocation.push({
                depth: parseInt(d, 10),
                rarity: parseInt(r, 10),
              });
            }
          }
        }
        break;
      }
      case 'P': {
        if (current) {
          const [ac, damage, toHit, toDam, toAc] = value.split(':');
          current.baseAc = parseInt(ac ?? '0', 10);
          current.damage = damage ?? '0d0';
          current.toHit = parseInt(toHit ?? '0', 10);
          current.toDam = parseInt(toDam ?? '0', 10);
          current.toAc = parseInt(toAc ?? '0', 10);
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
  const items: ItemRecord = {};
  for (const entry of entries) {
    const hasCollision = (slugCounts.get(entry.slug) ?? 0) > 1;
    const key = hasCollision ? `${entry.slug}_${entry.index}` : entry.slug;

    if (items[key]) {
      throw new Error(`Duplicate item key: ${key}`);
    }

    items[key] = {
      key,
      index: entry.index,
      name: entry.name,
      symbol: entry.symbol,
      color: entry.color,
      tval: entry.tval,
      sval: entry.sval,
      pval: entry.pval,
      depth: entry.depth,
      rarity: entry.rarity,
      weight: entry.weight,
      cost: entry.cost,
      allocation: entry.allocation,
      baseAc: entry.baseAc,
      damage: entry.damage,
      toHit: entry.toHit,
      toDam: entry.toDam,
      toAc: entry.toAc,
      flags: entry.flags,
    };
  }

  return items;
}
