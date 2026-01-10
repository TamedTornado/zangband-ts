/**
 * StoreModal - Store interface for buying/selling items
 *
 * Implements Zangband-style store flow:
 * - browse: see store inventory, press commands (p/s/x)
 * - buying: select item to purchase
 * - selling: select item from inventory to sell
 * - examining: select item to inspect
 */

import { useGame } from '@/ui/context/GameContext';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

export function StoreModal() {
  const { state, actions } = useGame();
  const { shopping, player } = state;

  if (!shopping || !player) {
    return null;
  }

  const { storeName, ownerName, mode, stock } = shopping;

  // Determine what items to show based on mode
  const showPlayerInventory = mode === 'selling';
  const items = showPlayerInventory
    ? player.inventory.map((item, idx) => ({
        letter: LETTERS[idx] ?? '?',
        name: actions.getItemDisplayName(item),
        price: 0, // Sell prices shown in messages
        quantity: item.quantity,
      }))
    : stock.map((item, idx) => ({
        letter: LETTERS[idx] ?? '?',
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

  // Determine prompt text based on mode
  const getPromptText = () => {
    switch (mode) {
      case 'buying':
        return 'Which item are you interested in?';
      case 'selling':
        return 'Which item do you want to sell?';
      case 'examining':
        return 'Which item do you want to examine?';
      default:
        return null;
    }
  };

  const promptText = getPromptText();
  const isSelecting = mode !== 'browse';

  return (
    <div className="store-modal">
      <div className="store-header">
        <h2>{storeName}</h2>
        <div className="store-owner">&quot;{ownerName}&quot; welcomes you.</div>
        <div className="store-gold">Gold: {player.gold}</div>
      </div>

      {/* Show inventory title */}
      <div className="store-inventory-title">
        {showPlayerInventory ? 'Your Inventory' : 'Store Inventory'}
      </div>

      {/* Prompt when selecting */}
      {promptText && (
        <div className="store-prompt">{promptText}</div>
      )}

      <div className="store-inventory">
        {items.length === 0 ? (
          <div className="store-empty">
            {showPlayerInventory ? 'You have nothing to sell.' : 'No items for sale.'}
          </div>
        ) : (
          <ul className="store-item-list">
            {items.map((item, idx) => (
              <li
                key={idx}
                className={`store-item ${isSelecting ? 'selectable' : ''}`}
                onClick={() => isSelecting && actions.letterSelect(item.letter)}
              >
                {item.letter}) {item.name}
                {!showPlayerInventory && ` - ${item.price} gp`}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="store-footer">
        <div className="store-commands">
          {mode === 'browse' ? (
            'p) Purchase   s) Sell   x) Examine   ESC) Exit'
          ) : (
            'ESC) Cancel'
          )}
        </div>
      </div>
    </div>
  );
}
