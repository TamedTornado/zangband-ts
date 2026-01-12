/**
 * CastSpellState - Handles casting magic spells
 *
 * Shows list of known spells, lets player select one,
 * checks requirements, rolls failure, and executes effects.
 */

import { RNG } from 'rot-js';
import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import { LevelTransitionState } from './LevelTransitionState';
import { getSpellByKey, getSpellRequirement } from '../../data/spellLoader';
import type { SpellDef, ClassSpellReq } from '../../data/spells';
import { executeGPEffects, type GPEffectContext } from '../../systems/effects';
import { TargetingState } from './TargetingState';
import { getGameStore } from '@/core/store/gameStore';

interface SpellListEntry {
  realm: string;
  spellKey: string;
  spell: SpellDef;
  req: ClassSpellReq;
  letter: string;
  canCast: boolean;
  reason: string | undefined;
}

export class CastSpellState implements State {
  readonly name = 'cast';

  private spellList: SpellListEntry[] = [];
  private showList: boolean = false;

  // Selected spell for targeting
  private selectedSpell: SpellListEntry | null = null;

  onEnter(fsm: GameFSM): void {
    const player = getGameStore().player!;

    // Check if player can cast spells
    if (!player.classDef || !player.classDef.spellStat) {
      fsm.addMessage('You cannot cast spells.', 'info');
      fsm.transition(new PlayingState());
      return;
    }

    // Build list of known spells
    this.spellList = [];
    const classKey = player.className.toLowerCase().replace('-', '_');
    let letterIndex = 0;

    // Gather from primary realm
    if (player.primaryRealm) {
      const spellKeys = player.getKnownSpellsInRealm(player.primaryRealm);
      for (const spellKey of spellKeys) {
        const spell = getSpellByKey(player.primaryRealm, spellKey);
        if (!spell) continue;

        const req = getSpellRequirement(spell, classKey);
        if (!req) continue;

        const letter = String.fromCharCode('a'.charCodeAt(0) + letterIndex++);
        const { canCast, reason } = this.checkCanCast(player, req);

        this.spellList.push({
          realm: player.primaryRealm,
          spellKey,
          spell,
          req,
          letter,
          canCast,
          reason,
        });
      }
    }

    // Gather from secondary realm
    if (player.secondaryRealm) {
      const spellKeys = player.getKnownSpellsInRealm(player.secondaryRealm);
      for (const spellKey of spellKeys) {
        const spell = getSpellByKey(player.secondaryRealm, spellKey);
        if (!spell) continue;

        const req = getSpellRequirement(spell, classKey);
        if (!req) continue;

        const letter = String.fromCharCode('a'.charCodeAt(0) + letterIndex++);
        const { canCast, reason } = this.checkCanCast(player, req);

        this.spellList.push({
          realm: player.secondaryRealm,
          spellKey,
          spell,
          req,
          letter,
          canCast,
          reason,
        });
      }
    }

    if (this.spellList.length === 0) {
      fsm.addMessage('You know no spells.', 'info');
      fsm.transition(new PlayingState());
      return;
    }

    // Check for repeat mode - auto-select saved spell
    const store = getGameStore();
    if (store.isRepeating && store.lastCommand?.spellKey) {
      const entry = this.spellList.find(
        e => `${e.realm}:${e.spellKey}` === store.lastCommand!.spellKey
      );
      if (entry && entry.canCast) {
        // Check if spell needs targeting (spells have target at spell level)
        if (entry.spell.target === 'position') {
          if (store.lastCommand.targetPosition) {
            // Use saved target position
            this.executeSpell(fsm, entry, store.lastCommand.targetPosition);
            return;
          }
          // Needs targeting but no saved position - go to targeting
          this.selectedSpell = entry;
          fsm.addMessage(`Cast ${entry.spell.name} at which target?`, 'info');
          fsm.push(new TargetingState(true));
          return;
        }
        // No targeting needed, execute immediately
        this.executeSpell(fsm, entry);
        return;
      }
      // Spell not found or can't cast - fall back to normal selection
      store.setIsRepeating(false);
    }

    // Populate spell targeting for UI modal
    getGameStore().setSpellTargeting({
      mode: 'cast',
      prompt: 'Cast which spell?',
      spells: this.spellList.map(entry => {
        const spell: {
          letter: string;
          name: string;
          level: number;
          mana: number;
          fail: number;
          canUse: boolean;
          reason?: string;
          realm?: string;
        } = {
          letter: entry.letter,
          name: entry.spell.name,
          level: entry.req.level,
          mana: entry.req.mana,
          fail: this.calculateFailChance(entry.req),
          canUse: entry.canCast,
          realm: entry.realm,
        };
        if (entry.reason) spell.reason = entry.reason;
        return spell;
      }),
    });

    fsm.addMessage('Cast which spell? [a-z, ESC to cancel]', 'info');
  }

  onExit(_fsm: GameFSM): void {
    getGameStore().setSpellTargeting(null);
  }

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    switch (action.type) {
      case 'letterSelect':
        return this.handleLetterSelect(fsm, action.letter);
      case 'showList':
        this.showList = !this.showList;
        if (this.showList) {
          this.showSpellList(fsm);
        }
        return true;
      case 'cancelTarget':
        fsm.addMessage('Cancelled.', 'info');
        fsm.transition(new PlayingState());
        return true;
      default:
        return false;
    }
  }

  onResume(fsm: GameFSM, result: unknown): void {
    // Called after targeting returns
    if (!this.selectedSpell) {
      fsm.transition(new PlayingState());
      return;
    }

    const targetResult = result as { position?: { x: number; y: number }; cancelled?: boolean };
    if (targetResult.cancelled || !targetResult.position) {
      fsm.addMessage('Cancelled.', 'info');
      fsm.transition(new PlayingState());
      return;
    }

    // Execute the spell with the target position
    this.executeSpell(fsm, this.selectedSpell, targetResult.position);
  }

  private checkCanCast(
    player: { level: number; currentMana: number },
    req: ClassSpellReq
  ): { canCast: boolean; reason?: string } {
    if (player.level < req.level) {
      return { canCast: false, reason: `Need level ${req.level}` };
    }
    if (player.currentMana < req.mana) {
      return { canCast: false, reason: `Need ${req.mana} mana` };
    }
    return { canCast: true };
  }

  private handleLetterSelect(fsm: GameFSM, letter: string): boolean {
    const entry = this.spellList.find(e => e.letter === letter);
    if (!entry) {
      fsm.addMessage('Invalid selection.', 'info');
      return true;
    }

    if (!entry.canCast) {
      fsm.addMessage(`You cannot cast ${entry.spell.name}: ${entry.reason}`, 'info');
      return true;
    }

    // Check if spell needs targeting (spells have target at spell level, not effect level)
    if (entry.spell.target === 'position') {
      // Need to target a position
      this.selectedSpell = entry;
      fsm.addMessage(`Cast ${entry.spell.name} at which target?`, 'info');
      fsm.push(new TargetingState(true));
      return true;
    }

    // No targeting needed, execute immediately
    this.executeSpell(fsm, entry);
    return true;
  }

  private executeSpell(
    fsm: GameFSM,
    entry: SpellListEntry,
    targetPosition?: { x: number; y: number }
  ): void {
    const store = getGameStore();
    const player = store.player!;
    const level = store.level!;
    const { spell, req } = entry;

    // Roll for failure
    const failChance = this.calculateFailChance(req);
    const roll = RNG.getUniformInt(0, 99);

    if (roll < failChance) {
      // Spell failed
      fsm.addMessage(`You failed to cast ${spell.name}!`, 'danger');
      // Still consume half mana on failure
      player.spendMana(Math.floor(req.mana / 2));
      fsm.transition(new PlayingState());
      return;
    }

    // Spend mana
    player.spendMana(req.mana);

    // Execute spell effects
    fsm.addMessage(`You cast ${spell.name}.`, 'info');

    const effects = spell.effects;
    if (effects && effects.length > 0) {
      const context: GPEffectContext = {
        actor: player,
        level,
        rng: RNG,
        monsterDataManager: fsm.monsterDataManager,
        getMonsterInfo: (monster) => {
          const def = fsm.monsterDataManager.getMonsterDef(monster.definitionKey);
          return {
            name: def?.name ?? 'creature',
            flags: def?.flags ?? [],
          };
        },
      };

      // Add target position if provided
      if (targetPosition) {
        context.targetPosition = targetPosition;
      }

      const result = executeGPEffects(effects, context);
      for (const msg of result.messages) {
        fsm.addMessage(msg, 'info');
      }

      // Spend energy for casting
      fsm.completeTurn();

      // Save for repeat command
      const lastCommand: { actionType: string; itemId: string; spellKey: string; targetPosition?: { x: number; y: number } } = {
        actionType: 'cast',
        itemId: '',
        spellKey: `${entry.realm}:${entry.spellKey}`,
      };
      if (targetPosition) {
        lastCommand.targetPosition = targetPosition;
      }
      store.setLastCommand(lastCommand);
      store.setIsRepeating(false);

      // Check for level transition request from effects
      if (result.levelTransition) {
        fsm.transition(new LevelTransitionState(result.levelTransition));
        return;
      }
    } else {
      fsm.addMessage('Nothing happens.', 'info');
      fsm.completeTurn();
    }

    fsm.transition(new PlayingState());
  }

  private calculateFailChance(req: ClassSpellReq): number {
    const player = getGameStore().player!;
    let fail = req.fail;

    // Reduce by stat bonus
    const spellStat = player.classDef?.spellStat;
    if (spellStat) {
      const statValue = player.stats[spellStat];
      // Each point above 15 reduces fail by 1%
      fail -= Math.max(0, statValue - 15);
    }

    // Reduce by levels above requirement
    const levelsAbove = player.level - req.level;
    if (levelsAbove > 0) {
      fail -= levelsAbove * 2;
    }

    // Minimum 5% failure
    return Math.max(5, fail);
  }

  private showSpellList(fsm: GameFSM): void {
    fsm.addMessage('Known spells:', 'info');
    for (const entry of this.spellList) {
      const status = entry.canCast
        ? ''
        : ` (${entry.reason})`;
      fsm.addMessage(
        `  ${entry.letter}) ${entry.spell.name} [${entry.req.level}] ${entry.req.mana}mp ${entry.req.fail}%${status}`,
        entry.canCast ? 'info' : 'normal'
      );
    }
  }
}
