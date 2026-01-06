import { useRef, useCallback, useSyncExternalStore } from 'react';
import useResizeObserver from 'use-resize-observer';
import * as ROT from 'rot-js';

interface UseROTDisplayOptions {
  fontSize?: number;
  fontFamily?: string;
}

interface ROTDisplayState {
  display: ROT.Display | null;
  gridWidth: number;
  gridHeight: number;
}

export function useROTDisplay(options: UseROTDisplayOptions = {}) {
  const { fontSize = 16, fontFamily = 'monospace' } = options;

  // Compute cell size once
  const cellSize = useRef<{ width: number; height: number } | null>(null);
  if (!cellSize.current) {
    const test = new ROT.Display({ width: 1, height: 1, fontSize, fontFamily });
    const canvas = test.getContainer() as HTMLCanvasElement;
    cellSize.current = { width: canvas.width, height: canvas.height };
  }

  // Container ref
  const containerRef = useRef<HTMLDivElement>(null!);

  // Track current state
  const stateRef = useRef<ROTDisplayState>({ display: null, gridWidth: 0, gridHeight: 0 });
  const listenersRef = useRef(new Set<() => void>());

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const getSnapshot = useCallback(() => stateRef.current, []);

  const state = useSyncExternalStore(subscribe, getSnapshot);

  // Handle resize
  useResizeObserver<HTMLDivElement>({
    ref: containerRef,
    onResize: ({ width = 0, height = 0 }) => {
      const container = containerRef.current;
      if (!container || !cellSize.current) return;

      const gridWidth = Math.floor(width / cellSize.current.width);
      const gridHeight = Math.floor(height / cellSize.current.height);

      if (gridWidth <= 0 || gridHeight <= 0) return;
      if (gridWidth === stateRef.current.gridWidth && gridHeight === stateRef.current.gridHeight) return;

      // Remove old display
      stateRef.current.display?.getContainer()?.remove();

      // Create new display
      const display = new ROT.Display({ width: gridWidth, height: gridHeight, fontSize, fontFamily });
      container.appendChild(display.getContainer()!);

      stateRef.current = { display, gridWidth, gridHeight };
      listenersRef.current.forEach(l => l());
    },
  });

  return { ref: containerRef, ...state };
}
