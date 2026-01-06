import { useRef } from 'react';
import { useROTDisplay } from '../hooks/useROTDisplay';
import { useGame } from '../context/GameContext';
import { Camera } from '@/core/systems/Camera';

export function GameViewport() {
  const { ref, display, gridWidth, gridHeight } = useROTDisplay({ fontSize: 16 });
  const { state } = useGame();
  const cameraRef = useRef<Camera | null>(null);

  // Render when we have a display
  if (display && gridWidth > 0 && gridHeight > 0) {
    const { level, player } = state;

    // Create or update camera
    if (!cameraRef.current) {
      cameraRef.current = new Camera(gridWidth, gridHeight, { mode: 'center' });
    } else {
      cameraRef.current.resize(gridWidth, gridHeight);
    }

    const camera = cameraRef.current;
    camera.follow(player.position, level.width, level.height);

    display.clear();

    // Draw visible portion of level
    for (let screenY = 0; screenY < gridHeight; screenY++) {
      for (let screenX = 0; screenX < gridWidth; screenX++) {
        const world = camera.screenToWorld({ x: screenX, y: screenY });

        if (world.x < level.width && world.y < level.height) {
          if (level.isWalkable(world)) {
            display.draw(screenX, screenY, '.', '#444', '#000');
          } else {
            display.draw(screenX, screenY, '#', '#888', '#000');
          }
        }
      }
    }

    // Draw player at screen position
    const playerScreen = camera.worldToScreen(player.position);
    display.draw(playerScreen.x, playerScreen.y, '@', '#fff', '#000');
  }

  return <div ref={ref} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}
