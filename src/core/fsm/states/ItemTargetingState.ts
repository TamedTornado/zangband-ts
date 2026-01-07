/**
 * ItemTargetingState - Select an inventory item for an effect
 *
 * Used for effects like Identify, Enchant, Recharge that target an item.
 * Filters valid items based on effect requirements.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import type { GPEffectContext, GPEffectResult, GPEffectDef } from '@/core/systems/effects';
import { executeGPEffects } from '@/core/systems/effects';
import type { Item } from '@/core/entities/Item';

export class ItemTargetingState implements State {
  readonly name = 'itemTargeting';

  private effectDefs: GPEffectDef[];
  private baseContext: GPEffectContext;
  private sourceItem: Item | null;
  private onComplete: (fsm: GameFSM, result: GPEffectResult) => void;

  constructor(
    effectDefs: GPEffectDef[],
    baseContext: GPEffectContext,
    sourceItem: Item | null,
    onComplete: (fsm: GameFSM, result: GPEffectResult) => void
  ) {
    this.effectDefs = effectDefs;
    this.baseContext = baseContext;
    this.sourceItem = sourceItem;
    this.onComplete = onComplete;
  }

  onEnter(fsm: GameFSM): void {
    const prompt = this.getPrompt();
    fsm.addMessage(prompt, 'info');

    const validItems = this.getValidItems(fsm);
    fsm.data.itemTargeting = {
      prompt,
      validItemIndices: validItems.map((_, i) => i),
    };

    fsm.notify();
  }

  onExit(fsm: GameFSM): void {
    fsm.data.itemTargeting = null;
  }

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    switch (action.type) {
      case 'selectTargetItem':
        return this.handleSelectItem(fsm, action.itemIndex);
      case 'letterSelect': {
        // Convert letter to item index (a=0, b=1, etc.)
        const index = action.letter.charCodeAt(0) - 'a'.charCodeAt(0);
        if (index >= 0 && index < 26) {
          return this.handleSelectItem(fsm, index);
        }
        return false;
      }
      case 'cancelTarget':
        this.handleCancel(fsm);
        return true;
      default:
        return false;
    }
  }

  private handleSelectItem(fsm: GameFSM, itemIndex: number): boolean {
    const { player } = fsm.data;
    const item = player.inventory[itemIndex];
    if (!item) {
      fsm.addMessage('Invalid item selection.', 'info');
      return true;
    }

    const context: GPEffectContext = {
      ...this.baseContext,
      targetItem: item,
    };

    const result = executeGPEffects(this.effectDefs, context);

    for (const msg of result.messages) {
      fsm.addMessage(msg, 'info');
    }

    if (result.success && this.sourceItem) {
      fsm.makeAware(this.sourceItem);
      player.removeItem(this.sourceItem.id);
    }

    this.onComplete(fsm, result);
    fsm.transition(new PlayingState());
    return true;
  }

  private handleCancel(fsm: GameFSM): void {
    fsm.addMessage('Cancelled.', 'info');
    fsm.transition(new PlayingState());
  }

  private getPrompt(): string {
    for (const def of this.effectDefs) {
      if (def.target === 'item' && typeof def['prompt'] === 'string') {
        return def['prompt'];
      }
    }
    return 'Select an item:';
  }

  private getValidItems(fsm: GameFSM): Item[] {
    return fsm.data.player.inventory;
  }
}
