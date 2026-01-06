/**
 * Room Type 23: Semicircle
 *
 * Half-circle room.
 */

import { type RoomBuilderContext, CAVE_ROOM, CAVE_GLOW } from '../DungeonTypes';

export function buildType23(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const rad = ctx.randRange(4, 10);

  const pos = ctx.roomAlloc(rad * 2 + 1, rad + 1, false, bx0, by0);
  if (!pos) return;

  const light = ctx.randint1(ctx.depth) <= 15;
  const x0 = pos.x;
  const y0 = pos.y;
  const isTop = ctx.oneIn(2);

  // Make semicircular floor
  for (let x = x0 - rad; x <= x0 + rad; x++) {
    for (let y = y0 - (isTop ? rad : 0); y <= y0 + (isTop ? 0 : rad); y++) {
      const dist = Math.sqrt((x - x0) ** 2 + (y - y0) ** 2);
      if (dist <= rad - 1) {
        ctx.setFeat(x, y, ctx.dun.featFloor);
        if (ctx.inBounds(x, y)) {
          ctx.tiles[y][x].info |= CAVE_ROOM;
          if (light) ctx.tiles[y][x].info |= CAVE_GLOW;
        }
      } else if (dist <= rad + 1 && dist > rad - 1) {
        ctx.setFeat(x, y, 'wall_outer');
      }
    }
  }

  // Add straight wall
  ctx.generateLine(x0 - rad, y0, x0 + rad, y0, 'wall_outer');
}
