import { Modal, ItemList } from './Modal';
import { useGame } from '../../context/GameContext';
import { useModal } from '../../context/ModalContext';
import type { Item } from '@/core/entities/Item';

/**
 * Inventory modal - displays player's backpack items
 *
 * Inspired by Zangband TCL/TK inventory.tcl:
 * - Items displayed with: character label (a, b, c...), name, stats
 * - a-z key selection
 * - Context actions (wield, drop, etc.)
 */
export function InventoryModal() {
  const { state } = useGame();
  const { closeModal } = useModal();
  const inventory = state.player.inventory;

  const renderItem = (item: Item, _index: number, letter: string) => {
    // Format item display like TCL/TK: "a) Short Sword (1d6) (+2,+3)"
    let display = `${letter}) ${item.name}`;

    // Add damage for weapons
    if (item.damage && item.damage !== '0d0') {
      display += ` (${item.damage})`;
      if (item.toHit !== 0 || item.toDam !== 0) {
        display += ` (${item.toHit >= 0 ? '+' : ''}${item.toHit},${item.toDam >= 0 ? '+' : ''}${item.toDam})`;
      }
    }

    // Add AC for armor
    if (item.baseAc > 0) {
      display += ` [${item.baseAc}`;
      if (item.toAc !== 0) {
        display += `,${item.toAc >= 0 ? '+' : ''}${item.toAc}`;
      }
      display += ']';
    }

    return (
      <span className={`item-display tval-${item.generated?.baseItem.tval ?? 0}`}>
        {display}
      </span>
    );
  };

  const handleSelect = (item: Item, _index: number) => {
    // For now, just show item info in console
    // TODO: Show item action menu (wield, drop, etc.)
    console.log('Selected item:', item.name);
  };

  return (
    <Modal
      title="Inventory"
      onClose={closeModal}
      width={450}
      footer={
        <div className="modal-hints">
          <span>a-z) Select item</span>
          <span>ESC) Close</span>
        </div>
      }
    >
      <ItemList
        items={inventory}
        renderItem={renderItem}
        onSelect={handleSelect}
        emptyMessage="Your pack is empty."
      />
    </Modal>
  );
}
