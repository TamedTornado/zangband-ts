export interface Attack {
  method: string;
  effect: string | undefined;
  damage: string | undefined;
}

export interface MonsterDef {
  id: number;
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

function createEmptyMonster(): MonsterDef {
  return {
    id: 0,
    name: '',
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

export function parseMonsters(text: string): MonsterDef[] {
  const lines = text.split('\n');
  const monsters: MonsterDef[] = [];
  let current: MonsterDef | null = null;

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
          monsters.push(current);
        }
        const [idStr, ...nameParts] = value.split(':');
        current = createEmptyMonster();
        current.id = parseInt(idStr ?? '0', 10);
        current.name = nameParts.join(':');
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
      // O: and S: lines ignored for now
    }
  }

  if (current) {
    monsters.push(current);
  }

  return monsters;
}
