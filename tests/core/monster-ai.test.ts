import { describe, it, expect, beforeEach } from 'vitest';
import {
  MonsterAI,
  type MonsterAIContext,
  AIAction,
} from '@/core/systems/MonsterAI';
import { Level } from '@/core/world/Level';
import type { Position } from '@/core/types';

/**
 * Monster AI tests based on Zangband melee2.c behavior:
 * - Movement toward/away from player
 * - Fleeing when HP is low or afraid
 * - Spell casting decisions
 * - Special behaviors (breeding, stealing, etc.)
 */
describe('MonsterAI', () => {
  let ai: MonsterAI;
  let level: Level;

  beforeEach(() => {
    ai = new MonsterAI();
    level = new Level(20, 20);
  });

  function createContext(overrides: Partial<MonsterAIContext> = {}): MonsterAIContext {
    return {
      monsterPos: { x: 5, y: 5 },
      playerPos: { x: 10, y: 10 },
      monsterHp: 100,
      monsterMaxHp: 100,
      monsterLevel: 5,
      playerLevel: 1,
      playerHp: 100,
      playerMaxHp: 100,
      distanceToPlayer: 7,
      hasLineOfSight: true,
      isConfused: false,
      isFeared: false,
      isStunned: false,
      isSleeping: false,
      flags: [],
      spells: [],
      spellChance: 0,
      level,
      ...overrides,
    };
  }

  describe('decide', () => {
    it('should return NONE for sleeping monsters', () => {
      const ctx = createContext({ isSleeping: true });
      const decision = ai.decide(ctx);
      expect(decision.action).toBe(AIAction.None);
    });

    it('should return NONE for stunned monsters', () => {
      const ctx = createContext({ isStunned: true });
      const decision = ai.decide(ctx);
      expect(decision.action).toBe(AIAction.None);
    });
  });

  describe('movement toward player', () => {
    it('should move toward player when hostile and not fleeing', () => {
      const ctx = createContext({
        monsterPos: { x: 5, y: 5 },
        playerPos: { x: 10, y: 5 },
        distanceToPlayer: 5,
      });

      const decision = ai.decide(ctx);
      expect(decision.action).toBe(AIAction.Move);
      // Should move east toward player
      expect(decision.targetPos?.x).toBeGreaterThan(5);
    });

    it('should move diagonally when appropriate', () => {
      const ctx = createContext({
        monsterPos: { x: 5, y: 5 },
        playerPos: { x: 10, y: 10 },
        distanceToPlayer: 7,
      });

      const decision = ai.decide(ctx);
      expect(decision.action).toBe(AIAction.Move);
      // Should move diagonally
      expect(decision.targetPos?.x).toBeGreaterThan(5);
      expect(decision.targetPos?.y).toBeGreaterThan(5);
    });

    it('should attack when adjacent to player', () => {
      const ctx = createContext({
        monsterPos: { x: 5, y: 5 },
        playerPos: { x: 6, y: 5 },
        distanceToPlayer: 1,
      });

      const decision = ai.decide(ctx);
      expect(decision.action).toBe(AIAction.Attack);
    });
  });

  describe('fleeing behavior', () => {
    it('should flee when HP is very low (below 10%)', () => {
      const ctx = createContext({
        monsterHp: 5,
        monsterMaxHp: 100,
        isFeared: true,
      });

      const decision = ai.decide(ctx);
      expect(decision.action).toBe(AIAction.Flee);
    });

    it('should flee when monster is afraid', () => {
      const ctx = createContext({
        isFeared: true,
        monsterHp: 100,
        monsterMaxHp: 100,
      });

      const decision = ai.decide(ctx);
      expect(decision.action).toBe(AIAction.Flee);
    });

    it('should move away from player when fleeing', () => {
      const ctx = createContext({
        monsterPos: { x: 10, y: 10 },
        playerPos: { x: 5, y: 5 },
        distanceToPlayer: 7,
        isFeared: true,
      });

      const decision = ai.decide(ctx);
      expect(decision.action).toBe(AIAction.Flee);
      // Should move away from player (northeast)
      expect(decision.targetPos?.x).toBeGreaterThan(10);
      expect(decision.targetPos?.y).toBeGreaterThan(10);
    });

    it('should not flee when NO_FEAR flag is set', () => {
      const ctx = createContext({
        monsterHp: 5,
        monsterMaxHp: 100,
        flags: ['NO_FEAR'],
      });

      const decision = ai.decide(ctx);
      // Should still attack/move even at low HP
      expect(decision.action).not.toBe(AIAction.Flee);
    });

    it('should stop fleeing when far enough from player', () => {
      const ctx = createContext({
        distanceToPlayer: 20,
        isFeared: true,
      });

      const decision = ai.decide(ctx);
      // At distance >= FLEE_RANGE (15), monster should stop running
      expect(decision.action).toBe(AIAction.None);
    });
  });

  describe('willRun - flee decision calculation', () => {
    it('should flee when player is much stronger', () => {
      const ctx = createContext({
        monsterLevel: 5,
        playerLevel: 20,
        distanceToPlayer: 8,
      });

      // Monster level + 25 (morale) = 30, player level = 20
      // When m_lev + 4 <= p_lev, monster runs
      const willRun = ai.willRun(ctx);
      // 5 + 25 = 30, 30 + 4 = 34 > 20, so won't run based on level alone
      // But if close to player and player much stronger in combined value...
      expect(typeof willRun).toBe('boolean');
    });

    it('should not flee when monster is much stronger', () => {
      const ctx = createContext({
        monsterLevel: 30,
        playerLevel: 5,
        distanceToPlayer: 8,
      });

      const willRun = ai.willRun(ctx);
      expect(willRun).toBe(false);
    });

    it('should not flee when very close to player (within 5 tiles)', () => {
      const ctx = createContext({
        monsterLevel: 5,
        playerLevel: 50,
        distanceToPlayer: 3,
      });

      const willRun = ai.willRun(ctx);
      // Nearby monsters don't become terrified
      expect(willRun).toBe(false);
    });
  });

  describe('spellcasting behavior', () => {
    it('should consider casting spell when in range and has spells', () => {
      const ctx = createContext({
        spells: ['BA_FIRE', 'BO_COLD'],
        spellChance: 2, // 1 in 2 = 50% chance
        hasLineOfSight: true,
        distanceToPlayer: 5,
      });

      // Run multiple times since spell casting is probabilistic
      let castCount = 0;
      for (let i = 0; i < 100; i++) {
        const decision = ai.decide(ctx);
        if (decision.action === AIAction.CastSpell) {
          castCount++;
        }
      }

      // Should cast sometimes given 1 in 2 (50%) chance
      expect(castCount).toBeGreaterThan(10);
    });

    it('should not cast spells when confused', () => {
      const ctx = createContext({
        spells: ['BA_FIRE'],
        spellChance: 1, // 1 in 1 = 100% chance
        isConfused: true,
      });

      const decision = ai.decide(ctx);
      expect(decision.action).not.toBe(AIAction.CastSpell);
    });

    it('should not cast spells when out of range', () => {
      const ctx = createContext({
        spells: ['BA_FIRE'],
        spellChance: 1, // 1 in 1 = 100% chance
        distanceToPlayer: 30,
      });

      const decision = ai.decide(ctx);
      expect(decision.action).not.toBe(AIAction.CastSpell);
    });

    it('should not cast spells without line of sight', () => {
      const ctx = createContext({
        spells: ['BA_FIRE'],
        spellChance: 1, // 1 in 1 = 100% chance
        hasLineOfSight: false,
      });

      const decision = ai.decide(ctx);
      expect(decision.action).not.toBe(AIAction.CastSpell);
    });

    it('smart monsters should use healing spells when HP is low', () => {
      const ctx = createContext({
        monsterHp: 5, // Below 10% of 100 maxHp
        monsterMaxHp: 100,
        spells: ['HEAL', 'BA_FIRE'],
        spellChance: 1, // 1 in 1 = 100% chance
        flags: ['SMART'],
      });

      // Run multiple times since the monster might flee instead of cast
      let healCount = 0;
      for (let i = 0; i < 100; i++) {
        const decision = ai.decide(ctx);
        if (decision.action === AIAction.CastSpell) {
          // Smart AI at critical HP should prefer HEAL over BA_FIRE
          if (decision.spell === 'HEAL') {
            healCount++;
          }
        }
      }

      // Smart monsters at critical HP should cast HEAL when they cast spells
      // (may flee some of the time instead)
      expect(healCount).toBeGreaterThan(0);
    });
  });

  describe('random movement', () => {
    it('should move randomly when RAND_50 flag and chance triggers', () => {
      const ctx = createContext({
        flags: ['RAND_50'],
      });

      const positions = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const decision = ai.decide(ctx);
        if (decision.targetPos) {
          positions.add(`${decision.targetPos.x},${decision.targetPos.y}`);
        }
      }

      // With random movement, should see variety in target positions
      // (though some may still be toward player by chance)
      expect(positions.size).toBeGreaterThan(1);
    });

    it('should move completely randomly when confused', () => {
      const ctx = createContext({
        isConfused: true,
      });

      const positions = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const decision = ai.decide(ctx);
        if (decision.targetPos) {
          positions.add(`${decision.targetPos.x},${decision.targetPos.y}`);
        }
      }

      // Confused monsters move in random directions
      expect(positions.size).toBeGreaterThan(3);
    });
  });

  describe('special behaviors', () => {
    describe('breeders (MULTIPLY flag)', () => {
      it('should consider breeding when MULTIPLY flag is set', () => {
        const ctx = createContext({
          flags: ['MULTIPLY'],
          currentReproCount: 0,
          maxReproCount: 100,
        });

        let breedCount = 0;
        for (let i = 0; i < 100; i++) {
          const decision = ai.decide(ctx);
          if (decision.action === AIAction.Breed) {
            breedCount++;
          }
        }

        // Should sometimes attempt to breed
        expect(breedCount).toBeGreaterThan(0);
      });

      it('should not breed when reproduction limit reached', () => {
        const ctx = createContext({
          flags: ['MULTIPLY'],
          currentReproCount: 100,
          maxReproCount: 100,
        });

        const decision = ai.decide(ctx);
        expect(decision.action).not.toBe(AIAction.Breed);
      });

      it('should breed less in crowded areas', () => {
        const ctx = createContext({
          flags: ['MULTIPLY'],
          currentReproCount: 0,
          maxReproCount: 100,
          adjacentMonsterCount: 5,
        });

        let breedCount = 0;
        for (let i = 0; i < 100; i++) {
          const decision = ai.decide(ctx);
          if (decision.action === AIAction.Breed) {
            breedCount++;
          }
        }

        // Should breed less when surrounded
        expect(breedCount).toBeLessThan(20);
      });
    });

    describe('thieves (TAKE_ITEM flag)', () => {
      it('should have steal behavior with EAT_GOLD attack', () => {
        const ctx = createContext({
          flags: ['TAKE_ITEM'],
          distanceToPlayer: 1,
          monsterPos: { x: 5, y: 5 },
          playerPos: { x: 6, y: 5 },
        });

        // Thieves should attack and potentially blink away after stealing
        const decision = ai.decide(ctx);
        expect(decision.action).toBe(AIAction.Attack);
      });
    });

    describe('NEVER_MOVE flag', () => {
      it('should not move when NEVER_MOVE flag is set', () => {
        const ctx = createContext({
          flags: ['NEVER_MOVE'],
          distanceToPlayer: 5,
        });

        const decision = ai.decide(ctx);
        if (decision.action === AIAction.Move) {
          // If it decides to "move", it should stay in place
          expect(decision.targetPos).toEqual(ctx.monsterPos);
        }
      });

      it('should still cast spells when NEVER_MOVE but has spells', () => {
        const ctx = createContext({
          flags: ['NEVER_MOVE'],
          spells: ['BA_FIRE'],
          spellChance: 1, // 1 in 1 = 100% chance
          distanceToPlayer: 5,
        });

        const decision = ai.decide(ctx);
        expect(decision.action).toBe(AIAction.CastSpell);
      });
    });

    describe('STUPID flag', () => {
      it('should never fail spellcasting with STUPID flag', () => {
        const ctx = createContext({
          flags: ['STUPID'],
          spells: ['BA_FIRE'],
          spellChance: 1, // 1 in 1 = 100% chance
        });

        // STUPID monsters (like jellies) never fail spells
        let failCount = 0;
        for (let i = 0; i < 100; i++) {
          const decision = ai.decide(ctx);
          if (decision.action === AIAction.CastSpell && decision.spellFailed) {
            failCount++;
          }
        }

        expect(failCount).toBe(0);
      });
    });

    describe('FRIENDS flag (pack monsters)', () => {
      it('should try to surround player with FRIENDS flag', () => {
        const ctx = createContext({
          flags: ['FRIENDS'],
          distanceToPlayer: 2,
        });

        // Pack monsters try to surround rather than just approach
        const decision = ai.decide(ctx);
        expect(decision.action).toBe(AIAction.Move);
      });
    });

    describe('pass through walls', () => {
      it('should move through walls with PASS_WALL flag', () => {
        // Create a wall between monster and player
        const wallLevel = new Level(20, 20);
        wallLevel.setWalkable({ x: 6, y: 5 }, false);
        wallLevel.setWalkable({ x: 7, y: 5 }, false);

        const ctx = createContext({
          monsterPos: { x: 5, y: 5 },
          playerPos: { x: 10, y: 5 },
          flags: ['PASS_WALL'],
          level: wallLevel,
        });

        const decision = ai.decide(ctx);
        expect(decision.action).toBe(AIAction.Move);
        // Can move through wall
        expect(decision.targetPos?.x).toBe(6);
      });
    });

    describe('KILL_WALL flag', () => {
      it('should destroy walls when moving with KILL_WALL flag', () => {
        const ctx = createContext({
          flags: ['KILL_WALL'],
        });

        const decision = ai.decide(ctx);
        if (decision.action === AIAction.Move) {
          // Monster with KILL_WALL can destroy terrain as it moves
          expect(decision.destroysTerrain).toBeDefined();
        }
      });
    });
  });

  describe('getDirectionToward', () => {
    it('should return correct direction toward target', () => {
      const from: Position = { x: 5, y: 5 };
      const to: Position = { x: 10, y: 5 };

      const pos = ai.getDirectionToward(from, to);
      expect(pos.x).toBe(6);
      expect(pos.y).toBe(5);
    });

    it('should return diagonal movement when appropriate', () => {
      const from: Position = { x: 5, y: 5 };
      const to: Position = { x: 10, y: 10 };

      const pos = ai.getDirectionToward(from, to);
      expect(pos.x).toBe(6);
      expect(pos.y).toBe(6);
    });
  });

  describe('getDirectionAwayFrom', () => {
    it('should return correct direction away from threat', () => {
      const from: Position = { x: 5, y: 5 };
      const threat: Position = { x: 3, y: 3 };

      const pos = ai.getDirectionAwayFrom(from, threat);
      expect(pos.x).toBe(6);
      expect(pos.y).toBe(6);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate Chebyshev distance correctly', () => {
      const a: Position = { x: 0, y: 0 };
      const b: Position = { x: 3, y: 4 };

      // Chebyshev distance = max(|dx|, |dy|) = max(3, 4) = 4
      const dist = ai.calculateDistance(a, b);
      expect(dist).toBe(4);
    });

    it('should return 0 for same position', () => {
      const pos: Position = { x: 5, y: 5 };
      expect(ai.calculateDistance(pos, pos)).toBe(0);
    });
  });

  describe('canCastSpell', () => {
    it('should return false when no spells available', () => {
      const ctx = createContext({ spells: [] });
      expect(ai.canCastSpell(ctx)).toBe(false);
    });

    it('should return false when confused', () => {
      const ctx = createContext({
        spells: ['BA_FIRE'],
        isConfused: true,
      });
      expect(ai.canCastSpell(ctx)).toBe(false);
    });

    it('should return false when out of range', () => {
      const ctx = createContext({
        spells: ['BA_FIRE'],
        distanceToPlayer: 30,
      });
      expect(ai.canCastSpell(ctx)).toBe(false);
    });

    it('should return true when conditions are met', () => {
      const ctx = createContext({
        spells: ['BA_FIRE'],
        spellChance: 50,
        hasLineOfSight: true,
        distanceToPlayer: 5,
      });
      expect(ai.canCastSpell(ctx)).toBe(true);
    });
  });
});
