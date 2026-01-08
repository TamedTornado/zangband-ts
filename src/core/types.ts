export interface Position {
  x: number;
  y: number;
}

/**
 * Damage/effect elements - matches Zangband GF_* types
 */
export const Element = {
  // Physical
  Physical: 'physical',

  // Classic elements
  Fire: 'fire',
  Cold: 'cold',
  Acid: 'acid',
  Lightning: 'lightning',
  Poison: 'poison',

  // Light/Dark
  Light: 'light',
  Dark: 'dark',

  // High-level elements
  Chaos: 'chaos',
  Nether: 'nether',
  Nexus: 'nexus',
  Sound: 'sound',
  Shards: 'shards',
  Confusion: 'confusion',
  Disenchant: 'disenchant',
  Time: 'time',
  Gravity: 'gravity',
  Inertia: 'inertia',
  Force: 'force',
  Plasma: 'plasma',
  Mana: 'mana',

  // Special
  Magic: 'magic', // Pure magic damage, rarely resisted
  Holy: 'holy', // Damages evil
  Arrow: 'arrow', // Physical ranged
} as const;

export type Element = (typeof Element)[keyof typeof Element];

/**
 * Human-readable names for elements
 */
export const ELEMENT_NAMES: Record<Element, string> = {
  physical: 'physical',
  fire: 'fire',
  cold: 'cold',
  acid: 'acid',
  lightning: 'lightning',
  poison: 'poison',
  light: 'light',
  dark: 'darkness',
  chaos: 'chaos',
  nether: 'nether',
  nexus: 'nexus',
  sound: 'sound',
  shards: 'shards',
  confusion: 'confusion',
  disenchant: 'disenchantment',
  time: 'time',
  gravity: 'gravity',
  inertia: 'inertia',
  force: 'force',
  plasma: 'plasma',
  mana: 'mana',
  magic: 'magic',
  holy: 'holy',
  arrow: '',
};

export const Direction = {
  North: 'north',
  South: 'south',
  East: 'east',
  West: 'west',
  NorthEast: 'northeast',
  NorthWest: 'northwest',
  SouthEast: 'southeast',
  SouthWest: 'southwest',
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];

const DIRECTION_DELTAS: Record<Direction, Position> = {
  [Direction.North]: { x: 0, y: -1 },
  [Direction.South]: { x: 0, y: 1 },
  [Direction.East]: { x: 1, y: 0 },
  [Direction.West]: { x: -1, y: 0 },
  [Direction.NorthEast]: { x: 1, y: -1 },
  [Direction.NorthWest]: { x: -1, y: -1 },
  [Direction.SouthEast]: { x: 1, y: 1 },
  [Direction.SouthWest]: { x: -1, y: 1 },
};

export function movePosition(pos: Position, dir: Direction): Position {
  const delta = DIRECTION_DELTAS[dir];
  return { x: pos.x + delta.x, y: pos.y + delta.y };
}
