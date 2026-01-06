/**
 * Room Type 10: Random Vault
 *
 * Procedurally generated vault with various internal patterns.
 */

import { type RoomBuilderContext } from '../DungeonTypes';

export function buildType10(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const xsize = ctx.randRange(22, 44);
  const ysize = ctx.randRange(11, 22);

  const pos = ctx.roomAlloc(xsize + 1, ysize + 1, false, bx0, by0);
  if (!pos) return;

  const vtype = ctx.randint1(5);

  const y1 = pos.y - Math.floor(ysize / 2);
  const y2 = pos.y + Math.floor((ysize - 1) / 2);
  const x1 = pos.x - Math.floor(xsize / 2);
  const x2 = pos.x + Math.floor((xsize - 1) / 2);

  ctx.generateVault(x1 - 1, y1 - 1, x2 + 1, y2 + 1);
  ctx.generateDraw(x1 - 1, y1 - 1, x2 + 1, y2 + 1, 'wall_outer');
  ctx.generateFill(x1, y1, x2, y2, ctx.dun.featFloor);

  switch (vtype) {
    case 1: // Cross
      ctx.generatePlus(x1, y1, x2, y2, 'wall_inner');
      break;
    case 2: // Horizontal grid
      for (let y = y1 + 2; y < y2 - 1; y += 4) {
        ctx.generateLine(x1, y, x2, y, 'wall_inner');
      }
      break;
    case 3: // Vertical stripes
      for (let x = x1 + 3; x < x2 - 2; x += 5) {
        ctx.generateLine(x, y1, x, y2, 'wall_inner');
      }
      break;
    case 4: // Pillars
      for (let y = y1 + 2; y < y2; y += 3) {
        for (let x = x1 + 2; x < x2; x += 3) {
          ctx.setFeat(x, y, 'pillar');
        }
      }
      break;
    case 5: // Nested
      ctx.generateDraw(x1 + 3, y1 + 3, x2 - 3, y2 - 3, 'wall_inner');
      break;
  }

  ctx.incRating(10);
}
