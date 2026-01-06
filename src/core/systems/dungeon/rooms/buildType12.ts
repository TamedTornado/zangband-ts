/**
 * Room Type 12: Crypt I
 *
 * Diamond-shaped crypt using Manhattan distance metric.
 */

import { type RoomBuilderContext, CAVE_ROOM, CAVE_GLOW } from '../DungeonTypes';

export function buildType12(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const rad = ctx.randint1(9);

  const pos = ctx.roomAlloc(rad * 2 + 3, rad * 2 + 3, false, bx0, by0);
  if (!pos) return;

  const light = ctx.randint1(ctx.depth) <= 5;
  const x0 = pos.x;
  const y0 = pos.y;

  ctx.generateDraw(x0 - rad, y0 - rad, x0 + rad, y0 + rad, 'wall_extra');

  // Irregular floor using Manhattan metric
  for (let x = x0 - rad + 1; x <= x0 + rad - 1; x++) {
    for (let y = y0 - rad + 1; y <= y0 + rad - 1; y++) {
      const dx = Math.abs(x - x0);
      const dy = Math.abs(y - y0);
      if (dx + dy <= rad - 1 || (dx < 3 && dy < 3)) {
        ctx.setFeat(x, y, ctx.dun.featFloor);
        if (ctx.inBounds(x, y)) {
          ctx.tiles[y][x].info |= CAVE_ROOM;
          if (light) ctx.tiles[y][x].info |= CAVE_GLOW;
        }
      }
    }
  }
}
