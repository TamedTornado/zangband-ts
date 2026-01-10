import { useGame } from '../../../context/GameContext';
import type { Sex } from '@/core/data/characterCreation';

export function SexStep() {
  const { state, actions } = useGame();
  const currentSex = state.characterCreation?.sex;

  const handleSelect = (sex: Sex) => {
    actions.dispatch({ type: 'selectSex', sex });
  };

  return (
    <div className="step-content">
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
