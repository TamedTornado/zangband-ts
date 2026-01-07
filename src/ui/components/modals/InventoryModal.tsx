import { Modal, ItemList } from './Modal';
import { useGame } from '../../context/GameContext';
import type { Item } from '@/core/entities/Item';

/** Item with original index for filtered lists */
interface IndexedItem {
  item: Item;
  originalIndex: number;
}

/**
 * Inventory modal - displays player's backpack items
 *
 * Inspired by Zangband TCL/TK inventory.tcl:
 * - Items displayed with: character label (a, b, c...), name, stats
 * - a-z key selection
 * - Context actions (wield, drop, etc.)
 */
export function InventoryModal() {
  const { state, actions } = useGame();
  const inventory = state.player.inventory;

  // Build indexed items
  const indexedItems: IndexedItem[] = inventory
    .map((item: Item, index: number) => ({ item, originalIndex: index }));

  const renderItem = (indexed: IndexedItem, _index: number, letter: string) => {
    const item = indexed.item;
    // Format item display like TCL/TK: "a) Short Sword (1d6) (+2,+3)"
    let display = `${letter}) ${item.name}`;

    // Add damage for weapons only (tval 16-23 are weapons)
    const isWeapon = item.tval >= 16 && item.tval <= 23;
    if (isWeapon && item.damage && item.damage !== '0d0') {
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

  const handleSelect = (_indexed: IndexedItem, _listIndex: number) => {
    // In browse mode, selection does nothing (could show item details in future)
    // Item actions (wield, drop, quaff, read, eat) now go through FSM states
    // with inline prompts, so modal-based selection is deprecated
  };

  return (
    <Modal
      title="Inventory"
      onClose={() => actions.cancelTarget()}
      width={450}
      footer={
        <div className="modal-hints">
          <span>i) Close</span>
          <span>ESC) Close</span>
        </div>
      }
    >
      <ItemList
        items={indexedItems}
        renderItem={renderItem}
        onSelect={handleSelect}
        emptyMessage="Your pack is empty."
      />
    </Modal>
  );
}
