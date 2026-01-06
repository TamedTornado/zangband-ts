/**
 * Room Type 17: Triangular Rooms
 *
 * Room composed of multiple overlapping triangles.
 */

import { type RoomBuilderContext, CAVE_ROOM, CAVE_GLOW } from '../DungeonTypes';

export function buildType17(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const y1 = ctx.randint1(14);
  const x1 = ctx.randint1(14);
  const y2 = ctx.randint1(14);
  const x2 = ctx.randint1(14);

  const xsize = x1 + x2 + 1;
  const ysize = y1 + y2 + 1;

  const pos = ctx.roomAlloc(xsize + 2, ysize + 2, false, bx0, by0);
  if (!pos) return;

  const light = ctx.depth <= ctx.randint1(25);
  const rx1 = pos.x - Math.floor(xsize / 2);
  const rx2 = pos.x + Math.floor((xsize - 1) / 2);
  const ry1 = pos.y - Math.floor(ysize / 2);
  const ry2 = pos.y + Math.floor((ysize - 1) / 2);

  if (xsize * ysize < 20) {
    // Too small, just make rectangle
    ctx.generateRoom(rx1, ry1, rx2, ry2, light);
    ctx.generateFill(rx1 + 1, ry1 + 1, rx2 - 1, ry2 - 1, ctx.dun.featFloor);
    ctx.generateDraw(rx1, ry1, rx2, ry2, 'wall_outer');
    return;
  }

  // Draw triangles
  const numTriangles = ctx.randRange(2, 4);
  for (let i = 0; i < numTriangles; i++) {
    const vx1 = ctx.randRange(rx1, rx2);
    const vx2 = ctx.randRange(rx1, rx2);
    const vx3 = ctx.randRange(rx1, rx2);
    const vy1 = ctx.randRange(ry1, ry2);
    const vy2 = ctx.randRange(ry1, ry2);
    const vy3 = ctx.randRange(ry1, ry2);

    fillTriangle(ctx, vx1, vy1, vx2, vy2, vx3, vy3, light);
  }
}

function fillTriangle(
  ctx: RoomBuilderContext,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  light: boolean
): void {
  const minX = Math.min(x1, x2, x3);
  const maxX = Math.max(x1, x2, x3);
  const minY = Math.min(y1, y2, y3);
  const maxY = Math.max(y1, y2, y3);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (pointInTriangle(x, y, x1, y1, x2, y2, x3, y3)) {
        ctx.setFeat(x, y, ctx.dun.featFloor);
        if (ctx.inBounds(x, y)) {
          ctx.tiles[y][x].info |= CAVE_ROOM;
          if (light) ctx.tiles[y][x].info |= CAVE_GLOW;
        }
      }
    }
  }
}

function pointInTriangle(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number
): boolean {
  const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
  const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}
