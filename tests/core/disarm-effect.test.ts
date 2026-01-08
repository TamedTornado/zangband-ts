import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { DisarmEffect } from '@/core/systems/effects/DisarmEffect';
import { Actor } from '@/core/entities/Actor';
import { Trap } from '@/core/entities/Trap';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';

// Mock trap definition
const TRAP_DEF = {
  key: 'pit_trap',
  name: 'pit trap',
  symbol: '^',
  color: '#fff',
  flags: ['HIDDEN'],
  triggerChance: 100,
  damage: '2d6',
  effects: [],
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
    // Test helper
    addTrap: (pos: Position): Trap => {
      const trap = new Trap({
        id: `trap-${trapIdCounter++}`,
        position: pos,
        definition: TRAP_DEF as any,
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
});
