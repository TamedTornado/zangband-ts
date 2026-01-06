import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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

interface ModalContextValue {
  activeModal: ModalType;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
  toggleModal: (modal: ModalType) => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const openModal = useCallback((modal: ModalType) => {
    setActiveModal(modal);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const toggleModal = useCallback((modal: ModalType) => {
    setActiveModal(prev => prev === modal ? null : modal);
  }, []);

  return (
    <ModalContext.Provider value={{ activeModal, openModal, closeModal, toggleModal }}>
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
