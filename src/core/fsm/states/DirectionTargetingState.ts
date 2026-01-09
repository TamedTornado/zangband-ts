/**
 * DirectionTargetingState - Select a direction for an effect
 *
 * Used for effects like door destruction that target adjacent tiles.
 * Prompts for one of 8 direction keys.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import type { GPEffectContext, GPEffectResult, GPEffectDef } from '@/core/systems/effects';
import { executeGPEffects } from '@/core/systems/effects';
import type { Item } from '@/core/entities/Item';
import type { Direction } from '@/core/types';
import { getGameStore } from '@/core/store/gameStore';

export class DirectionTargetingState implements State {
  readonly name = 'directionTargeting';

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

    getGameStore().setDirectionTargeting({ prompt });
  }

  onExit(_fsm: GameFSM): void {
    getGameStore().setDirectionTargeting(null);
  }

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    switch (action.type) {
      case 'selectTargetDirection':
        return this.handleSelectDirection(fsm, action.dir);
      case 'cancelTarget':
        this.handleCancel(fsm);
        return true;
      default:
        return false;
    }
  }

  private handleSelectDirection(fsm: GameFSM, direction: Direction): boolean {
    const context: GPEffectContext = {
      ...this.baseContext,
      targetDirection: direction,
    };

    const result = executeGPEffects(this.effectDefs, context);

    for (const msg of result.messages) {
      fsm.addMessage(msg, 'info');
    }

    if (result.success && this.sourceItem) {
      fsm.makeAware(this.sourceItem);
      getGameStore().player!.removeItem(this.sourceItem.id);
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
      if (def.target === 'direction' && typeof def['prompt'] === 'string') {
        return def['prompt'];
      }
    }
    return 'Choose a direction:';
  }
}
