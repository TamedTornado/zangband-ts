/**
 * StudySpellState - Handles learning spells from spell books
 *
 * Player must have a spell book in inventory. Shows learnable spells
 * from that book and lets player choose one to learn.
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import { ItemSelectionState, type ItemSelectionResult } from './ItemSelectionState';
import { getBookInfo } from '../../data/spellBooks';
import { getSpellByIndex, getSpellRequirement, canClassLearnSpell } from '../../data/spellLoader';
import type { SpellDef, ClassSpellReq } from '../../data/spells';

interface LearnableSpell {
  spell: SpellDef;
  req: ClassSpellReq;
  letter: string;
  canLearn: boolean;
  reason: string | undefined;
}

export class StudySpellState implements State {
  readonly name = 'study';

  private bookRealm: string | null = null;
  private learnableSpells: LearnableSpell[] = [];

  onEnter(fsm: GameFSM): void {
    const { player } = fsm.data;

    // Check if player can cast spells
    if (!player.classDef || !player.classDef.spellStat) {
      fsm.addMessage('You cannot learn spells.', 'info');
      fsm.transition(new PlayingState());
      return;
    }

    // Check if player has any spell books
    const hasBooks = player.inventory.some(item => {
      const info = getBookInfo({ type: item.type, sval: item.sval });
      return info !== null;
    });

    if (!hasBooks) {
      fsm.addMessage('You have no spell books to study.', 'info');
      fsm.transition(new PlayingState());
      return;
    }

    // Push item selection to pick a book
    fsm.push(new ItemSelectionState({
      prompt: 'Study which book?',
      filter: (item) => {
        const info = getBookInfo({ type: item.type, sval: item.sval });
        if (!info) return false;
        // Check if this realm is available to the player
        const realms = player.classDef?.realms ?? [];
        return realms.includes(info.realm);
      },
    }));
  }

  onExit(fsm: GameFSM): void {
    fsm.data.spellTargeting = null;
  }

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    switch (action.type) {
      case 'letterSelect':
        return this.handleLetterSelect(fsm, action.letter);
      case 'showList':
        this.showSpellList(fsm);
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
    const selection = result as ItemSelectionResult;

    if (!selection.item) {
      fsm.transition(new PlayingState());
      return;
    }

    const bookInfo = getBookInfo({ type: selection.item.type, sval: selection.item.sval });

    if (!bookInfo) {
      fsm.addMessage('That is not a spell book.', 'info');
      fsm.transition(new PlayingState());
      return;
    }

    this.bookRealm = bookInfo.realm;
    this.buildLearnableSpells(fsm, bookInfo);

    if (this.learnableSpells.length === 0) {
      fsm.addMessage('There are no spells in this book you can learn.', 'info');
      fsm.transition(new PlayingState());
      return;
    }

    const learnableCount = this.learnableSpells.filter(s => s.canLearn).length;
    if (learnableCount === 0) {
      fsm.addMessage('You cannot learn any more spells from this book right now.', 'info');
      fsm.transition(new PlayingState());
      return;
    }

    // Populate spell targeting for UI modal
    fsm.data.spellTargeting = {
      mode: 'study',
      prompt: 'Learn which spell?',
      spells: this.learnableSpells.map(entry => {
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
          fail: entry.req.fail,
          canUse: entry.canLearn,
        };
        if (entry.reason) spell.reason = entry.reason;
        if (this.bookRealm) spell.realm = this.bookRealm;
        return spell;
      }),
    };

    fsm.addMessage('Learn which spell? [a-z, ESC to cancel]', 'info');
  }

  private buildLearnableSpells(
    fsm: GameFSM,
    bookInfo: { realm: string; spellIndices: number[] }
  ): void {
    const { player } = fsm.data;
    const classKey = player.className.toLowerCase().replace('-', '_');
    this.learnableSpells = [];

    let letterIndex = 0;
    for (const spellIndex of bookInfo.spellIndices) {
      const spell = getSpellByIndex(bookInfo.realm, spellIndex);
      if (!spell) continue;

      // Skip spells this class can't learn
      if (!canClassLearnSpell(spell, classKey)) continue;

      const req = getSpellRequirement(spell, classKey);
      if (!req) continue;

      const letter = String.fromCharCode('a'.charCodeAt(0) + letterIndex++);
      const { canLearn, reason } = this.checkCanLearn(fsm, spell, req);

      this.learnableSpells.push({
        spell,
        req,
        letter,
        canLearn,
        reason,
      });
    }
  }

  private checkCanLearn(
    fsm: GameFSM,
    spell: SpellDef,
    req: ClassSpellReq
  ): { canLearn: boolean; reason: string | undefined } {
    const { player } = fsm.data;

    // Already known?
    if (player.knowsSpell(this.bookRealm!, spell.key)) {
      return { canLearn: false, reason: 'already known' };
    }

    // Level requirement
    if (player.level < req.level) {
      return { canLearn: false, reason: `need level ${req.level}` };
    }

    return { canLearn: true, reason: undefined };
  }

  private handleLetterSelect(fsm: GameFSM, letter: string): boolean {
    const entry = this.learnableSpells.find(e => e.letter === letter);
    if (!entry) {
      fsm.addMessage('Invalid selection.', 'info');
      return true;
    }

    if (!entry.canLearn) {
      fsm.addMessage(`You cannot learn ${entry.spell.name}: ${entry.reason}`, 'info');
      return true;
    }

    // Learn the spell
    const { player } = fsm.data;
    player.learnSpell(this.bookRealm!, entry.spell.key);
    fsm.addMessage(`You have learned ${entry.spell.name}.`, 'info');

    fsm.transition(new PlayingState());
    return true;
  }

  private showSpellList(fsm: GameFSM): void {
    fsm.addMessage('Spells in this book:', 'info');
    for (const entry of this.learnableSpells) {
      const status = entry.canLearn ? '' : ` (${entry.reason})`;
      fsm.addMessage(
        `  ${entry.letter}) ${entry.spell.name} [${entry.req.level}]${status}`,
        entry.canLearn ? 'info' : 'normal'
      );
    }
  }
}
