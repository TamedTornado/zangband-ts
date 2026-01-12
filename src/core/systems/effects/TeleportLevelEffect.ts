/**
 * TeleportLevelEffect - Teleports player to a different dungeon level
 *
 * Used by: Teleport Level spell (sorcery, trump, arcane)
 * Direction can be 'up', 'down', or 'random' (50/50)
 *
 * The actual level transition is handled by LevelTransitionState in the FSM.
 * This effect just signals the request.
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';

export interface TeleportLevelEffectDef extends GPEffectDef {
  type: 'teleportLevel';
  /** Direction: 'up', 'down', or 'random' (default: 'random') */
  direction?: 'up' | 'down' | 'random';
}

export class TeleportLevelEffect extends SelfGPEffect {
  readonly direction: 'up' | 'down' | 'random';

  constructor(def: GPEffectDef) {
    super(def);
    const typed = def as TeleportLevelEffectDef;
    this.direction = typed.direction ?? 'random';
  }

  execute(_context: GPEffectContext): GPEffectResult {
    return {
      success: true,
      messages: ['You sink through the floor.'],
      turnConsumed: true,
      levelTransition: {
        direction: this.direction,
      },
    };
  }
}
