import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';

export function MessageLog() {
  const { state } = useGame();
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or prompt changes
  // Use last message ID (not length) since messages are trimmed at 100
  const lastMessageId = state.messages[state.messages.length - 1]?.id;
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' });
  }, [lastMessageId, state.prompt]);

  return (
    <div className="message-log">
      {state.messages.map(msg => (
        <div key={msg.id} className={`message ${msg.type}`}>
          {msg.text}
        </div>
      ))}
      {state.prompt && (
        <div className="message-prompt">
          <span className="prompt-text">{state.prompt.text}</span>
          <span className="prompt-value">{state.prompt.value}</span>
          <span className="prompt-cursor">_</span>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
