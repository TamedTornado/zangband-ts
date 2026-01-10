import { useGame } from '../../../context/GameContext';
import { useGameStore } from '@/core/store/gameStore';
import type { Sex } from '@/core/data/characterCreation';

export function SexStep() {
  const { state, actions } = useGame();
  const currentSex = state.characterCreation?.sex;
  const previousCharacter = useGameStore(s => s.previousCharacter);

  const handleSelect = (sex: Sex) => {
    actions.dispatch({ type: 'selectSex', sex });
  };

  const handleQuickStart = () => {
    actions.dispatch({ type: 'quickStart' });
  };

  return (
    <div className="step-content">
      {previousCharacter && (
        <div className="quick-start-section">
          <button
            className="quick-start-button"
            onClick={handleQuickStart}
          >
            Quick Start (Q) - {previousCharacter.name} the {previousCharacter.raceKey} {previousCharacter.classKey}
          </button>
          <div className="divider">or create a new character</div>
        </div>
      )}

      <p className="step-description">
        Choose your character's sex. This affects height and weight calculations only.
      </p>

      <div className="option-cards">
        <label className={`option-card ${currentSex === 'male' ? 'selected' : ''}`}>
          <input
            type="radio"
            name="sex"
            checked={currentSex === 'male'}
            onChange={() => handleSelect('male')}
          />
          <div className="option-card-content">
            <span className="option-title">Male</span>
          </div>
        </label>

        <label className={`option-card ${currentSex === 'female' ? 'selected' : ''}`}>
          <input
            type="radio"
            name="sex"
            checked={currentSex === 'female'}
            onChange={() => handleSelect('female')}
          />
          <div className="option-card-content">
            <span className="option-title">Female</span>
          </div>
        </label>
      </div>
    </div>
  );
}
