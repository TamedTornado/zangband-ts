export interface EgoItemDef {
  id: number;
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

function createEmptyEgoItem(): EgoItemDef {
  return {
    id: 0,
    name: '',
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

export function parseEgoItems(text: string): EgoItemDef[] {
  const lines = text.split('\n');
  const egoItems: EgoItemDef[] = [];
  let current: EgoItemDef | null = null;

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
          egoItems.push(current);
        }
        const [idStr, ...nameParts] = value.split(':');
        current = createEmptyEgoItem();
        current.id = parseInt(idStr ?? '0', 10);
        current.name = nameParts.join(':');
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
    egoItems.push(current);
  }

  return egoItems;
}
