import type { State } from '../../State';
import type { GameAction } from '../../Actions';
import type { GameFSM } from '../../GameFSM';
import { getGameStore } from '@/core/store/gameStore';
import { canSelectClass } from '@/core/systems/StatRoller';
import { SexSelectionState } from './SexSelectionState';
import { ClassSelectionState } from './ClassSelectionState';
import racesData from '@/data/races/races.json';
import classesData from '@/data/classes/classes.json';
import type { RaceDef } from '@/core/data/races';
import type { ClassDef } from '@/core/data/classes';

export class RaceSelectionState implements State {
  readonly name = 'raceSelection';

  onEnter(_fsm: GameFSM): void {}

  onExit(_fsm: GameFSM): void {}

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    if (action.type === 'selectRace') {
      const store = getGameStore();
      const creation = store.characterCreation;
      if (!creation) return false;

      const newRace = racesData[action.raceKey as keyof typeof racesData] as RaceDef;

      // Check if current class is still valid for new race
      let newClassKey = creation.classKey;
      if (newClassKey) {
        const currentClass = classesData[newClassKey as keyof typeof classesData] as ClassDef;
        if (!canSelectClass(newRace, currentClass)) {
          newClassKey = null;
        }
      }

      store.updateCharacterCreation({
        raceKey: action.raceKey,
        classKey: newClassKey,
        // Reset realms if class was reset
        primaryRealm: newClassKey ? creation.primaryRealm : null,
        secondaryRealm: newClassKey ? creation.secondaryRealm : null,
      });

      return true;
    }

    if (action.type === 'creationNext') {
      const store = getGameStore();
      if (store.characterCreation?.raceKey) {
        fsm.transition(new ClassSelectionState());
        return true;
      }
    }

    if (action.type === 'creationBack') {
      fsm.transition(new SexSelectionState());
      return true;
    }

    return false;
  }
}
