/**
 * Settings Store - Persistent user preferences
 *
 * Handles settings that should persist across sessions, including:
 * - Tile/ASCII rendering mode
 * - Selected tileset
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  useTiles: boolean;
  tilesetKey: string;
}

interface SettingsActions {
  toggleTiles: () => void;
  setUseTiles: (useTiles: boolean) => void;
  setTileset: (tilesetKey: string) => void;
}

type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Default state
      useTiles: false,
      tilesetKey: 'adam-bolt-16x16',

      // Actions
      toggleTiles: () => set((state) => ({ useTiles: !state.useTiles })),
      setUseTiles: (useTiles) => set({ useTiles }),
      setTileset: (tilesetKey) => set({ tilesetKey }),
    }),
    {
      name: 'zangband-settings',
    }
  )
);
