/**
 * Energy System - Zangband energy mechanics
 *
 * Speed 110 is "normal". Energy gain per tick is looked up from
 * the extract_energy table, which provides non-linear scaling:
 * - Speed 100 (slowed): 9 energy/tick
 * - Speed 110 (normal): 10 energy/tick
 * - Speed 120 (hasted): 20 energy/tick (2x normal!)
 *
 * Actions cost energy (usually 100). When energy >= 100, actor can act.
 */

/**
 * Extract energy table from Zangband (tables.c line 1663)
 * Indexed by speed (0-199), returns energy gain per tick.
 *
 * Key values:
 * - Index 100: 5 (slowed by 10 = half speed)
 * - Index 110: 10 (normal)
 * - Index 120: 20 (hasted by 10 = 2x speed!)
 */
const EXTRACT_ENERGY: readonly number[] = [
  /* 0-9   Slow */     1,  1,  1,  1,  1,  1,  1,  1,  1,  1,
  /* 10-19 Slow */     1,  1,  1,  1,  1,  1,  1,  1,  1,  1,
  /* 20-29 Slow */     1,  1,  1,  1,  1,  1,  1,  1,  1,  1,
  /* 30-39 Slow */     1,  1,  1,  1,  1,  1,  1,  1,  1,  1,
  /* 40-49 Slow */     1,  1,  1,  1,  1,  1,  1,  1,  1,  1,
  /* 50-59 Slow */     1,  1,  1,  1,  1,  1,  1,  1,  1,  1,
  /* 60-69 S-50 */     1,  1,  1,  1,  1,  1,  1,  1,  1,  1,
  /* 70-79 S-40 */     2,  2,  2,  2,  2,  2,  2,  2,  2,  2,
  /* 80-89 S-30 */     2,  2,  2,  2,  2,  2,  2,  3,  3,  3,
  /* 90-99 S-20 */     3,  3,  3,  3,  3,  4,  4,  4,  4,  4,
  /* 100-109 S-10 */   5,  5,  5,  5,  6,  6,  7,  7,  8,  9,
  /* 110-119 Norm */  10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  /* 120-129 F+10 */  20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
  /* 130-139 F+20 */  30, 31, 32, 33, 34, 35, 36, 36, 37, 37,
  /* 140-149 F+30 */  38, 38, 39, 39, 40, 40, 40, 41, 41, 41,
  /* 150-159 F+40 */  42, 42, 42, 43, 43, 43, 44, 44, 44, 44,
  /* 160-169 F+50 */  45, 45, 45, 45, 45, 46, 46, 46, 46, 46,
  /* 170-179 F+60 */  47, 47, 47, 47, 47, 48, 48, 48, 48, 48,
  /* 180-189 F+70 */  49, 49, 49, 49, 49, 49, 49, 49, 49, 49,
  /* 190-199 Fast */  49, 49, 49, 49, 49, 49, 49, 49, 49, 49,
];

/**
 * Get energy gain per tick for a given speed.
 * @param speed The actor's effective speed (usually around 110)
 * @returns Energy gained per game tick
 */
export function extractEnergy(speed: number): number {
  // Clamp speed to valid range
  if (speed < 0) {
    return EXTRACT_ENERGY[0];
  }
  if (speed >= 200) {
    return EXTRACT_ENERGY[199];
  }
  return EXTRACT_ENERGY[speed];
}

/**
 * Calculate energy cost for using a device (wand/rod/staff).
 * Higher device skill = lower energy cost, minimum 75.
 *
 * Formula from Zangband cmd6.c:
 * MIN(75, 200 - 5 * skill / 8)
 *
 * @param deviceSkill The actor's device skill value
 * @returns Energy cost for using the device
 */
export function calculateDeviceEnergyCost(deviceSkill: number): number {
  const cost = 200 - Math.floor(5 * deviceSkill / 8);
  return Math.max(75, cost);
}
