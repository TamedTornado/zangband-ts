import { Modal, ItemList } from './Modal';
import { useGame } from '../../context/GameContext';
import { useGameStore } from '@/core/store/gameStore';

type SpellEntry = NonNullable<ReturnType<typeof useGameStore.getState>['spellTargeting']>['spells'][number];

/**
 * Spell selection modal - used for casting (m) and studying (G)
 *
 * Shows spell list with level, mana cost, fail%, and status.
 */
export function SpellSelectionModal() {
  const { actions } = useGame();
  const spellTargeting = useGameStore(s => s.spellTargeting);

  if (!spellTargeting) return null;

  const { mode, spells } = spellTargeting;

  const renderSpell = (spell: SpellEntry, _index: number, letter: string) => {
    const statusText = spell.canUse ? '' : ` (${spell.reason})`;

    // Format: "a) Magic Missile [1] 3mp 5%"
    let display = `${letter}) ${spell.name}`;
    display += ` [${spell.level}]`;
    display += ` ${spell.mana}mp`;
    display += ` ${spell.fail}%`;
    display += statusText;

    return (
      <span className={`spell-entry ${spell.canUse ? 'spell-available' : 'spell-unavailable'}`}>
        {display}
      </span>
    );
  };

  const handleSelect = (spell: SpellEntry, _index: number) => {
    actions.letterSelect(spell.letter);
  };

  const title = mode === 'cast' ? 'Cast Spell' : 'Learn Spell';
  const emptyMsg = mode === 'cast' ? 'You know no spells.' : 'No spells to learn.';

  return (
    <Modal
      title={title}
      onClose={() => actions.cancelTarget()}
      width={450}
      footer={
        <div className="modal-hints">
          <span>a-z) Select</span>
          <span>ESC) Cancel</span>
        </div>
      }
    >
      <div className="spell-list-header">
        <span className="spell-col-name">Spell</span>
        <span className="spell-col-level">Lv</span>
        <span className="spell-col-mana">MP</span>
        <span className="spell-col-fail">Fail</span>
      </div>
      <ItemList
        items={spells}
        renderItem={renderSpell}
        onSelect={handleSelect}
        emptyMessage={emptyMsg}
      />
    </Modal>
  );
}
