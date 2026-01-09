/**
 * TargetingState - Look/Target cursor mode
 *
 * Player examines the map with a cursor. No turns pass.
 * Used for 'look' command and targeting for ranged attacks/spells.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import { Direction, movePosition } from '../../types';
import { VIEW_RADIUS } from '../../constants';
import { getGameStore } from '@/core/store/gameStore';

export class TargetingState implements State {
  readonly name = 'targeting';

  /** Whether this is targeting mode (for ranged) vs just looking */
  private readonly isTargeting: boolean;

  /** List of visible monster positions for Tab cycling */
  private visibleTargets: Array<{ x: number; y: number }> = [];
  private currentTargetIndex: number = -1;

  constructor(isTargeting: boolean = false) {
    this.isTargeting = isTargeting;
  }

  onEnter(fsm: GameFSM): void {
    const store = getGameStore();
    const player = store.player!;
    const level = store.level!;
    const lastTargetMonsterId = store.lastTargetMonsterId;

    // Build list of visible monsters for Tab cycling
    this.buildTargetList(fsm);

    // Default cursor position
    let startPos = { x: player.position.x, y: player.position.y };

    // In targeting mode, try to start on last targeted monster if still alive and visible
    if (this.isTargeting && lastTargetMonsterId) {
      const monster = level.getMonsterById(lastTargetMonsterId);
      if (monster && !monster.isDead) {
        // Check if monster is visible
        const key = `${monster.position.x},${monster.position.y}`;
        const visibleTiles = fsm.fovSystem.compute(level, player.position, VIEW_RADIUS);
        if (visibleTiles.has(key)) {
          startPos = { x: monster.position.x, y: monster.position.y };
          // Find this monster in the target list to sync the cycle index
          this.currentTargetIndex = this.visibleTargets.findIndex(
            t => t.x === monster.position.x && t.y === monster.position.y
          );
        }
      }
    }

    store.setCursor(startPos);

    const mode = this.isTargeting ? 'Targeting' : 'Looking';
    fsm.addMessage(`${mode} mode. Use movement keys, Tab to cycle, Escape to cancel.`, 'info');
    this.describeCursor(fsm);
  }

  onExit(_fsm: GameFSM): void {
    getGameStore().setCursor(null);
  }

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    switch (action.type) {
      case 'moveCursor':
        this.handleMoveCursor(fsm, action.dir);
        return true;
      case 'cycleTarget':
        this.handleCycleTarget(fsm);
        return true;
      case 'confirmTarget':
        this.handleConfirm(fsm);
        return true;
      case 'cancelTarget':
        this.handleCancel(fsm);
        return true;
      default:
        return false;
    }
  }

  private handleMoveCursor(fsm: GameFSM, dir: Direction): void {
    const store = getGameStore();
    const cursor = store.cursor;
    if (!cursor) return;

    const newPos = movePosition(cursor, dir);
    const level = store.level!;

    // Keep cursor in bounds
    if (newPos.x >= 0 && newPos.x < level.width &&
        newPos.y >= 0 && newPos.y < level.height) {
      store.setCursor(newPos);
      this.currentTargetIndex = -1; // Clear cycle index on manual move
      this.describeCursor(fsm);
    }
  }

  private handleCycleTarget(fsm: GameFSM): void {
    if (this.visibleTargets.length === 0) {
      fsm.addMessage('No visible targets.', 'info');
      return;
    }

    this.currentTargetIndex = (this.currentTargetIndex + 1) % this.visibleTargets.length;
    const target = this.visibleTargets[this.currentTargetIndex];
    getGameStore().setCursor({ x: target.x, y: target.y });
    this.describeCursor(fsm);
  }

  private handleConfirm(fsm: GameFSM): void {
    const store = getGameStore();
    const cursor = store.cursor;

    if (this.isTargeting && cursor) {
      // Store the targeted monster's ID for next time (if there's a monster there)
      const monster = store.level!.getMonsterAt(cursor);
      if (monster && !monster.isDead) {
        store.setLastTargetMonsterId(monster.id);
      }

      // Pop back to the state that pushed us, passing the target position
      fsm.pop({ position: { ...cursor } });
    } else {
      // Just looking, not targeting - transition back to playing
      fsm.transition(new PlayingState());
    }
  }

  private handleCancel(fsm: GameFSM): void {
    if (this.isTargeting) {
      // Pop back to the state that pushed us with cancelled flag
      fsm.pop({ cancelled: true });
    } else {
      // Just looking - transition back to playing
      fsm.transition(new PlayingState());
    }
  }

  /** Build list of visible monsters for Tab cycling */
  private buildTargetList(fsm: GameFSM): void {
    const store = getGameStore();
    const player = store.player!;
    const level = store.level!;
    const visibleTiles = fsm.fovSystem.compute(level, player.position, VIEW_RADIUS);

    this.visibleTargets = [];
    for (const monster of level.getMonsters()) {
      if (monster.isDead) continue;
      const key = `${monster.position.x},${monster.position.y}`;
      if (visibleTiles.has(key)) {
        this.visibleTargets.push({ x: monster.position.x, y: monster.position.y });
      }
    }

    // Sort by distance from player
    this.visibleTargets.sort((a, b) => {
      const distA = Math.abs(a.x - player.position.x) + Math.abs(a.y - player.position.y);
      const distB = Math.abs(b.x - player.position.x) + Math.abs(b.y - player.position.y);
      return distA - distB;
    });
  }

  /** Describe what's at the cursor position */
  private describeCursor(fsm: GameFSM): void {
    const store = getGameStore();
    const cursor = store.cursor;
    if (!cursor) return;

    const player = store.player!;
    const level = store.level!;
    const tile = level.getTile(cursor);

    // Check if cursor is on player
    if (cursor.x === player.position.x && cursor.y === player.position.y) {
      fsm.addMessage('You see yourself.', 'info');
      return;
    }

    // Check visibility
    const visibleTiles = fsm.fovSystem.compute(level, player.position, VIEW_RADIUS);
    const key = `${cursor.x},${cursor.y}`;
    const isVisible = visibleTiles.has(key);

    if (!tile) {
      fsm.addMessage('You see nothing.', 'info');
      return;
    }

    if (!tile.explored) {
      fsm.addMessage('You see unknown territory.', 'info');
      return;
    }

    const parts: string[] = [];

    if (isVisible) {
      // Check for monster
      const monster = level.getMonsterAt(cursor);
      if (monster && !monster.isDead) {
        const name = fsm.getMonsterName(monster);
        parts.push(`a ${name}`);
      }

      // Check for items
      const items = level.getItemsAt(cursor);
      if (items.length === 1) {
        parts.push(fsm.getItemDisplayName(items[0]!));
      } else if (items.length > 1) {
        parts.push(`${items.length} items`);
      }

      // Check for trap
      const trap = level.getTrapAt(cursor);
      if (trap && trap.isRevealed && trap.isActive) {
        parts.push(`a ${trap.name}`);
      }
    }

    // Terrain (always show if explored)
    const terrainName = tile.terrain.name || tile.terrain.key;
    if (parts.length === 0) {
      parts.push(terrainName);
    } else {
      parts.push(`on ${terrainName}`);
    }

    // Check for stairs
    const downStairs = store.downStairs;
    const upStairs = store.upStairs;
    const isDownStairs = downStairs.some(s => s.x === cursor.x && s.y === cursor.y);
    const isUpStairs = upStairs.some(s => s.x === cursor.x && s.y === cursor.y);
    if (isDownStairs) parts.push('(down stairs)');
    if (isUpStairs) parts.push('(up stairs)');

    const prefix = isVisible ? 'You see' : 'You recall';
    fsm.addMessage(`${prefix} ${parts.join(' ')}.`, 'info');
  }
}
