/**
 * Trap Trigger System
 *
 * Handles triggering traps when the player steps on them.
 * Executes trap effects based on the trap definition.
 */

import { RNG } from 'rot-js';
import type { Trap } from '@/core/entities/Trap';
import type { Player } from '@/core/entities/Player';
import type { ILevel } from '@/core/world/Level';
import { rollDiceExpression } from './effects/diceUtils';
import { createStatus } from './status';

export interface TrapTriggerContext {
  player: Player;
  level: ILevel;
  rng: typeof RNG;
}

export interface TrapTriggerResult {
  triggered: boolean;
  messages: Array<{ text: string; type: 'normal' | 'combat' | 'info' | 'danger' }>;
  fellThroughFloor?: boolean;
  teleported?: boolean;
  aggravated?: boolean;
  summonCount?: number;
}

/**
 * Check if player makes a stat-based saving throw.
 * Formula: roll 1-20, add stat modifier (stat-10)/2, compare to difficulty
 */
function checkStatSave(
  player: Player,
  saveType: string,
  difficulty: number,
  rng: typeof RNG
): boolean {
  if (saveType === 'none' || saveType === '') {
    return false; // No save allowed
  }

  // Get the stat value
  let statValue: number;
  switch (saveType.toUpperCase()) {
    case 'STR':
      statValue = player.currentStats.str;
      break;
    case 'DEX':
      statValue = player.currentStats.dex;
      break;
    case 'CON':
      statValue = player.currentStats.con;
      break;
    case 'INT':
      statValue = player.currentStats.int;
      break;
    case 'WIS':
      statValue = player.currentStats.wis;
      break;
    case 'CHR':
      statValue = player.currentStats.chr;
      break;
    default:
      return false; // Unknown save type
  }

  // Calculate modifier: (stat - 10) / 2
  const modifier = Math.floor((statValue - 10) / 2);

  // Roll d20 + modifier vs difficulty
  const roll = rng.getUniformInt(1, 20);
  return roll + modifier >= difficulty;
}

/**
 * Trigger a trap when the player steps on it.
 */
export function triggerTrap(context: TrapTriggerContext, trap: Trap): TrapTriggerResult {
  const { player, level, rng } = context;
  const def = trap.definition;

  // Disarmed traps don't trigger
  if (!trap.isActive) {
    return { triggered: false, messages: [] };
  }

  const messages: TrapTriggerResult['messages'] = [];
  const result: TrapTriggerResult = { triggered: true, messages };

  // Reveal hidden traps
  if (!trap.isRevealed) {
    trap.reveal();
    messages.push({ text: 'You found a trap!', type: 'danger' });
  }

  // Check saving throw
  const saved = checkStatSave(player, def.saveType, def.saveDifficulty, rng);

  // Execute effect based on type
  switch (def.effect.toUpperCase()) {
    case 'DAMAGE':
      handleDamageEffect(context, def, saved, messages);
      break;

    case 'FALL':
      handleFallEffect(context, def, saved, messages, result);
      break;

    case 'POISON':
      handlePoisonEffect(context, def, saved, messages);
      break;

    case 'POISON_DART':
      handlePoisonDartEffect(context, def, saved, messages);
      break;

    case 'FIRE':
    case 'ACID':
      handleElementalEffect(context, def, saved, messages);
      break;

    case 'TELEPORT':
      handleTeleportEffect(context, def, messages, result);
      break;

    case 'BLIND':
      handleBlindEffect(context, def, saved, messages);
      break;

    case 'CONFUSE':
      handleConfuseEffect(context, def, saved, messages);
      break;

    case 'SLOW_DART':
      handleSlowDartEffect(context, def, saved, messages);
      break;

    case 'SLEEP':
      handleSleepEffect(context, def, saved, messages);
      break;

    case 'DRAIN_STAT':
      handleDrainStatEffect(context, def, saved, messages);
      break;

    case 'DRAIN_XP':
      handleDrainXpEffect(context, def, saved, messages);
      break;

    case 'CURSE':
      handleCurseEffect(context, def, saved, messages);
      break;

    case 'DISENCHANT':
      handleDisenchantEffect(context, def, saved, messages);
      break;

    case 'AGGRAVATE':
      handleAggravateEffect(context, messages, result);
      break;

    case 'SUMMON':
      handleSummonEffect(context, def, messages, result);
      break;

    default:
      messages.push({ text: `The ${def.name} activates!`, type: 'danger' });
  }

  // Remove trap from level (one-shot)
  level.removeTrap(trap);

  return result;
}

function handleDamageEffect(
  context: TrapTriggerContext,
  def: Trap['definition'],
  saved: boolean,
  messages: TrapTriggerResult['messages']
): void {
  const { player, rng } = context;
  let damage = rollDiceExpression(def.damage, rng);

  if (saved) {
    damage = Math.floor(damage / 2);
    messages.push({ text: `You partially avoid the ${def.name}!`, type: 'info' });
  }

  if (damage > 0) {
    player.takeDamage(damage);
    messages.push({ text: `The ${def.name} hits you for ${damage} damage!`, type: 'combat' });
  }
}

function handleFallEffect(
  context: TrapTriggerContext,
  def: Trap['definition'],
  saved: boolean,
  messages: TrapTriggerResult['messages'],
  result: TrapTriggerResult
): void {
  const { player, rng } = context;

  // TODO: Check for feather falling
  // const hasFeatherFall = player.hasFlag('FEATHER');

  let damage = rollDiceExpression(def.damage, rng);

  if (saved) {
    damage = Math.floor(damage / 2);
    messages.push({ text: 'You grab the edge of the trap door!', type: 'info' });
  }

  if (damage > 0) {
    player.takeDamage(damage);
    messages.push({ text: `You fall through the trap door! (${damage} damage)`, type: 'danger' });
  }

  result.fellThroughFloor = true;
}

function handlePoisonEffect(
  context: TrapTriggerContext,
  def: Trap['definition'],
  saved: boolean,
  messages: TrapTriggerResult['messages']
): void {
  const { player, rng } = context;

  // Physical damage
  let damage = rollDiceExpression(def.damage, rng);
  if (saved) {
    damage = Math.floor(damage / 2);
  }

  if (damage > 0) {
    player.takeDamage(damage);
    messages.push({ text: `You fall into a poison pit! (${damage} damage)`, type: 'combat' });
  }

  // Poison status
  if (!saved && def.poisonDamage) {
    const poisonDamage = rollDiceExpression(def.poisonDamage, rng);
    const status = createStatus('poisoned', { damage: poisonDamage });
    player.statuses.add(status, player);
    messages.push({ text: 'You are poisoned!', type: 'danger' });
  }
}

function handlePoisonDartEffect(
  context: TrapTriggerContext,
  def: Trap['definition'],
  saved: boolean,
  messages: TrapTriggerResult['messages']
): void {
  const { player, rng } = context;

  if (saved) {
    messages.push({ text: 'A dart barely misses you!', type: 'info' });
    return;
  }

  // Physical damage
  const damage = rollDiceExpression(def.damage, rng);
  if (damage > 0) {
    player.takeDamage(damage);
    messages.push({ text: `A poisoned dart hits you! (${damage} damage)`, type: 'combat' });
  }

  // Poison status
  if (def.poisonDamage) {
    const poisonDamage = rollDiceExpression(def.poisonDamage, rng);
    const status = createStatus('poisoned', { damage: poisonDamage });
    player.statuses.add(status, player);
    messages.push({ text: 'You feel poison coursing through your veins!', type: 'danger' });
  }
}

function handleElementalEffect(
  context: TrapTriggerContext,
  def: Trap['definition'],
  saved: boolean,
  messages: TrapTriggerResult['messages']
): void {
  const { player, rng } = context;
  const element = def.effect.toLowerCase();

  let damage = rollDiceExpression(def.damage, rng);
  if (saved) {
    damage = Math.floor(damage / 2);
    messages.push({ text: `You partially avoid the ${element} trap!`, type: 'info' });
  }

  if (damage > 0) {
    player.takeDamage(damage);
    messages.push({ text: `You are engulfed in ${element}! (${damage} damage)`, type: 'danger' });
  }
}

function handleTeleportEffect(
  context: TrapTriggerContext,
  def: Trap['definition'],
  messages: TrapTriggerResult['messages'],
  result: TrapTriggerResult
): void {
  const { player, level, rng } = context;
  const range = def.teleportRange || 100;

  // Find a random valid position within range
  let newPos = player.position;
  for (let i = 0; i < 100; i++) {
    const dx = rng.getUniformInt(-range, range);
    const dy = rng.getUniformInt(-range, range);
    const testPos = { x: player.position.x + dx, y: player.position.y + dy };

    if (level.isInBounds(testPos) && level.isWalkable(testPos) && !level.isOccupied(testPos)) {
      newPos = testPos;
      break;
    }
  }

  player.position = newPos;
  result.teleported = true;
  messages.push({ text: 'You are teleported!', type: 'info' });
}

function handleBlindEffect(
  context: TrapTriggerContext,
  def: Trap['definition'],
  saved: boolean,
  messages: TrapTriggerResult['messages']
): void {
  const { player, rng } = context;

  if (saved) {
    messages.push({ text: 'You hold your breath and avoid the gas!', type: 'info' });
    return;
  }

  const duration = def.duration ? rollDiceExpression(def.duration, rng) : 10;
  const status = createStatus('blind', { duration });
  const statusMessages = player.statuses.add(status, player);
  messages.push(...statusMessages.map(text => ({ text, type: 'danger' as const })));
}

function handleConfuseEffect(
  context: TrapTriggerContext,
  def: Trap['definition'],
  saved: boolean,
  messages: TrapTriggerResult['messages']
): void {
  const { player, rng } = context;

  if (saved) {
    messages.push({ text: 'You hold your breath and avoid the gas!', type: 'info' });
    return;
  }

  const duration = def.duration ? rollDiceExpression(def.duration, rng) : 10;
  const status = createStatus('confused', { duration });
  const statusMessages = player.statuses.add(status, player);
  messages.push(...statusMessages.map(text => ({ text, type: 'danger' as const })));
}

function handleSlowDartEffect(
  context: TrapTriggerContext,
  def: Trap['definition'],
  saved: boolean,
  messages: TrapTriggerResult['messages']
): void {
  const { player, rng } = context;

  if (saved) {
    messages.push({ text: 'A dart barely misses you!', type: 'info' });
    return;
  }

  // Physical damage
  const damage = rollDiceExpression(def.damage, rng);
  if (damage > 0) {
    player.takeDamage(damage);
    messages.push({ text: `A dart hits you! (${damage} damage)`, type: 'combat' });
  }

  // Slow status
  const duration = def.duration ? rollDiceExpression(def.duration, rng) : 15;
  const status = createStatus('slow', { duration });
  const statusMessages = player.statuses.add(status, player);
  messages.push(...statusMessages.map(text => ({ text, type: 'danger' as const })));
}

function handleSleepEffect(
  context: TrapTriggerContext,
  def: Trap['definition'],
  saved: boolean,
  messages: TrapTriggerResult['messages']
): void {
  const { player, rng } = context;

  if (saved) {
    messages.push({ text: 'You resist the gas!', type: 'info' });
    return;
  }

  const duration = def.duration ? rollDiceExpression(def.duration, rng) : 5;
  const status = createStatus('paralyzed', { duration });
  const statusMessages = player.statuses.add(status, player);
  messages.push(...statusMessages.map(text => ({ text, type: 'danger' as const })));
}

function handleDrainStatEffect(
  context: TrapTriggerContext,
  _def: Trap['definition'],
  saved: boolean,
  messages: TrapTriggerResult['messages']
): void {
  const { player, rng } = context;

  if (saved) {
    messages.push({ text: 'You resist the trap!', type: 'info' });
    return;
  }

  // Randomly drain a stat
  const stats = ['str', 'dex', 'con', 'int', 'wis'] as const;
  const stat = stats[rng.getUniformInt(0, stats.length - 1)];

  // Use drainStat method if available, otherwise just message
  if (typeof player.drainStat === 'function') {
    player.drainStat(stat, 1);
  }

  const statNames: Record<string, string> = {
    str: 'strength',
    dex: 'dexterity',
    con: 'constitution',
    int: 'intelligence',
    wis: 'wisdom',
  };

  messages.push({ text: `You feel your ${statNames[stat]} drain away!`, type: 'danger' });
}

function handleDrainXpEffect(
  context: TrapTriggerContext,
  def: Trap['definition'],
  saved: boolean,
  messages: TrapTriggerResult['messages']
): void {
  const { player, rng } = context;

  if (saved) {
    messages.push({ text: 'You resist the trap!', type: 'info' });
    return;
  }

  const xpLoss = def.xpDrain ? rollDiceExpression(def.xpDrain, rng) : 25;
  player.drainExperience(xpLoss);
  messages.push({ text: `You feel your life force drain away! (${xpLoss} XP lost)`, type: 'danger' });
}

function handleCurseEffect(
  _context: TrapTriggerContext,
  _def: Trap['definition'],
  saved: boolean,
  messages: TrapTriggerResult['messages']
): void {
  if (saved) {
    messages.push({ text: 'You resist the curse!', type: 'info' });
    return;
  }

  // TODO: Implement curse effect (curse random equipment)
  messages.push({ text: 'You feel a terrible curse upon you!', type: 'danger' });
}

function handleDisenchantEffect(
  _context: TrapTriggerContext,
  _def: Trap['definition'],
  saved: boolean,
  messages: TrapTriggerResult['messages']
): void {
  if (saved) {
    messages.push({ text: 'You resist the disenchantment!', type: 'info' });
    return;
  }

  // TODO: Implement disenchant effect (reduce equipment enchantment)
  messages.push({ text: 'You feel your equipment become less magical!', type: 'danger' });
}

function handleAggravateEffect(
  _context: TrapTriggerContext,
  messages: TrapTriggerResult['messages'],
  result: TrapTriggerResult
): void {
  result.aggravated = true;
  messages.push({ text: 'A shrill alarm sounds!', type: 'danger' });
}

function handleSummonEffect(
  context: TrapTriggerContext,
  def: Trap['definition'],
  messages: TrapTriggerResult['messages'],
  result: TrapTriggerResult
): void {
  const { rng } = context;
  const count = def.summonCount ? rollDiceExpression(def.summonCount, rng) : 3;
  result.summonCount = count;
  messages.push({ text: 'Monsters appear around you!', type: 'danger' });
}
