import type { State } from '../../State';
import type { GameAction } from '../../Actions';
import type { GameFSM } from '../../GameFSM';
import { getGameStore } from '@/core/store/gameStore';
import { ClassSelectionState } from './ClassSelectionState';
import { StatRollingState } from './StatRollingState';
import classesData from '@/data/classes/classes.json';
import type { ClassDef } from '@/core/data/classes';

export class RealmSelectionState implements State {
  readonly name = 'realmSelection';

  onEnter(_fsm: GameFSM): void {}

  onExit(_fsm: GameFSM): void {}

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    const store = getGameStore();
    const creation = store.characterCreation;
    if (!creation || !creation.classKey) return false;

    const classDef = classesData[creation.classKey as keyof typeof classesData] as ClassDef;

    if (action.type === 'selectRealm') {
      if (creation.isSelectingPrimaryRealm) {
        // Selecting primary realm
        store.updateCharacterCreation({
          primaryRealm: action.realm,
        });
      } else {
        // Selecting secondary realm - can't be same as primary
        if (action.realm === creation.primaryRealm) {
          return false; // Reject same realm
        }
        store.updateCharacterCreation({
          secondaryRealm: action.realm,
        });
      }
      return true;
    }

    if (action.type === 'creationNext') {
      if (creation.isSelectingPrimaryRealm) {
        // Must have selected primary realm
        if (!creation.primaryRealm) return false;

        // If class allows secondary realm, move to secondary selection
        if (classDef.secondaryRealm) {
          store.updateCharacterCreation({ isSelectingPrimaryRealm: false });
          fsm.transition(new RealmSelectionState());
        } else {
          fsm.transition(new StatRollingState());
        }
      } else {
        // Must have selected secondary realm
        if (!creation.secondaryRealm) return false;
        fsm.transition(new StatRollingState());
      }
      return true;
    }

    if (action.type === 'creationBack') {
      if (creation.isSelectingPrimaryRealm) {
        // Go back to class selection
        fsm.transition(new ClassSelectionState());
      } else {
        // Go back to primary realm selection
        store.updateCharacterCreation({
          primaryRealm: null,
          isSelectingPrimaryRealm: true,
        });
        fsm.transition(new RealmSelectionState());
      }
      return true;
    }

    return false;
  }
}
