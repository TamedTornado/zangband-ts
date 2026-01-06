/**
 * Room Type 18: Chambers
 *
 * Grid of small rooms with doors.
 */

import { type RoomBuilderContext } from '../DungeonTypes';

export function buildType18(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const pos = ctx.roomAlloc(25, 11, false, bx0, by0);
  if (!pos) return;

  const light = ctx.depth <= ctx.randint1(25);
  const y1 = pos.y - 4;
  const y2 = pos.y + 4;
  const x1 = pos.x - 11;
  const x2 = pos.x + 11;

  ctx.generateRoom(x1 - 1, y1 - 1, x2 + 1, y2 + 1, light);
  ctx.generateFill(x1, y1, x2, y2, ctx.dun.featFloor);

  // Create chambers grid
  for (let i = 0; i < 6; i++) {
    ctx.generateDraw(x1 - 1 + i * 4, y1 - 1, x1 + 3 + i * 4, pos.y - 1, 'wall_inner');
    ctx.generateDraw(x1 - 1 + i * 4, pos.y + 1, x1 + 3 + i * 4, y2 + 1, 'wall_inner');
    ctx.placeRandomDoor(x1 + 1 + i * 4, pos.y - 1);
    ctx.placeRandomDoor(x1 + 1 + i * 4, pos.y + 1);
  }

  ctx.generateDraw(x1 - 1, y1 - 1, x2 + 1, y2 + 1, 'wall_outer');
}
