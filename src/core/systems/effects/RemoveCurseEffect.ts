/**
 * RemoveCurseEffect - Removes curses from equipped items
 *
 * From Zangband: remove_curse() removes light curses,
 * remove_all_curse() removes all curses including heavy curses.
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectContext, GPEffectResult } from './GPEffect';

export class RemoveCurseEffect extends SelfGPEffect {
  execute(_context: GPEffectContext): GPEffectResult {
    const removeAll = this.def['removeAll'] === true;

    // TODO: Implement actual curse removal when curse system is added
    // For now, just show a message
    const message = removeAll
      ? 'A heavy curse is lifted from your equipment!'
      : 'A curse is lifted from your equipment!';

    return this.success([message]);
  }
}
