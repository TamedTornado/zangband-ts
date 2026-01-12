import { useRef, useMemo } from 'react';
import { useROTDisplay } from '../hooks/useROTDisplay';
import { useGame } from '../context/GameContext';
import { useTiles } from '../hooks/useTiles';
import { useSettingsStore } from '@/core/store/settingsStore';
import { Camera } from '@/core/systems/Camera';
import { FOVSystem } from '@/core/systems/FOV';
import { VIEW_RADIUS } from '@/core/constants';
import { isWildernessLevel } from '@/core/world/WildernessLevel';

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
  Y: '#ff0',    // Yellow (uppercase alias)
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
  const { useTiles: tilesEnabled } = useSettingsStore();
  const { tileManager, tileImage } = useTiles();

  const { ref, display, gridWidth, gridHeight, useTiles: actualTilesMode } = useROTDisplay({
    fontSize: 16,
    useTiles: tilesEnabled,
    tileManager,
    tileImage,
  });
  const { state } = useGame();
  const cameraRef = useRef<Camera | null>(null);
  const fovSystem = useMemo(() => new FOVSystem(), []);

  // Render when we have a display and game is initialized
  // Also check that tile mode state matches what we requested to avoid drawing ASCII to tile display
  const { level, player } = state;
  const tilesReady = !!(tileManager && tileImage);
  const expectedTileMode = tilesEnabled && tilesReady;
  const modeMatches = actualTilesMode === expectedTileMode;

  if (display && gridWidth > 0 && gridHeight > 0 && player && level && modeMatches) {
    // Create or update camera
    if (!cameraRef.current) {
      cameraRef.current = new Camera(gridWidth, gridHeight, { mode: 'center' });
    } else {
      cameraRef.current.resize(gridWidth, gridHeight);
    }

    const camera = cameraRef.current;

    // For wilderness, player.position is in world coordinates
    // Camera needs screen coordinates, but FOV needs world coordinates
    const isWilderness = isWildernessLevel(level);
    const playerScreenPos = isWilderness
      ? level.getPlayerScreenPosition() ?? player.position
      : player.position;

    camera.follow(playerScreenPos, level.width, level.height);

    // Compute visible tiles and mark as explored
    // Use world coordinates for FOV in wilderness (level methods expect world coords)
    const fovOrigin = isWilderness ? player.position : playerScreenPos;
    const visibleTiles = fovSystem.computeAndMark(level, fovOrigin, VIEW_RADIUS);

    display.clear();

    // Helper to draw a cell - handles both ASCII and tile modes
    // In tile mode, tileKeys is an array for layering (terrain on bottom, entities on top)
    const drawCell = (
      sx: number,
      sy: number,
      symbol: string,
      fg: string,
      bg: string,
      tileKeys?: string[]
    ) => {
      if (actualTilesMode && tileKeys && tileKeys.length > 0 && tileManager) {
        // In tile mode, draw layered tiles (rot.js supports string[] for layering)
        display.draw(sx, sy, tileKeys, null, null);
      } else {
        // ASCII mode
        display.draw(sx, sy, symbol, fg, bg);
      }
    };

    // Draw visible portion of level
    for (let screenY = 0; screenY < gridHeight; screenY++) {
      for (let screenX = 0; screenX < gridWidth; screenX++) {
        const cameraWorld = camera.screenToWorld({ x: screenX, y: screenY });

        // Skip out of bounds (camera bounds, not level bounds)
        if (cameraWorld.x >= level.width || cameraWorld.y >= level.height || cameraWorld.x < 0 || cameraWorld.y < 0) {
          continue;
        }

        // For wilderness, convert camera-relative coords to world coords
        // For dungeons, they're the same
        const levelPos = isWilderness
          ? level.screenToWilderness(cameraWorld.x, cameraWorld.y)
          : cameraWorld;

        const tile = level.getTile(levelPos);
        if (!tile) continue;

        // Use the same coords for visibility check as we used for getTile
        const posKey = `${levelPos.x},${levelPos.y}`;
        const isVisible = visibleTiles.has(posKey);
        const isExplored = tile.explored;

        // Handle unexplored tiles - but telepathy can still see monsters
        if (!isExplored) {
          // Check for telepathy monsters even on unexplored tiles
          if (player.hasTelepathy) {
            const monster = level.getMonsterAt(levelPos);
            if (monster && !monster.isDead) {
              const monsterTileKey = tileManager ? tileManager.getTileKey('monster', monster.def.index) : `m:${monster.def.index}`;
              // Layer: floor + monster (for telepathy on unexplored)
              drawCell(screenX, screenY, monster.symbol, '#f0f', '#000', ['f:1', monsterTileKey]);
              continue;
            }
          }
          drawCell(screenX, screenY, ' ', '#000', '#000', [' ']);
          continue;
        }

        // Get terrain display - this is always the base layer
        const terrain = tile.terrain;
        let symbol = terrain.symbol;
        let fg = parseColor(terrain.color);
        const bg = '#000';
        const terrainTileKey = tileManager ? tileManager.getTileKey('feature', terrain.index) : `f:${terrain.index}`;

        // Build tile layers: terrain is always base
        const tileLayers: string[] = [terrainTileKey];

        if (isVisible) {
          // Full visibility - show traps, items, and monsters
          // Clear any remembered monster since we can now see the actual state
          tile.clearRememberedMonster();

          // Check for revealed traps at this position
          const trap = level.getTrapAt(levelPos);
          if (trap && trap.isRevealed && trap.isActive) {
            symbol = trap.symbol;
            fg = parseColor(trap.color);
            // Traps don't have tile mappings yet, terrain remains as tile
          }

          // Check for items at this position (items layer on top of terrain)
          const items = level.getItemsAt(levelPos);
          if (items.length > 0) {
            const topItem = items[items.length - 1];
            symbol = topItem.symbol;
            fg = parseColor(topItem.color);
            if (topItem.generated?.baseItem.index !== undefined && tileManager) {
              tileLayers.push(tileManager.getTileKey('item', topItem.generated.baseItem.index));
            }
          }

          // Check for monsters at this position (monsters layer on top)
          const monster = level.getMonsterAt(levelPos);
          if (monster && !monster.isDead) {
            symbol = monster.symbol;
            fg = parseColor(monster.color);
            if (tileManager) {
              tileLayers.push(tileManager.getTileKey('monster', monster.def.index));
            }
          }
        } else {
          // Explored but not visible - dim terrain only
          fg = dimColor(fg);

          // Check for remembered monster (from detection spell)
          const remembered = tile.rememberedMonster;
          if (remembered) {
            symbol = remembered.symbol;
            fg = parseColor(remembered.color);
            if (remembered.defIndex !== undefined && tileManager) {
              tileLayers.push(tileManager.getTileKey('monster', remembered.defIndex));
            }
          }

          // Telepathy shows monsters even when not visible
          if (player.hasTelepathy) {
            const monster = level.getMonsterAt(levelPos);
            if (monster && !monster.isDead) {
              symbol = monster.symbol;
              fg = '#f0f';
              if (tileManager) {
                tileLayers.push(tileManager.getTileKey('monster', monster.def.index));
              }
            }
          }
        }

        drawCell(screenX, screenY, symbol, fg, bg, tileLayers);
      }
    }

    // Draw player at screen position (always on top, layered over terrain)
    const playerScreen = camera.worldToScreen(playerScreenPos);
    // For wilderness, player.position is world coords; for dungeons, same as playerScreenPos
    const playerWorldPos = isWilderness ? player.position : playerScreenPos;
    const playerTile = level.getTile(playerWorldPos);
    const playerTerrainKey = playerTile && tileManager
      ? tileManager.getTileKey('feature', playerTile.terrain.index)
      : 'f:1';
    drawCell(playerScreen.x, playerScreen.y, '@', '#fff', '#000', [playerTerrainKey, '@']);

    // Draw targeting cursor if active (ASCII mode only - tile mode can't show highlight)
    if (state.cursor && !actualTilesMode) {
      const cursorScreen = camera.worldToScreen(state.cursor);
      // Only draw if on screen
      if (cursorScreen.x >= 0 && cursorScreen.x < gridWidth &&
          cursorScreen.y >= 0 && cursorScreen.y < gridHeight) {
        // Get what's under the cursor to preserve the character
        const tile = level.getTile(state.cursor);
        let symbol = tile?.terrain.symbol ?? ' ';

        // Check if player is at cursor (use screen coordinates)
        if (state.cursor.x === playerScreenPos.x && state.cursor.y === playerScreenPos.y) {
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

        // Draw cursor with magenta background for visibility
        display.draw(cursorScreen.x, cursorScreen.y, symbol, '#fff', '#f0f');
      }
    }
    // TODO: Add cursor overlay support for tile mode (requires canvas layering)
  }

  return <div ref={ref} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
}
