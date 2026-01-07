/**
 * GenocideEffect - Kill all monsters of a type
 *
 * Destroys all monsters with the selected symbol.
 * Example: { type: "genocide", target: "symbol" }
 */

import { SymbolTargetGPEffect } from './SymbolTargetGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';

export class GenocideEffect extends SymbolTargetGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const symbol = this.getTargetSymbol(context);
    const { level } = context;

    const monsters = level.getMonsters().filter((m) => m.symbol === symbol && !m.isDead);

    if (monsters.length === 0) {
      return this.success(['Nothing happens.']);
    }

    let killed = 0;
    for (const monster of monsters) {
      monster.takeDamage(monster.hp + 1); // Kill it
      killed++;
    }

    return this.success([`You feel a great disturbance... ${killed} creatures destroyed.`], {
      damageDealt: killed,
    });
  }
}
