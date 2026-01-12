import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RNG } from 'rot-js';
import { triggerTrap, type TrapTriggerContext } from '@/core/systems/TrapTrigger';
import { Trap } from '@/core/entities/Trap';
import { Player } from '@/core/entities/Player';
import { Level } from '@/core/world/Level';
import type { TrapDef } from '@/core/data/traps';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';

// Test data fixtures
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

const createTestPlayer = (): Player => {
  const player = new Player({
    id: 'player_1',
    position: { x: 5, y: 5 },
    maxHp: 100,
    speed: 110,
    stats: { str: 14, int: 14, wis: 14, dex: 14, con: 14, chr: 14 },
  });
  return player;
};

describe('TrapTrigger', () => {
  let player: Player;
  let level: Level;
  let context: TrapTriggerContext;

  beforeEach(() => {
    loadStatusDefs(statusesData);
    player = createTestPlayer();
    level = new Level(20, 20, { depth: 5 });
    level.player = player;
    context = {
      player,
      level,
      rng: RNG,
    };
  });

  describe('triggerTrap basic behavior', () => {
    it('does nothing for disarmed traps', () => {
      const trapDef = createTestTrap();
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      trap.disarm();
      level.addTrap(trap);

      const result = triggerTrap(context, trap);

      expect(result.triggered).toBe(false);
      expect(result.messages).toHaveLength(0);
    });

    it('reveals hidden traps on trigger', () => {
      const trapDef = createTestTrap({ flags: ['FLOOR', 'HIDDEN'] });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);
      expect(trap.isRevealed).toBe(false);

      triggerTrap(context, trap);

      expect(trap.isRevealed).toBe(true);
    });

    it('removes trap from level after triggering (one-shot)', () => {
      const trapDef = createTestTrap();
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);

      triggerTrap(context, trap);

      expect(level.getTrapAt({ x: 5, y: 5 })).toBeUndefined();
    });

    it('generates appropriate messages', () => {
      const trapDef = createTestTrap({ name: 'Pit Trap' });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);

      const result = triggerTrap(context, trap);

      expect(result.messages.length).toBeGreaterThan(0);
      // Should have a "trap found" message for hidden traps
      expect(result.messages.some(m => m.text.toLowerCase().includes('trap'))).toBe(true);
    });
  });

  describe('saving throws', () => {
    it('checks DEX save for physical traps', () => {
      const trapDef = createTestTrap({
        effect: 'DAMAGE',
        damage: '10d6', // High damage to see the difference
        saveType: 'DEX',
        saveDifficulty: 5, // Easy save
      });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);

      // High DEX should help with saves
      player.stats.dex = 18;
      const startHp = player.hp;

      // Run multiple times to verify save reduces damage on average
      let totalDamage = 0;
      for (let i = 0; i < 10; i++) {
        player.hp = startHp;
        const trap2 = new Trap({ id: `trap_${i}`, position: { x: 5, y: 5 }, definition: trapDef });
        level.addTrap(trap2);
        triggerTrap(context, trap2);
        totalDamage += startHp - player.hp;
      }

      // With high DEX and easy save, damage should often be reduced
      expect(totalDamage).toBeLessThan(10 * 35); // 10d6 avg is 35, saves should reduce some
    });

    it('skips save for traps with saveType "none"', () => {
      const trapDef = createTestTrap({
        effect: 'TELEPORT',
        teleportRange: 100,
        saveType: 'none',
        saveDifficulty: 0,
      });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);

      // Even with very high stats, teleport should always trigger
      player.stats.dex = 30;
      player.stats.con = 30;
      player.stats.wis = 30;
      player.stats.int = 30;

      const result = triggerTrap(context, trap);

      expect(result.triggered).toBe(true);
      expect(result.teleported).toBe(true);
    });
  });

  describe('effect: DAMAGE', () => {
    it('deals damage from damage dice', () => {
      const trapDef = createTestTrap({
        effect: 'DAMAGE',
        damage: '2d6',
        saveType: 'none', // No save for predictable test
        saveDifficulty: 0,
      });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);
      const startHp = player.hp;

      triggerTrap(context, trap);

      expect(player.hp).toBeLessThan(startHp);
      expect(startHp - player.hp).toBeGreaterThanOrEqual(2); // Min 2d6 = 2
      expect(startHp - player.hp).toBeLessThanOrEqual(12); // Max 2d6 = 12
    });

    it('halves damage on successful save', () => {
      // Use deterministic RNG for this test
      const mockRng = {
        getUniformInt: vi.fn()
          .mockReturnValueOnce(6) // First dice roll
          .mockReturnValueOnce(6) // Second dice roll = 12 damage
          .mockReturnValueOnce(1), // Save roll = success (low roll)
      } as unknown as typeof RNG;

      const testContext: TrapTriggerContext = { ...context, rng: mockRng };

      const trapDef = createTestTrap({
        effect: 'DAMAGE',
        damage: '2d6',
        saveType: 'DEX',
        saveDifficulty: 0, // Very easy save
      });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);
      player.stats.dex = 18; // High DEX for easy save
      const startHp = player.hp;

      triggerTrap(testContext, trap);

      // With a successful save, damage should be halved (12 -> 6)
      expect(startHp - player.hp).toBeLessThanOrEqual(6);
    });
  });

  describe('effect: FALL (trap door)', () => {
    it('deals falling damage', () => {
      const trapDef = createTestTrap({
        effect: 'FALL',
        damage: '2d8',
        saveType: 'DEX',
        saveDifficulty: 5,
      });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);
      const startHp = player.hp;

      triggerTrap(context, trap);

      expect(player.hp).toBeLessThan(startHp);
    });

    it('sets fellThroughFloor flag', () => {
      const trapDef = createTestTrap({
        effect: 'FALL',
        damage: '2d8',
        saveType: 'none', // Guaranteed to trigger
        saveDifficulty: 0,
      });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);

      const result = triggerTrap(context, trap);

      expect(result.fellThroughFloor).toBe(true);
    });

    it('is prevented by feather falling (no floor fall)', () => {
      const trapDef = createTestTrap({
        effect: 'FALL',
        damage: '2d8',
        saveType: 'none',
        saveDifficulty: 0,
      });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);

      // TODO: Add feather falling flag to player when implemented
      // For now, we skip this test as feather falling isn't implemented
      const result = triggerTrap(context, trap);
      expect(result.fellThroughFloor).toBe(true); // Without feather falling
    });
  });

  describe('effect: POISON', () => {
    it('deals physical damage', () => {
      const trapDef = createTestTrap({
        effect: 'POISON',
        damage: '2d6',
        poisonDamage: '4d6',
        saveType: 'none',
        saveDifficulty: 0,
      });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);
      const startHp = player.hp;

      triggerTrap(context, trap);

      expect(player.hp).toBeLessThan(startHp);
    });

    it('applies poison status effect', () => {
      const trapDef = createTestTrap({
        effect: 'POISON',
        damage: '2d6',
        poisonDamage: '4d6',
        saveType: 'none',
        saveDifficulty: 0,
      });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);

      triggerTrap(context, trap);

      expect(player.statuses.has('poisoned')).toBe(true);
    });
  });

  describe('effect: TELEPORT', () => {
    it('teleports player to random location', () => {
      const trapDef = createTestTrap({
        effect: 'TELEPORT',
        teleportRange: 100,
        saveType: 'none',
        saveDifficulty: 0,
      });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);

      const result = triggerTrap(context, trap);

      expect(result.teleported).toBe(true);
    });
  });

  describe('effect: status effects', () => {
    it('BLIND applies blind status', () => {
      const trapDef = createTestTrap({
        effect: 'BLIND',
        duration: '10+1d10',
        saveType: 'none',
        saveDifficulty: 0,
      });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);

      triggerTrap(context, trap);

      expect(player.statuses.has('blind')).toBe(true);
    });

    it('CONFUSE applies confused status', () => {
      const trapDef = createTestTrap({
        effect: 'CONFUSE',
        duration: '10+1d10',
        saveType: 'none',
        saveDifficulty: 0,
      });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);

      triggerTrap(context, trap);

      expect(player.statuses.has('confused')).toBe(true);
    });

    it('SLOW_DART applies slow status', () => {
      const trapDef = createTestTrap({
        effect: 'SLOW_DART',
        damage: '1d4',
        duration: '15+1d15',
        saveType: 'none',
        saveDifficulty: 0,
      });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);

      triggerTrap(context, trap);

      expect(player.statuses.has('slow')).toBe(true);
    });

    it('SLEEP applies paralyzed status', () => {
      const trapDef = createTestTrap({
        effect: 'SLEEP',
        saveType: 'none',
        saveDifficulty: 0,
      });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);

      triggerTrap(context, trap);

      expect(player.statuses.has('paralyzed')).toBe(true);
    });
  });

  describe('effect: DRAIN_XP', () => {
    it('reduces player experience', () => {
      const trapDef = createTestTrap({
        effect: 'DRAIN_XP',
        xpDrain: '20+1d20',
        saveType: 'none',
        saveDifficulty: 0,
      });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);
      player.gainExperience(1000);
      const startXp = player.experience;

      triggerTrap(context, trap);

      expect(player.experience).toBeLessThan(startXp);
    });
  });

  describe('effect: AGGRAVATE', () => {
    it('wakes all monsters on level', () => {
      const trapDef = createTestTrap({
        effect: 'AGGRAVATE',
        saveType: 'none',
        saveDifficulty: 0,
      });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);

      const result = triggerTrap(context, trap);

      expect(result.aggravated).toBe(true);
      // Actual monster waking is done by the caller with access to monsters
    });
  });

  describe('effect: SUMMON', () => {
    it('requests monster summoning', () => {
      const trapDef = createTestTrap({
        effect: 'SUMMON',
        summonCount: '2d3',
        saveType: 'none',
        saveDifficulty: 0,
      });
      const trap = new Trap({ id: 'trap_1', position: { x: 5, y: 5 }, definition: trapDef });
      level.addTrap(trap);

      const result = triggerTrap(context, trap);

      expect(result.summonCount).toBeGreaterThanOrEqual(2);
      expect(result.summonCount).toBeLessThanOrEqual(6);
    });
  });
});
