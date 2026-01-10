import { useState, useEffect, useRef } from 'react';
import { useGame } from '../../../context/GameContext';

export function NameStep() {
  const { state, actions } = useGame();
  const [name, setName] = useState(state.characterCreation?.name ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length > 0) {
      actions.dispatch({ type: 'setName', name: name.trim() });
    }
  };

  const isValid = name.trim().length > 0;

  return (
    <div className="step-content name-step-content">
      <p className="step-description">
        Enter a name for your character. This will be displayed throughout the game.
      </p>

      <form onSubmit={handleSubmit} className="name-form">
        <div className="form-group">
          <label htmlFor="character-name" className="form-label">Character Name</label>
          <input
            ref={inputRef}
            id="character-name"
            type="text"
            className="form-input"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={32}
            placeholder="Enter name..."
          />
        </div>

        <button
          type="submit"
          className="creation-btn creation-btn-primary"
          disabled={!isValid}
        >
          Continue
        </button>
      </form>
    </div>
  );
}
