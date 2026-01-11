/**
 * WildernessSystem - Handles wilderness navigation logic
 *
 * Manages movement between wilderness blocks, place entry/exit,
 * and terrain information.
 */

import { getGameStore } from '@/core/store/gameStore';
import { Direction, movePosition } from '@/core/types';
import type { WildPlace } from '@/core/data/WildernessTypes';

export interface WildernessMessage {
  text: string;
  type: 'normal' | 'info' | 'danger';
}

export interface MoveResult {
  success: boolean;
  messages: WildernessMessage[];
  enteredPlace?: WildPlace;
}

export class WildernessSystem {
  /**
   * Move to an adjacent wilderness block.
   */
  move(dir: Direction): MoveResult {
    const store = getGameStore();
    const wildernessMap = store.wildernessMap;

    if (!wildernessMap) {
      return {
        success: false,
        messages: [{ text: 'No wilderness map available.', type: 'danger' }],
      };
    }

    const currentPos = { x: store.wildernessX, y: store.wildernessY };
    const newPos = movePosition(currentPos, dir);

    // Check bounds
    const block = wildernessMap.getBlock(newPos.x, newPos.y);
    if (!block) {
      return {
        success: false,
        messages: [{ text: 'You cannot go that way.', type: 'info' }],
      };
    }

    // Move to new block
    store.setWildernessPosition(newPos.x, newPos.y);

    const messages: WildernessMessage[] = [];

    // Check if there's a place at this location
    const place = wildernessMap.places.find((p) => p.x === newPos.x && p.y === newPos.y);

    if (place) {
      messages.push({ text: `You see ${place.name}.`, type: 'info' });

      if (place.type === 'town') {
        return {
          success: true,
          messages,
          enteredPlace: place,
        };
      } else if (place.type === 'dungeon') {
        messages.push({ text: `Press '>' to enter ${place.name}.`, type: 'info' });
      }
    } else {
      const terrainDesc = this.getTerrainDescription(block.wild);
      messages.push({ text: `You travel through ${terrainDesc}.`, type: 'info' });
    }

    return { success: true, messages };
  }

  /**
   * Get the place at the current wilderness position.
   */
  getPlaceAtCurrentPosition(): WildPlace | undefined {
    const store = getGameStore();
    const wildernessMap = store.wildernessMap;

    if (!wildernessMap) return undefined;

    return wildernessMap.places.find(
      (p) => p.x === store.wildernessX && p.y === store.wildernessY
    );
  }

  /**
   * Get information about the current wilderness location.
   */
  getLocationInfo(): WildernessMessage[] {
    const store = getGameStore();
    const wildernessMap = store.wildernessMap;
    const messages: WildernessMessage[] = [];

    if (!wildernessMap) return messages;

    const block = wildernessMap.getBlock(store.wildernessX, store.wildernessY);
    if (block) {
      const terrainDesc = this.getTerrainDescription(block.wild);
      messages.push({
        text: `Wilderness (${store.wildernessX}, ${store.wildernessY}): ${terrainDesc}`,
        type: 'info',
      });

      if (block.place > 0) {
        const place = this.getPlaceAtCurrentPosition();
        if (place) {
          messages.push({ text: `Location: ${place.name} (${place.type})`, type: 'info' });
        }
      }
    }

    return messages;
  }

  /**
   * Get a description for a terrain type.
   */
  private getTerrainDescription(wildType: number): string {
    if (wildType <= 20) return 'mudflats';
    if (wildType <= 50) return 'grasslands';
    if (wildType <= 80) return 'forest';
    if (wildType <= 120) return 'hills';
    if (wildType <= 160) return 'mountains';
    if (wildType <= 200) return 'desert';
    return 'wasteland';
  }
}
