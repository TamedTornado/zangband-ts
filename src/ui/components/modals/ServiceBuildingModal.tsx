/**
 * ServiceBuildingModal - Service building interface
 *
 * Displays available services (Inn, Healer, Library, etc.) with their costs
 * and handles user selection via hotkeys.
 */

import { useGame } from '@/ui/context/GameContext';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

interface ServiceInfo {
  key: string;
  name: string;
  description: string;
  cost: number;
  available: boolean;
  reason?: string;
}

interface ItemEntry {
  letter: string;
  name: string;
  inventoryIndex: number;
}

export function ServiceBuildingModal() {
  const { state, actions } = useGame();
  const { serviceBuilding, player } = state;

  if (!serviceBuilding || !player) {
    return null;
  }

  const { buildingName, mode, services, itemPrompt, validItemIndices } = serviceBuilding;

  // In item_select mode, show filtered inventory
  const showItemSelection = mode === 'item_select' && validItemIndices;

  // Get items to display in item selection mode
  const itemsForSelection = showItemSelection
    ? validItemIndices.map((idx: number, displayIdx: number) => {
        const item = player.inventory[idx];
        return {
          letter: LETTERS[displayIdx] ?? '?',
          name: item ? actions.getItemDisplayName(item) : 'Unknown item',
          inventoryIndex: idx,
        };
      })
    : [];

  return (
    <div className="store-modal service-building-modal">
      <div className="store-header">
        <h2>{buildingName}</h2>
        <div className="store-gold">Gold: {player.gold}</div>
      </div>

      {/* Browse mode - show services */}
      {mode === 'browse' && (
        <>
          <div className="store-inventory-title">Available Services</div>
          <div className="store-inventory">
            {services.length === 0 ? (
              <div className="store-empty">No services available.</div>
            ) : (
              <ul className="store-item-list">
                {services.map((service: ServiceInfo, idx: number) => {
                  const letter = LETTERS[idx] ?? '?';
                  const cost = service.cost > 0 ? ` - ${service.cost} gp` : ' - Free';
                  const unavailableReason = !service.available && service.reason
                    ? ` (${service.reason})`
                    : '';
                  return (
                    <li
                      key={service.key}
                      className={`store-item ${service.available ? 'selectable' : 'unavailable'}`}
                      title={service.description}
                    >
                      {letter}) {service.name}{cost}{unavailableReason}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="store-footer">
            <div className="store-commands">
              {services.map((service: ServiceInfo, idx: number) => {
                const letter = LETTERS[idx] ?? '?';
                return `${letter}) ${service.name}   `;
              })}
              ESC) Exit
            </div>
          </div>
        </>
      )}

      {/* Item selection mode */}
      {mode === 'item_select' && (
        <>
          <div className="store-inventory-title">{itemPrompt ?? 'Select an item:'}</div>
          <div className="store-inventory">
            {itemsForSelection.length === 0 ? (
              <div className="store-empty">No valid items.</div>
            ) : (
              <ul className="store-item-list">
                {itemsForSelection.map((item: ItemEntry) => (
                  <li
                    key={item.inventoryIndex}
                    className="store-item selectable"
                    onClick={() => actions.letterSelect(item.letter)}
                  >
                    {item.letter}) {item.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="store-footer">
            <div className="store-commands">
              ESC) Cancel
            </div>
          </div>
        </>
      )}
    </div>
  );
}
