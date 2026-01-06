import { describe, it, expect } from 'vitest';
import { Level } from '@/core/world/Level';

describe('Level', () => {
  it('should create a level with given dimensions', () => {
    const level = new Level(80, 25);
    expect(level.width).toBe(80);
    expect(level.height).toBe(25);
  });

  it('should report positions inside bounds as valid', () => {
    const level = new Level(80, 25);
    expect(level.isInBounds({ x: 0, y: 0 })).toBe(true);
    expect(level.isInBounds({ x: 79, y: 24 })).toBe(true);
    expect(level.isInBounds({ x: 40, y: 12 })).toBe(true);
  });

  it('should report positions outside bounds as invalid', () => {
    const level = new Level(80, 25);
    expect(level.isInBounds({ x: -1, y: 0 })).toBe(false);
    expect(level.isInBounds({ x: 0, y: -1 })).toBe(false);
    expect(level.isInBounds({ x: 80, y: 0 })).toBe(false);
    expect(level.isInBounds({ x: 0, y: 25 })).toBe(false);
  });

  it('should have all tiles walkable by default (empty map)', () => {
    const level = new Level(10, 10);
    expect(level.isWalkable({ x: 5, y: 5 })).toBe(true);
    expect(level.isWalkable({ x: 0, y: 0 })).toBe(true);
  });

  it('should report out-of-bounds positions as not walkable', () => {
    const level = new Level(10, 10);
    expect(level.isWalkable({ x: -1, y: 0 })).toBe(false);
    expect(level.isWalkable({ x: 10, y: 10 })).toBe(false);
  });

  it('should allow setting a tile as blocked', () => {
    const level = new Level(10, 10);
    level.setWalkable({ x: 5, y: 5 }, false);
    expect(level.isWalkable({ x: 5, y: 5 })).toBe(false);
    expect(level.isWalkable({ x: 5, y: 4 })).toBe(true);
  });
});
