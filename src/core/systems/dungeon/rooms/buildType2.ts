/**
 * Room Type 2: Overlapping Rectangles
 *
 * Two overlapping rectangular rooms creating an irregular shape.
 */

import { type RoomBuilderContext } from '../DungeonTypes';

export function buildType2(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const pos = ctx.roomAlloc(25, 11, false, bx0, by0);
  if (!pos) return;

  const light = ctx.depth <= ctx.randint1(25);
  const xval = pos.x;
  const yval = pos.y;

  // Room A
  const a_y1 = yval - ctx.randRange(1, 4);
  const a_y2 = yval + ctx.randRange(1, 3);
  const a_x1 = xval - ctx.randRange(1, 11);
  const a_x2 = xval + ctx.randRange(1, 10);

  // Room B
  const b_y1 = yval - ctx.randRange(1, 3);
  const b_y2 = yval + ctx.randRange(1, 4);
  const b_x1 = xval - ctx.randRange(1, 10);
  const b_x2 = xval + ctx.randRange(1, 11);

  ctx.generateRoom(a_x1 - 1, a_y1 - 1, a_x2 + 1, a_y2 + 1, light);
  ctx.generateDraw(a_x1 - 1, a_y1 - 1, a_x2 + 1, a_y2 + 1, 'wall_outer');
  ctx.generateFill(a_x1, a_y1, a_x2, a_y2, ctx.dun.featFloor);

  ctx.generateRoom(b_x1 - 1, b_y1 - 1, b_x2 + 1, b_y2 + 1, light);
  ctx.generateDraw(b_x1 - 1, b_y1 - 1, b_x2 + 1, b_y2 + 1, 'wall_outer');
  ctx.generateFill(b_x1, b_y1, b_x2, b_y2, ctx.dun.featFloor);
}
