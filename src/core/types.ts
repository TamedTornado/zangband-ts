export interface Position {
  x: number;
  y: number;
}

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
