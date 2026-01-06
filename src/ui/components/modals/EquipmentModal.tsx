import { Modal } from './Modal';
import { useGame } from '../../context/GameContext';
import { useModal } from '../../context/ModalContext';
import type { EquipmentSlot } from '@/core/entities/Player';
import type { Item } from '@/core/entities/Item';

/**
 * Equipment slot configuration - matches Zangband slot layout
 * From TCL/TK inventory2.tcl paperdoll display
 */
const EQUIPMENT_SLOTS: Array<{ slot: EquipmentSlot; label: string; letter: string }> = [
  { slot: 'weapon', label: 'Wielding', letter: 'a' },
  { slot: 'bow', label: 'Shooting', letter: 'b' },
  { slot: 'ring1', label: 'Left Ring', letter: 'c' },
  { slot: 'ring2', label: 'Right Ring', letter: 'd' },
  { slot: 'amulet', label: 'Neck', letter: 'e' },
  { slot: 'light', label: 'Light', letter: 'f' },
  { slot: 'armor', label: 'Body', letter: 'g' },
  { slot: 'cloak', label: 'Cloak', letter: 'h' },
  { slot: 'shield', label: 'Off-hand', letter: 'i' },
  { slot: 'helmet', label: 'Head', letter: 'j' },
  { slot: 'gloves', label: 'Hands', letter: 'k' },
  { slot: 'boots', label: 'Feet', letter: 'l' },
];

/**
 * Format item display string
 */
function formatItem(item: Item | undefined): string {
  if (!item) return '(empty)';

  let display = item.name;

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

  return display;
}

/**
 * Equipment modal - displays equipped items by slot
 *
 * Inspired by Zangband TCL/TK equipment display:
 * - Slot-based layout with labels
 * - Shows equipped item or (empty)
 * - Letter selection for takeoff
 */
export function EquipmentModal() {
  const { state } = useGame();
  const { closeModal } = useModal();
  const equipment = state.player.getAllEquipment();

  return (
    <Modal
      title="Equipment"
      onClose={closeModal}
      width={450}
      footer={
        <div className="modal-hints">
          <span>a-l) Take off</span>
          <span>ESC) Close</span>
        </div>
      }
    >
      <div className="equipment-list">
        {EQUIPMENT_SLOTS.map(({ slot, label, letter }) => {
          const item = equipment[slot];
          const isEmpty = !item;

          return (
            <div
              key={slot}
              className={`equipment-row ${isEmpty ? 'empty' : ''}`}
            >
              <span className="slot-letter">{letter})</span>
              <span className="slot-label">{label}:</span>
              <span className={`slot-item ${isEmpty ? 'empty' : ''}`}>
                {formatItem(item)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="equipment-summary">
        <div className="stat-row">
          <span className="stat-label">Total AC:</span>
          <span className="stat-value">{state.player.totalAc}</span>
        </div>
      </div>
    </Modal>
  );
}
