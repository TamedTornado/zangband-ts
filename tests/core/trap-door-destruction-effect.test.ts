import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { TrapDoorDestructionEffect } from '@/core/systems/effects/TrapDoorDestructionEffect';
import { Actor } from '@/core/entities/Actor';
import { Trap } from '@/core/entities/Trap';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';

// Mock terrain definitions
const FLOOR_TERRAIN = { key: 'floor', name: 'floor', flags: [] as string[] };
const CLOSED_DOOR = { key: 'closed_door', name: 'closed door', flags: ['BLOCK', 'DOOR'] };
const LOCKED_DOOR = { key: 'locked_door', name: 'locked door', flags: ['BLOCK', 'DOOR'] };

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

// Mock level with traps and terrain
function createMockLevel(width = 20, height = 20) {
  const tiles: Record<string, typeof FLOOR_TERRAIN> = {};
  const traps: Trap[] = [];
  let trapIdCounter = 0;

  const level = {
    width,
    height,
    getTile: (pos: Position) => {
      const key = `${pos.x},${pos.y}`;
      return {
        terrain: tiles[key] || FLOOR_TERRAIN,
      };
    },
    setTerrain: (pos: Position, terrain: string) => {
      const key = `${pos.x},${pos.y}`;
      if (terrain === 'floor') {
        tiles[key] = FLOOR_TERRAIN;
      }
    },
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
    // Test helpers
    setDoor: (pos: Position) => {
      const key = `${pos.x},${pos.y}`;
      tiles[key] = CLOSED_DOOR;
    },
    setLockedDoor: (pos: Position) => {
      const key = `${pos.x},${pos.y}`;
      tiles[key] = LOCKED_DOOR;
    },
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

describe('TrapDoorDestructionEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns true with self target', () => {
      const effect = new TrapDoorDestructionEffect({
        type: 'trapDoorDestruction',
        target: 'self',
        radius: 8,
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(true);
    });

    it('returns false without target position for position-targeted', () => {
      const effect = new TrapDoorDestructionEffect({
        type: 'trapDoorDestruction',
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
  });

  describe('execute - area mode (scroll)', () => {
    it('destroys traps within radius', () => {
      const effect = new TrapDoorDestructionEffect({
        type: 'trapDoorDestruction',
        target: 'self',
        radius: 5,
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      // Place traps - some within radius, some outside
      level.addTrap({ x: 11, y: 10 }); // 1 tile away - within radius
      level.addTrap({ x: 13, y: 10 }); // 3 tiles away - within radius
      level.addTrap({ x: 20, y: 10 }); // 10 tiles away - outside radius

      expect(level.getTraps().length).toBe(3);

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      // Only the trap outside radius should remain
      expect(level.getTraps().length).toBe(1);
      expect(level.getTraps()[0].position.x).toBe(20);
    });

    it('destroys doors within radius', () => {
      const effect = new TrapDoorDestructionEffect({
        type: 'trapDoorDestruction',
        target: 'self',
        radius: 5,
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      // Place doors - some within radius
      level.setDoor({ x: 11, y: 10 }); // 1 tile away
      level.setLockedDoor({ x: 12, y: 10 }); // 2 tiles away

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      // Doors should be converted to floor
      expect(level.getTile({ x: 11, y: 10 }).terrain.key).toBe('floor');
      expect(level.getTile({ x: 12, y: 10 }).terrain.key).toBe('floor');
    });

    it('reports nothing if no traps or doors nearby', () => {
      const effect = new TrapDoorDestructionEffect({
        type: 'trapDoorDestruction',
        target: 'self',
        radius: 5,
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.messages.some(m => m.includes('nothing') || m.includes('no'))).toBe(true);
    });
  });

  describe('execute - position mode (wand)', () => {
    it('destroys trap at target position', () => {
      const effect = new TrapDoorDestructionEffect({
        type: 'trapDoorDestruction',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      level.addTrap({ x: 12, y: 10 });
      expect(level.getTrapAt({ x: 12, y: 10 })).toBeDefined();

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(level.getTrapAt({ x: 12, y: 10 })).toBeUndefined();
      expect(result.messages.some(m => m.includes('trap') || m.includes('destroyed'))).toBe(true);
    });

    it('destroys door at target position', () => {
      const effect = new TrapDoorDestructionEffect({
        type: 'trapDoorDestruction',
        target: 'position',
      });
      const actor = createActor(10, 10);
      const level = createMockLevel();

      level.setDoor({ x: 12, y: 10 });

      const context: GPEffectContext = {
        actor,
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(level.getTile({ x: 12, y: 10 }).terrain.key).toBe('floor');
      expect(result.messages.some(m => m.includes('door') || m.includes('destroyed'))).toBe(true);
    });

    it('reports nothing at empty floor', () => {
      const effect = new TrapDoorDestructionEffect({
        type: 'trapDoorDestruction',
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
      expect(result.messages.some(m => m.includes('nothing'))).toBe(true);
    });
  });
});
