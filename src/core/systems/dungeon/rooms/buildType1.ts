/**
 * Room Type 1: Simple Rectangle
 *
 * Basic rectangular room with occasional pillars or rounded corners.
 * The most common room type, available from depth 1.
 */

import { type RoomBuilderContext } from '../DungeonTypes';

export function buildType1(ctx: RoomBuilderContext, bx0: number, by0: number): void {
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

  // Occasional pillar room (1 in 20)
  if (ctx.oneIn(20)) {
    for (let y = ry1; y <= ry2; y += 2) {
      for (let x = rx1; x <= rx2; x += 2) {
        ctx.setFeat(x, y, 'pillar');
      }
    }
  }
  // Occasional room with four pillars (1 in 40)
  else if (ctx.oneIn(40)) {
    if (ry1 + 4 < ry2 && rx1 + 4 < rx2) {
      ctx.setFeat(rx1 + 1, ry1 + 1, 'pillar');
      ctx.setFeat(rx2 - 1, ry1 + 1, 'pillar');
      ctx.setFeat(rx1 + 1, ry2 - 1, 'pillar');
      ctx.setFeat(rx2 - 1, ry2 - 1, 'pillar');
    }
  }
  // Occasional rounded corners (1 in 40)
  else if (ctx.oneIn(40)) {
    ctx.setFeat(rx1, ry1, 'wall_inner');
    ctx.setFeat(rx2, ry1, 'wall_inner');
    ctx.setFeat(rx1, ry2, 'wall_inner');
    ctx.setFeat(rx2, ry2, 'wall_inner');
  }
}
