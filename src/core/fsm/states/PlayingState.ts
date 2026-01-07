/**
 * PlayingState - Normal gameplay state
 *
 * Handles movement, combat, items, stairs, rest, running.
 */

import { RNG } from 'rot-js';
import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { DeadState } from './DeadState';
import { TargetingState } from './TargetingState';
import { Direction, movePosition } from '../../types';
import { RunSystem } from '../../systems/RunSystem';
import { ENERGY_PER_TURN, VISION_RADIUS, HP_REGEN_RATE } from '../../constants';
import { executeEffects } from '../../systems/effects';

export class PlayingState implements State {
  readonly name = 'playing';

  onEnter(_fsm: GameFSM): void {
    // Nothing special on enter
  }

  onExit(_fsm: GameFSM): void {
    // Nothing special on exit
  }

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    switch (action.type) {
      case 'move':
        this.handleMove(fsm, action.dir);
        return true;
      case 'run':
        this.handleRun(fsm, action.dir);
        return true;
      case 'goDownStairs':
        this.handleDownStairs(fsm);
        return true;
      case 'goUpStairs':
        this.handleUpStairs(fsm);
        return true;
      case 'pickup':
        this.handlePickup(fsm);
        return true;
      case 'wield':
        this.handleWield(fsm, action.itemIndex);
        return true;
      case 'drop':
        this.handleDrop(fsm, action.itemIndex);
        return true;
      case 'takeOff':
        this.handleTakeOff(fsm, action.slot);
        return true;
      case 'rest':
        this.handleRest(fsm, action.mode);
        return true;
      case 'quaff':
        this.handleQuaff(fsm, action.itemIndex);
        return true;
      case 'read':
        this.handleRead(fsm, action.itemIndex);
        return true;
      case 'eat':
        this.handleEat(fsm, action.itemIndex);
        return true;
      case 'look':
        fsm.transition(new TargetingState(false));
        return true;
      case 'target':
        fsm.transition(new TargetingState(true));
        return true;
      default:
        return false;
    }
  }

  /** Process monster turns and check for player death */
  private processMonsterTurns(fsm: GameFSM): void {
    const { player, level, scheduler } = fsm.data;

    const result = fsm.gameLoop.processMonsterTurns(player, level, scheduler);
    for (const msg of result.messages) {
      fsm.addMessage(msg.text, msg.type as 'normal' | 'combat' | 'info' | 'danger');
    }

    // Clean up dead monsters
    for (const monster of level.getMonsters()) {
      if (monster.isDead) {
        level.removeMonster(monster);
        scheduler.remove(monster);
      }
    }

    // Check for player death
    if (player.isDead) {
      // Find what killed the player
      const lastAttack = [...result.messages].reverse().find((m: { text: string }) =>
        m.text.includes('hits you') || m.text.includes('bites you') || m.text.includes('claws you')
      );
      if (lastAttack) {
        const match = lastAttack.text.match(/^The (.+?) /);
        if (match) {
          fsm.data.killedBy = match[1];
        }
      }
      fsm.transition(new DeadState());
    }
  }

  private handleMove(fsm: GameFSM, dir: Direction): void {
    const { player, level, scheduler } = fsm.data;
    const newPos = movePosition(player.position, dir);

    // Bump attack
    const targetMonster = level.getMonsterAt(newPos);
    if (targetMonster) {
      fsm.data.turn++;
      const result = fsm.gameLoop.playerAttack(player, targetMonster);
      for (const msg of result.messages) {
        fsm.addMessage(msg.text, msg.type as 'normal' | 'combat' | 'info' | 'danger');
      }

      if (targetMonster.isDead) {
        level.removeMonster(targetMonster);
        scheduler.remove(targetMonster);
      }

      player.spendEnergy(ENERGY_PER_TURN);
      this.processMonsterTurns(fsm);
      fsm.notify();
      return;
    }

    // Normal movement
    if (level.isWalkable(newPos) && !level.isOccupied(newPos)) {
      fsm.data.turn++;
      player.position = newPos;
      player.spendEnergy(ENERGY_PER_TURN);

      // Check for items
      const itemsHere = level.getItemsAt(newPos);
      if (itemsHere.length === 1) {
        fsm.addMessage(`You see ${itemsHere[0].name} here.`, 'info');
      } else if (itemsHere.length > 1) {
        fsm.addMessage(`You see ${itemsHere.length} items here.`, 'info');
      }

      this.processMonsterTurns(fsm);
      fsm.notify();
      return;
    }

    // Check for door
    const tile = level.getTile(newPos);
    if (tile?.terrain.flags.includes('DOOR')) {
      fsm.data.turn++;
      level.setTerrain(newPos, 'open_door');
      fsm.addMessage('You open the door.', 'info');
      player.spendEnergy(ENERGY_PER_TURN);
      this.processMonsterTurns(fsm);
      fsm.notify();
      return;
    }

    // Can't move - no turn consumed, no notify needed
  }

  private handleRun(fsm: GameFSM, dir: Direction): void {
    const { player, level } = fsm.data;

    // Check for visible monsters first
    if (fsm.fovSystem.getVisibleMonster(level, player.position, VISION_RADIUS)) {
      fsm.addMessage('You cannot run with monsters nearby!', 'danger');
      fsm.notify();
      return;
    }

    const runState = RunSystem.initRun(level, player.position, dir);
    let runDir = runState.direction;
    let stepsRun = 0;
    let interruptReason = '';
    const startHp = player.hp;
    const MAX_RUN_STEPS = 100;

    while (stepsRun < MAX_RUN_STEPS) {
      const newPos = movePosition(player.position, runDir);

      if (!level.isWalkable(newPos)) {
        if (stepsRun === 0) interruptReason = 'Something blocks your path.';
        break;
      }

      const tile = level.getTile(newPos);
      if (tile?.terrain.flags.includes('DOOR')) break;

      // Move
      stepsRun++;
      fsm.data.turn++;
      player.position = newPos;
      player.spendEnergy(ENERGY_PER_TURN);

      // Process monsters
      this.processMonsterTurns(fsm);
      if (player.isDead) break;

      // Interruption checks
      if (player.hp < startHp) {
        interruptReason = 'You are being attacked!';
        break;
      }

      const visibleMonster = fsm.fovSystem.getVisibleMonster(level, player.position, VISION_RADIUS);
      if (visibleMonster) {
        interruptReason = `You see a ${fsm.getMonsterName(visibleMonster)}.`;
        break;
      }

      const itemsHere = level.getItemsAt(newPos);
      if (itemsHere.length > 0) {
        const text = itemsHere.length === 1
          ? `You see ${itemsHere[0].name} here.`
          : `You see ${itemsHere.length} items here.`;
        fsm.addMessage(text, 'info');
        break;
      }

      // Run test
      const result = RunSystem.testRun(level, newPos, runState);
      if (result.spottedMonster) {
        interruptReason = `You see a ${fsm.getMonsterName(result.spottedMonster)}.`;
      }
      if (!result.canContinue) break;
      runDir = result.newDirection;
    }

    if (interruptReason) {
      fsm.addMessage(interruptReason, 'danger');
    }

    fsm.notify();
  }

  private handleDownStairs(fsm: GameFSM): void {
    const { player, downStairs, depth } = fsm.data;
    const pos = player.position;
    const onDownStairs = downStairs.some(s => s.x === pos.x && s.y === pos.y);

    if (!onDownStairs) {
      fsm.addMessage('There are no down stairs here.', 'info');
      fsm.notify();
      return;
    }

    fsm.data.depth = depth + 1;
    fsm.generateLevel(fsm.data.depth);
    fsm.addMessage(`You descend to dungeon level ${fsm.data.depth}.`, 'info');
    fsm.notify();
  }

  private handleUpStairs(fsm: GameFSM): void {
    const { player, upStairs, depth } = fsm.data;
    const pos = player.position;
    const onUpStairs = upStairs.some(s => s.x === pos.x && s.y === pos.y);

    if (!onUpStairs) {
      fsm.addMessage('There are no up stairs here.', 'info');
      fsm.notify();
      return;
    }

    if (depth <= 1) {
      fsm.addMessage('You cannot leave the dungeon!', 'danger');
      fsm.notify();
      return;
    }

    fsm.data.depth = depth - 1;
    fsm.generateLevel(fsm.data.depth);

    // Place at down stairs when going up
    if (fsm.data.downStairs.length > 0) {
      const stairs = fsm.data.downStairs[0];
      player.position = { x: stairs.x, y: stairs.y };
    }

    fsm.addMessage(`You ascend to dungeon level ${fsm.data.depth}.`, 'info');
    fsm.notify();
  }

  private handlePickup(fsm: GameFSM): void {
    const { player, level } = fsm.data;
    const items = level.getItemsAt(player.position);

    if (items.length === 0) {
      fsm.addMessage('There is nothing here to pick up.', 'info');
      fsm.notify();
      return;
    }

    const item = items[0];
    player.addItem(item);
    level.removeItem(item);
    fsm.addMessage(`You pick up ${item.name}.`, 'info');
    fsm.notify();
  }

  private handleWield(fsm: GameFSM, itemIndex: number): void {
    const { player } = fsm.data;
    const item = player.inventory[itemIndex];
    if (!item) return;

    const result = player.equip(item);
    if (result.equipped) {
      fsm.addMessage(`You wield ${item.name}.`, 'info');
      if (result.unequipped) {
        fsm.addMessage(`You were wielding ${result.unequipped.name}.`, 'info');
      }
    }
    fsm.notify();
  }

  private handleDrop(fsm: GameFSM, itemIndex: number): void {
    const { player, level } = fsm.data;
    const item = player.inventory[itemIndex];
    if (!item) return;

    player.removeItem(item.id);
    item.position = { ...player.position };
    level.addItem(item);
    fsm.addMessage(`You drop ${item.name}.`, 'info');
    fsm.notify();
  }

  private handleTakeOff(fsm: GameFSM, slot: string): void {
    const { player } = fsm.data;
    const item = player.unequip(slot as any);
    if (item) {
      fsm.addMessage(`You take off ${item.name}.`, 'info');
    }
    fsm.notify();
  }

  private handleRest(fsm: GameFSM, mode: 'full' | 'hp' | { turns: number }): void {
    const { player, level } = fsm.data;

    // Check for visible monsters
    if (fsm.fovSystem.getVisibleMonster(level, player.position, VISION_RADIUS)) {
      fsm.addMessage('You cannot rest with monsters nearby!', 'danger');
      fsm.notify();
      return;
    }

    // Already at full HP
    if (player.hp >= player.maxHp) {
      fsm.addMessage('You are already fully rested.', 'info');
      fsm.notify();
      return;
    }

    fsm.addMessage('You begin resting...', 'info');

    let turnsRested = 0;
    const maxTurns = typeof mode === 'object' ? mode.turns : 10000;
    const startHp = player.hp;
    let interrupted = false;
    let interruptReason = '';

    while (turnsRested < maxTurns) {
      fsm.data.turn++;
      turnsRested++;
      player.spendEnergy(ENERGY_PER_TURN);

      // HP regeneration
      if (turnsRested % HP_REGEN_RATE === 0 && player.hp < player.maxHp) {
        player.hp++;
      }

      // Process monsters
      this.processMonsterTurns(fsm);

      // Check interruptions
      if (player.hp < startHp) {
        interrupted = true;
        interruptReason = 'You are being attacked!';
        break;
      }

      if (player.isDead) break;

      const visibleMonster = fsm.fovSystem.getVisibleMonster(level, player.position, VISION_RADIUS);
      if (visibleMonster) {
        interrupted = true;
        interruptReason = `You see a ${fsm.getMonsterName(visibleMonster)}.`;
        break;
      }

      // Check completion
      if (mode === 'full' || mode === 'hp') {
        if (player.hp >= player.maxHp) break;
      }
    }

    if (interrupted) {
      fsm.addMessage(interruptReason, 'danger');
    } else if (!player.isDead) {
      fsm.addMessage(`You finish resting. (${turnsRested} turns)`, 'info');
    }

    fsm.notify();
  }

  private handleQuaff(fsm: GameFSM, itemIndex: number): void {
    const { player } = fsm.data;
    const item = player.inventory[itemIndex];
    if (!item) return;

    if (!item.isPotion) {
      fsm.addMessage(`You cannot quaff ${item.name}.`, 'info');
      fsm.notify();
      return;
    }

    fsm.addMessage(`You quaff ${item.name}.`, 'info');

    // Effects are on the item definition
    const effects = item.generated?.baseItem.effects;
    if (effects && effects.length > 0) {
      const result = executeEffects(effects, player, RNG);
      for (const msg of result.messages) {
        fsm.addMessage(msg, 'info');
      }
    } else {
      fsm.addMessage('That tasted... interesting.', 'info');
    }

    player.removeItem(item.id);
    fsm.notify();
  }

  private handleRead(fsm: GameFSM, itemIndex: number): void {
    const { player, level } = fsm.data;
    const item = player.inventory[itemIndex];
    if (!item) return;

    if (!item.isScroll) {
      fsm.addMessage(`You cannot read ${item.name}.`, 'info');
      fsm.notify();
      return;
    }

    fsm.addMessage(`You read ${item.name}.`, 'info');

    const name = item.name.toLowerCase();
    if (name.includes('teleport') || name.includes('phase door')) {
      const attempts = 100;
      for (let i = 0; i < attempts; i++) {
        const newX = 1 + Math.floor(Math.random() * (level.width - 2));
        const newY = 1 + Math.floor(Math.random() * (level.height - 2));
        if (level.isWalkable({ x: newX, y: newY })) {
          player.position = { x: newX, y: newY };
          fsm.addMessage('Your surroundings blur and shift!', 'info');
          break;
        }
      }
    } else if (name.includes('word of recall')) {
      fsm.addMessage('The air around you crackles...', 'info');
    } else if (name.includes('identify')) {
      fsm.addMessage('You sense the nature of your possessions.', 'info');
    } else if (name.includes('light') || name.includes('illumination')) {
      fsm.addMessage('The area is lit up!', 'info');
    } else if (name.includes('mapping') || name.includes('magic mapping')) {
      fsm.addMessage('You sense the layout of the dungeon.', 'info');
    } else if (name.includes('monster detection')) {
      fsm.addMessage('You sense the presence of monsters!', 'info');
    } else if (name.includes('blessing') || name.includes('holy chant')) {
      fsm.addMessage('You feel righteous!', 'info');
    } else {
      fsm.addMessage('The scroll crumbles to dust.', 'info');
    }

    player.removeItem(item.id);
    fsm.notify();
  }

  private handleEat(fsm: GameFSM, itemIndex: number): void {
    const { player } = fsm.data;
    const item = player.inventory[itemIndex];
    if (!item) return;

    if (!item.isFood) {
      fsm.addMessage(`You cannot eat ${item.name}.`, 'info');
      fsm.notify();
      return;
    }

    fsm.addMessage(`You eat ${item.name}.`, 'info');

    // Effects are on the item definition
    const effects = item.generated?.baseItem.effects;
    if (effects && effects.length > 0) {
      const result = executeEffects(effects, player, RNG);
      for (const msg of result.messages) {
        fsm.addMessage(msg, 'info');
      }
    } else {
      // Basic food with no special effects
      fsm.addMessage('That was tasty.', 'info');
    }

    player.removeItem(item.id);
    fsm.notify();
  }
}
