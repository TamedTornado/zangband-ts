/**
 * PolymorphEffect - Transform a monster into a different creature
 *
 * Position-targeted effect from wands/rods of polymorph.
 * The monster transforms into a random creature of similar level.
 * Unique monsters and those with NO_POLY flag are immune.
 */

import { PositionGPEffect } from './PositionGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';
import type { Monster } from '@/core/entities/Monster';

/**
 * Polymorph effect - transforms a monster at the target position
 *
 * Effect definition:
 * {
 *   type: 'polymorph',
 *   target: 'position'
 * }
 */
export class PolymorphEffect extends PositionGPEffect {
  execute(context: GPEffectContext): GPEffectResult {
    const pos = this.getTargetPosition(context);

    // Get monster at target position
    const monster = context.level.getMonsterAt(pos);
    if (!monster) {
      return this.noEffect('There is no monster there.');
    }

    // Get monster info for flag checking
    const monsterInfo = context.getMonsterInfo?.(monster);
    const flags = monsterInfo?.flags ?? [];
    const monsterName = monsterInfo?.name ?? 'The monster';

    // Unique monsters are immune
    if (flags.includes('UNIQUE')) {
      return this.success([`${monsterName} is unaffected!`]);
    }

    // Monsters with NO_POLY resist
    if (flags.includes('NO_POLY')) {
      return this.success([`${monsterName} is unaffected!`]);
    }

    // Get the monster data manager from resources
    const dataManager = this.resources?.monsterDataManager;
    if (!dataManager) {
      // Fallback: check for polymorphMonster callback (for testing)
      const polymorphCallback = (context as { polymorphMonster?: (m: Monster) => boolean }).polymorphMonster;
      if (polymorphCallback) {
        const success = polymorphCallback(monster);
        if (success) {
          return this.success([`${monsterName} changes!`]);
        } else {
          return this.success([`${monsterName} is unaffected!`]);
        }
      }
      return this.fail('Polymorph effect cannot execute without monster data manager.');
    }

    // Get the original monster's definition for its level
    const originalDef = dataManager.getMonsterDef(monster.definitionKey);
    if (!originalDef) {
      return this.noEffect(`${monsterName} resists the transformation.`);
    }

    // Select a new monster form
    const newDef = dataManager.selectPolymorphTarget(originalDef.depth);
    if (!newDef) {
      return this.noEffect(`${monsterName} resists the transformation.`);
    }

    // Create the new monster
    const newMonster = dataManager.createMonsterFromDef(newDef, pos);

    // Remove old monster and add new one
    context.level.removeMonster(monster);
    context.level.addMonster(newMonster);

    // Wake the new monster
    newMonster.wake();

    return this.success([`${monsterName} changes into ${newDef.name}!`]);
  }
}
