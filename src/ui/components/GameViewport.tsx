import { useRef, useMemo } from 'react';
import { useROTDisplay } from '../hooks/useROTDisplay';
import { useGame } from '../context/GameContext';
import { Camera } from '@/core/systems/Camera';
import { FOVSystem } from '@/core/systems/FOV';
import { VIEW_RADIUS } from '@/core/constants';

// Map single-character color codes to hex colors
const COLOR_MAP: Record<string, string> = {
  d: '#666',    // Dark (dark gray, not black - needs to be visible)
  w: '#fff',    // White
  s: '#888',    // Slate
  o: '#f80',    // Orange
  r: '#f00',    // Red
  g: '#0f0',    // Green
  b: '#00f',    // Blue
  u: '#840',    // Umber
  D: '#444',    // Light dark (dark gray)
  W: '#fff',    // Light white
  v: '#f0f',    // Violet
  y: '#ff0',    // Yellow
  R: '#f88',    // Light red
  G: '#8f8',    // Light green
  B: '#88f',    // Light blue
  U: '#c84',    // Light umber
  p: '#f8f',    // Purple
  t: '#4ff',    // Teal
};

function parseColor(color: string): string {
  // Single character color codes
  if (color.length === 1) {
    return COLOR_MAP[color] ?? '#fff';
  }
  // Already a hex or CSS color
  if (color.startsWith('#') || color.startsWith('rgb')) {
    return color;
  }
  // Uppercase single letter
  if (color.length === 1 && /[A-Z]/.test(color)) {
    return COLOR_MAP[color] ?? '#fff';
  }
  return '#fff';
}

/**
 * Dim a hex color for unexplored/not visible areas
 */
function dimColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2) || hex.substring(0, 1).repeat(2), 16);
  const g = parseInt(hex.substring(2, 4) || hex.substring(1, 2).repeat(2), 16);
  const b = parseInt(hex.substring(4, 6) || hex.substring(2, 3).repeat(2), 16);

  // Dim to 30%
  const dimR = Math.floor(r * 0.3);
  const dimG = Math.floor(g * 0.3);
  const dimB = Math.floor(b * 0.3);

  return `#${dimR.toString(16).padStart(2, '0')}${dimG.toString(16).padStart(2, '0')}${dimB.toString(16).padStart(2, '0')}`;
}

export function GameViewport() {
  const { ref, display, gridWidth, gridHeight } = useROTDisplay({ fontSize: 16 });
  const { state } = useGame();
  const cameraRef = useRef<Camera | null>(null);
  const fovSystem = useMemo(() => new FOVSystem(), []);

  // Render when we have a display and game is initialized
  const { level, player } = state;
  if (display && gridWidth > 0 && gridHeight > 0 && player && level) {
    // Create or update camera
    if (!cameraRef.current) {
      cameraRef.current = new Camera(gridWidth, gridHeight, { mode: 'center' });
    } else {
      cameraRef.current.resize(gridWidth, gridHeight);
    }

    const camera = cameraRef.current;
    camera.follow(player.position, level.width, level.height);

    // Compute visible tiles and mark as explored
    const visibleTiles = fovSystem.computeAndMark(level, player.position, VIEW_RADIUS);

    display.clear();

    // Draw visible portion of level
    for (let screenY = 0; screenY < gridHeight; screenY++) {
      for (let screenX = 0; screenX < gridWidth; screenX++) {
        const world = camera.screenToWorld({ x: screenX, y: screenY });

        // Skip out of bounds
        if (world.x >= level.width || world.y >= level.height || world.x < 0 || world.y < 0) {
          continue;
        }

        const tile = level.getTile(world);
        if (!tile) continue;

        const posKey = `${world.x},${world.y}`;
        const isVisible = visibleTiles.has(posKey);
        const isExplored = tile.explored;

        // Handle unexplored tiles - but telepathy can still see monsters
        if (!isExplored) {
          // Check for telepathy monsters even on unexplored tiles
          // TODO: Replace with proper VisionSystem.canSeeMonster() integration
          if (player.hasTelepathy) {
            const monster = level.getMonsterAt(world);
            if (monster && !monster.isDead) {
              display.draw(screenX, screenY, monster.symbol, '#f0f', '#000');
              continue;
            }
          }
          display.draw(screenX, screenY, ' ', '#000', '#000');
          continue;
        }

        // Get terrain display
        const terrain = tile.terrain;
        let symbol = terrain.symbol;
        let fg = parseColor(terrain.color);
        const bg = '#000';

        if (isVisible) {
          // Full visibility - show traps, items, and monsters
          // Clear any remembered monster since we can now see the actual state
          tile.clearRememberedMonster();

          // Check for revealed traps at this position
          const trap = level.getTrapAt(world);
          if (trap && trap.isRevealed && trap.isActive) {
            symbol = trap.symbol;
            fg = parseColor(trap.color);
          }

          // Check for items at this position (items cover traps)
          const items = level.getItemsAt(world);
          if (items.length > 0) {
            const topItem = items[items.length - 1];
            symbol = topItem.symbol;
            fg = parseColor(topItem.color);
          }

          // Check for monsters at this position (monsters on top)
          const monster = level.getMonsterAt(world);
          if (monster && !monster.isDead) {
            symbol = monster.symbol;
            fg = parseColor(monster.color);
          }
        } else {
          // Explored but not visible - dim terrain only
          fg = dimColor(fg);

          // Check for remembered monster (from detection spell)
          const remembered = tile.rememberedMonster;
          if (remembered) {
            symbol = remembered.symbol;
            fg = parseColor(remembered.color);
          }

          // Telepathy shows monsters even when not visible
          // TODO: Replace with proper VisionSystem.canSeeMonster() integration
          // that handles EMPTY_MIND, WEIRD_MIND flags and infravision
          if (player.hasTelepathy) {
            const monster = level.getMonsterAt(world);
            if (monster && !monster.isDead) {
              symbol = monster.symbol;
              // Show telepathic monsters in a distinct color (purple/violet)
              fg = '#f0f';
            }
          }
        }

        display.draw(screenX, screenY, symbol, fg, bg);
      }
    }

    // Draw player at screen position (always on top)
    const playerScreen = camera.worldToScreen(player.position);
    display.draw(playerScreen.x, playerScreen.y, '@', '#fff', '#000');

    // Draw targeting cursor if active
    if (state.cursor) {
      const cursorScreen = camera.worldToScreen(state.cursor);
      // Only draw if on screen
      if (cursorScreen.x >= 0 && cursorScreen.x < gridWidth &&
          cursorScreen.y >= 0 && cursorScreen.y < gridHeight) {
        // Get what's under the cursor to preserve the character
        const tile = level.getTile(state.cursor);
        let symbol = tile?.terrain.symbol ?? ' ';

        // Check if player is at cursor
        if (state.cursor.x === player.position.x && state.cursor.y === player.position.y) {
          symbol = '@';
        } else {
          // Check for monster
          const monster = level.getMonsterAt(state.cursor);
          if (monster && !monster.isDead) {
            symbol = monster.symbol;
          } else {
            // Check for items
            const items = level.getItemsAt(state.cursor);
            if (items.length > 0) {
              symbol = items[items.length - 1].symbol;
            }
          }
        }

        // Draw with bright magenta background to highlight cursor position
        display.draw(cursorScreen.x, cursorScreen.y, symbol, '#fff', '#f0f');
      }
    }
  }

  return <div ref={ref} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}
