import { FOV } from 'rot-js';
import type { Position } from '../types';
import type { Level } from '../world/Level';

export class FOVSystem {
  compute(level: Level, origin: Position, radius: number): Set<string> {
    const visible = new Set<string>();

    const fov = new FOV.PreciseShadowcasting((x, y) => {
      return level.isTransparent({ x, y });
    });

    fov.compute(origin.x, origin.y, radius, (x, y, _r, _visibility) => {
      if (level.isInBounds({ x, y })) {
        visible.add(`${x},${y}`);
      }
    });

    return visible;
  }

  computeAndMark(level: Level, origin: Position, radius: number): Set<string> {
    const visible = this.compute(level, origin, radius);

    for (const key of visible) {
      const [x, y] = key.split(',').map(Number);
      const tile = level.getTile({ x, y });
      if (tile) {
        tile.explored = true;
      }
    }

    return visible;
  }
}
