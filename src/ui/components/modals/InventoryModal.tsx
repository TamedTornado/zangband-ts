import { Modal, ItemList } from './Modal';
import { useGame } from '../../context/GameContext';
import { useModal, type InventoryMode } from '../../context/ModalContext';
import type { Item } from '@/core/entities/Item';

interface ModeConfig {
  title: string;
  hint: string;
  filter?: (item: Item) => boolean;
  emptyMessage?: string;
}

/**
 * Get title and hints based on inventory mode
 */
function getModeConfig(mode: InventoryMode): ModeConfig {
  switch (mode) {
    case 'wield':
      return { title: 'Wield/Wear which item?', hint: 'a-z) Wield item' };
    case 'drop':
      return { title: 'Drop which item?', hint: 'a-z) Drop item' };
    case 'quaff':
      return {
        title: 'Quaff which potion?',
        hint: 'a-z) Quaff potion',
        filter: (item: Item) => item.isPotion,
        emptyMessage: 'You have no potions.',
      };
    case 'read':
      return {
        title: 'Read which scroll?',
        hint: 'a-z) Read scroll',
        filter: (item: Item) => item.isScroll,
        emptyMessage: 'You have no scrolls.',
      };
    case 'eat':
      return {
        title: 'Eat what?',
        hint: 'a-z) Eat',
        filter: (item: Item) => item.isFood,
        emptyMessage: 'You have no food.',
      };
    default:
      return { title: 'Inventory', hint: 'a-z) Select item' };
  }
}

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
  const { inventoryMode, modalActions } = useModal();
  const inventory = state.player.inventory;
  const config = getModeConfig(inventoryMode);

  // Build indexed items with optional filtering
  const indexedItems: IndexedItem[] = inventory
    .map((item, index) => ({ item, originalIndex: index }))
    .filter(({ item }) => !config.filter || config.filter(item));

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

  const handleSelect = (indexed: IndexedItem, _listIndex: number) => {
    const originalIndex = indexed.originalIndex;
    switch (inventoryMode) {
      case 'wield':
        actions.wieldItem(originalIndex);
        modalActions.closeModal();
        break;
      case 'drop':
        actions.dropItem(originalIndex);
        modalActions.closeModal();
        break;
      case 'quaff':
        actions.quaffPotion(originalIndex);
        modalActions.closeModal();
        break;
      case 'read':
        actions.readScroll(originalIndex);
        modalActions.closeModal();
        break;
      case 'eat':
        actions.eatFood(originalIndex);
        modalActions.closeModal();
        break;
      default:
        // Browse mode - could show item details in future
        break;
    }
  };

  return (
    <Modal
      title={config.title}
      onClose={modalActions.closeModal}
      width={450}
      footer={
        <div className="modal-hints">
          <span>{config.hint}</span>
          <span>ESC) Close</span>
        </div>
      }
    >
      <ItemList
        items={indexedItems}
        renderItem={renderItem}
        onSelect={handleSelect}
        emptyMessage={config.emptyMessage ?? 'Your pack is empty.'}
      />
    </Modal>
  );
}
