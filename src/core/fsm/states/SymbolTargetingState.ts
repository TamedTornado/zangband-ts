/**
 * SymbolTargetingState - Enter a monster symbol for an effect
 *
 * Used for effects like Genocide that target all monsters of a type.
 * Prompts for a single character input.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import type { GPEffectContext, GPEffectResult, GPEffectDef } from '@/core/systems/effects';
import { executeGPEffects } from '@/core/systems/effects';
import type { Item } from '@/core/entities/Item';

export class SymbolTargetingState implements State {
  readonly name = 'symbolTargeting';

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

    fsm.data.symbolTargeting = { prompt };
  }

  onExit(fsm: GameFSM): void {
    fsm.data.symbolTargeting = null;
  }

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    switch (action.type) {
      case 'selectTargetSymbol':
        return this.handleSelectSymbol(fsm, action.symbol);
      case 'letterSelect':
        // Use the letter directly as the symbol
        return this.handleSelectSymbol(fsm, action.letter);
      case 'cancelTarget':
        this.handleCancel(fsm);
        return true;
      default:
        return false;
    }
  }

  private handleSelectSymbol(fsm: GameFSM, symbol: string): boolean {
    if (symbol.length !== 1) {
      fsm.addMessage('Please enter a single character.', 'info');
      return true;
    }

    const context: GPEffectContext = {
      ...this.baseContext,
      targetSymbol: symbol,
    };

    const result = executeGPEffects(this.effectDefs, context);

    for (const msg of result.messages) {
      fsm.addMessage(msg, 'info');
    }

    if (result.success && this.sourceItem) {
      fsm.makeAware(this.sourceItem);
      fsm.data.player.removeItem(this.sourceItem.id);
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
      if (def.target === 'symbol' && typeof def['prompt'] === 'string') {
        return def['prompt'];
      }
    }
    return 'Enter monster symbol:';
  }
}
