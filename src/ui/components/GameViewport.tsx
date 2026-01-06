import { useEffect, useRef } from 'react';
import * as ROT from 'rot-js';
import { useGame } from '../context/GameContext';

const WIDTH = 80;
const HEIGHT = 25;

export function GameViewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<ROT.Display | null>(null);
  const { state } = useGame();

  // Initialize display once
  useEffect(() => {
    if (!containerRef.current || displayRef.current) return;

    const display = new ROT.Display({
      width: WIDTH,
      height: HEIGHT,
      fontSize: 16,
      fontFamily: 'monospace',
    });
    displayRef.current = display;

    const canvas = display.getContainer();
    if (canvas) {
      containerRef.current.appendChild(canvas);
    }

    return () => {
      if (canvas && containerRef.current?.contains(canvas)) {
        containerRef.current.removeChild(canvas);
      }
      displayRef.current = null;
    };
  }, []);

  // Render on state change
  useEffect(() => {
    const display = displayRef.current;
    if (!display) return;

    display.clear();

    const { level, player } = state;

    // Draw floor and walls
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        if (level.isWalkable({ x, y })) {
          display.draw(x, y, '.', '#444', '#000');
        } else {
          display.draw(x, y, '#', '#888', '#000');
        }
      }
    }

    // Draw player
    const pos = player.position;
    display.draw(pos.x, pos.y, '@', '#fff', '#000');
  }, [state]);

  return <div ref={containerRef} />;
}
