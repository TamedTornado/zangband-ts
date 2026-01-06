/**
 * Room Type 16: Rectangle with Chunks Removed
 *
 * Rectangular room with corners cut out.
 */

import { type RoomBuilderContext } from '../DungeonTypes';

export function buildType16(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const y1 = ctx.randint1(4);
  const x1 = ctx.randint1(11);
  const y2 = ctx.randint1(3);
  const x2 = ctx.randint1(11);

  const xsize = x1 + x2 + 1;
  const ysize = y1 + y2 + 1;

  const pos = ctx.roomAlloc(xsize + 2, ysize + 2, false, bx0, by0);
  if (!pos) return;

  const light = ctx.depth <= ctx.randint1(25);
  const rx1 = pos.x - Math.floor(xsize / 2);
  const rx2 = pos.x + Math.floor((xsize - 1) / 2);
  const ry1 = pos.y - Math.floor(ysize / 2);
  const ry2 = pos.y + Math.floor((ysize - 1) / 2);

  ctx.generateRoom(rx1 - 1, ry1 - 1, rx2 + 1, ry2 + 1, light);
  ctx.generateFill(rx1, ry1, rx2, ry2, ctx.dun.featFloor);
  ctx.generateDraw(rx1 - 1, ry1 - 1, rx2 + 1, ry2 + 1, 'wall_outer');

  // Remove chunks
  const numChunks = ctx.randRange(1, 2);
  for (let i = 0; i < numChunks; i++) {
    const corner = ctx.randint1(4);
    let cx1: number, cy1: number, cx2: number, cy2: number;
    switch (corner) {
      case 1: // Top left
        cx1 = rx1; cx2 = ctx.randRange((rx1 + pos.x) / 2, pos.x - 1);
        cy1 = ry1; cy2 = ctx.randRange((ry1 + pos.y) / 2, pos.y - 1);
        break;
      case 2: // Bottom left
        cx1 = rx1; cx2 = ctx.randRange((rx1 + pos.x) / 2, pos.x - 1);
        cy1 = ctx.randRange(pos.y + 1, (pos.y + ry2) / 2); cy2 = ry2;
        break;
      case 3: // Top right
        cx1 = ctx.randRange(pos.x + 1, (pos.x + rx2) / 2); cx2 = rx2;
        cy1 = ry1; cy2 = ctx.randRange((ry1 + pos.y) / 2, pos.y - 1);
        break;
      default: // Bottom right
        cx1 = ctx.randRange(pos.x + 1, (pos.x + rx2) / 2); cx2 = rx2;
        cy1 = ctx.randRange(pos.y + 1, (pos.y + ry2) / 2); cy2 = ry2;
        break;
    }
    ctx.generateFill(Math.floor(cx1), Math.floor(cy1), Math.floor(cx2), Math.floor(cy2), 'wall_extra');
  }
}
