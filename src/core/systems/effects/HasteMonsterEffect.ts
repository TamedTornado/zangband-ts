/**
 * HasteMonsterEffect - Speed up a monster (cursed wand effect)
 *
 * Position-targeted effect that applies haste status to the monster.
 *
 * Example: { type: "hasteMonster", target: "position", duration: 20 }
 */

import { PositionGPEffect } from './PositionGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';
import { createStatus } from '@/core/systems/status';
import { rollDiceExpression } from './EffectExecutor';

export class HasteMonsterEffect extends PositionGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const pos = this.getTargetPosition(context);

    const monster = context.level.getMonsterAt(pos);
    if (!monster || monster.isDead) {
      return this.noEffect('There is nothing there.');
    }

    const monsterInfo = context.getMonsterInfo?.(monster);
    const monsterName = monsterInfo?.name ?? 'The monster';

    // Parse duration
    const durationExpr = this.getString('duration', '');
    const durationNum = this.getNumber('duration', 0);
    let duration = 20;

    if (durationExpr) {
      duration = rollDiceExpression(durationExpr, context.rng);
    } else if (durationNum > 0) {
      duration = durationNum;
    }

    const status = createStatus('haste', { duration });
    monster.statuses.add(status, monster);

    return this.success([`${monsterName} starts moving faster!`], {
      statusesApplied: ['haste'],
    });
  }
}
