import { describe, it, expect } from 'vitest';
import { Camera } from '@/core/systems/Camera';

describe('Camera', () => {
  describe('center mode', () => {
    it('centers on target', () => {
      const camera = new Camera(20, 10, { mode: 'center' });
      camera.follow({ x: 50, y: 50 }, 100, 100);

      const viewport = camera.viewport;
      expect(viewport.x).toBe(40); // 50 - 10 (half width)
      expect(viewport.y).toBe(45); // 50 - 5 (half height)
    });

    it('clamps to level bounds at top-left', () => {
      const camera = new Camera(20, 10, { mode: 'center' });
      camera.follow({ x: 5, y: 3 }, 100, 100);

      const viewport = camera.viewport;
      expect(viewport.x).toBe(0);
      expect(viewport.y).toBe(0);
    });

    it('clamps to level bounds at bottom-right', () => {
      const camera = new Camera(20, 10, { mode: 'center' });
      camera.follow({ x: 95, y: 97 }, 100, 100);

      const viewport = camera.viewport;
      expect(viewport.x).toBe(80); // 100 - 20
      expect(viewport.y).toBe(90); // 100 - 10
    });
  });

  describe('scroll mode', () => {
    it('does not scroll when target is in safe zone', () => {
      const camera = new Camera(20, 10, { mode: 'scroll', scrollMarginX: 4, scrollMarginY: 2 });
      camera.follow({ x: 10, y: 5 }, 100, 100);

      const viewport = camera.viewport;
      expect(viewport.x).toBe(0);
      expect(viewport.y).toBe(0);
    });

    it('scrolls right when target approaches right edge', () => {
      const camera = new Camera(20, 10, { mode: 'scroll', scrollMarginX: 4, scrollMarginY: 2 });
      // First position camera
      camera.follow({ x: 10, y: 5 }, 100, 100);
      // Then move target to right edge
      camera.follow({ x: 18, y: 5 }, 100, 100);

      const viewport = camera.viewport;
      expect(viewport.x).toBe(2); // scrolled to keep target 4 from right edge
    });

    it('scrolls left when target approaches left edge', () => {
      const camera = new Camera(20, 10, { mode: 'scroll', scrollMarginX: 4, scrollMarginY: 2 });
      // Position camera so target is in middle
      camera.follow({ x: 50, y: 5 }, 100, 100); // camera.x = 34
      // Move target toward left edge of viewport
      camera.follow({ x: 36, y: 5 }, 100, 100); // 36 < 34 + 4 = 38, triggers scroll

      expect(camera.viewport.x).toBe(32); // scrolled to keep target 4 from left edge
    });
  });

  describe('coordinate conversion', () => {
    it('converts world to screen coordinates', () => {
      const camera = new Camera(20, 10, { mode: 'center' });
      camera.follow({ x: 50, y: 50 }, 100, 100);

      const screen = camera.worldToScreen({ x: 50, y: 50 });
      expect(screen.x).toBe(10); // center of viewport
      expect(screen.y).toBe(5);
    });

    it('converts screen to world coordinates', () => {
      const camera = new Camera(20, 10, { mode: 'center' });
      camera.follow({ x: 50, y: 50 }, 100, 100);

      const world = camera.screenToWorld({ x: 0, y: 0 });
      expect(world.x).toBe(40); // viewport.x
      expect(world.y).toBe(45); // viewport.y
    });
  });

  describe('contains', () => {
    it('returns true for positions inside viewport', () => {
      const camera = new Camera(20, 10, { mode: 'center' });
      camera.follow({ x: 50, y: 50 }, 100, 100);

      expect(camera.contains({ x: 50, y: 50 })).toBe(true);
      expect(camera.contains({ x: 40, y: 45 })).toBe(true);
      expect(camera.contains({ x: 59, y: 54 })).toBe(true);
    });

    it('returns false for positions outside viewport', () => {
      const camera = new Camera(20, 10, { mode: 'center' });
      camera.follow({ x: 50, y: 50 }, 100, 100);

      expect(camera.contains({ x: 39, y: 50 })).toBe(false);
      expect(camera.contains({ x: 60, y: 50 })).toBe(false);
      expect(camera.contains({ x: 50, y: 44 })).toBe(false);
      expect(camera.contains({ x: 50, y: 55 })).toBe(false);
    });
  });

  describe('resize', () => {
    it('updates viewport dimensions', () => {
      const camera = new Camera(20, 10, { mode: 'center' });
      camera.resize(30, 15);

      const viewport = camera.viewport;
      expect(viewport.width).toBe(30);
      expect(viewport.height).toBe(15);
    });
  });
});
