/**
 * Room Type 22: Very Large Pillared Chamber
 *
 * Massive room with regular pillar grid.
 */

import { type RoomBuilderContext } from '../DungeonTypes';

export function buildType22(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const pos = ctx.roomAlloc(40, 18, false, bx0, by0);
  if (!pos) return;

  const light = ctx.depth <= ctx.randint1(25);
  const y1 = pos.y - 8;
  const y2 = pos.y + 8;
  const x1 = pos.x - 19;
  const x2 = pos.x + 19;

  ctx.generateRoom(x1 - 1, y1 - 1, x2 + 1, y2 + 1, light);
  ctx.generateDraw(x1 - 1, y1 - 1, x2 + 1, y2 + 1, 'wall_outer');
  ctx.generateFill(x1, y1, x2, y2, ctx.dun.featFloor);

  // Regular pillar grid
  for (let y = y1 + 2; y < y2 - 1; y += 3) {
    for (let x = x1 + 2; x < x2 - 1; x += 4) {
      ctx.setFeat(x, y, 'pillar');
    }
  }
}
