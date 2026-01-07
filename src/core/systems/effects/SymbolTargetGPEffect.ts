/**
 * SymbolTargetGPEffect - Base class for symbol-targeted effects
 *
 * Effects that require selecting a monster symbol (genocide).
 */

import { BaseGPEffect } from './BaseGPEffect';
import type { GPEffectContext } from './GPEffect';

/**
 * Base class for effects that target a monster symbol.
 * Requires context.targetSymbol to be set (single character).
 */
export abstract class SymbolTargetGPEffect extends BaseGPEffect {
  canExecute(context: GPEffectContext): boolean {
    return context.targetSymbol !== undefined && context.targetSymbol.length === 1;
  }

  /** Get the target symbol (throws if not set - use after canExecute) */
  protected getTargetSymbol(context: GPEffectContext): string {
    if (!context.targetSymbol) {
      throw new Error('SymbolTargetGPEffect requires targetSymbol in context');
    }
    return context.targetSymbol;
  }
}
