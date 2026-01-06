/**
 * Monster AI System
 *
 * Extracted from Zangband melee2.c and mspells1.c
 * Handles monster decision making including:
 * - Movement toward/away from player
 * - Fleeing when HP is low or afraid
 * - Spell casting decisions
 * - Special behaviors (breeding, stealing, etc.)
 */

import type { Position } from '../types';
import type { Level } from '../world/Level';

/** Maximum spell range */
const MAX_RANGE = 18;

/** Distance at which fleeing monsters stop running */
const FLEE_RANGE = 15;

/** Maximum number of reproducers on a level */
const MAX_REPRO = 100;

/** Multiplier adjustment for breeding in crowded areas */
const MON_MULT_ADJ = 8;

/**
 * Actions a monster can take
 */
export const AIAction = {
  None: 'none',
  Move: 'move',
  Attack: 'attack',
  Flee: 'flee',
  CastSpell: 'cast_spell',
  Breed: 'breed',
} as const;

export type AIAction = (typeof AIAction)[keyof typeof AIAction];

/**
 * Result of AI decision making
 */
export interface AIDecision {
  action: AIAction;
  targetPos?: Position;
  spell?: string;
  spellFailed?: boolean;
  destroysTerrain?: boolean;
}

/**
 * Context passed to AI for decision making
 */
export interface MonsterAIContext {
  // Monster state
  monsterPos: Position;
  monsterHp: number;
  monsterMaxHp: number;
  monsterLevel: number;

  // Player state
  playerPos: Position;
  playerHp: number;
  playerMaxHp: number;
  playerLevel: number;

  // Relationship
  distanceToPlayer: number;
  hasLineOfSight: boolean;

  // Status effects
  isConfused: boolean;
  isFeared: boolean;
  isStunned: boolean;
  isSleeping: boolean;

  // Monster flags (from monster definition)
  flags: string[];

  // Spellcasting
  spells: string[];
  spellChance: number;

  // Level/environment
  level: Level;

  // Breeding context
  currentReproCount?: number;
  maxReproCount?: number;
  adjacentMonsterCount?: number;
}

/**
 * Monster AI system based on Zangband melee2.c
 */
export class MonsterAI {
  /**
   * Main decision function - determines what action a monster should take
   */
  decide(ctx: MonsterAIContext): AIDecision {
    // Sleeping monsters do nothing
    if (ctx.isSleeping) {
      return { action: AIAction.None };
    }

    // Stunned monsters do nothing
    if (ctx.isStunned) {
      return { action: AIAction.None };
    }

    // Check for breeding (MULTIPLY flag)
    if (this.shouldBreed(ctx)) {
      return { action: AIAction.Breed };
    }

    // Try casting a spell first (if able)
    const spellDecision = this.trySpellcast(ctx);
    if (spellDecision) {
      return spellDecision;
    }

    // Check if monster should flee
    if (this.shouldFlee(ctx)) {
      return this.handleFleeing(ctx);
    }

    // Check if adjacent to player - attack
    if (ctx.distanceToPlayer <= 1) {
      return { action: AIAction.Attack };
    }

    // Default: move toward player
    return this.handleMovement(ctx);
  }

  /**
   * Determines if a monster will run from the player.
   * Based on mon_will_run() from melee2.c
   *
   * Monsters will attempt to avoid very powerful players.
   * This compares monster level + morale (25) against player level,
   * then factors in HP ratios.
   */
  willRun(ctx: MonsterAIContext): boolean {
    // Already afraid monsters always run
    if (ctx.isFeared) {
      return true;
    }

    // NO_FEAR flag prevents fleeing
    if (ctx.flags.includes('NO_FEAR')) {
      return false;
    }

    // Keep monsters from running too far away
    if (ctx.distanceToPlayer > MAX_RANGE + 5) {
      return false;
    }

    // Nearby monsters will not become terrified
    if (ctx.distanceToPlayer <= 5) {
      return false;
    }

    // Examine player power (level)
    const pLev = ctx.playerLevel;

    // Examine monster power (level plus morale bonus of 25)
    const mLev = ctx.monsterLevel + 25;

    // Optimize extreme cases
    if (mLev > pLev + 4) {
      return false;
    }
    if (mLev + 4 <= pLev) {
      return true;
    }

    // Compare combined strength values
    // p_val = (p_lev * p_mhp) + (p_chp << 2)
    // m_val = (m_lev * m_mhp) + (m_chp << 2)
    const pVal = pLev * ctx.playerMaxHp + (ctx.playerHp << 2);
    const mVal = mLev * ctx.monsterMaxHp + (ctx.monsterHp << 2);

    // Strong players scare monsters
    if (pVal * ctx.monsterMaxHp > mVal * ctx.playerMaxHp) {
      return true;
    }

    return false;
  }

  /**
   * Check if monster should flee based on fear or HP
   */
  private shouldFlee(ctx: MonsterAIContext): boolean {
    // Already afraid
    if (ctx.isFeared) {
      return true;
    }

    // NO_FEAR prevents fleeing
    if (ctx.flags.includes('NO_FEAR')) {
      return false;
    }

    // Very low HP triggers fear check
    const hpPercent = (ctx.monsterHp * 100) / ctx.monsterMaxHp;
    if (hpPercent <= 10) {
      // Random chance to become afraid at low HP
      return Math.random() * 100 < 80;
    }

    return this.willRun(ctx);
  }

  /**
   * Handle fleeing behavior
   */
  private handleFleeing(ctx: MonsterAIContext): AIDecision {
    // If well away from danger, relax
    if (ctx.distanceToPlayer >= FLEE_RANGE) {
      return { action: AIAction.None };
    }

    // Find direction away from player
    const targetPos = this.getDirectionAwayFrom(ctx.monsterPos, ctx.playerPos);

    // Check if we can actually move there
    if (this.canMoveTo(ctx, targetPos)) {
      return {
        action: AIAction.Flee,
        targetPos,
      };
    }

    // Try to find a safe location
    const safePos = this.findSafeLocation(ctx);
    if (safePos) {
      return {
        action: AIAction.Flee,
        targetPos: safePos,
      };
    }

    // Can't flee - turn and fight (no longer afraid)
    return { action: AIAction.Attack };
  }

  /**
   * Handle normal movement toward player
   */
  private handleMovement(ctx: MonsterAIContext): AIDecision {
    // NEVER_MOVE flag
    if (ctx.flags.includes('NEVER_MOVE')) {
      return { action: AIAction.Move, targetPos: ctx.monsterPos };
    }

    // Confused - random movement
    if (ctx.isConfused) {
      return this.getRandomMove(ctx);
    }

    // Random movement flags
    let randChance = 0;
    if (ctx.flags.includes('RAND_50')) randChance += 50;
    if (ctx.flags.includes('RAND_25')) randChance += 25;

    if (randChance > 0 && Math.random() * 100 < randChance) {
      return this.getRandomMove(ctx);
    }

    // Move toward player
    const targetPos = this.getDirectionToward(ctx.monsterPos, ctx.playerPos);

    // Check for wall passing abilities
    const canPassWalls = ctx.flags.includes('PASS_WALL');
    const killsWalls = ctx.flags.includes('KILL_WALL');

    if (this.canMoveTo(ctx, targetPos) || canPassWalls) {
      return {
        action: AIAction.Move,
        targetPos,
        destroysTerrain: killsWalls && !ctx.level.isWalkable(targetPos),
      };
    }

    // Can't move to preferred location, try alternatives
    return this.getAlternativeMove(ctx);
  }

  /**
   * Try to cast a spell
   */
  private trySpellcast(ctx: MonsterAIContext): AIDecision | null {
    if (!this.canCastSpell(ctx)) {
      return null;
    }

    // Roll against spell chance
    if (Math.random() * 100 >= ctx.spellChance) {
      return null;
    }

    // Smart monsters at low HP use desperate spells
    let availableSpells = [...ctx.spells];
    if (
      ctx.flags.includes('SMART') &&
      ctx.monsterHp < ctx.monsterMaxHp / 10
    ) {
      // Filter to "intelligent" spells (healing, teleport, etc.)
      const intSpells = ['HEAL', 'TELE_SELF', 'BLINK', 'HASTE'];
      const desperate = availableSpells.filter(s => intSpells.includes(s));
      if (desperate.length > 0) {
        availableSpells = desperate;
      }
    }

    // Choose a random spell from available
    const spell = availableSpells[Math.floor(Math.random() * availableSpells.length)];

    // Calculate spell failure rate (STUPID monsters never fail)
    let spellFailed = false;
    if (!ctx.flags.includes('STUPID')) {
      const failrate = Math.max(0, 25 - (ctx.monsterLevel + 3) / 4);
      spellFailed = Math.random() * 100 < failrate;
    }

    return {
      action: AIAction.CastSpell,
      spell,
      spellFailed,
    };
  }

  /**
   * Check if monster can cast spells in current context
   */
  canCastSpell(ctx: MonsterAIContext): boolean {
    // No spells available
    if (!ctx.spells || ctx.spells.length === 0) {
      return false;
    }

    // Cannot cast when confused
    if (ctx.isConfused) {
      return false;
    }

    // Must be in range
    if (ctx.distanceToPlayer > MAX_RANGE) {
      return false;
    }

    // Need line of sight for most spells
    if (!ctx.hasLineOfSight) {
      return false;
    }

    return true;
  }

  /**
   * Check if monster should attempt to breed
   */
  private shouldBreed(ctx: MonsterAIContext): boolean {
    if (!ctx.flags.includes('MULTIPLY')) {
      return false;
    }

    // Check reproduction limit
    const currentRepro = ctx.currentReproCount ?? 0;
    const maxRepro = ctx.maxReproCount ?? MAX_REPRO;
    if (currentRepro >= maxRepro) {
      return false;
    }

    // Check crowding - harder to breed when surrounded
    const adjacent = ctx.adjacentMonsterCount ?? 0;
    if (adjacent >= 4) {
      return false;
    }

    // Random chance, reduced by crowding
    if (adjacent > 0) {
      return Math.random() < 1 / (adjacent * MON_MULT_ADJ);
    }

    // Base breeding chance
    return Math.random() < 0.1;
  }

  /**
   * Get a random move for confused/random monsters
   */
  private getRandomMove(ctx: MonsterAIContext): AIDecision {
    const directions = [
      { x: -1, y: -1 },
      { x: 0, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 1 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ];

    const dir = directions[Math.floor(Math.random() * directions.length)];
    const targetPos = {
      x: ctx.monsterPos.x + dir.x,
      y: ctx.monsterPos.y + dir.y,
    };

    return {
      action: AIAction.Move,
      targetPos,
    };
  }

  /**
   * Get alternative move when primary direction blocked
   */
  private getAlternativeMove(ctx: MonsterAIContext): AIDecision {
    const dx = Math.sign(ctx.playerPos.x - ctx.monsterPos.x);
    const dy = Math.sign(ctx.playerPos.y - ctx.monsterPos.y);

    // Try orthogonal alternatives
    const alternatives = [
      { x: ctx.monsterPos.x + dx, y: ctx.monsterPos.y },
      { x: ctx.monsterPos.x, y: ctx.monsterPos.y + dy },
    ];

    for (const pos of alternatives) {
      if (this.canMoveTo(ctx, pos)) {
        return { action: AIAction.Move, targetPos: pos };
      }
    }

    // Can't move
    return { action: AIAction.None };
  }

  /**
   * Find a safe location away from player
   */
  private findSafeLocation(ctx: MonsterAIContext): Position | null {
    // Simple implementation: look for adjacent tile furthest from player
    let bestPos: Position | null = null;
    let bestDist = 0;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;

        const pos = {
          x: ctx.monsterPos.x + dx,
          y: ctx.monsterPos.y + dy,
        };

        if (!this.canMoveTo(ctx, pos)) continue;

        const dist = this.calculateDistance(pos, ctx.playerPos);
        if (dist > bestDist) {
          bestDist = dist;
          bestPos = pos;
        }
      }
    }

    return bestPos;
  }

  /**
   * Check if monster can move to a position
   */
  private canMoveTo(ctx: MonsterAIContext, pos: Position): boolean {
    // Check bounds
    if (!ctx.level.isInBounds(pos)) {
      return false;
    }

    // Pass through walls ability
    if (ctx.flags.includes('PASS_WALL')) {
      return true;
    }

    // Kill walls ability
    if (ctx.flags.includes('KILL_WALL')) {
      return true;
    }

    return ctx.level.isWalkable(pos);
  }

  /**
   * Get position one step toward target
   */
  getDirectionToward(from: Position, to: Position): Position {
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);

    return {
      x: from.x + dx,
      y: from.y + dy,
    };
  }

  /**
   * Get position one step away from threat
   */
  getDirectionAwayFrom(from: Position, threat: Position): Position {
    const dx = Math.sign(from.x - threat.x);
    const dy = Math.sign(from.y - threat.y);

    return {
      x: from.x + dx,
      y: from.y + dy,
    };
  }

  /**
   * Calculate distance between two positions (Chebyshev distance)
   */
  calculateDistance(a: Position, b: Position): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return Math.max(dx, dy);
  }
}
