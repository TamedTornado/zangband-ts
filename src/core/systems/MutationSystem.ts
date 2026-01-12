/**
 * MutationSystem - Manages player mutations
 *
 * Mutations are permanent (until removed) modifications to the player.
 * Three categories:
 * - Activatable (MUT1): Powers the player can trigger manually
 * - Random (MUT2): Effects that trigger randomly each turn
 * - Passive (MUT3): Constant stat/ability modifiers
 */

import type { Player, Stats } from '@/core/entities/Player';
import type { RNG } from 'rot-js';
import type {
  MutationDef,
  MutationRecord,
  ActivatableMutationDef,
  RandomMutationDef,
  PassiveMutationDef,
  GainMutationResult,
  LoseMutationResult,
  MutationTickResult,
  CanActivateResult,
  ActivateMutationResult,
} from '@/core/data/mutations';
import { isActivatable, isRandom, isPassive } from '@/core/data/mutations';

export class MutationSystem {
  private defs: MutationRecord = {};

  /**
   * Load mutation definitions from JSON data
   */
  loadDefs(data: MutationRecord): void {
    this.defs = { ...data };
  }

  /**
   * Get mutation definition by key
   */
  getDef(key: string): MutationDef | undefined {
    return this.defs[key];
  }

  /**
   * Get all mutation keys
   */
  getAllKeys(): string[] {
    return Object.keys(this.defs);
  }

  /**
   * Check if player has a mutation
   */
  hasMutation(player: Player, key: string): boolean {
    return player.hasMutation(key);
  }

  /**
   * Gain a mutation
   * @param player The player to gain the mutation
   * @param key Specific mutation key, or undefined for random selection
   * @param rng Random number generator
   */
  gainMutation(player: Player, key: string | undefined, rng: typeof RNG): GainMutationResult {
    // Select mutation if not specified
    const mutationKey = key ?? this.selectRandomMutation(player, rng);
    if (!mutationKey) {
      return { gained: false };
    }

    // Check if player already has it
    if (player.hasMutation(mutationKey)) {
      return { gained: false };
    }

    // Get the definition
    const def = this.defs[mutationKey];
    if (!def) {
      return { gained: false };
    }

    // Check for and remove opposite mutations
    const cancelled: string[] = [];
    if (def.opposites) {
      for (const oppositeKey of def.opposites) {
        if (player.hasMutation(oppositeKey)) {
          player.removeMutation(oppositeKey);
          cancelled.push(oppositeKey);
        }
      }
    }

    // Add the mutation
    player.addMutation(mutationKey);

    const result: GainMutationResult = {
      gained: true,
      key: mutationKey,
      message: def.gainMessage,
    };
    if (cancelled.length > 0) {
      result.cancelled = cancelled;
    }
    return result;
  }

  /**
   * Lose a mutation
   * @param player The player to lose the mutation
   * @param key Specific mutation key, or undefined for random selection from player's mutations
   * @param rng Random number generator
   */
  loseMutation(player: Player, key: string | undefined, rng: typeof RNG): LoseMutationResult {
    // Select mutation if not specified
    const mutationKey = key ?? this.selectRandomPlayerMutation(player, rng);
    if (!mutationKey) {
      return { lost: false };
    }

    // Check if player has it
    if (!player.hasMutation(mutationKey)) {
      return { lost: false };
    }

    // Get the definition for the message
    const def = this.defs[mutationKey];

    // Remove the mutation
    player.removeMutation(mutationKey);

    return {
      lost: true,
      key: mutationKey,
      message: def?.loseMessage,
    };
  }

  /**
   * Select a random mutation that the player doesn't already have
   */
  private selectRandomMutation(player: Player, rng: typeof RNG): string | undefined {
    const available = Object.keys(this.defs).filter(key => !player.hasMutation(key));
    if (available.length === 0) {
      return undefined;
    }
    return available[rng.getUniformInt(0, available.length - 1)];
  }

  /**
   * Select a random mutation from the player's current mutations
   */
  private selectRandomPlayerMutation(player: Player, rng: typeof RNG): string | undefined {
    const mutations = player.mutations;
    if (mutations.length === 0) {
      return undefined;
    }
    return mutations[rng.getUniformInt(0, mutations.length - 1)];
  }

  /**
   * Get all activatable mutations the player has
   */
  getActivatable(player: Player): ActivatableMutationDef[] {
    return player.mutations
      .map(key => this.defs[key])
      .filter((def): def is ActivatableMutationDef => def !== undefined && isActivatable(def));
  }

  /**
   * Get all random mutations the player has
   */
  getRandom(player: Player): RandomMutationDef[] {
    return player.mutations
      .map(key => this.defs[key])
      .filter((def): def is RandomMutationDef => def !== undefined && isRandom(def));
  }

  /**
   * Get all passive mutations the player has
   */
  getPassive(player: Player): PassiveMutationDef[] {
    return player.mutations
      .map(key => this.defs[key])
      .filter((def): def is PassiveMutationDef => def !== undefined && isPassive(def));
  }

  /**
   * Calculate stat modifiers from all passive mutations
   */
  getStatModifiers(player: Player): Partial<Stats> {
    const mods: Partial<Stats> = {};
    const passive = this.getPassive(player);

    for (const def of passive) {
      if (def.modifiers) {
        for (const [stat, value] of Object.entries(def.modifiers)) {
          const key = stat as keyof Stats;
          mods[key] = (mods[key] ?? 0) + value;
        }
      }
    }

    return mods;
  }

  /**
   * Calculate speed modifier from all passive mutations
   */
  getSpeedModifier(player: Player): number {
    return this.getPassive(player).reduce((total, def) => total + (def.speedMod ?? 0), 0);
  }

  /**
   * Calculate AC modifier from all passive mutations
   */
  getAcModifier(player: Player): number {
    return this.getPassive(player).reduce((total, def) => total + (def.acMod ?? 0), 0);
  }

  /**
   * Calculate stealth modifier from all passive mutations
   */
  getStealthModifier(player: Player): number {
    return this.getPassive(player).reduce((total, def) => total + (def.stealthMod ?? 0), 0);
  }

  /**
   * Check if player has a specific flag from mutations
   */
  hasFlag(player: Player, flag: string): boolean {
    const passive = this.getPassive(player);
    return passive.some(def => def.flags?.includes(flag));
  }

  /**
   * Process random mutations each turn
   * Returns messages and effects that were triggered
   */
  tickRandomMutations(player: Player, rng: typeof RNG): MutationTickResult {
    const messages: string[] = [];
    const effectsTriggered: string[] = [];

    const randomMutations = this.getRandom(player);
    for (const def of randomMutations) {
      if (def.chance <= 0) continue;

      // Roll for random activation
      if (rng.getUniformInt(1, 100) <= def.chance) {
        // Mutation triggered
        effectsTriggered.push(def.randomEffect);
        // Messages would be generated by the effect execution
      }
    }

    return { messages, effectsTriggered };
  }

  /**
   * Check if a mutation can be activated
   * Returns whether activation is possible and reason if not
   */
  canActivateMutation(player: Player, key: string): CanActivateResult {
    // Check if player has the mutation
    if (!player.hasMutation(key)) {
      return { canActivate: false, reason: 'You do not have this mutation.' };
    }

    // Get the definition
    const def = this.defs[key];
    if (!def) {
      return { canActivate: false, reason: 'Unknown mutation.' };
    }

    // Check if it's activatable
    if (!isActivatable(def)) {
      return { canActivate: false, reason: 'This mutation is not activatable.' };
    }

    // Check level requirement
    if (player.level < def.level) {
      return {
        canActivate: false,
        reason: `You need to be level ${def.level} to use this ability.`,
      };
    }

    // Check mana cost
    if (player.currentMana < def.cost) {
      return {
        canActivate: false,
        reason: `Not enough mana. You need ${def.cost} mana but have ${player.currentMana}.`,
      };
    }

    return { canActivate: true };
  }

  /**
   * Try to activate a mutation
   * Performs validation, deducts mana, and checks stat roll
   * Returns the effect to execute if successful
   */
  tryActivateMutation(player: Player, key: string, rng: typeof RNG): ActivateMutationResult {
    // First check if activation is possible
    const canActivate = this.canActivateMutation(player, key);
    if (!canActivate.canActivate) {
      return { activated: false, reason: canActivate.reason ?? 'Cannot activate mutation.' };
    }

    const def = this.defs[key] as ActivatableMutationDef;

    // Deduct mana cost
    player.spendMana(def.cost);

    // Perform stat check
    // Formula from Zangband: difficulty - 3 * stat_adj - level/2
    // If random roll > this threshold, success
    const statKey = def.stat as keyof Stats;
    const statValue = player.currentStats[statKey];
    // stat_adj is typically (stat - 10) / 2 for D&D-like systems
    // In Zangband it's more complex, but we simplify to: stat/3
    const statAdj = Math.floor(statValue / 3);
    const threshold = def.difficulty - 3 * statAdj - Math.floor(player.level / 2);

    // Roll d100, if roll > threshold, success
    const roll = rng.getUniformInt(1, 100);
    const succeeded = roll > threshold;

    if (!succeeded) {
      return {
        activated: true,
        succeeded: false,
        failMessage: 'You failed to concentrate hard enough!',
      };
    }

    // Return the effect for the caller to execute
    return {
      activated: true,
      succeeded: true,
      effect: def.effect,
    };
  }
}
