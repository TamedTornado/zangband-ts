import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';

export function MessageLog() {
  const { state } = useGame();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.messages.length]);

  return (
    <div className="message-log" ref={scrollRef}>
      {state.messages.map(msg => (
        <div key={msg.id} className={`message ${msg.type}`}>
          {msg.text}
        </div>
      ))}
    </div>
  );
}
