/**
 * Room Type 20: Collapsed Room
 *
 * Room filled with rubble debris.
 */

import { type RoomBuilderContext } from '../DungeonTypes';

export function buildType20(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const y1 = ctx.randint1(4);
  const x1 = ctx.randint1(11);
  const y2 = ctx.randint1(3);
  const x2 = ctx.randint1(11);

  const xsize = x1 + x2 + 1;
  const ysize = y1 + y2 + 1;

  const pos = ctx.roomAlloc(xsize + 2, ysize + 2, false, bx0, by0);
  if (!pos) return;

  const light = ctx.depth <= ctx.randint1(25);
  const rx1 = pos.x - Math.floor(xsize / 2);
  const rx2 = pos.x + Math.floor((xsize - 1) / 2);
  const ry1 = pos.y - Math.floor(ysize / 2);
  const ry2 = pos.y + Math.floor((ysize - 1) / 2);

  ctx.generateRoom(rx1 - 1, ry1 - 1, rx2 + 1, ry2 + 1, light);
  ctx.generateDraw(rx1 - 1, ry1 - 1, rx2 + 1, ry2 + 1, 'wall_outer');
  ctx.generateFill(rx1, ry1, rx2, ry2, ctx.dun.featFloor);

  // Add rubble
  for (let y = ry1; y <= ry2; y++) {
    for (let x = rx1; x <= rx2; x++) {
      if (ctx.oneIn(4)) {
        ctx.setFeat(x, y, 'rubble');
      }
    }
  }
}
