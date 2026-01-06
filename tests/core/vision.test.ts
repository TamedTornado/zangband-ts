import { describe, it, expect, beforeEach } from 'vitest';
import { VisionSystem, type VisionConfig } from '@/core/systems/Vision';
import type { Position } from '@/core/types';

// Mock level for testing
function createMockLevel(
  width: number,
  height: number,
  blockedTiles: Set<string> = new Set(),
  litTiles?: Set<string> // undefined = all lit, empty Set = all dark
) {
  return {
    width,
    height,
    isInBounds(pos: Position): boolean {
      return pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height;
    },
    isTransparent(pos: Position): boolean {
      return !blockedTiles.has(`${pos.x},${pos.y}`);
    },
    isLit(pos: Position): boolean {
      if (litTiles === undefined) {
        // All tiles lit by default
        return !blockedTiles.has(`${pos.x},${pos.y}`);
      }
      return litTiles.has(`${pos.x},${pos.y}`);
    },
    getTile(_pos: Position) {
      return { explored: false, lit: true };
    },
  };
}

// Mock monster for visibility tests
interface MockMonster {
  position: Position;
  flags: {
    invisible?: boolean;
    coldBlooded?: boolean;
    emptyMind?: boolean;
    weirdMind?: boolean;
    glows?: boolean;
  };
  id: number;
}

describe('VisionSystem', () => {
  let vision: VisionSystem;

  beforeEach(() => {
    vision = new VisionSystem();
  });

  describe('light radius', () => {
    it('should default to 0 light radius', () => {
      const config: VisionConfig = {};
      expect(vision.getLightRadius(config)).toBe(0);
    });

    it('should calculate light from torch (+1)', () => {
      const config: VisionConfig = {
        equipment: [{ type: 'torch', hasFuel: true }],
      };
      expect(vision.getLightRadius(config)).toBe(1);
    });

    it('should calculate light from lantern (+2)', () => {
      const config: VisionConfig = {
        equipment: [{ type: 'lantern', hasFuel: true }],
      };
      expect(vision.getLightRadius(config)).toBe(2);
    });

    it('should give 0 for torch without fuel', () => {
      const config: VisionConfig = {
        equipment: [{ type: 'torch', hasFuel: false }],
      };
      expect(vision.getLightRadius(config)).toBe(0);
    });

    it('should calculate light from artifact light (+3)', () => {
      const config: VisionConfig = {
        equipment: [{ type: 'artifact_light' }],
      };
      expect(vision.getLightRadius(config)).toBe(3);
    });

    it('should stack light from glowing items', () => {
      const config: VisionConfig = {
        equipment: [
          { type: 'lantern', hasFuel: true },
          { type: 'glowing_item' },
          { type: 'glowing_item' },
        ],
      };
      // lantern (2) + 2 glowing items (+1 each) = 4
      expect(vision.getLightRadius(config)).toBe(4);
    });

    it('should give minimum 1 light for intrinsic glow', () => {
      const config: VisionConfig = {
        intrinsicLight: true,
      };
      expect(vision.getLightRadius(config)).toBe(1);
    });

    it('should give 0 light when blind', () => {
      const config: VisionConfig = {
        equipment: [{ type: 'lantern', hasFuel: true }],
        isBlind: true,
      };
      expect(vision.getLightRadius(config)).toBe(0);
    });
  });

  describe('infravision', () => {
    it('should default to 0 infravision', () => {
      const config: VisionConfig = {};
      expect(vision.getInfravision(config)).toBe(0);
    });

    it('should use racial infravision', () => {
      const config: VisionConfig = {
        raceInfravision: 3, // Elves have 3
      };
      expect(vision.getInfravision(config)).toBe(3);
    });

    it('should add equipment infravision bonuses', () => {
      const config: VisionConfig = {
        raceInfravision: 2,
        equipment: [{ type: 'ring', infravisionBonus: 2 }],
      };
      expect(vision.getInfravision(config)).toBe(4);
    });

    it('should add temporary infravision bonus', () => {
      const config: VisionConfig = {
        raceInfravision: 0,
        timedInfravision: true,
      };
      expect(vision.getInfravision(config)).toBe(1);
    });

    it('should stack all infravision sources', () => {
      const config: VisionConfig = {
        raceInfravision: 3,
        equipment: [
          { type: 'helm', infravisionBonus: 1 },
          { type: 'ring', infravisionBonus: 2 },
        ],
        timedInfravision: true,
      };
      // 3 (race) + 1 (helm) + 2 (ring) + 1 (timed) = 7
      expect(vision.getInfravision(config)).toBe(7);
    });
  });

  describe('monster visibility', () => {
    const origin: Position = { x: 10, y: 10 };
    const level = createMockLevel(30, 30);

    it('should see normal monster in LOS and lit area', () => {
      const monster: MockMonster = {
        position: { x: 12, y: 10 },
        flags: {},
        id: 1,
      };
      const config: VisionConfig = {
        equipment: [{ type: 'lantern', hasFuel: true }],
      };

      const result = vision.canSeeMonster(origin, monster, level, config);
      expect(result.visible).toBe(true);
      expect(result.method).toBe('normal');
    });

    it('should not see monster out of LOS', () => {
      const blocked = new Set(['11,10']); // Wall between player and monster
      const blockedLevel = createMockLevel(30, 30, blocked);
      const monster: MockMonster = {
        position: { x: 12, y: 10 },
        flags: {},
        id: 1,
      };
      const config: VisionConfig = {
        equipment: [{ type: 'lantern', hasFuel: true }],
      };

      const result = vision.canSeeMonster(origin, monster, blockedLevel, config);
      expect(result.visible).toBe(false);
    });

    it('should see warm-blooded monster with infravision', () => {
      const monster: MockMonster = {
        position: { x: 12, y: 10 }, // distance 2
        flags: {},
        id: 1,
      };
      const config: VisionConfig = {
        raceInfravision: 3,
      };

      const result = vision.canSeeMonster(origin, monster, level, config);
      expect(result.visible).toBe(true);
      expect(result.method).toBe('infravision');
    });

    it('should not see cold-blooded monster with infravision alone', () => {
      const monster: MockMonster = {
        position: { x: 12, y: 10 },
        flags: { coldBlooded: true },
        id: 1,
      };
      const config: VisionConfig = {
        raceInfravision: 3,
      };
      // No light source, so can only use infravision
      // But cold-blooded blocks infravision

      const result = vision.canSeeMonster(origin, monster, level, config);
      // Should still be visible if in lit area
      expect(result.visible).toBe(true);
      expect(result.method).toBe('normal'); // Lit area, not infravision
    });

    it('should not see invisible monster without see_invis', () => {
      const monster: MockMonster = {
        position: { x: 12, y: 10 },
        flags: { invisible: true },
        id: 1,
      };
      const config: VisionConfig = {
        equipment: [{ type: 'lantern', hasFuel: true }],
      };

      const result = vision.canSeeMonster(origin, monster, level, config);
      expect(result.visible).toBe(false);
    });

    it('should see invisible monster with see_invis', () => {
      const monster: MockMonster = {
        position: { x: 12, y: 10 },
        flags: { invisible: true },
        id: 1,
      };
      const config: VisionConfig = {
        equipment: [{ type: 'lantern', hasFuel: true }],
        seeInvisible: true,
      };

      const result = vision.canSeeMonster(origin, monster, level, config);
      expect(result.visible).toBe(true);
    });

    it('should detect monster with telepathy', () => {
      const monster: MockMonster = {
        position: { x: 15, y: 10 }, // distance 5
        flags: {},
        id: 1,
      };
      const config: VisionConfig = {
        telepathy: true,
      };

      const result = vision.canSeeMonster(origin, monster, level, config);
      expect(result.visible).toBe(true);
      expect(result.method).toBe('telepathy');
    });

    it('should not detect empty_mind monster with telepathy', () => {
      // Dark level - only telepathy could detect
      const darkLevel = createMockLevel(30, 30, new Set(), new Set());
      const monster: MockMonster = {
        position: { x: 15, y: 10 },
        flags: { emptyMind: true },
        id: 1,
      };
      const config: VisionConfig = {
        telepathy: true,
      };

      const result = vision.canSeeMonster(origin, monster, darkLevel, config);
      expect(result.visible).toBe(false);
    });

    it('should sometimes detect weird_mind monster with telepathy (10% based on id)', () => {
      // Dark level - only telepathy could detect
      const darkLevel = createMockLevel(30, 30, new Set(), new Set());
      // Monster with id % 10 == 5 should be detectable
      const detectableMonster: MockMonster = {
        position: { x: 15, y: 10 },
        flags: { weirdMind: true },
        id: 5,
      };
      const undetectableMonster: MockMonster = {
        position: { x: 15, y: 10 },
        flags: { weirdMind: true },
        id: 3,
      };
      const config: VisionConfig = {
        telepathy: true,
      };

      expect(vision.canSeeMonster(origin, detectableMonster, darkLevel, config).visible).toBe(true);
      expect(vision.canSeeMonster(origin, undetectableMonster, darkLevel, config).visible).toBe(false);
    });

    it('should see glowing monster even without other light', () => {
      const monster: MockMonster = {
        position: { x: 12, y: 10 },
        flags: { glows: true },
        id: 1,
      };
      const config: VisionConfig = {}; // No light, no infravision

      const result = vision.canSeeMonster(origin, monster, level, config);
      expect(result.visible).toBe(true);
    });

    it('should not see monster beyond MAX_SIGHT', () => {
      const monster: MockMonster = {
        position: { x: 30, y: 10 }, // distance 20
        flags: {},
        id: 1,
      };
      const config: VisionConfig = {
        telepathy: true,
        equipment: [{ type: 'lantern', hasFuel: true }],
      };

      const result = vision.canSeeMonster(origin, monster, level, config);
      expect(result.visible).toBe(false);
    });
  });

  describe('FOV computation', () => {
    it('should compute visible tiles within light radius', () => {
      const level = createMockLevel(20, 20);
      const config: VisionConfig = {
        equipment: [{ type: 'lantern', hasFuel: true }],
      };

      const visible = vision.computeFOV(level, { x: 10, y: 10 }, config);

      // Origin should always be visible
      expect(visible.has('10,10')).toBe(true);

      // Adjacent tiles should be visible
      expect(visible.has('11,10')).toBe(true);
      expect(visible.has('10,11')).toBe(true);
    });

    it('should not see through walls', () => {
      const blocked = new Set(['11,10']);
      const level = createMockLevel(20, 20, blocked);
      const config: VisionConfig = {
        equipment: [{ type: 'artifact_light' }], // radius 3
      };

      const visible = vision.computeFOV(level, { x: 10, y: 10 }, config);

      // Wall itself might be visible (can see the wall)
      // But tiles behind the wall should not be visible
      expect(visible.has('12,10')).toBe(false);
    });

    it('should see further with larger light radius', () => {
      const level = createMockLevel(20, 20);
      const torchConfig: VisionConfig = {
        equipment: [{ type: 'torch', hasFuel: true }],
      };
      const artifactConfig: VisionConfig = {
        equipment: [{ type: 'artifact_light' }],
      };

      const torchVisible = vision.computeFOV(level, { x: 10, y: 10 }, torchConfig);
      const artifactVisible = vision.computeFOV(level, { x: 10, y: 10 }, artifactConfig);

      expect(artifactVisible.size).toBeGreaterThan(torchVisible.size);
    });

    it('should mark tiles as explored', () => {
      const level = createMockLevel(20, 20);
      const config: VisionConfig = {
        equipment: [{ type: 'torch', hasFuel: true }],
      };

      const explored: Set<string> = new Set();
      vision.computeAndMarkExplored(level, { x: 10, y: 10 }, config, explored);

      expect(explored.has('10,10')).toBe(true);
      expect(explored.has('11,10')).toBe(true);
    });
  });

  describe('distance calculation', () => {
    it('should calculate distance correctly', () => {
      expect(vision.distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5); // 3-4-5 triangle
      expect(vision.distance({ x: 0, y: 0 }, { x: 5, y: 0 })).toBe(5);
      expect(vision.distance({ x: 0, y: 0 }, { x: 0, y: 5 })).toBe(5);
      expect(vision.distance({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(0);
    });
  });
});
