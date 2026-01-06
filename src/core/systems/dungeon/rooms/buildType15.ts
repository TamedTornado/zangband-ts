/**
 * Room Type 15: Parallelogram
 *
 * Slanted rectangular room.
 */

import { type RoomBuilderContext, CAVE_ROOM, CAVE_GLOW } from '../DungeonTypes';

export function buildType15(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const h = ctx.randRange(6, 15);
  const w = ctx.randRange(11, 22);

  const pos = ctx.roomAlloc(w + h, h, false, bx0, by0);
  if (!pos) return;

  const light = ctx.depth <= ctx.randint1(25);
  const x1 = pos.x - Math.floor((w + h) / 2);
  const y1 = pos.y - Math.floor(h / 2);
  const isRight = ctx.oneIn(2);

  for (let y = 1; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = isRight ? x1 + x + y : x1 + x + h - y;
      const py = y1 + y;
      ctx.setFeat(px, py, ctx.dun.featFloor);
      if (ctx.inBounds(px, py)) {
        ctx.tiles[py][px].info |= CAVE_ROOM;
        if (light) ctx.tiles[py][px].info |= CAVE_GLOW;
      }
    }
  }
}
