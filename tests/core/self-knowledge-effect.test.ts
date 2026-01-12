import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { SelfKnowledgeEffect } from '@/core/systems/effects/SelfKnowledgeEffect';
import { Player } from '@/core/entities/Player';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';
import { createMockLevel } from './testHelpers';

function createTestPlayer(x: number, y: number): Player {
  return new Player({
    id: 'test-player',
    position: { x, y },
    maxHp: 100,
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
}

describe('SelfKnowledgeEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('always returns true (self-targeted)', () => {
      const effect = new SelfKnowledgeEffect({ type: 'selfKnowledge' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);
      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute - player info', () => {
    it('returns success with player knowledge', () => {
      const effect = new SelfKnowledgeEffect({ type: 'selfKnowledge' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('includes stat information', () => {
      const effect = new SelfKnowledgeEffect({ type: 'selfKnowledge' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // Should include information about stats
      const allMessages = result.messages.join(' ').toLowerCase();
      expect(
        allMessages.includes('str') ||
        allMessages.includes('strength') ||
        allMessages.includes('stat')
      ).toBe(true);
    });

    it('includes HP information', () => {
      const effect = new SelfKnowledgeEffect({ type: 'selfKnowledge' });
      const player = createTestPlayer(25, 25);
      player.takeDamage(30); // Take some damage
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // Should include HP info
      const allMessages = result.messages.join(' ').toLowerCase();
      expect(
        allMessages.includes('hp') ||
        allMessages.includes('health') ||
        allMessages.includes('life')
      ).toBe(true);
    });

    it('includes speed information', () => {
      const effect = new SelfKnowledgeEffect({ type: 'selfKnowledge' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // Should include speed info
      const allMessages = result.messages.join(' ').toLowerCase();
      expect(allMessages.includes('speed')).toBe(true);
    });

    it('reports active statuses', async () => {
      const effect = new SelfKnowledgeEffect({ type: 'selfKnowledge' });
      const player = createTestPlayer(25, 25);

      // Apply a status using the proper status system (using DurationStatus directly)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { DurationStatus } = await import('@/core/systems/status/DurationStatus');
      const blessedDef = {
        type: 'duration',
        name: 'Blessed',
        messages: { apply: 'You feel righteous!', expire: 'The blessing has worn off.' },
      };
      const blessedStatus = new DurationStatus('blessed', blessedDef, { duration: 100 });
      player.statuses.add(blessedStatus, player);

      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // Should report blessed status
      const allMessages = result.messages.join(' ').toLowerCase();
      expect(allMessages.includes('blessed') || allMessages.includes('righteous')).toBe(true);
    });
  });

  describe('execute - return data', () => {
    it('returns knowledge data for UI display', () => {
      const effect = new SelfKnowledgeEffect({ type: 'selfKnowledge' });
      const player = createTestPlayer(25, 25);
      const level = createMockLevel([], player);

      const context: GPEffectContext = {
        actor: player,
        level: level as any,
        rng: RNG,
      };

      const result = effect.execute(context);

      // Should return data object with knowledge info
      expect(result.data).toBeDefined();
      expect(result.data?.['type']).toBe('selfKnowledge');
    });
  });
});
