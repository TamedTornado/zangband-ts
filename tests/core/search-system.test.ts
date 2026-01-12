import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RNG } from 'rot-js';
import {
  shouldTriggerPassiveSearch,
  search,
} from '@/core/systems/SearchSystem';
import { Player } from '@/core/entities/Player';
import { Level } from '@/core/world/Level';
import { Trap } from '@/core/entities/Trap';
import type { TrapDef } from '@/core/data/traps';
import { loadStatusDefs, createStatus } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';

// Test fixtures
const createTestTrap = (overrides: Partial<TrapDef> = {}): TrapDef => ({
  key: 'test_trap',
  index: 1,
  name: 'Test Trap',
  symbol: '^',
  color: 'w',
  minDepth: 1,
  rarity: 3,
  effect: 'DAMAGE',
  damage: '2d6',
  saveType: 'DEX',
  saveDifficulty: 10,
  flags: ['FLOOR', 'HIDDEN'],
  ...overrides,
});

const createTestPlayer = (overrides: Partial<{ perception: number }> = {}): Player => {
  const player = new Player({
    id: 'player_1',
    position: { x: 5, y: 5 },
    maxHp: 100,
    speed: 110,
    stats: { str: 14, int: 14, wis: 14, dex: 14, con: 14, chr: 14 },
  });
  // Override perception skill if provided
  if (overrides.perception !== undefined) {
    // We'll need to mock skills or set them appropriately
    vi.spyOn(player, 'skills', 'get').mockReturnValue({
      ...player.skills,
      perception: overrides.perception,
    });
  }
  return player;
};

describe('SearchSystem', () => {
  beforeEach(() => {
    loadStatusDefs(statusesData);
  });

  describe('shouldTriggerPassiveSearch', () => {
    it('always triggers when searching >= 50', () => {
      // Should always return true regardless of RNG
      expect(shouldTriggerPassiveSearch(50, RNG)).toBe(true);
      expect(shouldTriggerPassiveSearch(75, RNG)).toBe(true);
      expect(shouldTriggerPassiveSearch(100, RNG)).toBe(true);
    });

    it('triggers probabilistically when searching < 50', () => {
      // With searching = 49, it's 1-in-1 chance (100%)
      expect(shouldTriggerPassiveSearch(49, RNG)).toBe(true);

      // With searching = 25, it's 1-in-25 chance
      // Run multiple times to verify it sometimes triggers and sometimes doesn't
      let triggered = 0;
      for (let i = 0; i < 100; i++) {
        if (shouldTriggerPassiveSearch(25, RNG)) {
          triggered++;
        }
      }
      // Should trigger roughly 4% of the time (1/25)
      expect(triggered).toBeGreaterThan(0);
      expect(triggered).toBeLessThan(20); // Very unlikely to be >20% with 1/25 odds
    });

    it('never triggers when searching <= 0', () => {
      expect(shouldTriggerPassiveSearch(0, RNG)).toBe(false);
      expect(shouldTriggerPassiveSearch(-5, RNG)).toBe(false);
    });

    it('uses correct formula: 1-in-(50 - searching)', () => {
      // Mock RNG to return specific values
      const mockRng = {
        getUniformInt: vi.fn().mockReturnValue(1),
      } as unknown as typeof RNG;

      // With searching = 48, it's 1-in-2 chance
      // Roll of 1 should trigger
      expect(shouldTriggerPassiveSearch(48, mockRng)).toBe(true);
      expect(mockRng.getUniformInt).toHaveBeenCalledWith(1, 2);

      // Roll of 2 should not trigger
      (mockRng.getUniformInt as ReturnType<typeof vi.fn>).mockReturnValue(2);
      expect(shouldTriggerPassiveSearch(48, mockRng)).toBe(false);
    });
  });

  describe('search', () => {
    let player: Player;
    let level: Level;

    beforeEach(() => {
      player = createTestPlayer({ perception: 100 }); // 100% detection for testing
      level = new Level(20, 20, { depth: 5 });
      level.player = player;
    });

    it('checks 3x3 grid around player', () => {
      // Place traps in the 3x3 grid around player at (5,5)
      const trapPositions = [
        { x: 4, y: 4 },
        { x: 5, y: 4 },
        { x: 6, y: 4 },
        { x: 4, y: 5 },
        { x: 6, y: 5 },
        { x: 4, y: 6 },
        { x: 5, y: 6 },
        { x: 6, y: 6 },
      ];

      trapPositions.forEach((pos, i) => {
        const trap = new Trap({
          id: `trap_${i}`,
          position: pos,
          definition: createTestTrap(),
        });
        level.addTrap(trap);
      });

      // With 100% perception, all traps should be found
      const result = search(player, level, RNG);
      expect(result.trapsFound).toBe(8);
    });

    it('reveals hidden traps on successful perception roll', () => {
      const trap = new Trap({
        id: 'trap_1',
        position: { x: 5, y: 4 },
        definition: createTestTrap({ flags: ['FLOOR', 'HIDDEN'] }),
      });
      level.addTrap(trap);
      expect(trap.isRevealed).toBe(false);

      // With 100% perception, trap should be revealed
      search(player, level, RNG);
      expect(trap.isRevealed).toBe(true);
    });

    it('does not reveal already-revealed traps', () => {
      const trap = new Trap({
        id: 'trap_1',
        position: { x: 5, y: 4 },
        definition: createTestTrap({ flags: ['FLOOR'] }), // Not hidden
      });
      level.addTrap(trap);
      expect(trap.isRevealed).toBe(true);

      const result = search(player, level, RNG);
      expect(result.trapsFound).toBe(0);
      expect(result.messages).toHaveLength(0);
    });

    it('generates "You have found a trap." message per trap found', () => {
      const trap1 = new Trap({
        id: 'trap_1',
        position: { x: 5, y: 4 },
        definition: createTestTrap(),
      });
      const trap2 = new Trap({
        id: 'trap_2',
        position: { x: 4, y: 5 },
        definition: createTestTrap(),
      });
      level.addTrap(trap1);
      level.addTrap(trap2);

      const result = search(player, level, RNG);
      expect(result.messages.filter(m => m.text === 'You have found a trap.')).toHaveLength(2);
    });

    it('returns count of traps found', () => {
      const trap1 = new Trap({
        id: 'trap_1',
        position: { x: 5, y: 4 },
        definition: createTestTrap(),
      });
      const trap2 = new Trap({
        id: 'trap_2',
        position: { x: 4, y: 5 },
        definition: createTestTrap(),
      });
      level.addTrap(trap1);
      level.addTrap(trap2);

      const result = search(player, level, RNG);
      expect(result.trapsFound).toBe(2);
    });

    it('does not find traps outside 3x3 grid', () => {
      // Place trap outside the search radius
      const trap = new Trap({
        id: 'trap_1',
        position: { x: 8, y: 8 }, // Too far from player at (5,5)
        definition: createTestTrap(),
      });
      level.addTrap(trap);

      const result = search(player, level, RNG);
      expect(result.trapsFound).toBe(0);
      expect(trap.isRevealed).toBe(false);
    });
  });

  describe('perception checks', () => {
    let level: Level;

    beforeEach(() => {
      loadStatusDefs(statusesData);
      level = new Level(20, 20, { depth: 5 });
    });

    it('uses player.skills.perception for base chance (roll 0-99 < perception)', () => {
      // With perception 50, roughly half should be detected
      const player = createTestPlayer({ perception: 50 });
      player.position = { x: 5, y: 5 };
      level.player = player;

      // Add many traps to get statistical significance
      let totalFound = 0;
      for (let trial = 0; trial < 100; trial++) {
        const trap = new Trap({
          id: `trap_${trial}`,
          position: { x: 5, y: 4 },
          definition: createTestTrap(),
        });
        level.addTrap(trap);
        const result = search(player, level, RNG);
        totalFound += result.trapsFound;
        level.removeTrap(trap);
      }

      // Should find roughly 50% (with some variance)
      expect(totalFound).toBeGreaterThan(30);
      expect(totalFound).toBeLessThan(70);
    });

    it('divides chance by 10 when player is blind', () => {
      const player = createTestPlayer({ perception: 100 });
      player.position = { x: 5, y: 5 };
      level.player = player;

      // Apply blind status
            const blindStatus = createStatus('blind', { duration: 10 });
      player.statuses.add(blindStatus, player);

      // With perception 100 / 10 = 10, should find roughly 10%
      let totalFound = 0;
      for (let trial = 0; trial < 100; trial++) {
        const trap = new Trap({
          id: `trap_${trial}`,
          position: { x: 5, y: 4 },
          definition: createTestTrap(),
        });
        level.addTrap(trap);
        const result = search(player, level, RNG);
        totalFound += result.trapsFound;
        level.removeTrap(trap);
      }

      // Should find roughly 10% (with some variance)
      expect(totalFound).toBeLessThan(30); // Much less than the 50 we'd expect without blind
    });

    it('divides chance by 10 when player is confused', () => {
      const player = createTestPlayer({ perception: 100 });
      player.position = { x: 5, y: 5 };
      level.player = player;

      // Apply confused status
            const confusedStatus = createStatus('confused', { duration: 10 });
      player.statuses.add(confusedStatus, player);

      // With perception 100 / 10 = 10, should find roughly 10%
      let totalFound = 0;
      for (let trial = 0; trial < 100; trial++) {
        const trap = new Trap({
          id: `trap_${trial}`,
          position: { x: 5, y: 4 },
          definition: createTestTrap(),
        });
        level.addTrap(trap);
        const result = search(player, level, RNG);
        totalFound += result.trapsFound;
        level.removeTrap(trap);
      }

      expect(totalFound).toBeLessThan(30);
    });

    it('stacks penalties (blind + confused = /100)', () => {
      const player = createTestPlayer({ perception: 100 });
      player.position = { x: 5, y: 5 };
      level.player = player;

      // Apply both statuses
            const blindStatus = createStatus('blind', { duration: 10 });
      const confusedStatus = createStatus('confused', { duration: 10 });
      player.statuses.add(blindStatus, player);
      player.statuses.add(confusedStatus, player);

      // With perception 100 / 100 = 1, should find roughly 1%
      let totalFound = 0;
      for (let trial = 0; trial < 100; trial++) {
        const trap = new Trap({
          id: `trap_${trial}`,
          position: { x: 5, y: 4 },
          definition: createTestTrap(),
        });
        level.addTrap(trap);
        const result = search(player, level, RNG);
        totalFound += result.trapsFound;
        level.removeTrap(trap);
      }

      // Should find very few (1% = ~1 out of 100)
      expect(totalFound).toBeLessThan(10);
    });
  });
});

describe('Search Mode', () => {
  let player: Player;

  beforeEach(() => {
    loadStatusDefs(statusesData);
    player = new Player({
      id: 'player_1',
      position: { x: 5, y: 5 },
      maxHp: 100,
      speed: 110,
      stats: { str: 14, int: 14, wis: 14, dex: 14, con: 14, chr: 14 },
    });
  });

  it('toggles isSearching state on player', () => {
    expect(player.isSearching).toBe(false);
    player.toggleSearchMode();
    expect(player.isSearching).toBe(true);
    player.toggleSearchMode();
    expect(player.isSearching).toBe(false);
  });

  it('reduces player speed by 10 when active', () => {
    const baseSpeed = player.speed;
    player.toggleSearchMode();
    expect(player.speed).toBe(baseSpeed - 10);
  });

  it('restores speed when deactivated', () => {
    const baseSpeed = player.speed;
    player.toggleSearchMode(); // Activate
    expect(player.speed).toBe(baseSpeed - 10);
    player.toggleSearchMode(); // Deactivate
    expect(player.speed).toBe(baseSpeed);
  });
});
