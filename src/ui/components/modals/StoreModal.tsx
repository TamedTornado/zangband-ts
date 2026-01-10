/**
 * StoreModal - Store interface for buying/selling items
 *
 * Displays store inventory (buy mode) or player inventory (sell mode)
 * with prices and keyboard selection.
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

  // Build items to display based on mode
  const displayItems = mode === 'buy'
    ? stock.map((item, idx) => ({
        letter: LETTERS[idx] ?? '?',
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }))
    : player.inventory.map((item, idx) => ({
        letter: LETTERS[idx] ?? '?',
        name: actions.getItemDisplayName(item),
        price: 0, // TODO: Get sell price from store
        quantity: item.quantity,
      }));

  return (
    <div className="store-modal">
      <div className="store-header">
        <h2>{storeName}</h2>
        <div className="store-owner">&quot;{ownerName}&quot; welcomes you.</div>
        <div className="store-gold">Gold: {player.gold}</div>
      </div>

      <div className="store-tabs">
        <button
          className={`store-tab ${mode === 'buy' ? 'active' : ''}`}
          onClick={() => actions.dispatch({ type: 'toggleStorePage' })}
        >
          Buy (b)
        </button>
        <button
          className={`store-tab ${mode === 'sell' ? 'active' : ''}`}
          onClick={() => actions.dispatch({ type: 'toggleStorePage' })}
        >
          Sell (s)
        </button>
      </div>

      <div className="store-inventory">
        {displayItems.length === 0 ? (
          <div className="store-empty">
            {mode === 'buy' ? 'No items for sale.' : 'No items to sell.'}
          </div>
        ) : (
          <ul className="store-item-list">
            {displayItems.map((item, idx) => (
              <li
                key={idx}
                className="store-item"
                onClick={() => actions.letterSelect(item.letter)}
              >
                <span className="item-letter">{item.letter})</span>
                <span className="item-name">
                  {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}
                </span>
                {mode === 'buy' && (
                  <span className="item-price">{item.price} gp</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="store-footer">
        <div className="store-help">
          Press a letter to {mode === 'buy' ? 'buy' : 'sell'}, Tab to switch modes, ESC to exit
        </div>
      </div>
    </div>
  );
}
