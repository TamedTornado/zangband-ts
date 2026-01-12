import { useRef, useCallback, useSyncExternalStore, useEffect } from 'react';
import useResizeObserver from 'use-resize-observer';
import * as ROT from 'rot-js';
import type { TileManager } from '@/core/systems/TileManager';

interface UseROTDisplayOptions {
  fontSize?: number;
  fontFamily?: string;
  useTiles?: boolean;
  tileManager?: TileManager | null;
  tileImage?: HTMLImageElement | null;
}

interface ROTDisplayState {
  display: ROT.Display | null;
  gridWidth: number;
  gridHeight: number;
  useTiles: boolean;
}

export function useROTDisplay(options: UseROTDisplayOptions = {}) {
  const {
    fontSize = 16,
    fontFamily = 'monospace',
    useTiles = false,
    tileManager = null,
    tileImage = null,
  } = options;

  // Compute cell size for ASCII mode
  const asciiCellSize = useRef<{ width: number; height: number } | null>(null);
  if (!asciiCellSize.current) {
    const test = new ROT.Display({ width: 1, height: 1, fontSize, fontFamily });
    const canvas = test.getContainer() as HTMLCanvasElement;
    asciiCellSize.current = { width: canvas.width, height: canvas.height };
  }

  // Get current cell size based on mode
  const getCellSize = useCallback(() => {
    if (useTiles && tileManager) {
      const size = tileManager.getTileSize();
      return { width: size.width, height: size.height };
    }
    return asciiCellSize.current!;
  }, [useTiles, tileManager]);

  // Container ref
  const containerRef = useRef<HTMLDivElement>(null!);

  // Track current state
  const stateRef = useRef<ROTDisplayState>({
    display: null,
    gridWidth: 0,
    gridHeight: 0,
    useTiles: false,
  });
  const listenersRef = useRef(new Set<() => void>());

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const getSnapshot = useCallback(() => stateRef.current, []);

  const state = useSyncExternalStore(subscribe, getSnapshot);

  // Create display function
  const createDisplay = useCallback(
    (gridWidth: number, gridHeight: number): ROT.Display => {
      if (useTiles && tileManager && tileImage) {
        const tileMap = tileManager.buildRotTileMap();
        const { width: tileWidth, height: tileHeight } = tileManager.getTileSize();
        return new ROT.Display({
          width: gridWidth,
          height: gridHeight,
          layout: 'tile',
          tileWidth,
          tileHeight,
          tileSet: tileImage,
          tileMap: tileMap as Record<string, [number, number]>,
        });
      }
      return new ROT.Display({ width: gridWidth, height: gridHeight, fontSize, fontFamily });
    },
    [useTiles, tileManager, tileImage, fontSize, fontFamily]
  );

  // Rebuild display when mode changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // If mode hasn't changed, nothing to do
    if (stateRef.current.useTiles === useTiles && stateRef.current.display) {
      return;
    }

    // Need tile image for tile mode
    if (useTiles && (!tileManager || !tileImage)) {
      return;
    }

    const cellSize = getCellSize();
    const rect = container.getBoundingClientRect();
    const gridWidth = Math.floor(rect.width / cellSize.width);
    const gridHeight = Math.floor(rect.height / cellSize.height);

    if (gridWidth <= 0 || gridHeight <= 0) return;

    // Remove old display
    stateRef.current.display?.getContainer()?.remove();

    // Create new display
    const display = createDisplay(gridWidth, gridHeight);
    container.appendChild(display.getContainer()!);

    stateRef.current = { display, gridWidth, gridHeight, useTiles };
    listenersRef.current.forEach((l) => l());
  }, [useTiles, tileManager, tileImage, createDisplay, getCellSize]);

  // Handle resize
  useResizeObserver<HTMLDivElement>({
    ref: containerRef,
    onResize: ({ width = 0, height = 0 }) => {
      const container = containerRef.current;
      if (!container) return;

      // Need tile image for tile mode
      if (useTiles && (!tileManager || !tileImage)) return;

      const cellSize = getCellSize();
      const gridWidth = Math.floor(width / cellSize.width);
      const gridHeight = Math.floor(height / cellSize.height);

      if (gridWidth <= 0 || gridHeight <= 0) return;
      if (
        gridWidth === stateRef.current.gridWidth &&
        gridHeight === stateRef.current.gridHeight &&
        useTiles === stateRef.current.useTiles
      )
        return;

      // Remove old display
      stateRef.current.display?.getContainer()?.remove();

      // Create new display
      const display = createDisplay(gridWidth, gridHeight);
      container.appendChild(display.getContainer()!);

      stateRef.current = { display, gridWidth, gridHeight, useTiles };
      listenersRef.current.forEach((l) => l());
    },
  });

  return { ref: containerRef, ...state };
}
