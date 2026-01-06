import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';

/**
 * Modal types - inspired by Zangband TCL/TK window names
 * NSInventory, NSCharacterWindow, etc.
 */
export type ModalType =
  | 'inventory'
  | 'equipment'
  | 'character'
  | 'spellbook'
  | 'knowledge'
  | null;

/**
 * Inventory modal modes - like Zangband's INKEY_ITEM with different actions
 */
export type InventoryMode = 'browse' | 'wield' | 'drop' | 'quaff' | 'read' | 'eat';

interface ModalActions {
  openModal: (modal: ModalType) => void;
  openInventory: (mode: InventoryMode) => void;
  closeModal: () => void;
  toggleModal: (modal: ModalType) => void;
}

interface ModalContextValue {
  activeModal: ModalType;
  inventoryMode: InventoryMode;
  modalActions: ModalActions;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [inventoryMode, setInventoryMode] = useState<InventoryMode>('browse');

  // Stable actions object
  const modalActions = useMemo<ModalActions>(() => ({
    openModal: (modal: ModalType) => {
      setActiveModal(modal);
      if (modal === 'inventory') {
        setInventoryMode('browse');
      }
    },

    openInventory: (mode: InventoryMode) => {
      setActiveModal('inventory');
      setInventoryMode(mode);
    },

    closeModal: () => {
      setActiveModal(null);
      setInventoryMode('browse');
    },

    toggleModal: (modal: ModalType) => {
      setActiveModal(prev => {
        if (prev === modal) {
          setInventoryMode('browse');
          return null;
        }
        if (modal === 'inventory') {
          setInventoryMode('browse');
        }
        return modal;
      });
    },
  }), []);

  return (
    <ModalContext.Provider value={{ activeModal, inventoryMode, modalActions }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return ctx;
}
