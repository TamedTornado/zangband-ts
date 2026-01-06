import { GameProvider } from './context/GameContext';
import { GameViewport } from './components/GameViewport';
import { StatsPanel } from './components/StatsPanel';
import { MessageLog } from './components/MessageLog';
import { useKeyboard } from './hooks/useKeyboard';

function GameLayout() {
  useKeyboard();

  return (
    <>
      <div className="game-container">
        <div className="viewport-container">
          <GameViewport />
        </div>
        <div className="side-panel">
          <StatsPanel />
        </div>
      </div>
      <MessageLog />
    </>
  );
}

export function App() {
  return (
    <GameProvider>
      <GameLayout />
    </GameProvider>
  );
}
