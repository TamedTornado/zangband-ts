import type { State } from '../../State';
import type { GameAction } from '../../Actions';
import type { GameFSM } from '../../GameFSM';
import { getGameStore } from '@/core/store/gameStore';
import { RaceSelectionState } from './RaceSelectionState';
import { RealmSelectionState } from './RealmSelectionState';
import { StatRollingState } from './StatRollingState';
import classesData from '@/data/classes/classes.json';
import type { ClassDef } from '@/core/data/classes';

export class ClassSelectionState implements State {
  readonly name = 'classSelection';

  onEnter(_fsm: GameFSM): void {}

  onExit(_fsm: GameFSM): void {}

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    if (action.type === 'selectClass') {
      const store = getGameStore();

      store.updateCharacterCreation({
        classKey: action.classKey,
        primaryRealm: null,
        secondaryRealm: null,
        isSelectingPrimaryRealm: true,
      });

      return true;
    }

    if (action.type === 'creationNext') {
      const store = getGameStore();
      const creation = store.characterCreation;
      if (!creation?.classKey) return false;

      const classDef = classesData[creation.classKey as keyof typeof classesData] as ClassDef;

      // If class has realms, go to realm selection; otherwise go to stats
      if (classDef.realms.length > 0) {
        fsm.transition(new RealmSelectionState());
      } else {
        fsm.transition(new StatRollingState());
      }
      return true;
    }

    if (action.type === 'creationBack') {
      fsm.transition(new RaceSelectionState());
      return true;
    }

    return false;
  }
}
