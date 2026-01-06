/**
 * Room Type 3: Crossed Rooms
 *
 * Two rooms crossing each other (horizontal and vertical parts).
 */

import { type RoomBuilderContext } from '../DungeonTypes';

export function buildType3(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const pos = ctx.roomAlloc(25, 11, false, bx0, by0);
  if (!pos) return;

  const light = ctx.depth <= ctx.randint1(25);
  const xval = pos.x;
  const yval = pos.y;

  const wx = (xval - 11) + ctx.randRange(3, 10);
  const dy = ctx.randint1(3);
  const dx = ctx.randint1(11);

  // Horizontal part
  const y1 = yval - dy;
  const y2 = yval + dy;
  const x1 = xval - dx;
  const x2 = xval + dx;

  // Vertical part
  const y1b = yval - 4;
  const y2b = yval + 4;
  const x1b = wx;
  const x2b = wx + ctx.randRange(2, 6);

  ctx.generateRoom(x1 - 1, y1 - 1, x2 + 1, y2 + 1, light);
  ctx.generateDraw(x1 - 1, y1 - 1, x2 + 1, y2 + 1, 'wall_outer');
  ctx.generateFill(x1, y1, x2, y2, ctx.dun.featFloor);

  ctx.generateRoom(x1b - 1, y1b - 1, x2b + 1, y2b + 1, light);
  ctx.generateDraw(x1b - 1, y1b - 1, x2b + 1, y2b + 1, 'wall_outer');
  ctx.generateFill(x1b, y1b, x2b, y2b, ctx.dun.featFloor);
}
