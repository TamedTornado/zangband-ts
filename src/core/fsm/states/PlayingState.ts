/**
 * PlayingState - Normal gameplay state
 *
 * Handles movement, combat, items, stairs, rest, running.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { DeadState } from './DeadState';
import { TargetingState } from './TargetingState';
import { ReadScrollState } from './ReadScrollState';
import { QuaffState } from './QuaffState';
import { EatState } from './EatState';
import { ZapState } from './ZapState';
import { WieldState } from './WieldState';
import { DropState } from './DropState';
import { InventoryState } from './InventoryState';
import { EquipmentState } from './EquipmentState';
import { CharacterState } from './CharacterState';
import { CastSpellState } from './CastSpellState';
import { StudySpellState } from './StudySpellState';
import { ShoppingState } from './ShoppingState';
import { ServiceInteractionState } from './ServiceInteractionState';
import { WildernessRestoreState } from './WildernessRestoreState';
import { isWildernessLevel } from '../../world/WildernessLevel';
import { Direction, movePosition } from '../../types';
import { RunSystem, type RunContext } from '../../systems/RunSystem';
import { triggerTrap, type TrapTriggerContext } from '../../systems/TrapTrigger';
import { shouldTriggerPassiveSearch, search } from '../../systems/SearchSystem';
import { ENERGY_PER_TURN, VISION_RADIUS, VIEW_RADIUS, HP_REGEN_RATE } from '../../constants';
import { RNG } from 'rot-js';
import { getGameStore } from '@/core/store/gameStore';
import { getDungeonType } from '@/core/data/DungeonTypes';
import { WILD_BLOCK_SIZE } from '@/core/data/WildernessTypes';

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
        fsm.transition(new WieldState());
        return true;
      case 'drop':
        fsm.transition(new DropState());
        return true;
      case 'takeOff':
        this.handleTakeOff(fsm, action.slot);
        return true;
      case 'rest':
        this.handleRest(fsm, action.mode);
        return true;
      case 'quaff':
        fsm.transition(new QuaffState());
        return true;
      case 'read':
        fsm.transition(new ReadScrollState());
        return true;
      case 'eat':
        fsm.transition(new EatState());
        return true;
      case 'zap':
        fsm.transition(new ZapState());
        return true;
      case 'cast':
        fsm.transition(new CastSpellState());
        return true;
      case 'study':
        fsm.transition(new StudySpellState());
        return true;
      case 'look':
        fsm.transition(new TargetingState(false));
        return true;
      case 'target':
        fsm.transition(new TargetingState(true));
        return true;
      case 'toggleInventory':
        fsm.transition(new InventoryState());
        return true;
      case 'toggleEquipment':
        fsm.transition(new EquipmentState());
        return true;
      case 'toggleCharacter':
        fsm.transition(new CharacterState());
        return true;
      case 'repeatLastCommand':
        this.handleRepeatLastCommand(fsm);
        return true;
      case 'enterStore':
        this.handleEnterStore(fsm);
        return true;
      case 'enterBuilding':
        this.handleEnterStore(fsm); // Same as enterStore - looks up from player position
        return true;
      case 'search':
        this.handleSearch(fsm);
        return true;
      case 'toggleSearchMode':
        this.handleToggleSearchMode(fsm);
        return true;
      default:
        return false;
    }
  }

  /**
   * Check if player died and transition to DeadState.
   * Called after fsm.completeTurn() in relevant places.
   */
  private checkPlayerDeath(fsm: GameFSM): void {
    const store = getGameStore();
    const player = store.player!;

    if (player.isDead) {
      fsm.transition(new DeadState());
    }
  }

  /**
   * Handle manual search action ('s' key).
   * Searches 3x3 area around player, costs one turn.
   */
  private handleSearch(fsm: GameFSM): void {
    const store = getGameStore();
    const player = store.player!;
    const level = store.level!;

    store.incrementTurn();
    const result = search(player, level, RNG);

    if (result.trapsFound === 0) {
      fsm.addMessage('You search the area...', 'info');
    }
    for (const msg of result.messages) {
      fsm.addMessage(msg.text, msg.type);
    }

    fsm.completeTurn(ENERGY_PER_TURN);
  }

  /**
   * Handle toggle search mode action ('S' key).
   * Toggles continuous searching, which searches every turn but slows movement.
   */
  private handleToggleSearchMode(fsm: GameFSM): void {
    const store = getGameStore();
    const player = store.player!;

    player.toggleSearchMode();

    if (player.isSearching) {
      fsm.addMessage('You begin searching carefully.', 'info');
    } else {
      fsm.addMessage('You stop searching.', 'info');
    }
    // No turn cost to toggle search mode
    fsm.notify();
  }

  private handleMove(fsm: GameFSM, dir: Direction): void {
    const store = getGameStore();
    const player = store.player!;
    const level = store.level!;
    const newPos = movePosition(player.position, dir);
    const isWilderness = isWildernessLevel(level);

    // Bump attack
    const targetMonster = level.getMonsterAt(newPos);
    if (targetMonster) {
      store.incrementTurn();
      const result = fsm.gameLoop.playerAttack(player, targetMonster);
      for (const msg of result.messages) {
        fsm.addMessage(msg.text, msg.type as 'normal' | 'combat' | 'info' | 'danger');
      }

      fsm.completeTurn(ENERGY_PER_TURN);
      this.checkPlayerDeath(fsm);
      return;
    }

    // Normal movement
    if (level.isWalkable(newPos) && !level.isOccupied(newPos)) {
      store.incrementTurn();

      if (isWilderness) {
        // Wilderness: update viewport as player moves
        level.movePlayer(newPos.x, newPos.y);
        store.setWildernessPosition(player.position.x, player.position.y);
      } else {
        // Dungeon: just update position
        player.position = newPos;
      }

      // Check for traps (dungeon only)
      if (!isWilderness) {
        const trap = level.getTrapAt(player.position);
        if (trap && trap.isActive) {
          const trapContext: TrapTriggerContext = { player, level, rng: RNG };
          const trapResult = triggerTrap(trapContext, trap);
          for (const msg of trapResult.messages) {
            fsm.addMessage(msg.text, msg.type);
          }
          // Handle trap door (fall to next level)
          if (trapResult.fellThroughFloor) {
            this.handleTrapDoorFall(fsm);
            return;
          }
          // Handle aggravation (wake all monsters)
          if (trapResult.aggravated) {
            for (const monster of level.getMonsters()) {
              monster.wake();
            }
          }
          // Handle summoning (spawn monsters near player)
          if (trapResult.summonCount && trapResult.summonCount > 0) {
            // Summoning is handled by caller with access to monster spawner
            fsm.addMessage(`${trapResult.summonCount} monsters appear!`, 'danger');
          }
        }
      }

      // Passive search (check for hidden traps)
      // Triggers if: in search mode (guaranteed) OR passive search skill check passes
      const shouldSearch = player.isSearching ||
        shouldTriggerPassiveSearch(player.skills.searching, RNG);
      if (shouldSearch) {
        const searchResult = search(player, level, RNG);
        for (const msg of searchResult.messages) {
          fsm.addMessage(msg.text, msg.type);
        }
      }

      // Check for items
      const itemsHere = level.getItemsAt(player.position);
      if (itemsHere.length === 1) {
        fsm.addMessage(`You see ${fsm.getItemDisplayName(itemsHere[0]!)} here.`, 'info');
      } else if (itemsHere.length > 1) {
        fsm.addMessage(`You see ${itemsHere.length} items here.`, 'info');
      }

      // Check for store entrance
      this.checkStoreEntrance(fsm, player.position);

      // Check for staircase
      this.checkStaircase(fsm, player.position, level);

      fsm.completeTurn(ENERGY_PER_TURN);
      this.checkPlayerDeath(fsm);
      return;
    }

    // Check for door
    const tile = level.getTile(newPos);
    if (tile?.terrain.flags.includes('DOOR')) {
      store.incrementTurn();
      level.setTerrain(newPos, 'open_door');
      fsm.addMessage('You open the door.', 'info');
      fsm.completeTurn(ENERGY_PER_TURN);
      this.checkPlayerDeath(fsm);
      return;
    }

    // Can't move - no turn consumed, no notify needed
  }

  private handleRun(fsm: GameFSM, dir: Direction): void {
    const store = getGameStore();
    const player = store.player!;
    const level = store.level!;
    const isWilderness = isWildernessLevel(level);

    // Check for visible monsters first
    if (fsm.fovSystem.getVisibleMonster(level, player.position, VISION_RADIUS)) {
      fsm.addMessage('You cannot run with monsters nearby!', 'danger');
      return;
    }

    const ctx: RunContext = {
      level,
      player,
      fovSystem: fsm.fovSystem,
      storeManager: fsm.storeManager,
      wildernessMap: store.wildernessMap,
      visionRadius: VISION_RADIUS,
      viewRadius: VIEW_RADIUS,
      onMoved: () => {
        store.incrementTurn();
        if (isWilderness) {
          store.setWildernessPosition(player.position.x, player.position.y);
        }
      },
      onStepComplete: () => {
        fsm.completeTurn(ENERGY_PER_TURN);
      },
      getMonsterName: (monster) => fsm.getMonsterName(monster),
    };

    const result = RunSystem.run(ctx, dir);

    // Add messages from run
    for (const msg of result.messages) {
      fsm.addMessage(msg.text, msg.type);
    }

    // Handle trap door fall
    if (result.trapTriggered?.fellThroughFloor) {
      this.handleTrapDoorFall(fsm);
      return;
    }

    this.checkPlayerDeath(fsm);
  }

  private handleDownStairs(fsm: GameFSM): void {
    const store = getGameStore();
    const player = store.player!;
    const downStairs = store.downStairs;
    const depth = store.depth;
    const level = store.level!;
    const pos = player.position;
    const isWilderness = isWildernessLevel(level);

    // Check if standing on down stairs
    const tile = level.getTile(pos);
    let onDownStairs = tile?.terrain.key === 'down_staircase' ||
                       downStairs.some(s => s.x === pos.x && s.y === pos.y);

    // Save wilderness position before entering dungeon
    if (isWilderness && onDownStairs) {
      store.setWildernessPosition(pos.x, pos.y);
    }

    if (!onDownStairs) {
      fsm.addMessage('There are no down stairs here.', 'info');
      return;
    }

    const newDepth = depth + 1;
    store.setDepth(newDepth);
    fsm.goToLevel(newDepth);

    if (store.isInWilderness) {
      fsm.addMessage('You enter the dungeon.', 'info');
    } else {
      fsm.addMessage(`You descend to dungeon level ${newDepth}.`, 'info');
    }
  }

  /**
   * Handle falling through a trap door to the next level.
   */
  private handleTrapDoorFall(fsm: GameFSM): void {
    const store = getGameStore();
    const depth = store.depth;

    const newDepth = depth + 1;
    store.setDepth(newDepth);
    fsm.goToLevel(newDepth);

    fsm.addMessage(`You fall through the trap door to dungeon level ${newDepth}!`, 'danger');
    fsm.completeTurn(ENERGY_PER_TURN);
    this.checkPlayerDeath(fsm);
  }

  private handleUpStairs(fsm: GameFSM): void {
    const store = getGameStore();
    const player = store.player!;
    const upStairs = store.upStairs;
    const depth = store.depth;
    const level = store.level!;
    const pos = player.position;

    // Check if standing on up stairs
    // In wilderness (depth 0), there are no up stairs
    let onUpStairs = false;
    if (!store.isInWilderness) {
      // In dungeon, check terrain for up_staircase
      const tile = level.getTile(pos);
      onUpStairs = tile?.terrain.key === 'up_staircase' ||
                   upStairs.some(s => s.x === pos.x && s.y === pos.y);
    }

    if (!onUpStairs) {
      fsm.addMessage('There are no up stairs here.', 'info');
      return;
    }

    // At depth 1, return to wilderness
    if (depth === 1 && store.wildernessMap) {
      const wildernessX = store.wildernessX;
      const wildernessY = store.wildernessY;
      fsm.transition(new WildernessRestoreState(wildernessX, wildernessY));
      return;
    }

    // At depth 0 (town), can't go up
    if (depth <= 0) {
      fsm.addMessage('There is nothing above!', 'info');
      return;
    }

    const newDepth = depth - 1;
    store.setDepth(newDepth);
    fsm.goToLevel(newDepth);

    // Place at down stairs when going up
    const newDownStairs = store.downStairs;
    if (newDownStairs.length > 0) {
      const stairs = newDownStairs[0];
      player.position = { x: stairs.x, y: stairs.y };
    }

    fsm.addMessage(`You ascend to dungeon level ${newDepth}.`, 'info');
  }

  private handlePickup(fsm: GameFSM): void {
    const store = getGameStore();
    const player = store.player!;
    const level = store.level!;
    const items = level.getItemsAt(player.position);

    if (items.length === 0) {
      fsm.addMessage('There is nothing here to pick up.', 'info');
      return;
    }

    const item = items[0];
    player.addItem(item);
    level.removeItem(item);
    fsm.addMessage(`You pick up ${fsm.getItemDisplayName(item)}.`, 'info');
  }

  private handleTakeOff(fsm: GameFSM, slot: string): void {
    const player = getGameStore().player!;
    const item = player.unequip(slot as any);
    if (item) {
      fsm.addMessage(`You take off ${item.name}.`, 'info');
    }
  }

  private handleRest(fsm: GameFSM, mode: 'full' | 'hp' | { turns: number }): void {
    const store = getGameStore();
    const player = store.player!;
    const level = store.level!;

    // Check for visible monsters
    if (fsm.fovSystem.getVisibleMonster(level, player.position, VISION_RADIUS)) {
      fsm.addMessage('You cannot rest with monsters nearby!', 'danger');
      return;
    }

    // Already at full HP
    if (player.hp >= player.maxHp) {
      fsm.addMessage('You are already fully rested.', 'info');
      return;
    }

    fsm.addMessage('You begin resting...', 'info');

    let turnsRested = 0;
    const maxTurns = typeof mode === 'object' ? mode.turns : 10000;
    const startHp = player.hp;
    let interrupted = false;
    let interruptReason = '';

    while (turnsRested < maxTurns) {
      store.incrementTurn();
      turnsRested++;

      // HP regeneration (before completing turn)
      if (turnsRested % HP_REGEN_RATE === 0 && player.hp < player.maxHp) {
        player.hp++;
      }

      fsm.completeTurn(ENERGY_PER_TURN);

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

    this.checkPlayerDeath(fsm);
  }

  private handleRepeatLastCommand(fsm: GameFSM): void {
    const store = getGameStore();
    const lastCommand = store.lastCommand;

    if (!lastCommand) {
      fsm.addMessage('No command to repeat.', 'info');
      return;
    }

    // Set repeat mode flag
    store.setIsRepeating(true);

    // Dispatch the original action
    fsm.dispatch({ type: lastCommand.actionType } as GameAction);
  }

  /**
   * Check if player stepped on a store entrance and show message.
   * In wilderness, pos is already world coordinates.
   * In dungeon/town, pos is screen coordinates (same thing since no scroll).
   */
  private checkStoreEntrance(fsm: GameFSM, pos: { x: number; y: number }): void {
    const storeKey = fsm.storeManager.getStoreKeyAt(pos);
    if (storeKey) {
      const storeInstance = fsm.storeManager.getStore(storeKey);
      if (storeInstance) {
        fsm.addMessage(`You are standing at the entrance to ${storeInstance.definition.name}. (Enter to shop)`, 'info');
      }
    }
  }

  /**
   * Check if player stepped on a staircase and show message with dungeon name.
   */
  private checkStaircase(fsm: GameFSM, pos: { x: number; y: number }, level: import('../../world/Level').ILevel): void {
    const tile = level.getTile(pos);
    if (!tile) return;

    const isDownStair = tile.terrain.key === 'down_staircase';
    const isUpStair = tile.terrain.key === 'up_staircase';

    if (!isDownStair && !isUpStair) return;

    const store = getGameStore();
    const isInWilderness = isWildernessLevel(level);

    if (isDownStair) {
      // Only look up dungeon name when on the surface (wilderness/town)
      if (isInWilderness && store.wildernessMap) {
        const wildernessMap = store.wildernessMap;
        let dungeonName: string | null = null;
        let foundPlace: string | null = null;

        // Look up what place we're in or at
        const blockX = Math.floor(pos.x / WILD_BLOCK_SIZE);
        const blockY = Math.floor(pos.y / WILD_BLOCK_SIZE);

        // Check all places to see if this position is in one
        for (const place of wildernessMap.places) {
          // Check if the position is within this place's bounds
          if (
            blockX >= place.x &&
            blockX < place.x + place.xsize &&
            blockY >= place.y &&
            blockY < place.y + place.ysize
          ) {
            foundPlace = place.key;
            if (place.dungeonTypeId !== undefined) {
              const dungeonType = getDungeonType(place.dungeonTypeId);
              if (dungeonType) {
                dungeonName = dungeonType.name;
              } else {
                console.error(`[checkStaircase] Unknown dungeonTypeId ${place.dungeonTypeId} for place ${place.key}`);
              }
            }
            break;
          }

          // Also check if we're at a dungeon entrance (exact position)
          if (place.type === 'dungeon') {
            const entranceX = place.x * WILD_BLOCK_SIZE + Math.floor(WILD_BLOCK_SIZE / 2);
            const entranceY = place.y * WILD_BLOCK_SIZE + Math.floor(WILD_BLOCK_SIZE / 2);
            if (pos.x === entranceX && pos.y === entranceY) {
              foundPlace = place.key;
              if (place.dungeonTypeId !== undefined) {
                const dungeonType = getDungeonType(place.dungeonTypeId);
                if (dungeonType) {
                  dungeonName = dungeonType.name;
                } else {
                  console.error(`[checkStaircase] Unknown dungeonTypeId ${place.dungeonTypeId} for place ${place.key}`);
                }
              }
              break;
            }
          }
        }

        if (dungeonName === null) {
          console.error(`[checkStaircase] Failed to find dungeon at pos (${pos.x}, ${pos.y}), block (${blockX}, ${blockY}), foundPlace=${foundPlace}`);
          dungeonName = 'somewhere';
        }

        fsm.addMessage(`You see the entrance to ${dungeonName} here. (> to descend)`, 'info');
      } else {
        // Inside a dungeon - just show generic message
        fsm.addMessage(`You see a staircase leading down here. (> to descend)`, 'info');
      }
    } else if (isUpStair) {
      if (isInWilderness) {
        console.error(`Up staircase found in wilderness at (${pos.x}, ${pos.y}) - this should not happen`);
      } else {
        // Inside a dungeon
        fsm.addMessage(`You see a staircase leading up here. (< to ascend)`, 'info');
      }
    }
  }

  /**
   * Handle entering a store (transition to ShoppingState).
   * Looks up what store the player is standing on.
   */
  private handleEnterStore(fsm: GameFSM): void {
    const player = getGameStore().player;
    if (!player) return;

    const storeKey = fsm.storeManager.getStoreKeyAt(player.position);
    if (!storeKey) {
      fsm.addMessage('There is no store entrance here.', 'info');
      return;
    }

    const store = fsm.storeManager.getStore(storeKey);
    if (!store) {
      fsm.addMessage('That store does not exist.', 'info');
      return;
    }
    // Check if this is a service building
    if (store.isServiceBuilding) {
      fsm.transition(new ServiceInteractionState(storeKey));
    } else {
      fsm.transition(new ShoppingState(storeKey));
    }
  }
}
