/**
 * HealMonsterEffect - Restore HP to a monster (cursed wand effect)
 *
 * Position-targeted effect that heals the monster at the target location.
 *
 * Example: { type: "healMonster", target: "position", amount: 30 }
 */

import { PositionGPEffect } from './PositionGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';

export class HealMonsterEffect extends PositionGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const pos = this.getTargetPosition(context);

    const monster = context.level.getMonsterAt(pos);
    if (!monster || monster.isDead) {
      return this.noEffect('There is nothing there to heal.');
    }

    const monsterInfo = context.getMonsterInfo?.(monster);
    const monsterName = monsterInfo?.name ?? 'The monster';

    const amount = this.getNumber('amount', 30);
    const before = monster.hp;
    monster.heal(amount);
    const healed = monster.hp - before;

    if (healed > 0) {
      return this.success([`${monsterName} looks healthier.`]);
    }

    return this.success([`${monsterName} is already at full health.`]);
  }
}
