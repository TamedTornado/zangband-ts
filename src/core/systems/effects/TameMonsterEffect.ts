/**
 * TameMonsterEffect - Charm a monster to become a pet
 *
 * Position-targeted effect that tames the monster at target position.
 * UNIQUE monsters cannot be tamed.
 *
 * Example: { type: "tameMonster", target: "position" }
 */

import { PositionGPEffect } from './PositionGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';

export class TameMonsterEffect extends PositionGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const pos = this.getTargetPosition(context);

    const monster = context.level.getMonsterAt(pos);
    if (!monster || monster.isDead) {
      return this.noEffect('There is nothing there to tame.');
    }

    const monsterName = monster.def.name;

    // Check if monster can be tamed (uses monster's def.flags)
    if (!monster.canBeTamed()) {
      return this.success([`${monsterName} is unaffected.`]);
    }

    // Already tamed
    if (monster.isTamed) {
      return this.success([`${monsterName} is already your pet.`]);
    }

    // Tame the monster
    monster.tame();

    return this.success([`${monsterName} becomes your pet!`]);
  }
}
