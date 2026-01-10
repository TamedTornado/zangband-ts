import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RNG } from 'rot-js';
import { DisarmEffect } from '@/core/systems/effects/DisarmEffect';
import { Actor } from '@/core/entities/Actor';
import { Player } from '@/core/entities/Player';
import { Trap } from '@/core/entities/Trap';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';
import type { TrapDef } from '@/core/data/traps';

// Mock trap definition with proper TrapDef fields
const TRAP_DEF: TrapDef = {
  key: 'pit_trap',
  index: 1,
  name: 'pit trap',
  symbol: '^',
  color: '#fff',
  minDepth: 1,
  rarity: 1,
  effect: 'FALL',
  damage: '2d6',
  saveType: 'DEX',
  saveDifficulty: 5,
  flags: ['HIDDEN'],
};

// Hard trap for testing skill checks
const HARD_TRAP_DEF: TrapDef = {
  key: 'poison_pit',
  index: 2,
  name: 'poison pit',
  symbol: '^',
  color: 'g',
  minDepth: 5,
  rarity: 2,
  effect: 'POISON',
  damage: '4d6',
  saveType: 'DEX',
  saveDifficulty: 10, // Higher difficulty
  flags: ['HIDDEN'],
};

// Mock level with traps
function createMockLevel(width = 20, height = 20) {
  const traps: Trap[] = [];
  let trapIdCounter = 0;

  const level = {
    width,
    height,
    getTile: () => ({ terrain: { key: 'floor', flags: [] } }),
    getTrapAt: (pos: Position): Trap | undefined => {
      return traps.find(t => t.position.x === pos.x && t.position.y === pos.y);
    },
    getTraps: () => [...traps],
    removeTrap: (trap: Trap) => {
      const idx = traps.indexOf(trap);
      if (idx !== -1) traps.splice(idx, 1);
    },
    getMonsterAt: () => undefined,
    getMonsters: () => [],
    // Test helper - can pass custom trap definition
    addTrap: (pos: Position, trapDef: TrapDef = TRAP_DEF): Trap => {
      const trap = new Trap({
        id: `trap-${trapIdCounter++}`,
        position: pos,
        definition: trapDef,
      });
      traps.push(trap);
      return trap;
    },
  };

  return level;
}

// Helper to create actor at position
function createActor(x: number, y: number): Actor {
  return new Actor({
    id: `actor-${x}-${y}`,
    position: { x, y },
    symbol: '@',
    color: '#fff',
    maxHp: 100,
    speed: 110,
  });
}

describe('DisarmEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns false without target position', () => {
      const effect = new DisarmEffect({
        type: 'disarm',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(false);
    });

    it('returns true with target position', () => {
      const effect = new DisarmEffect({
        type: 'disarm',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute', () => {
    it('disarms trap at target position', () => {
      const effect = new DisarmEffect({
        type: 'disarm',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      const trap = level.addTrap({ x: 12, y: 10 });
      expect(trap.isActive).toBe(true);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(trap.isDisarmed).toBe(true);
      expect(trap.isRevealed).toBe(true);
      expect(result.messages.some(m => m.includes('disarm'))).toBe(true);
    });

    it('reveals hidden traps when disarming', () => {
      const effect = new DisarmEffect({
        type: 'disarm',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      const trap = level.addTrap({ x: 12, y: 10 });
      // Trap starts hidden due to HIDDEN flag
      expect(trap.isRevealed).toBe(false);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      effect.execute(context);

      expect(trap.isRevealed).toBe(true);
    });

    it('reports nothing when no trap at position', () => {
      const effect = new DisarmEffect({
        type: 'disarm',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.messages.some(m => m.includes('nothing') || m.includes('no trap'))).toBe(true);
    });

    it('does nothing to already disarmed traps', () => {
      const effect = new DisarmEffect({
        type: 'disarm',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      const trap = level.addTrap({ x: 12, y: 10 });
      trap.disarm(); // Already disarmed

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.messages.some(m => m.includes('already') || m.includes('no trap'))).toBe(true);
    });
  });

  describe('skill-based disarming', () => {
    // High disarm class
    const rogueClass = {
      index: 0,
      name: 'Rogue',
      stats: { str: 2, int: 1, wis: -2, dex: 3, con: 1, chr: 0 },
      skills: { disarm: 45, device: 32, save: 28, stealth: 5, search: 32, searchFreq: 24, melee: 65, ranged: 66 },
      xSkills: { disarm: 15, device: 10, save: 10, stealth: 0, search: 0, searchFreq: 0, melee: 25, ranged: 30 },
      hitDie: 6,
      expMod: 25,
      petUpkeepDiv: 1,
      heavySense: false,
      spellStat: null,
      spellFirst: null,
      spellWeight: null,
      realms: [],
      secondaryRealm: false,
    };

    // Low disarm class
    const warriorClass = {
      index: 1,
      name: 'Warrior',
      stats: { str: 5, int: -2, wis: -2, dex: 2, con: 2, chr: -1 },
      skills: { disarm: 25, device: 18, save: 18, stealth: 1, search: 14, searchFreq: 2, melee: 70, ranged: 55 },
      xSkills: { disarm: 12, device: 7, save: 10, stealth: 0, search: 0, searchFreq: 0, melee: 45, ranged: 45 },
      hitDie: 9,
      expMod: 0,
      petUpkeepDiv: 1,
      heavySense: false,
      spellStat: null,
      spellFirst: null,
      spellWeight: null,
      realms: [],
      secondaryRealm: false,
    };

    function createPlayer(x: number, y: number, classDef = rogueClass): Player {
      return new Player({
        id: `player-${x}-${y}`,
        position: { x, y },
        maxHp: 100,
        speed: 110,
        stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
        classDef,
        level: 1,
      });
    }

    it('should succeed with high disarm skill vs low difficulty', () => {
      const effect = new DisarmEffect({
        type: 'disarm',
        target: 'position',
      });

      // Rogue has high disarm skill
      const player = createPlayer(10, 10, rogueClass);
      const level = createMockLevel();

      // Easy trap (saveDifficulty: 5)
      const trap = level.addTrap({ x: 12, y: 10 }, TRAP_DEF);

      // Mock RNG to always roll low (guaranteed success for high skill)
      vi.spyOn(RNG, 'getUniformInt').mockReturnValue(5);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(trap.isDisarmed).toBe(true);
      expect(result.messages.some(m => m.toLowerCase().includes('disarm'))).toBe(true);

      vi.restoreAllMocks();
    });

    it('should fail with low disarm skill vs high difficulty when roll is high', () => {
      const effect = new DisarmEffect({
        type: 'disarm',
        target: 'position',
      });

      // Warrior has lower disarm skill
      const player = createPlayer(10, 10, warriorClass);
      const level = createMockLevel();

      // Hard trap (saveDifficulty: 10)
      const trap = level.addTrap({ x: 12, y: 10 }, HARD_TRAP_DEF);

      // Mock RNG to roll high (guaranteed failure)
      vi.spyOn(RNG, 'getUniformInt').mockReturnValue(95);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      const result = effect.execute(context);

      // Should still be success (turn consumed) but trap not disarmed
      expect(result.turnConsumed).toBe(true);
      expect(trap.isDisarmed).toBe(false);
      expect(result.messages.some(m => m.toLowerCase().includes('fail'))).toBe(true);

      vi.restoreAllMocks();
    });

    it('should always have at least 2% success chance', () => {
      const effect = new DisarmEffect({
        type: 'disarm',
        target: 'position',
      });

      const player = createPlayer(10, 10, warriorClass);
      const level = createMockLevel();
      const trap = level.addTrap({ x: 12, y: 10 }, HARD_TRAP_DEF);

      // Mock RNG to roll 1 (within 2% threshold)
      vi.spyOn(RNG, 'getUniformInt').mockReturnValue(1);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      const result = effect.execute(context);

      // Even with low skill, roll of 1 should succeed due to 2% minimum
      expect(result.success).toBe(true);
      expect(trap.isDisarmed).toBe(true);

      vi.restoreAllMocks();
    });
  });
});
