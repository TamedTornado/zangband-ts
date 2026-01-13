/**
 * Tests for secret door detection via the search system.
 * TDD: These tests define the contract for secret door detection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { Player } from '@/core/entities/Player';
import { Level } from '@/core/world/Level';
import { search } from '@/core/systems/SearchSystem';

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
}

describe('search - secret doors', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  it('reveals secret door on successful perception roll (100% perception)', () => {
    const player = createTestPlayer(5, 5);
    // Force 100% perception to guarantee detection
    (player as any)._skills = { ...player.skills, perception: 100 };

    const level = new Level(20, 20);
    // Place secret door adjacent to player
    level.setTerrain({ x: 6, y: 5 }, 'secret_door');

    // Verify it starts as secret door with SECRET flag
    const tileBefore = level.getTile({ x: 6, y: 5 });
    expect(tileBefore?.terrain.flags).toContain('SECRET');

    const result = search(player, level, RNG);

    // Should find secret door
    expect(result.secretDoorsFound).toBe(1);
    expect(result.messages).toContainEqual({
      text: 'You have found a secret door.',
      type: 'info',
    });

    // Secret door should now be a regular closed door
    const tileAfter = level.getTile({ x: 6, y: 5 });
    expect(tileAfter?.terrain.flags).toContain('DOOR');
    expect(tileAfter?.terrain.flags).not.toContain('SECRET');
  });

  it('does not reveal secret door on failed perception roll (0% perception)', () => {
    const player = createTestPlayer(5, 5);
    // Force 0% perception to guarantee no detection
    (player as any)._skills = { ...player.skills, perception: 0 };

    const level = new Level(20, 20);
    level.setTerrain({ x: 6, y: 5 }, 'secret_door');

    const result = search(player, level, RNG);

    // Should not find secret door
    expect(result.secretDoorsFound).toBe(0);
    expect(result.messages).not.toContainEqual(
      expect.objectContaining({ text: 'You have found a secret door.' })
    );

    // Secret door should still be secret
    const tile = level.getTile({ x: 6, y: 5 });
    expect(tile?.terrain.flags).toContain('SECRET');
  });

  it('does not reveal secret door outside 3x3 range', () => {
    const player = createTestPlayer(5, 5);
    (player as any)._skills = { ...player.skills, perception: 100 };

    const level = new Level(20, 20);
    // Place secret door outside 3x3 range (more than 1 tile away)
    level.setTerrain({ x: 8, y: 5 }, 'secret_door'); // 3 tiles away

    const result = search(player, level, RNG);

    // Should not find secret door
    expect(result.secretDoorsFound).toBe(0);

    // Secret door should still be secret
    const tile = level.getTile({ x: 8, y: 5 });
    expect(tile?.terrain.flags).toContain('SECRET');
  });

  it('converts secret door to closed door when found', () => {
    const player = createTestPlayer(5, 5);
    (player as any)._skills = { ...player.skills, perception: 100 };

    const level = new Level(20, 20);
    level.setTerrain({ x: 5, y: 4 }, 'secret_door');

    // Verify secret door blocks movement (like a wall)
    expect(level.isWalkable({ x: 5, y: 4 })).toBe(false);

    search(player, level, RNG);

    // After revealing, it should still block (closed door blocks)
    // but should have DOOR flag so player can open it
    const tile = level.getTile({ x: 5, y: 4 });
    expect(tile?.terrain.flags).toContain('DOOR');
    expect(tile?.terrain.flags).toContain('BLOCK');
    expect(level.isWalkable({ x: 5, y: 4 })).toBe(false);
  });

  it('can find multiple secret doors in one search', () => {
    const player = createTestPlayer(5, 5);
    (player as any)._skills = { ...player.skills, perception: 100 };

    const level = new Level(20, 20);
    // Place secret doors on all 4 sides
    level.setTerrain({ x: 4, y: 5 }, 'secret_door');
    level.setTerrain({ x: 6, y: 5 }, 'secret_door');
    level.setTerrain({ x: 5, y: 4 }, 'secret_door');
    level.setTerrain({ x: 5, y: 6 }, 'secret_door');

    const result = search(player, level, RNG);

    // Should find all 4 secret doors
    expect(result.secretDoorsFound).toBe(4);
  });

  it('secret door looks like granite wall (visual appearance)', () => {
    const level = new Level(20, 20);
    level.setTerrain({ x: 5, y: 5 }, 'secret_door');

    const tile = level.getTile({ x: 5, y: 5 });
    // Should look like a wall
    expect(tile?.terrain.symbol).toBe('#');
    expect(tile?.terrain.name).toBe('granite wall');
  });
});
