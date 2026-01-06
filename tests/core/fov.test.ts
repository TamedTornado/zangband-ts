import { describe, it, expect } from 'vitest';
import { FOVSystem } from '@/core/systems/FOV';
import { Level } from '@/core/world/Level';

describe('FOVSystem', () => {
  it('should compute visible tiles from a position', () => {
    const level = new Level(20, 20);
    const fov = new FOVSystem();

    const visible = fov.compute(level, { x: 10, y: 10 }, 5);

    // Origin should be visible
    expect(visible.has('10,10')).toBe(true);

    // Adjacent tiles should be visible
    expect(visible.has('11,10')).toBe(true);
    expect(visible.has('10,11')).toBe(true);
  });

  it('should not see through walls', () => {
    const level = new Level(20, 20);
    // Create a wall blocking view
    level.setTerrain({ x: 11, y: 10 }, 'granite_wall');

    const fov = new FOVSystem();
    const visible = fov.compute(level, { x: 10, y: 10 }, 5);

    // Wall itself should be visible
    expect(visible.has('11,10')).toBe(true);

    // Tile behind wall should not be visible
    expect(visible.has('12,10')).toBe(false);
  });

  it('should respect radius', () => {
    const level = new Level(30, 30);
    const fov = new FOVSystem();

    const visible = fov.compute(level, { x: 15, y: 15 }, 3);

    // Within radius
    expect(visible.has('15,15')).toBe(true);
    expect(visible.has('17,15')).toBe(true);

    // Outside radius
    expect(visible.has('20,15')).toBe(false);
  });

  it('should mark explored tiles on level', () => {
    const level = new Level(20, 20);
    const fov = new FOVSystem();

    // Tile should not be explored initially
    expect(level.getTile({ x: 10, y: 10 })?.explored).toBe(false);

    fov.computeAndMark(level, { x: 10, y: 10 }, 5);

    // Visible tiles should now be explored
    expect(level.getTile({ x: 10, y: 10 })?.explored).toBe(true);
    expect(level.getTile({ x: 11, y: 10 })?.explored).toBe(true);
  });

  it('should handle edge of map gracefully', () => {
    const level = new Level(10, 10);
    const fov = new FOVSystem();

    // Should not throw when FOV extends past map edges
    const visible = fov.compute(level, { x: 0, y: 0 }, 5);

    expect(visible.has('0,0')).toBe(true);
    expect(visible.has('1,1')).toBe(true);
  });
});
