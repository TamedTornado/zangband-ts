import { RNG } from 'rot-js';
import type { Player } from '../entities/Player';
import type { Monster } from '../entities/Monster';
import type { Level } from '../world/Level';
import type { Position } from '../types';
import { Scheduler } from './Scheduler';
import { MonsterAI, AIAction, type MonsterAIContext, type AIDecision } from './MonsterAI';
import { Combat, type MonsterAttack } from './Combat';
import { MonsterDataManager } from '../data/MonsterDataManager';
import { MonsterSpellExecutor } from './MonsterSpellExecutor';
import { getEffectManager } from './effects';
import { ENERGY_PER_TURN } from '../constants';
import type { MonsterDef } from '../data/monsters';
import { checkAwareness, hasLineOfSight } from './Awareness';

export interface GameMessage {
  text: string;
  type: 'normal' | 'combat' | 'info' | 'danger';
}

export interface TurnResult {
  messages: GameMessage[];
  playerDied: boolean;
}

export interface AttackResult {
  hit: boolean;
  damage: number;
  killed: boolean;
  messages: GameMessage[];
}

/**
 * Core game loop - handles turn processing and action resolution
 */
export class GameLoop {
  private monsterAI: MonsterAI;
  private combat: Combat;
  private monsterData: MonsterDataManager;
  private spellExecutor: MonsterSpellExecutor;
  private rng: typeof RNG;

  constructor(rng: typeof RNG, monsterData: MonsterDataManager) {
    this.rng = rng;
    this.monsterAI = new MonsterAI(rng);
    this.combat = new Combat(rng);
    this.monsterData = monsterData;
    this.spellExecutor = new MonsterSpellExecutor(getEffectManager());
  }

  /**
   * Resolve player attacking a monster
   */
  playerAttack(player: Player, monster: Monster): AttackResult {
    const messages: GameMessage[] = [];
    const monsterDef = this.monsterData.getMonsterDef(monster.definitionKey);
    const monsterName = monsterDef?.name ?? 'monster';

    // Parse weapon damage
    const weaponDice = Combat.parseDice(player.weaponDamage);
    weaponDice.bonus += player.weaponToDam;

    // Calculate hit chance
    const hitChance = 50 + player.weaponToHit + Math.floor(player.stats.dex / 2);

    // Test hit
    const hit = this.combat.testHit(hitChance, monsterDef?.ac ?? 0, true);

    if (hit) {
      const damage = this.combat.calcDamage(weaponDice, 0, 100);
      monster.takeDamage(damage);

      messages.push({
        text: `You hit the ${monsterName} for ${damage} damage.`,
        type: 'combat',
      });

      if (monster.isDead) {
        messages.push({
          text: `You have slain the ${monsterName}!`,
          type: 'combat',
        });
      }

      return { hit: true, damage, killed: monster.isDead, messages };
    }

    messages.push({
      text: `You miss the ${monsterName}.`,
      type: 'combat',
    });

    return { hit: false, damage: 0, killed: false, messages };
  }

  /**
   * Resolve monster attacking player
   */
  monsterAttack(monster: Monster, player: Player): AttackResult {
    const messages: GameMessage[] = [];
    const monsterDef = this.monsterData.getMonsterDef(monster.definitionKey);
    const monsterName = monsterDef?.name ?? 'monster';

    if (!monsterDef?.attacks || monsterDef.attacks.length === 0) {
      return { hit: false, damage: 0, killed: false, messages };
    }

    let totalDamage = 0;
    let anyHit = false;

    for (const attack of monsterDef.attacks) {
      const hitChance = 30 + monsterDef.depth * 3;

      const monsterAttackDef: MonsterAttack = {
        method: attack.method,
        ...(attack.effect !== undefined && { effect: attack.effect }),
        ...(attack.damage !== undefined && { damage: attack.damage }),
      };

      const result = this.combat.resolveMonsterAttack(monsterAttackDef, player.totalAc, hitChance);

      if (result.hit && result.damage > 0) {
        player.takeDamage(result.damage);
        totalDamage += result.damage;
        anyHit = true;
        messages.push({
          text: `The ${monsterName} ${attack.method.toLowerCase()}s you for ${result.damage} damage!`,
          type: 'danger',
        });
      } else if (result.hit) {
        anyHit = true;
        messages.push({
          text: `The ${monsterName} ${attack.method.toLowerCase()}s you.`,
          type: 'combat',
        });
      } else {
        messages.push({
          text: `The ${monsterName} misses you.`,
          type: 'combat',
        });
      }
    }

    return { hit: anyHit, damage: totalDamage, killed: player.isDead, messages };
  }

  /**
   * Process monster turns until player can act again
   */
  processMonsterTurns(
    player: Player,
    level: Level,
    scheduler: Scheduler
  ): TurnResult {
    const messages: GameMessage[] = [];

    // Tick to give energy
    scheduler.tick();

    let iterations = 0;
    const maxIterations = 100;

    while (iterations < maxIterations) {
      iterations++;
      const nextActor = scheduler.next();

      if (!nextActor || nextActor === player) {
        break;
      }

      const monster = nextActor as Monster;
      if (monster.isDead) continue;

      // Check awareness - may wake sleeping monsters
      checkAwareness(monster, player, level, this.rng);

      // Sleeping monsters skip their turn
      if (!monster.isAwake) {
        monster.spendEnergy(ENERGY_PER_TURN);
        continue;
      }

      // Tamed monsters skip their turn (MVP - full pet AI is future work)
      if (monster.isTamed) {
        monster.spendEnergy(ENERGY_PER_TURN);
        continue;
      }

      const monsterDef = this.monsterData.getMonsterDef(monster.definitionKey);
      if (!monsterDef) continue;

      // Build AI context
      const ctx = this.buildAIContext(monster, monsterDef, player, level);

      // Get AI decision
      const decision = this.monsterAI.decide(ctx);

      // Execute action
      this.executeMonsterAction(monster, decision, player, level, messages);

      // Check if player died
      if (player.isDead) {
        messages.push({ text: 'You have died!', type: 'danger' });
        break;
      }
    }

    return { messages, playerDied: player.isDead };
  }

  private buildAIContext(
    monster: Monster,
    monsterDef: MonsterDef,
    player: Player,
    level: Level
  ): MonsterAIContext {
    const distance = this.distance(monster.position, player.position);
    const los = hasLineOfSight(monster.position, player.position, level);

    // If monster has LOS to player, update its memory
    if (los) {
      monster.updatePlayerLocation(player.position);
    }

    // If monster reached its last known position and player isn't there, clear memory
    const lastKnown = monster.lastKnownPlayerPos;
    if (lastKnown &&
        monster.position.x === lastKnown.x &&
        monster.position.y === lastKnown.y &&
        (player.position.x !== lastKnown.x || player.position.y !== lastKnown.y)) {
      monster.clearPlayerLocation();
    }

    return {
      monsterPos: monster.position,
      monsterHp: monster.hp,
      monsterMaxHp: monster.maxHp,
      monsterLevel: monsterDef.depth,
      playerPos: player.position,
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      playerLevel: 1,
      distanceToPlayer: distance,
      hasLineOfSight: los,
      lastKnownPlayerPos: monster.lastKnownPlayerPos,
      isConfused: false,
      isFeared: false,
      isStunned: false,
      isSleeping: !monster.isAwake,
      flags: monsterDef.flags,
      spells: monsterDef.spellFlags ?? [],
      spellChance: monsterDef.spellFrequency ?? 0,
      level,
    };
  }

  private executeMonsterAction(
    monster: Monster,
    decision: AIDecision,
    player: Player,
    level: Level,
    messages: GameMessage[]
  ): void {
    const monsterDef = this.monsterData.getMonsterDef(monster.definitionKey);
    const monsterName = monsterDef?.name ?? 'monster';

    switch (decision.action) {
      case AIAction.Attack: {
        const result = this.monsterAttack(monster, player);
        messages.push(...result.messages);
        monster.spendEnergy(ENERGY_PER_TURN);
        break;
      }

      case AIAction.CastSpell: {
        if (decision.spellFailed) {
          messages.push({
            text: `The ${monsterName} tries to cast a spell, but fails.`,
            type: 'info',
          });
        } else if (decision.spell) {
          const result = this.spellExecutor.executeSpell(decision.spell, {
            monster,
            level,
            player,
            rng: this.rng,
          });
          for (const msg of result.messages) {
            messages.push({ text: msg, type: 'danger' });
          }
        }
        monster.spendEnergy(ENERGY_PER_TURN);
        break;
      }

      case AIAction.Move:
      case AIAction.Flee:
        if (decision.targetPos) {
          if (
            decision.targetPos.x === player.position.x &&
            decision.targetPos.y === player.position.y
          ) {
            const result = this.monsterAttack(monster, player);
            messages.push(...result.messages);
          } else if (level.isWalkable(decision.targetPos) && !level.isOccupied(decision.targetPos)) {
            monster.position = decision.targetPos;
          }
        }
        monster.spendEnergy(ENERGY_PER_TURN);
        break;

      default:
        monster.spendEnergy(ENERGY_PER_TURN);
        break;
    }
  }

  private distance(a: Position, b: Position): number {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  }
}
