import { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { useGame } from '../../context/GameContext';
import { useModal } from '../../context/ModalContext';

/**
 * Rest modal - prompts player for rest duration
 *
 * Inspired by Zangband's rest command:
 * - R opens prompt
 * - Enter number for fixed turns
 * - '*' for until HP/SP full
 * - '&' for until fully recovered
 */
export function RestModal() {
  const { actions } = useGame();
  const { modalActions } = useModal();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const value = input.trim();

    if (value === '*') {
      modalActions.closeModal();
      actions.startRest({ type: 'hp_sp' });
      return;
    }

    if (value === '&') {
      modalActions.closeModal();
      actions.startRest({ type: 'full' });
      return;
    }

    const turns = parseInt(value, 10);
    if (isNaN(turns) || turns <= 0) {
      setError('Enter a number, *, or &');
      return;
    }

    modalActions.closeModal();
    actions.startRest({ type: 'turns', count: turns });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Modal
      title="Rest"
      onClose={modalActions.closeModal}
      width={300}
      footer={
        <div className="modal-hints">
          <span>Enter) Confirm</span>
          <span>ESC) Cancel</span>
        </div>
      }
    >
      <div className="rest-modal">
        <p className="rest-prompt">Rest for how long?</p>
        <div className="rest-options">
          <span className="rest-option">*) Until HP/SP restored</span>
          <span className="rest-option">&) Until fully recovered</span>
          <span className="rest-option">N) Rest for N turns</span>
        </div>
        <input
          ref={inputRef}
          type="text"
          className="rest-input"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError('');
          }}
          onKeyDown={handleKeyDown}
          placeholder="Enter *, &, or number"
        />
        {error && <p className="rest-error">{error}</p>}
      </div>
    </Modal>
  );
}
