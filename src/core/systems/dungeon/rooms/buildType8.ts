/**
 * Room Type 8: Large Vault
 *
 * A large vault with nested inner structure.
 * TODO: Load actual vault layouts from v_info.
 */

import { type RoomBuilderContext } from '../DungeonTypes';

export function buildType8(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const pos = ctx.roomAlloc(33, 22, false, bx0, by0);
  if (!pos) return;

  const y1 = pos.y - 10;
  const y2 = pos.y + 10;
  const x1 = pos.x - 15;
  const x2 = pos.x + 15;

  ctx.generateVault(x1 - 1, y1 - 1, x2 + 1, y2 + 1);
  ctx.generateDraw(x1 - 1, y1 - 1, x2 + 1, y2 + 1, 'wall_outer');
  ctx.generateFill(x1, y1, x2, y2, ctx.dun.featFloor);

  // Inner structure
  ctx.generateDraw(x1 + 3, y1 + 3, x2 - 3, y2 - 3, 'wall_inner');
  ctx.generatePlus(x1 + 3, y1 + 3, x2 - 3, y2 - 3, ctx.dun.featFloor);

  ctx.incRating(25);
}
