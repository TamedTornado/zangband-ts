import { toSlug } from './slug';

export interface ArtifactDef {
  key: string;
  index: number;
  name: string;
  tval: number;
  sval: number;
  pval: number;
  depth: number;
  rarity: number;
  weight: number;
  cost: number;
  baseAc: number;
  damage: string;
  toHit: number;
  toDam: number;
  toAc: number;
  flags: string[];
}

export type ArtifactRecord = Record<string, ArtifactDef>;

interface RawArtifact {
  index: number;
  name: string;
  slug: string;
  tval: number;
  sval: number;
  pval: number;
  depth: number;
  rarity: number;
  weight: number;
  cost: number;
  baseAc: number;
  damage: string;
  toHit: number;
  toDam: number;
  toAc: number;
  flags: string[];
}

function createEmptyRaw(index: number, name: string): RawArtifact {
  return {
    index,
    name,
    slug: toSlug(name),
    tval: 0,
    sval: 0,
    pval: 0,
    depth: 0,
    rarity: 0,
    weight: 0,
    cost: 0,
    baseAc: 0,
    damage: '0d0',
    toHit: 0,
    toDam: 0,
    toAc: 0,
    flags: [],
  };
}

export function parseArtifacts(text: string): ArtifactRecord {
  const lines = text.split('\n');
  const entries: RawArtifact[] = [];
  let current: RawArtifact | null = null;

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
  const artifacts: ArtifactRecord = {};
  for (const entry of entries) {
    const hasCollision = (slugCounts.get(entry.slug) ?? 0) > 1;
    const key = hasCollision ? `${entry.slug}_${entry.index}` : entry.slug;

    if (artifacts[key]) {
      throw new Error(`Duplicate artifact key: ${key}`);
    }

    artifacts[key] = {
      key,
      index: entry.index,
      name: entry.name,
      tval: entry.tval,
      sval: entry.sval,
      pval: entry.pval,
      depth: entry.depth,
      rarity: entry.rarity,
      weight: entry.weight,
      cost: entry.cost,
      baseAc: entry.baseAc,
      damage: entry.damage,
      toHit: entry.toHit,
      toDam: entry.toDam,
      toAc: entry.toAc,
      flags: entry.flags,
    };
  }

  return artifacts;
}
