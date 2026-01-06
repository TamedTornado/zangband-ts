import { GameProvider } from './context/GameContext';
import { ModalProvider, useModal } from './context/ModalContext';
import { GameViewport } from './components/GameViewport';
import { StatsPanel } from './components/StatsPanel';
import { MessageLog } from './components/MessageLog';
import { InventoryModal, EquipmentModal, CharacterModal } from './components/modals';
import { useKeyboard } from './hooks/useKeyboard';

function ModalContainer() {
  const { activeModal } = useModal();

  return (
    <>
      {activeModal === 'inventory' && <InventoryModal />}
      {activeModal === 'equipment' && <EquipmentModal />}
      {activeModal === 'character' && <CharacterModal />}
    </>
  );
}

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
      <ModalContainer />
    </>
  );
}

export function App() {
  return (
    <GameProvider>
      <ModalProvider>
        <GameLayout />
      </ModalProvider>
    </GameProvider>
  );
}
