import { useGame } from '../../context/GameContext';
import { SexStep } from './creation/SexStep';
import { RaceStep } from './creation/RaceStep';
import { ClassStep } from './creation/ClassStep';
import { RealmStep } from './creation/RealmStep';
import { StatsStep } from './creation/StatsStep';
import { NameStep } from './creation/NameStep';
import { ConfirmStep } from './creation/ConfirmStep';
import classesData from '@/data/classes/classes.json';
import type { ClassDef } from '@/core/data/classes';

const STEPS = [
  { id: 'sexSelection', label: 'Sex' },
  { id: 'raceSelection', label: 'Race' },
  { id: 'classSelection', label: 'Class' },
  { id: 'realmSelection', label: 'Realm' },
  { id: 'statRolling', label: 'Stats' },
  { id: 'nameEntry', label: 'Name' },
  { id: 'confirmation', label: 'Confirm' },
];

function getStepIndex(stateName: string): number {
  return STEPS.findIndex(s => s.id === stateName);
}

function isStepCompleted(stepId: string, currentStateName: string): boolean {
  const stepIndex = STEPS.findIndex(s => s.id === stepId);
  const currentIndex = getStepIndex(currentStateName);
  return stepIndex < currentIndex;
}

/**
 * Character creation wizard modal
 * Fixed size with tab navigation and prev/next buttons
 */
export function CharacterCreationModal() {
  const { state, actions } = useGame();
  const { stateName, characterCreation } = state;
  const currentIndex = getStepIndex(stateName);

  // Determine if realm step should be shown (only for magic classes)
  const showRealmStep = characterCreation?.classKey &&
    ['mage', 'priest', 'rogue', 'ranger', 'paladin', 'warrior_mage', 'chaos_warrior', 'monk', 'mindcrafter', 'high_mage']
      .includes(characterCreation.classKey);

  // Filter steps to hide realm for non-magic classes
  const visibleSteps = STEPS.filter(step =>
    step.id !== 'realmSelection' || showRealmStep
  );

  const canGoBack = currentIndex > 0;

  // Determine if Next button should be enabled based on current step's selection
  const canGoNext = (() => {
    if (!characterCreation) return false;

    switch (stateName) {
      case 'sexSelection':
        return !!characterCreation.sex;
      case 'raceSelection':
        return !!characterCreation.raceKey;
      case 'classSelection':
        return !!characterCreation.classKey;
      case 'realmSelection': {
        if (characterCreation.isSelectingPrimaryRealm) {
          return !!characterCreation.primaryRealm;
        } else {
          return !!characterCreation.secondaryRealm;
        }
      }
      case 'statRolling':
        // Stats step has its own Accept button, not handled here
        return false;
      case 'nameEntry':
        // Name step has its own Continue button
        return false;
      case 'confirmation':
        return true;
      default:
        return false;
    }
  })();

  // Steps that handle their own navigation (have internal buttons)
  const stepHandlesOwnNavigation = stateName === 'statRolling' || stateName === 'nameEntry';

  const handleBack = () => {
    actions.dispatch({ type: 'creationBack' });
  };

  const handleNext = () => {
    if (stateName === 'confirmation') {
      actions.dispatch({ type: 'confirmCharacter' });
    } else {
      actions.dispatch({ type: 'creationNext' });
    }
  };

  // Get the label for the realm step (primary vs secondary)
  const getRealmLabel = () => {
    if (stateName !== 'realmSelection') return 'Realm';
    if (characterCreation?.isSelectingPrimaryRealm) return 'Primary Realm';

    const classKey = characterCreation?.classKey;
    if (classKey) {
      const classDef = classesData[classKey as keyof typeof classesData] as ClassDef;
      if (classDef.secondaryRealm) return 'Secondary Realm';
    }
    return 'Realm';
  };

  return (
    <div className="modal-backdrop">
      <div className="creation-modal">
        {/* Tab bar */}
        <div className="creation-tabs">
          {visibleSteps.map((step) => {
            const isCurrent = step.id === stateName;
            const isCompleted = isStepCompleted(step.id, stateName);
            const label = step.id === 'realmSelection' ? getRealmLabel() : step.label;

            return (
              <div
                key={step.id}
                className={`creation-tab ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                <span className="tab-label">{label}</span>
              </div>
            );
          })}
        </div>

        {/* Content area - fixed height */}
        <div className="creation-body">
          {stateName === 'sexSelection' && <SexStep />}
          {stateName === 'raceSelection' && <RaceStep />}
          {stateName === 'classSelection' && <ClassStep />}
          {stateName === 'realmSelection' && <RealmStep />}
          {stateName === 'statRolling' && <StatsStep />}
          {stateName === 'nameEntry' && <NameStep />}
          {stateName === 'confirmation' && <ConfirmStep />}
        </div>

        {/* Navigation footer */}
        <div className="creation-footer">
          <button
            className="creation-btn creation-btn-secondary"
            onClick={handleBack}
            disabled={!canGoBack}
          >
            ← Back
          </button>
          <div className="creation-step-indicator">
            Step {currentIndex + 1} of {visibleSteps.length}
          </div>
          {stepHandlesOwnNavigation ? (
            <div className="creation-btn-placeholder" />
          ) : (
            <button
              className="creation-btn creation-btn-primary"
              onClick={handleNext}
              disabled={!canGoNext}
            >
              {stateName === 'confirmation' ? 'Start Game →' : 'Next →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
