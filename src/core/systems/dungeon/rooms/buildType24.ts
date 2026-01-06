/**
 * Room Type 24: Hourglass
 *
 * Hourglass-shaped room, wider at top and bottom.
 */

import { type RoomBuilderContext, CAVE_ROOM, CAVE_GLOW } from '../DungeonTypes';

export function buildType24(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const pos = ctx.roomAlloc(22, 16, false, bx0, by0);
  if (!pos) return;

  const light = ctx.depth <= ctx.randint1(25);
  const x0 = pos.x;
  const y0 = pos.y;

  const halfW = 10;
  const halfH = 7;

  for (let y = y0 - halfH; y <= y0 + halfH; y++) {
    const yDist = Math.abs(y - y0);
    const width = Math.max(2, halfW - yDist);

    for (let x = x0 - width; x <= x0 + width; x++) {
      ctx.setFeat(x, y, ctx.dun.featFloor);
      if (ctx.inBounds(x, y)) {
        ctx.tiles[y][x].info |= CAVE_ROOM;
        if (light) ctx.tiles[y][x].info |= CAVE_GLOW;
      }
    }
  }

  // Add outer walls
  for (let y = y0 - halfH - 1; y <= y0 + halfH + 1; y++) {
    const yDist = Math.abs(y - y0);
    const width = Math.max(2, halfW - yDist + 1);

    const leftX = x0 - width - 1;
    const rightX = x0 + width + 1;

    if (ctx.getFeat(leftX, y) !== ctx.dun.featFloor) {
      ctx.setFeat(leftX, y, 'wall_outer');
    }
    if (ctx.getFeat(rightX, y) !== ctx.dun.featFloor) {
      ctx.setFeat(rightX, y, 'wall_outer');
    }
  }
}
