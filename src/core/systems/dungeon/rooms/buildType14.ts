/**
 * Room Type 14: Large Room with Walls
 *
 * Large room with various interior wall patterns.
 */

import { type RoomBuilderContext } from '../DungeonTypes';

export function buildType14(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const pos = ctx.roomAlloc(25, 11, false, bx0, by0);
  if (!pos) return;

  const light = ctx.depth <= ctx.randint1(25);
  const y1 = pos.y - 4;
  const y2 = pos.y + 4;
  const x1 = pos.x - 11;
  const x2 = pos.x + 11;

  ctx.generateRoom(x1 - 1, y1 - 1, x2 + 1, y2 + 1, light);
  ctx.generateDraw(x1 - 1, y1 - 1, x2 + 1, y2 + 1, 'wall_outer');
  ctx.generateFill(x1, y1, x2, y2, ctx.dun.featFloor);

  const variant = ctx.randint0(5);
  switch (variant) {
    case 0: // Horizontal walls
      for (let x = x1 + 1; x < x2; x++) {
        ctx.setFeat(x, pos.y - 3, 'wall_inner');
        ctx.setFeat(x, pos.y - 1, 'wall_inner');
        ctx.setFeat(x, pos.y + 1, 'wall_inner');
        ctx.setFeat(x, pos.y + 3, 'wall_inner');
      }
      break;
    case 1: // S shape
      {
        const sgn = (ctx.randint0(2) * 2 - 1) * 3;
        for (let y = y1; y <= pos.y; y++) {
          ctx.setFeat(pos.x + sgn, y, 'wall_inner');
        }
        for (let y = y2; y >= pos.y; y--) {
          ctx.setFeat(pos.x - sgn, y, 'wall_inner');
        }
      }
      break;
    case 2: // Horizontal bar
      for (let x = pos.x - 4; x <= pos.x + 4; x++) {
        ctx.setFeat(x, pos.y, 'wall_inner');
      }
      break;
    case 3: // Plus
      ctx.generatePlus(x1, y1, x2, y2, 'wall_inner');
      break;
    default: // Pillars
      for (let y = y1 + 1; y < y2; y += 2) {
        for (let x = x1 + 1; x < x2; x += 2) {
          ctx.setFeat(x, y, 'pillar');
        }
      }
      break;
  }
}
