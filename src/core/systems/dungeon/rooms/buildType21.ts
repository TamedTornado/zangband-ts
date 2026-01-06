/**
 * Room Type 21: Crypt II
 *
 * Octagonal crypt using Chebyshev distance metric.
 */

import { type RoomBuilderContext, CAVE_ROOM, CAVE_GLOW } from '../DungeonTypes';

export function buildType21(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const rad = ctx.randRange(3, 9);

  const pos = ctx.roomAlloc(rad * 2 + 3, rad * 2 + 3, false, bx0, by0);
  if (!pos) return;

  const light = ctx.randint1(ctx.depth) <= 5;
  const x0 = pos.x;
  const y0 = pos.y;

  // Outer shell
  for (let x = x0 - rad - 1; x <= x0 + rad + 1; x++) {
    for (let y = y0 - rad - 1; y <= y0 + rad + 1; y++) {
      ctx.setFeat(x, y, 'wall_extra');
    }
  }

  // Inner floor with irregular shape
  for (let x = x0 - rad; x <= x0 + rad; x++) {
    for (let y = y0 - rad; y <= y0 + rad; y++) {
      const dx = Math.abs(x - x0);
      const dy = Math.abs(y - y0);
      const dist = Math.max(dx, dy) + Math.min(dx, dy) / 2;

      if (dist <= rad - 1) {
        ctx.setFeat(x, y, ctx.dun.featFloor);
        if (ctx.inBounds(x, y)) {
          ctx.tiles[y][x].info |= CAVE_ROOM;
          if (light) ctx.tiles[y][x].info |= CAVE_GLOW;
        }
      }
    }
  }

  // Add small inner room if space
  if (rad >= 5 && ctx.oneIn(2)) {
    ctx.generateDraw(x0 - 1, y0 - 1, x0 + 1, y0 + 1, 'wall_inner');
    ctx.generateDoor(x0 - 1, y0 - 1, x0 + 1, y0 + 1, true);
    ctx.setFeat(x0, y0, ctx.dun.featFloor);
  }
}
