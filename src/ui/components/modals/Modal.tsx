import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: number;
  footer?: ReactNode;
}

/**
 * Base modal component - inspired by Zangband TCL/TK window pattern
 *
 * Features:
 * - ESC to close (like bind $win <KeyPress-Escape>)
 * - Focus trap within modal
 * - Click outside to close
 * - Transient overlay (like wm transient $win)
 */
export function Modal({ title, children, onClose, width = 400, footer }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus the modal on mount
    modalRef.current?.focus();

    // Handle ESC key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div
        ref={modalRef}
        className="modal-window"
        style={{ width }}
        tabIndex={-1}
      >
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Item list for inventory/equipment modals
 * Supports a-z letter selection like TCL/TK inventory
 */
interface ItemListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, letter: string) => ReactNode;
  onSelect?: (item: T, index: number) => void;
  emptyMessage?: string;
}

export function ItemList<T>({ items, renderItem, onSelect, emptyMessage = 'Nothing here.' }: ItemListProps<T>) {
  useEffect(() => {
    if (!onSelect) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // a-z letter selection (like angband keypress $char)
      if (e.key.length === 1 && e.key >= 'a' && e.key <= 'z') {
        const index = e.key.charCodeAt(0) - 97; // 'a' = 0, 'b' = 1, etc.
        if (index < items.length) {
          e.preventDefault();
          e.stopPropagation();
          onSelect(items[index], index);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [items, onSelect]);

  if (items.length === 0) {
    return <div className="item-list-empty">{emptyMessage}</div>;
  }

  return (
    <div className="item-list">
      {items.map((item, index) => {
        const letter = String.fromCharCode(97 + index); // a, b, c...
        return (
          <div
            key={index}
            className="item-row"
            onClick={() => onSelect?.(item, index)}
          >
            {renderItem(item, index, letter)}
          </div>
        );
      })}
    </div>
  );
}
