import { Modal, ItemList } from './Modal';
import { useGame } from '../../context/GameContext';
import type { Item } from '@/core/entities/Item';

interface SelectableItem {
  item: Item;
  originalIndex: number;
}

/**
 * Item selection modal - used for zap, quaff, read, eat, and other item picking
 *
 * Shows filtered list of valid items with a-z selection.
 */
export function ItemSelectionModal() {
  const { state, actions } = useGame();
  const { itemTargeting, player } = state;

  if (!itemTargeting) return null;

  // Build list of selectable items from valid indices
  const selectableItems: SelectableItem[] = itemTargeting.validItemIndices.map(index => ({
    item: player.inventory[index],
    originalIndex: index,
  }));

  const renderItem = (selectable: SelectableItem, _index: number, letter: string) => {
    const item = selectable.item;
    let display = `${letter}) ${item.name}`;

    // Add charges for devices
    if (item.type === 'wand' || item.type === 'staff') {
      display += ` (${item.charges}/${item.maxCharges} charges)`;
    } else if (item.type === 'rod') {
      if (item.timeout > 0) {
        display += ` (recharging: ${item.timeout})`;
      } else {
        display += ' (ready)';
      }
    }

    // Add quantity for stackables
    if (item.quantity > 1) {
      display = `${letter}) ${item.quantity}x ${item.name}`;
    }

    return (
      <span className={`item-display item-type-${item.type}`}>
        {display}
      </span>
    );
  };

  const handleSelect = (selectable: SelectableItem, _index: number) => {
    const letter = String.fromCharCode('a'.charCodeAt(0) + selectable.originalIndex);
    actions.letterSelect(letter);
  };

  return (
    <Modal
      title={itemTargeting.prompt}
      onClose={() => actions.cancelTarget()}
      width={400}
      footer={
        <div className="modal-hints">
          <span>a-z) Select</span>
          <span>ESC) Cancel</span>
        </div>
      }
    >
      <ItemList
        items={selectableItems}
        renderItem={renderItem}
        onSelect={handleSelect}
        emptyMessage="No items available."
      />
    </Modal>
  );
}
