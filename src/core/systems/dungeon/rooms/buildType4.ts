/**
 * Room Type 4: Large Nested Room
 *
 * Large room with an inner room accessed via a door.
 */

import { type RoomBuilderContext } from '../DungeonTypes';

export function buildType4(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const pos = ctx.roomAlloc(25, 11, false, bx0, by0);
  if (!pos) return;

  const light = ctx.depth <= ctx.randint1(25);
  const y1 = pos.y - 4;
  const y2 = pos.y + 4;
  const x1 = pos.x - 11;
  const x2 = pos.x + 11;

  ctx.generateRoom(x1 - 1, y1 - 1, x2 + 1, y2 + 1, light);
  ctx.generateDraw(x1 - 1, y1 - 1, x2 + 1, y2 + 1, 'wall_outer');
  ctx.generateFill(x1, y1, x2, y2, ctx.dun.featFloor);

  // Inner room
  const y1a = y1 + 2;
  const y2a = y2 - 2;
  const x1a = x1 + 2;
  const x2a = x2 - 2;

  ctx.generateDraw(x1a, y1a, x2a, y2a, 'wall_inner');
  ctx.generateDoor(x1a, y1a, x2a, y2a, ctx.oneIn(2));
}
