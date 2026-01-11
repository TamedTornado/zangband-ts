/**
 * Tunnel Generator
 *
 * Generates corridors connecting rooms in the dungeon.
 * Ported from Zangband's grid.c
 */

import type { RoomBuilderContext, FeatureType, Coord } from './DungeonTypes';

/** Tunnel generation parameters */
export interface TunnelParams {
  dunTunRnd: number;  // Random direction chance
  dunTunChg: number;  // Direction change chance
  dunTunPen: number;  // Door placement chance
  dunTunJct: number;  // Junction door chance
}

export class TunnelGenerator {
  private ctx: RoomBuilderContext;

  constructor(ctx: RoomBuilderContext) {
    this.ctx = ctx;
  }

  /** Shuffle room centers for varied tunnel connections */
  shuffleRoomOrder(): void {
    const cent = this.ctx.dun.cent;
    const n = this.ctx.dun.centN;

    for (let i = 0; i < n; i++) {
      const j = this.ctx.randint0(n);
      const temp = cent[i];
      cent[i] = cent[j];
      cent[j] = temp;
    }
  }

  /** Connect all rooms with tunnels */
  connectRooms(params: TunnelParams): void {
    const n = this.ctx.dun.centN;
    if (n < 2) return;

    // Connect each room to the next in shuffled order
    let prevX = this.ctx.dun.cent[n - 1].x;
    let prevY = this.ctx.dun.cent[n - 1].y;

    for (let i = 0; i < n; i++) {
      const curr = this.ctx.dun.cent[i];
      this.buildTunnel(curr.x, curr.y, prevX, prevY, params);
      prevX = curr.x;
      prevY = curr.y;
    }
  }

  /** Build a tunnel between two points */
  private buildTunnel(
    x1: number, y1: number,
    x2: number, y2: number,
    params: TunnelParams
  ): void {
    let col1 = x1, row1 = y1;
    const col2 = x2, row2 = y2;

    let mainLoop = 0;
    let doorFlag = false;

    let [colDir, rowDir] = this.correctDir(col1, row1, col2, row2);

    while ((row1 !== row2 || col1 !== col2) && mainLoop++ < 2000) {
      // Allow bends
      if (this.ctx.randint0(100) < params.dunTunChg) {
        [colDir, rowDir] = this.correctDir(col1, row1, col2, row2);
        if (this.ctx.randint0(100) < params.dunTunRnd) {
          [colDir, rowDir] = this.randDir();
        }
      }

      let tmpRow = row1 + rowDir;
      let tmpCol = col1 + colDir;

      // Stay in bounds
      while (!this.ctx.inBounds(tmpCol, tmpRow)) {
        [colDir, rowDir] = this.correctDir(col1, row1, col2, row2);
        if (this.ctx.randint0(100) < params.dunTunRnd) {
          [colDir, rowDir] = this.randDir();
        }
        tmpRow = row1 + rowDir;
        tmpCol = col1 + colDir;
      }

      const feat = this.ctx.getFeat(tmpCol, tmpRow);

      // Solid wall - can't pass
      if (feat === 'permanent_wall' || feat === 'wall_solid') {
        continue;
      }

      // Room entrance
      if (feat === 'wall_outer') {
        if (this.ctx.randint0(100) < params.dunTunPen) {
          this.ctx.placeRandomDoor(tmpCol, tmpRow);
        } else {
          this.ctx.setFeat(tmpCol, tmpRow, this.ctx.dun.featFloor);
        }
        doorFlag = true;
      }
      // Granite wall
      else if (feat === 'wall_extra' || feat === 'wall_inner') {
        this.ctx.setFeat(tmpCol, tmpRow, this.ctx.dun.featFloor);
        doorFlag = false;
      }
      // Floor - check for junction
      else if (feat === this.ctx.dun.featFloor || feat === 'floor') {
        if (doorFlag && this.ctx.randint0(100) < params.dunTunJct) {
          this.tryDoor(tmpCol - 1, tmpRow, params);
          this.tryDoor(tmpCol + 1, tmpRow, params);
          this.tryDoor(tmpCol, tmpRow - 1, params);
          this.tryDoor(tmpCol, tmpRow + 1, params);
        }
        doorFlag = false;
      }

      row1 = tmpRow;
      col1 = tmpCol;
    }
  }

  /** Get direction toward target */
  private correctDir(col1: number, row1: number, col2: number, row2: number): [number, number] {
    let colDir = 0, rowDir = 0;

    if (col1 < col2) colDir = 1;
    else if (col1 > col2) colDir = -1;

    if (row1 < row2) rowDir = 1;
    else if (row1 > row2) rowDir = -1;

    // Prefer to move in longer direction
    if (colDir && rowDir) {
      if (this.ctx.randint0(Math.abs(col2 - col1) + Math.abs(row2 - row1)) < Math.abs(col2 - col1)) {
        rowDir = 0;
      } else {
        colDir = 0;
      }
    }

    return [colDir, rowDir];
  }

  /** Get random direction */
  private randDir(): [number, number] {
    switch (this.ctx.randint0(4)) {
      case 0: return [0, -1];
      case 1: return [0, 1];
      case 2: return [-1, 0];
      default: return [1, 0];
    }
  }

  /** Try to place a door at a floor tile */
  private tryDoor(x: number, y: number, params: TunnelParams): void {
    if (!this.ctx.inBounds(x, y)) return;

    const feat = this.ctx.getFeat(x, y);
    if (feat !== this.ctx.dun.featFloor && feat !== 'floor') return;

    const wallCount = this.nextToWalls(x, y);
    if (wallCount >= 2 && this.ctx.randint0(100) < params.dunTunJct) {
      this.ctx.placeRandomDoor(x, y);
    }
  }

  /** Count adjacent walls */
  private nextToWalls(x: number, y: number): number {
    let count = 0;
    if (this.isWall(x - 1, y)) count++;
    if (this.isWall(x + 1, y)) count++;
    if (this.isWall(x, y - 1)) count++;
    if (this.isWall(x, y + 1)) count++;
    return count;
  }

  /** Check if tile is a wall */
  private isWall(x: number, y: number): boolean {
    const feat = this.ctx.getFeat(x, y);
    return feat !== null && (
      feat === 'wall_extra' ||
      feat === 'wall_inner' ||
      feat === 'wall_outer' ||
      feat === 'wall_solid' ||
      feat === 'permanent_wall'
    );
  }
}

/** Place stairs in the dungeon */
export function allocStairs(
  ctx: RoomBuilderContext,
  stairType: 'up_staircase' | 'down_staircase'
): Coord | null {
  for (let attempt = 0; attempt < 5000; attempt++) {
    const x = ctx.randRange(1, ctx.width - 2);
    const y = ctx.randRange(1, ctx.height - 2);

    const feat = ctx.getFeat(x, y);
    if (feat !== ctx.dun.featFloor && feat !== 'floor') continue;

    // Prefer spots near walls
    const wallCount = countAdjacentWalls(ctx, x, y);
    if (wallCount < 2 && attempt < 1000) continue;

    ctx.setFeat(x, y, stairType);
    return { x, y };
  }
  return null;
}

function countAdjacentWalls(ctx: RoomBuilderContext, x: number, y: number): number {
  let count = 0;
  const walls: FeatureType[] = ['wall_extra', 'wall_inner', 'wall_outer', 'wall_solid', 'permanent_wall'];

  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const feat = ctx.getFeat(x + dx, y + dy);
    if (feat && walls.includes(feat)) count++;
  }
  return count;
}
