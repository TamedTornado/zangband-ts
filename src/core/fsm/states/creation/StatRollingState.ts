import type { State } from '../../State';
import type { GameAction } from '../../Actions';
import type { GameFSM } from '../../GameFSM';
import { getGameStore } from '@/core/store/gameStore';
import { rollBaseStats, applyStatBonuses, meetsMinimums } from '@/core/systems/StatRoller';
import { ClassSelectionState } from './ClassSelectionState';
import { RealmSelectionState } from './RealmSelectionState';
import { NameEntryState } from './NameEntryState';
import racesData from '@/data/races/races.json';
import classesData from '@/data/classes/classes.json';
import type { RaceDef } from '@/core/data/races';
import type { ClassDef } from '@/core/data/classes';
import { RNG } from 'rot-js';

export class StatRollingState implements State {
  readonly name = 'statRolling';

  onEnter(_fsm: GameFSM): void {
    // Roll initial stats on entry
    this.rollStats();
  }

  onExit(_fsm: GameFSM): void {}

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    const store = getGameStore();
    const creation = store.characterCreation;
    if (!creation) return false;

    if (action.type === 'rollStats') {
      this.rollStats();
      return true;
    }

    if (action.type === 'setMinimum') {
      store.updateCharacterCreation({
        autorollerMinimums: {
          ...creation.autorollerMinimums,
          [action.stat]: action.value,
        },
      });
      return true;
    }

    if (action.type === 'autoroll') {
      this.autoroll();
      return true;
    }

    if (action.type === 'acceptStats') {
      fsm.transition(new NameEntryState());
      return true;
    }

    if (action.type === 'creationBack') {
      const classDef = classesData[creation.classKey as keyof typeof classesData] as ClassDef;
      if (classDef.realms.length > 0) {
        // Go back to realm selection
        store.updateCharacterCreation({ isSelectingPrimaryRealm: false });
        fsm.transition(new RealmSelectionState());
      } else {
        fsm.transition(new ClassSelectionState());
      }
      return true;
    }

    return false;
  }

  private rollStats(): void {
    const store = getGameStore();
    const creation = store.characterCreation;
    if (!creation || !creation.raceKey || !creation.classKey) return;

    const raceDef = racesData[creation.raceKey as keyof typeof racesData] as RaceDef;
    const classDef = classesData[creation.classKey as keyof typeof classesData] as ClassDef;

    const baseStats = rollBaseStats(RNG);
    const finalStats = applyStatBonuses(baseStats, raceDef, classDef);

    store.updateCharacterCreation({
      baseStats,
      finalStats,
      rollCount: (creation.rollCount ?? 0) + 1,
    });
  }

  private autoroll(): void {
    const store = getGameStore();
    const creation = store.characterCreation;
    if (!creation || !creation.raceKey || !creation.classKey) return;

    const raceDef = racesData[creation.raceKey as keyof typeof racesData] as RaceDef;
    const classDef = classesData[creation.classKey as keyof typeof classesData] as ClassDef;

    store.updateCharacterCreation({ isAutorolling: true });

    const MAX_ITERATIONS = 500;
    let rollCount = creation.rollCount ?? 0;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const baseStats = rollBaseStats(RNG);
      const finalStats = applyStatBonuses(baseStats, raceDef, classDef);
      rollCount++;

      if (meetsMinimums(finalStats, creation.autorollerMinimums)) {
        store.updateCharacterCreation({
          baseStats,
          finalStats,
          rollCount,
          isAutorolling: false,
        });
        return;
      }
    }

    // If we didn't find a match, just keep the last roll
    const baseStats = rollBaseStats(RNG);
    const finalStats = applyStatBonuses(baseStats, raceDef, classDef);
    store.updateCharacterCreation({
      baseStats,
      finalStats,
      rollCount: rollCount + 1,
      isAutorolling: false,
    });
  }
}
