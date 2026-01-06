/**
 * Dungeon Generator
 *
 * Main orchestrator for procedural dungeon generation.
 * Ported from Zangband's generate.c
 */

import type { RNG as ROTRng } from 'rot-js';
import {
  type DungeonConfig,
  type GeneratedDungeon,
  type DungeonTile,
  type DunData,
  type FeatureType,
  type RoomBuilderContext,
  type Coord,
  type Room,
  CAVE_ROOM,
  CAVE_GLOW,
  CAVE_ICKY,
  RT_TAG_CROWDED,
  BLOCK_HGT,
  BLOCK_WID,
  CENT_MAX,
  DUN_TUN_RND_MIN,
  DUN_TUN_RND_MAX,
  DUN_TUN_CHG_MIN,
  DUN_TUN_CHG_MAX,
  DUN_TUN_PEN_MIN,
  DUN_TUN_PEN_MAX,
  DUN_TUN_JCT_MIN,
  DUN_TUN_JCT_MAX,
  DUN_ROOMS_MIN,
  DUN_ROOMS_MAX,
} from './DungeonTypes';
import { roomList } from './rooms';
import { TunnelGenerator, allocStairs } from './TunnelGenerator';

export class DungeonGenerator {
  private rng: typeof ROTRng;
  private tiles: DungeonTile[][] = [];
  private width = 0;
  private height = 0;
  private depth = 0;
  private dun!: DunData;
  private rating = 0;

  constructor(rng: typeof ROTRng) {
    this.rng = rng;
  }

  generate(config: DungeonConfig): GeneratedDungeon {
    this.width = config.width;
    this.height = config.height;
    this.depth = config.depth;
    this.rating = 0;

    this.initDunData(config);
    this.initTiles();

    // Randomize tunnel parameters
    const tunnelParams = {
      dunTunRnd: this.randRange(DUN_TUN_RND_MIN, DUN_TUN_RND_MAX),
      dunTunChg: this.randRange(DUN_TUN_CHG_MIN, DUN_TUN_CHG_MAX),
      dunTunPen: this.randRange(DUN_TUN_PEN_MIN, DUN_TUN_PEN_MAX),
      dunTunJct: this.randRange(DUN_TUN_JCT_MIN, DUN_TUN_JCT_MAX),
    };

    // Build rooms
    const numRooms = this.randRange(DUN_ROOMS_MIN, DUN_ROOMS_MAX);
    for (let i = 0; i < numRooms; i++) {
      let count = 0;
      while (!this.roomBuild() && count++ < 20) {
        // Keep trying
      }
    }

    this.addBoundaryWalls();

    // Connect rooms with tunnels
    const ctx = this.createContext();
    const tunnelGen = new TunnelGenerator(ctx);
    tunnelGen.shuffleRoomOrder();
    tunnelGen.connectRooms(tunnelParams);

    // Place stairs
    const upStairs: Coord[] = [];
    const downStairs: Coord[] = [];

    const numDown = this.randRange(3, 4);
    for (let i = 0; i < numDown; i++) {
      const pos = allocStairs(ctx, 'down_stairs');
      if (pos) downStairs.push(pos);
    }

    if (this.depth > 1) {
      const numUp = this.randRange(1, 2);
      for (let i = 0; i < numUp; i++) {
        const pos = allocStairs(ctx, 'up_stairs');
        if (pos) upStairs.push(pos);
      }
    }

    // Build rooms array
    const rooms: Room[] = [];
    for (let i = 0; i < this.dun.centN; i++) {
      const c = this.dun.cent[i];
      rooms.push({
        x1: c.x - 5,
        y1: c.y - 3,
        x2: c.x + 5,
        y2: c.y + 3,
        centerX: c.x,
        centerY: c.y,
        lit: (this.tiles[c.y]?.[c.x]?.info & CAVE_GLOW) !== 0,
        type: 1,
      });
    }

    return {
      width: this.width,
      height: this.height,
      depth: this.depth,
      tiles: this.tiles,
      rooms,
      upStairs,
      downStairs,
      rating: this.rating,
    };
  }

  private initDunData(config: DungeonConfig): void {
    this.dun = {
      centN: 0,
      cent: [],
      doorN: 0,
      door: [],
      wallN: 0,
      wall: [],
      tunnN: 0,
      tunn: [],
      rowRooms: Math.floor(this.height / BLOCK_HGT),
      colRooms: Math.floor(this.width / BLOCK_WID),
      roomMap: [],
      crowded: 0,
      roomTypes: config.roomTypes ?? 0xFFFF,
      featFloor: config.floorFeat ?? 'floor',
      featShalLiquid: config.shallowLiquid ?? 'shallow_water',
      featDeepLiquid: config.deepLiquid ?? 'deep_water',
    };

    for (let y = 0; y < this.dun.rowRooms; y++) {
      this.dun.roomMap[y] = [];
      for (let x = 0; x < this.dun.colRooms; x++) {
        this.dun.roomMap[y][x] = false;
      }
    }
  }

  private initTiles(): void {
    this.tiles = [];
    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.tiles[y][x] = { feat: 'wall_extra', info: 0 };
      }
    }
  }

  private addBoundaryWalls(): void {
    for (let x = 0; x < this.width; x++) {
      this.setFeat(x, 0, 'permanent_wall');
      this.setFeat(x, this.height - 1, 'permanent_wall');
    }
    for (let y = 0; y < this.height; y++) {
      this.setFeat(0, y, 'permanent_wall');
      this.setFeat(this.width - 1, y, 'permanent_wall');
    }
  }

  /** Select and build a room */
  private roomBuild(): boolean {
    const bx0 = this.randint0(this.dun.colRooms);
    const by0 = this.randint0(this.dun.rowRooms);

    if (this.dun.roomMap[by0]?.[bx0]) return false;

    let depth = this.depth;
    if (this.oneIn(10)) depth += this.randint1(5);
    if (this.oneIn(10)) depth += this.randint1(5);

    let total = 0;
    for (const room of roomList) {
      if (depth < room.depth) continue;
      if (!(this.dun.roomTypes & room.flags)) continue;
      if (this.dun.crowded >= 2 && (room.flags & RT_TAG_CROWDED)) continue;
      total += room.chance;
    }

    if (total === 0) return false;

    let val = this.randint0(total);
    let typeIdx = 0;

    for (let i = 0; i < roomList.length; i++) {
      const room = roomList[i];
      if (depth < room.depth) continue;
      if (!(this.dun.roomTypes & room.flags)) continue;
      if (this.dun.crowded >= 2 && (room.flags & RT_TAG_CROWDED)) continue;

      val -= room.chance;
      if (val < 0) {
        typeIdx = i;
        break;
      }
    }

    const ctx = this.createContext();
    roomList[typeIdx].buildFunc(ctx, bx0, by0);
    return true;
  }

  /** Create a context object for room builders */
  private createContext(): RoomBuilderContext {
    return {
      tiles: this.tiles,
      width: this.width,
      height: this.height,
      depth: this.depth,
      dun: this.dun,
      rng: this.rng,
      rating: this.rating,

      setFeat: (x, y, feat) => this.setFeat(x, y, feat),
      getFeat: (x, y) => this.getFeat(x, y),
      inBounds: (x, y) => this.inBounds(x, y),
      generateRoom: (x1, y1, x2, y2, light) => this.generateRoom(x1, y1, x2, y2, light),
      generateVault: (x1, y1, x2, y2) => this.generateVault(x1, y1, x2, y2),
      generateFill: (x1, y1, x2, y2, feat) => this.generateFill(x1, y1, x2, y2, feat),
      generateDraw: (x1, y1, x2, y2, feat) => this.generateDraw(x1, y1, x2, y2, feat),
      generateLine: (x1, y1, x2, y2, feat) => this.generateLine(x1, y1, x2, y2, feat),
      generatePlus: (x1, y1, x2, y2, feat) => this.generatePlus(x1, y1, x2, y2, feat),
      generateDoor: (x1, y1, x2, y2, secret) => this.generateDoor(x1, y1, x2, y2, secret),
      placeRandomDoor: (x, y) => this.placeRandomDoor(x, y),
      roomAlloc: (xSize, ySize, crowded, bx0, by0) => this.roomAlloc(xSize, ySize, crowded, bx0, by0),

      randint0: (max) => this.randint0(max),
      randint1: (max) => this.randint1(max),
      randRange: (min, max) => this.randRange(min, max),
      oneIn: (n) => this.oneIn(n),
      incRating: (delta) => { this.rating += delta; },
    };
  }

  // ============================================================================
  // Grid Helpers
  // ============================================================================

  private setFeat(x: number, y: number, feat: FeatureType): void {
    if (this.inBounds(x, y)) {
      this.tiles[y][x].feat = feat;
    }
  }

  private getFeat(x: number, y: number): FeatureType | null {
    if (this.inBounds(x, y)) {
      return this.tiles[y][x].feat;
    }
    return null;
  }

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  private generateRoom(x1: number, y1: number, x2: number, y2: number, light: boolean): void {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        if (this.inBounds(x, y)) {
          this.tiles[y][x].info |= CAVE_ROOM;
          if (light) {
            this.tiles[y][x].info |= CAVE_GLOW;
          }
        }
      }
    }
  }

  private generateVault(x1: number, y1: number, x2: number, y2: number): void {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        if (this.inBounds(x, y)) {
          this.tiles[y][x].info |= CAVE_ROOM | CAVE_ICKY;
        }
      }
    }
  }

  private generateFill(x1: number, y1: number, x2: number, y2: number, feat: FeatureType): void {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        this.setFeat(x, y, feat);
      }
    }
  }

  private generateDraw(x1: number, y1: number, x2: number, y2: number, feat: FeatureType): void {
    for (let y = y1; y <= y2; y++) {
      this.setFeat(x1, y, feat);
      this.setFeat(x2, y, feat);
    }
    for (let x = x1; x <= x2; x++) {
      this.setFeat(x, y1, feat);
      this.setFeat(x, y2, feat);
    }
  }

  private generateLine(x1: number, y1: number, x2: number, y2: number, feat: FeatureType): void {
    if (x1 === x2) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
        this.setFeat(x1, y, feat);
      }
    } else if (y1 === y2) {
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
        this.setFeat(x, y1, feat);
      }
    }
  }

  private generatePlus(x1: number, y1: number, x2: number, y2: number, feat: FeatureType): void {
    const y0 = Math.floor((y1 + y2) / 2);
    const x0 = Math.floor((x1 + x2) / 2);

    for (let y = y1; y <= y2; y++) {
      this.setFeat(x0, y, feat);
    }
    for (let x = x1; x <= x2; x++) {
      this.setFeat(x, y0, feat);
    }
  }

  private generateDoor(x1: number, y1: number, x2: number, y2: number, secret: boolean): void {
    const y0 = Math.floor((y1 + y2) / 2);
    const x0 = Math.floor((x1 + x2) / 2);

    let dx = x0, dy = y0;
    switch (this.randint0(4)) {
      case 0: dy = y1; break;
      case 1: dx = x1; break;
      case 2: dy = y2; break;
      case 3: dx = x2; break;
    }

    this.setFeat(dx, dy, secret ? 'secret_door' : 'closed_door');
  }

  private placeRandomDoor(x: number, y: number): void {
    const tmp = this.randint0(1000);

    if (tmp < 300) {
      this.setFeat(x, y, 'open_door');
    } else if (tmp < 400) {
      this.setFeat(x, y, 'broken_door');
    } else if (tmp < 600) {
      this.setFeat(x, y, 'secret_door');
    } else {
      this.setFeat(x, y, 'closed_door');
    }
  }

  private roomAlloc(
    xSize: number,
    ySize: number,
    crowded: boolean,
    bx0: number,
    by0: number
  ): { x: number; y: number } | null {
    const tempX = Math.floor((xSize - 1) / BLOCK_WID) + 1;
    const bx2 = Math.floor(tempX / 2) + bx0;
    const bx1 = bx2 + 1 - tempX;

    const tempY = Math.floor((ySize - 1) / BLOCK_HGT) + 1;
    const by2 = Math.floor(tempY / 2) + by0;
    const by1 = by2 + 1 - tempY;

    if (by1 < 0 || by2 >= this.dun.rowRooms) return null;
    if (bx1 < 0 || bx2 >= this.dun.colRooms) return null;

    for (let by = by1; by <= by2; by++) {
      for (let bx = bx1; bx <= bx2; bx++) {
        if (this.dun.roomMap[by][bx]) return null;
      }
    }

    const yy = Math.floor((by1 + by2 + 1) * BLOCK_HGT / 2);
    const xx = Math.floor((bx1 + bx2 + 1) * BLOCK_WID / 2);

    if (this.dun.centN < CENT_MAX) {
      this.dun.cent[this.dun.centN] = { x: xx, y: yy };
      this.dun.centN++;
    }

    for (let by = by1; by <= by2; by++) {
      for (let bx = bx1; bx <= bx2; bx++) {
        this.dun.roomMap[by][bx] = true;
      }
    }

    if (crowded) {
      this.dun.crowded++;
    }

    return { x: xx, y: yy };
  }

  // ============================================================================
  // Random Helpers
  // ============================================================================

  private randint0(max: number): number {
    if (max <= 0) return 0;
    return this.rng.getUniformInt(0, max - 1);
  }

  private randint1(max: number): number {
    if (max <= 0) return 0;
    return this.rng.getUniformInt(1, max);
  }

  private randRange(min: number, max: number): number {
    return this.rng.getUniformInt(min, max);
  }

  private oneIn(n: number): boolean {
    return this.randint0(n) === 0;
  }
}
