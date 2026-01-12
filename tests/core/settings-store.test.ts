import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSettingsStore } from '@/core/store/settingsStore';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage });

describe('SettingsStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    mockLocalStorage.clear();
    useSettingsStore.setState({
      useTiles: false,
      tilesetKey: 'adam-bolt-16x16',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('defaults to ASCII mode (useTiles: false)', () => {
      const state = useSettingsStore.getState();
      expect(state.useTiles).toBe(false);
    });

    it('defaults to adam-bolt-16x16 tileset', () => {
      const state = useSettingsStore.getState();
      expect(state.tilesetKey).toBe('adam-bolt-16x16');
    });
  });

  describe('toggleTiles', () => {
    it('toggles useTiles from false to true', () => {
      const { toggleTiles } = useSettingsStore.getState();
      expect(useSettingsStore.getState().useTiles).toBe(false);

      toggleTiles();

      expect(useSettingsStore.getState().useTiles).toBe(true);
    });

    it('toggles useTiles from true to false', () => {
      useSettingsStore.setState({ useTiles: true });
      const { toggleTiles } = useSettingsStore.getState();

      toggleTiles();

      expect(useSettingsStore.getState().useTiles).toBe(false);
    });

    it('can toggle multiple times', () => {
      const { toggleTiles } = useSettingsStore.getState();

      toggleTiles(); // false -> true
      expect(useSettingsStore.getState().useTiles).toBe(true);

      toggleTiles(); // true -> false
      expect(useSettingsStore.getState().useTiles).toBe(false);

      toggleTiles(); // false -> true
      expect(useSettingsStore.getState().useTiles).toBe(true);
    });
  });

  describe('setTileset', () => {
    it('updates tilesetKey', () => {
      const { setTileset } = useSettingsStore.getState();

      setTileset('adam-bolt-32x32');

      expect(useSettingsStore.getState().tilesetKey).toBe('adam-bolt-32x32');
    });

    it('allows any tileset key', () => {
      const { setTileset } = useSettingsStore.getState();

      setTileset('custom-tileset');

      expect(useSettingsStore.getState().tilesetKey).toBe('custom-tileset');
    });
  });

  describe('setUseTiles', () => {
    it('sets useTiles to true', () => {
      const { setUseTiles } = useSettingsStore.getState();

      setUseTiles(true);

      expect(useSettingsStore.getState().useTiles).toBe(true);
    });

    it('sets useTiles to false', () => {
      useSettingsStore.setState({ useTiles: true });
      const { setUseTiles } = useSettingsStore.getState();

      setUseTiles(false);

      expect(useSettingsStore.getState().useTiles).toBe(false);
    });
  });
});
