/**
 * Room Type 25: Connected Rooms
 *
 * Multiple small rooms connected by corridors.
 */

import { type RoomBuilderContext } from '../DungeonTypes';

export function buildType25(ctx: RoomBuilderContext, bx0: number, by0: number): void {
  const pos = ctx.roomAlloc(25, 11, false, bx0, by0);
  if (!pos) return;

  const light = ctx.depth <= ctx.randint1(25);

  const numRooms = ctx.randRange(2, 4);
  const roomSize = 4;

  let prevX = pos.x - 10;
  let prevY = pos.y;

  for (let i = 0; i < numRooms; i++) {
    const rx = prevX + ctx.randRange(3, 6);
    const ry = pos.y + ctx.randRange(-3, 3);

    ctx.generateRoom(rx - roomSize, ry - roomSize, rx + roomSize, ry + roomSize, light);
    ctx.generateDraw(rx - roomSize, ry - roomSize, rx + roomSize, ry + roomSize, 'wall_outer');
    ctx.generateFill(rx - roomSize + 1, ry - roomSize + 1, rx + roomSize - 1, ry + roomSize - 1, ctx.dun.featFloor);

    // Connect to previous
    if (i > 0) {
      ctx.generateLine(prevX, prevY, rx - roomSize, ry, ctx.dun.featFloor);
    }

    prevX = rx + roomSize;
    prevY = ry;
  }
}
