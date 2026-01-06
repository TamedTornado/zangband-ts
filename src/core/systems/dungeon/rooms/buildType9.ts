/**
 * Room Type 9: Fractal Cave
 *
 * Irregular cave-like room with organic shape.
 */

import { type RoomBuilderContext, CAVE_ROOM, CAVE_GLOW } from '../DungeonTypes';

export function buildType9(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const xsize = ctx.randRange(12, 22);
  const ysize = ctx.randRange(8, 14);

  const pos = ctx.roomAlloc(xsize + 1, ysize + 1, false, bx0, by0);
  if (!pos) return;

  const light = ctx.depth <= ctx.randint1(25);

  const x0 = pos.x;
  const y0 = pos.y;
  const xhalf = Math.floor(xsize / 2);
  const yhalf = Math.floor(ysize / 2);

  // Create irregular floor
  for (let y = y0 - yhalf; y <= y0 + yhalf; y++) {
    for (let x = x0 - xhalf; x <= x0 + xhalf; x++) {
      const dx = Math.abs(x - x0);
      const dy = Math.abs(y - y0);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < xhalf - ctx.randint0(3)) {
        ctx.setFeat(x, y, ctx.dun.featFloor);
        if (ctx.inBounds(x, y)) {
          ctx.tiles[y][x].info |= CAVE_ROOM;
          if (light) {
            ctx.tiles[y][x].info |= CAVE_GLOW;
          }
        }
      }
    }
  }
}
