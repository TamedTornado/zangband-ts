/**
 * Room Type 13: Large Room with Fractal Feature
 *
 * Large room with a central feature (liquid, walls, or rubble).
 */

import { type RoomBuilderContext, type FeatureType } from '../DungeonTypes';

export function buildType13(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const xsize = (ctx.randint1(11) * 2) + 6;
  const ysize = (ctx.randint1(7) * 2) + 6;

  const pos = ctx.roomAlloc(xsize + 1, ysize + 1, false, bx0, by0);
  if (!pos) return;

  const y1 = pos.y - Math.floor(ysize / 2);
  const y2 = pos.y + Math.floor((ysize - 1) / 2);
  const x1 = pos.x - Math.floor(xsize / 2);
  const x2 = pos.x + Math.floor((xsize - 1) / 2);

  ctx.generateRoom(x1 - 1, y1 - 1, x2 + 1, y2 + 1, false);
  ctx.generateDraw(x1 - 1, y1 - 1, x2 + 1, y2 + 1, 'wall_outer');
  ctx.generateFill(x1, y1, x2, y2, ctx.dun.featFloor);

  // Add central feature
  const featureType = ctx.randint0(4);
  const fx1 = x1 + 3;
  const fx2 = x2 - 3;
  const fy1 = y1 + 2;
  const fy2 = y2 - 2;

  let feat: FeatureType;
  switch (featureType) {
    case 0: feat = ctx.dun.featDeepLiquid; break;
    case 1: feat = ctx.dun.featShalLiquid; break;
    case 2: feat = 'wall_inner'; break;
    default: feat = 'rubble'; break;
  }

  ctx.generateFill(fx1, fy1, fx2, fy2, feat);
}
