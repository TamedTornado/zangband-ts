/**
 * Room Type 19: Channel/Reservoir
 *
 * Long room with liquid running through center.
 */

import { type RoomBuilderContext } from '../DungeonTypes';

export function buildType19(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const light = ctx.depth <= ctx.randint1(25);

  if (ctx.oneIn(2)) {
    // Horizontal channel
    const pos = ctx.roomAlloc(41, 11, false, bx0, by0);
    if (!pos) return;

    const y1 = pos.y - 4;
    const y2 = pos.y + 4;
    const x1 = pos.x - 19;
    const x2 = pos.x + 19;

    ctx.generateRoom(x1 - 1, y1 - 1, x2 + 1, y2 + 1, light);
    ctx.generateDraw(x1 - 1, y1 - 1, x2 + 1, y2 + 1, 'wall_outer');
    ctx.generateFill(x1, y1, x2, y2, ctx.dun.featFloor);

    // Liquid channel
    ctx.generateFill(x1, y1 + 1, x2, y2 - 1, ctx.dun.featShalLiquid);
    for (let x = x1; x <= x2; x++) {
      for (let y = y1 + 2; y <= y2 - 2; y++) {
        if (ctx.randint1(ctx.depth + 10) > 10) {
          ctx.setFeat(x, y, ctx.dun.featDeepLiquid);
        }
      }
    }
  } else {
    // Vertical channel
    const pos = ctx.roomAlloc(11, 33, false, bx0, by0);
    if (!pos) return;

    const y1 = pos.y - 15;
    const y2 = pos.y + 15;
    const x1 = pos.x - 4;
    const x2 = pos.x + 4;

    ctx.generateRoom(x1 - 1, y1 - 1, x2 + 1, y2 + 1, light);
    ctx.generateDraw(x1 - 1, y1 - 1, x2 + 1, y2 + 1, 'wall_outer');
    ctx.generateFill(x1, y1, x2, y2, ctx.dun.featFloor);

    // Liquid channel
    ctx.generateFill(x1 + 1, y1, x2 - 1, y2, ctx.dun.featShalLiquid);
    for (let x = x1 + 2; x <= x2 - 2; x++) {
      for (let y = y1; y <= y2; y++) {
        if (ctx.randint1(ctx.depth + 10) > 10) {
          ctx.setFeat(x, y, ctx.dun.featDeepLiquid);
        }
      }
    }
  }
}
