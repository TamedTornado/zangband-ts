import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { WizLiteEffect } from '@/core/systems/effects/WizLiteEffect';
import { Player } from '@/core/entities/Player';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import { createMockLevel, createTestMonster } from './testHelpers';

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
  });
}

describe('WizLiteEffect', () => {
  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted effect)', () => {
      const effect = new WizLiteEffect({ type: 'wizLite' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute - map revelation', () => {
    it('reveals all tiles on the map', () => {
      const effect = new WizLiteEffect({ type: 'wizLite' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);

      // Initially tiles are unexplored
      const tile = level.getTile({ x: 10, y: 10 }) as { explored: boolean };
      expect(tile.explored).toBe(false);

      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };
      const result = effect.execute(context);

      expect(result.success).toBe(true);
      // After wizLite, tiles should be explored
      expect(tile.explored).toBe(true);
    });

    it('reveals all tiles across the entire level', () => {
      const effect = new WizLiteEffect({ type: 'wizLite' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      effect.execute(context);

      // Check corners and edges
      expect((level.getTile({ x: 0, y: 0 }) as { explored: boolean }).explored).toBe(true);
      expect((level.getTile({ x: level.width - 1, y: 0 }) as { explored: boolean }).explored).toBe(true);
      expect((level.getTile({ x: 0, y: level.height - 1 }) as { explored: boolean }).explored).toBe(true);
      expect((level.getTile({ x: level.width - 1, y: level.height - 1 }) as { explored: boolean }).explored).toBe(true);
    });
  });

  describe('execute - monster detection', () => {
    it('detects all monsters on the level', () => {
      const effect = new WizLiteEffect({ type: 'wizLite' });
      const player = createTestPlayer(5, 5);
      const monster1 = createTestMonster({ name: 'Orc', position: { x: 10, y: 10 } });
      const monster2 = createTestMonster({ name: 'Troll', position: { x: 20, y: 20 } });
      const level = createMockLevel([monster1, monster2], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      // Tiles with monsters should remember them
      const tile1 = level.getTile(monster1.position) as { explored: boolean };
      const tile2 = level.getTile(monster2.position) as { explored: boolean };
      expect(tile1.explored).toBe(true);
      expect(tile2.explored).toBe(true);
    });

    it('does not detect dead monsters', () => {
      const effect = new WizLiteEffect({ type: 'wizLite' });
      const player = createTestPlayer(5, 5);
      const monster = createTestMonster({ name: 'Orc', position: { x: 10, y: 10 } });
      monster.takeDamage(1000); // Kill the monster
      const level = createMockLevel([monster], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      // Message shouldn't mention any creatures
      expect(result.messages.some(m => m.includes('creature'))).toBe(false);
    });
  });

  describe('execute - messages', () => {
    it('displays enlightenment message', () => {
      const effect = new WizLiteEffect({ type: 'wizLite' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0]).toContain('surroundings');
    });

    it('includes monster count when monsters detected', () => {
      const effect = new WizLiteEffect({ type: 'wizLite' });
      const player = createTestPlayer(5, 5);
      const monster1 = createTestMonster({ name: 'Orc', position: { x: 10, y: 10 } });
      const monster2 = createTestMonster({ name: 'Troll', position: { x: 20, y: 20 } });
      const level = createMockLevel([monster1, monster2], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.messages.some(m => m.includes('2') && m.includes('creature'))).toBe(true);
    });
  });

  describe('execute - turn consumption', () => {
    it('consumes a turn', () => {
      const effect = new WizLiteEffect({ type: 'wizLite' });
      const player = createTestPlayer(5, 5);
      const level = createMockLevel([], player);
      const context: GPEffectContext = { actor: player, level: level as any, rng: RNG };

      const result = effect.execute(context);

      expect(result.turnConsumed).toBe(true);
    });
  });
});
