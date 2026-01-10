import { GameProvider, useGame } from './context/GameContext';
import { GameViewport } from './components/GameViewport';
import { StatsPanel } from './components/StatsPanel';
import { MessageLog } from './components/MessageLog';
import {
  InventoryModal,
  EquipmentModal,
  CharacterModal,
  ItemSelectionModal,
  SpellSelectionModal,
} from './components/modals';
import { CharacterCreationModal } from './components/modals/CharacterCreationModal';
import { useKeyboard } from './hooks/useKeyboard';

const CREATION_STATES = [
  'sexSelection',
  'raceSelection',
  'classSelection',
  'realmSelection',
  'statRolling',
  'nameEntry',
  'confirmation',
];

function ModalContainer() {
  const { state } = useGame();

  return (
    <>
      {state.stateName === 'inventory' && <InventoryModal />}
      {state.stateName === 'equipment' && <EquipmentModal />}
      {state.stateName === 'character' && <CharacterModal />}
      {state.stateName === 'itemSelection' && <ItemSelectionModal />}
      {(state.stateName === 'cast' || state.stateName === 'study') && <SpellSelectionModal />}
    </>
  );
}

function GameLayout() {
  const { state } = useGame();
  useKeyboard();

  const isCreating = CREATION_STATES.includes(state.stateName);

  if (isCreating) {
    return <CharacterCreationModal />;
  }

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
      <GameLayout />
    </GameProvider>
  );
}
