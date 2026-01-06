import type { Position } from '../types';

export interface CameraConfig {
  mode: 'center' | 'scroll';
  scrollMarginX?: number; // For scroll mode: tiles from edge before scrolling
  scrollMarginY?: number;
}

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Camera {
  private _x = 0;
  private _y = 0;
  private _width: number;
  private _height: number;
  private config: CameraConfig;

  constructor(
    viewportWidth: number,
    viewportHeight: number,
    config: CameraConfig = { mode: 'center' }
  ) {
    this._width = viewportWidth;
    this._height = viewportHeight;
    this.config = {
      scrollMarginX: 4,
      scrollMarginY: 2,
      ...config,
    };
  }

  get viewport(): Viewport {
    return { x: this._x, y: this._y, width: this._width, height: this._height };
  }

  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
  }

  /** Update camera position to keep target visible */
  follow(target: Position, levelWidth: number, levelHeight: number): void {
    if (this.config.mode === 'center') {
      this.centerOn(target, levelWidth, levelHeight);
    } else {
      this.scrollTo(target, levelWidth, levelHeight);
    }
  }

  /** Center viewport on target */
  private centerOn(target: Position, levelWidth: number, levelHeight: number): void {
    const halfW = Math.floor(this._width / 2);
    const halfH = Math.floor(this._height / 2);

    this._x = this.clamp(target.x - halfW, 0, Math.max(0, levelWidth - this._width));
    this._y = this.clamp(target.y - halfH, 0, Math.max(0, levelHeight - this._height));
  }

  /** Scroll when target approaches edge (Zangband-style) */
  private scrollTo(target: Position, levelWidth: number, levelHeight: number): void {
    const marginX = this.config.scrollMarginX!;
    const marginY = this.config.scrollMarginY!;
    const maxX = Math.max(0, levelWidth - this._width);
    const maxY = Math.max(0, levelHeight - this._height);

    // Scroll right
    if (target.x > this._x + this._width - marginX) {
      this._x = Math.min(target.x - this._width + marginX, maxX);
    }
    // Scroll left
    if (target.x < this._x + marginX) {
      this._x = Math.max(target.x - marginX, 0);
    }
    // Scroll down
    if (target.y > this._y + this._height - marginY) {
      this._y = Math.min(target.y - this._height + marginY, maxY);
    }
    // Scroll up
    if (target.y < this._y + marginY) {
      this._y = Math.max(target.y - marginY, 0);
    }
  }

  /** Convert world position to screen position */
  worldToScreen(world: Position): Position {
    return { x: world.x - this._x, y: world.y - this._y };
  }

  /** Convert screen position to world position */
  screenToWorld(screen: Position): Position {
    return { x: screen.x + this._x, y: screen.y + this._y };
  }

  /** Check if world position is visible */
  contains(world: Position): boolean {
    return (
      world.x >= this._x &&
      world.x < this._x + this._width &&
      world.y >= this._y &&
      world.y < this._y + this._height
    );
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
  }
}
