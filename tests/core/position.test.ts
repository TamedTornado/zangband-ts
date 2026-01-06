import { describe, it, expect } from 'vitest';
import { type Position, Direction, movePosition } from '@/core/types';

describe('Position', () => {
  it('should create a position with x and y', () => {
    const pos: Position = { x: 5, y: 10 };
    expect(pos.x).toBe(5);
    expect(pos.y).toBe(10);
  });
});

describe('movePosition', () => {
  const origin: Position = { x: 5, y: 5 };

  it('should move north (y decreases)', () => {
    expect(movePosition(origin, Direction.North)).toEqual({ x: 5, y: 4 });
  });

  it('should move south (y increases)', () => {
    expect(movePosition(origin, Direction.South)).toEqual({ x: 5, y: 6 });
  });

  it('should move east (x increases)', () => {
    expect(movePosition(origin, Direction.East)).toEqual({ x: 6, y: 5 });
  });

  it('should move west (x decreases)', () => {
    expect(movePosition(origin, Direction.West)).toEqual({ x: 4, y: 5 });
  });

  it('should move northeast', () => {
    expect(movePosition(origin, Direction.NorthEast)).toEqual({ x: 6, y: 4 });
  });

  it('should move northwest', () => {
    expect(movePosition(origin, Direction.NorthWest)).toEqual({ x: 4, y: 4 });
  });

  it('should move southeast', () => {
    expect(movePosition(origin, Direction.SouthEast)).toEqual({ x: 6, y: 6 });
  });

  it('should move southwest', () => {
    expect(movePosition(origin, Direction.SouthWest)).toEqual({ x: 4, y: 6 });
  });
});
