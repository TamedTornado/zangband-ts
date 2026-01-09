/**
 * SymbolTargetingState - Enter a monster symbol for an effect
 *
 * A utility state that gathers target info and pops back to the calling state.
 * Does NOT execute effects - that's the caller's responsibility.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { getGameStore } from '@/core/store/gameStore';

export interface SymbolTargetingConfig {
  prompt: string;
}

export interface SymbolTargetingResult {
  cancelled: boolean;
  targetSymbol?: string;
}

export class SymbolTargetingState implements State {
  readonly name = 'symbolTargeting';

  private config: SymbolTargetingConfig;

  constructor(config: SymbolTargetingConfig) {
    this.config = config;
  }

  onEnter(fsm: GameFSM): void {
    fsm.addMessage(this.config.prompt, 'info');
    getGameStore().setSymbolTargeting({ prompt: this.config.prompt });
  }

  onExit(_fsm: GameFSM): void {
    getGameStore().setSymbolTargeting(null);
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

    // Pop back with the selected symbol
    const result: SymbolTargetingResult = {
      cancelled: false,
      targetSymbol: symbol,
    };
    fsm.pop(result);
    return true;
  }

  private handleCancel(fsm: GameFSM): void {
    fsm.addMessage('Cancelled.', 'info');
    const result: SymbolTargetingResult = { cancelled: true };
    fsm.pop(result);
  }
}
