import { describe, it, expect } from 'vitest';
import { Player } from '@/core/entities/Player';
import { Level } from '@/core/world/Level';
import { Direction } from '@/core/types';

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
  });
}

describe('Player movement', () => {
  it('should be created at a given position', () => {
    const player = createTestPlayer(10, 5);
    expect(player.position).toEqual({ x: 10, y: 5 });
  });

  it('should move in a direction on an empty level', () => {
    const player = createTestPlayer(5, 5);
    const level = new Level(80, 25);

    const moved = player.tryMove(Direction.North, level);

    expect(moved).toBe(true);
    expect(player.position).toEqual({ x: 5, y: 4 });
  });

  it('should not move into a blocked tile', () => {
    const player = createTestPlayer(5, 5);
    const level = new Level(80, 25);
    level.setWalkable({ x: 5, y: 4 }, false);

    const moved = player.tryMove(Direction.North, level);

    expect(moved).toBe(false);
    expect(player.position).toEqual({ x: 5, y: 5 });
  });

  it('should not move out of bounds', () => {
    const player = createTestPlayer(0, 0);
    const level = new Level(80, 25);

    const movedNorth = player.tryMove(Direction.North, level);
    expect(movedNorth).toBe(false);
    expect(player.position).toEqual({ x: 0, y: 0 });

    const movedWest = player.tryMove(Direction.West, level);
    expect(movedWest).toBe(false);
    expect(player.position).toEqual({ x: 0, y: 0 });
  });

  it('should move diagonally', () => {
    const player = createTestPlayer(5, 5);
    const level = new Level(80, 25);

    player.tryMove(Direction.NorthEast, level);
    expect(player.position).toEqual({ x: 6, y: 4 });
  });
});
