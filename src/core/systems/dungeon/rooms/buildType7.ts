/**
 * Room Type 7: Small Vault
 *
 * A small vault with cross pattern interior.
 * TODO: Load actual vault layouts from v_info.
 */

import { type RoomBuilderContext } from '../DungeonTypes';

export function buildType7(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const pos = ctx.roomAlloc(15, 9, false, bx0, by0);
  if (!pos) return;

  const y1 = pos.y - 3;
  const y2 = pos.y + 3;
  const x1 = pos.x - 6;
  const x2 = pos.x + 6;

  ctx.generateVault(x1 - 1, y1 - 1, x2 + 1, y2 + 1);
  ctx.generateDraw(x1 - 1, y1 - 1, x2 + 1, y2 + 1, 'wall_outer');
  ctx.generateFill(x1, y1, x2, y2, ctx.dun.featFloor);

  // Cross pattern
  ctx.generatePlus(x1, y1, x2, y2, 'wall_inner');

  ctx.incRating(10);
}
