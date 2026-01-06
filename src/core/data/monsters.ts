import { toSlug } from './slug';

export interface Attack {
  method: string;
  effect: string | undefined;
  damage: string | undefined;
}

export interface MonsterDef {
  key: string;
  index: number;
  name: string;
  symbol: string;
  color: string;
  speed: number;
  hp: string;
  vision: number;
  ac: number;
  alertness: number;
  depth: number;
  rarity: number;
  exp: number;
  attacks: Attack[];
  flags: string[];
  description: string;
}

export type MonsterRecord = Record<string, MonsterDef>;

interface RawMonster {
  index: number;
  name: string;
  slug: string;
  symbol: string;
  color: string;
  speed: number;
  hp: string;
  vision: number;
  ac: number;
  alertness: number;
  depth: number;
  rarity: number;
  exp: number;
  attacks: Attack[];
  flags: string[];
  description: string;
}

function createEmptyRaw(index: number, name: string): RawMonster {
  return {
    index,
    name,
    slug: toSlug(name),
    symbol: '?',
    color: 'w',
    speed: 110,
    hp: '1d1',
    vision: 20,
    ac: 0,
    alertness: 0,
    depth: 0,
    rarity: 1,
    exp: 0,
    attacks: [],
    flags: [],
    description: '',
  };
}

export function parseMonsters(text: string): MonsterRecord {
  const lines = text.split('\n');
  const entries: RawMonster[] = [];
  let current: RawMonster | null = null;

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
          const [speed, hp, vision, ac, alertness] = value.split(':');
          current.speed = parseInt(speed ?? '110', 10);
          current.hp = hp ?? '1d1';
          current.vision = parseInt(vision ?? '20', 10);
          current.ac = parseInt(ac ?? '0', 10);
          current.alertness = parseInt(alertness ?? '0', 10);
        }
        break;
      }
      case 'W': {
        if (current) {
          const [depth, rarity, , exp] = value.split(':');
          current.depth = parseInt(depth ?? '0', 10);
          current.rarity = parseInt(rarity ?? '1', 10);
          current.exp = parseInt(exp ?? '0', 10);
        }
        break;
      }
      case 'B': {
        if (current) {
          const parts = value.split(':');
          const attack: Attack = {
            method: parts[0] ?? '',
            effect: parts[1] || undefined,
            damage: parts[2] || undefined,
          };
          current.attacks.push(attack);
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
      case 'D': {
        if (current) {
          if (current.description) {
            current.description += value;
          } else {
            current.description = value;
          }
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
  const monsters: MonsterRecord = {};
  for (const entry of entries) {
    const hasCollision = (slugCounts.get(entry.slug) ?? 0) > 1;
    const key = hasCollision ? `${entry.slug}_${entry.index}` : entry.slug;

    if (monsters[key]) {
      throw new Error(`Duplicate monster key: ${key}`);
    }

    monsters[key] = {
      key,
      index: entry.index,
      name: entry.name,
      symbol: entry.symbol,
      color: entry.color,
      speed: entry.speed,
      hp: entry.hp,
      vision: entry.vision,
      ac: entry.ac,
      alertness: entry.alertness,
      depth: entry.depth,
      rarity: entry.rarity,
      exp: entry.exp,
      attacks: entry.attacks,
      flags: entry.flags,
      description: entry.description,
    };
  }

  return monsters;
}
