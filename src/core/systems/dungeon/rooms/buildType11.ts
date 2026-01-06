/**
 * Room Type 11: Circular Room
 *
 * Round room, occasionally with liquid center.
 */

import { type RoomBuilderContext, CAVE_ROOM, CAVE_GLOW } from '../DungeonTypes';

export function buildType11(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const rad = ctx.randRange(2, 9);

  const pos = ctx.roomAlloc(rad * 2 + 1, rad * 2 + 1, false, bx0, by0);
  if (!pos) return;

  const light = ctx.randint1(ctx.depth) <= 15;
  const x0 = pos.x;
  const y0 = pos.y;

  // Make circular floor
  for (let x = x0 - rad; x <= x0 + rad; x++) {
    for (let y = y0 - rad; y <= y0 + rad; y++) {
      const dist = Math.sqrt((x - x0) ** 2 + (y - y0) ** 2);
      if (dist <= rad - 1) {
        ctx.setFeat(x, y, ctx.dun.featFloor);
        if (ctx.inBounds(x, y)) {
          ctx.tiles[y][x].info |= CAVE_ROOM;
          if (light) ctx.tiles[y][x].info |= CAVE_GLOW;
        }
      } else if (dist <= rad + 1) {
        ctx.setFeat(x, y, 'wall_extra');
      }
    }
  }

  // Occasionally add liquid center
  if (ctx.oneIn(3)) {
    const innerRad = ctx.randint1(rad - 1);
    for (let x = x0 - innerRad; x <= x0 + innerRad; x++) {
      for (let y = y0 - innerRad; y <= y0 + innerRad; y++) {
        const dist = Math.sqrt((x - x0) ** 2 + (y - y0) ** 2);
        if (dist <= innerRad - 1) {
          ctx.setFeat(x, y, ctx.dun.featShalLiquid);
        }
      }
    }
  }
}
