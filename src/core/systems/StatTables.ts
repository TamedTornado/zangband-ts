/**
 * Stat Adjustment Tables from Zangband
 *
 * Stats in Zangband use a special notation where 18 is a threshold:
 * - Stats 3-17 are indexed directly (index 0-14)
 * - Stat 18/xx adds xx/10 to index 15 (so 18/00 = index 15, 18/10 = index 16, etc.)
 *
 * Our simplified system uses linear stats 3-40+, which we convert to indices.
 */

/**
 * Convert a stat value to a table index.
 * Stats 3-17 map to indices 0-14.
 * Stats 18+ map to indices 15+ (each +10 stat = +1 index, capped at index 37).
 */
export function statToIndex(stat: number): number {
  if (stat <= 3) return 0;
  if (stat <= 17) return stat - 3;
  // Stats 18+: index 15 for 18, +1 per 10 additional points
  // Stat 18 = index 15, stat 28 = index 16, stat 38 = index 17, etc.
  // Actually in Zangband, 18/10 = index 16, so each +1 above 18 = +0.1 index
  // We'll simplify: stat 18 = index 15, stat 19 = index 16, etc., capping at 37
  const idx = 15 + Math.floor((stat - 18));
  return Math.min(idx, 37);
}

/**
 * INT adjustment for magic device skill.
 * Index: 0-37, corresponding to stats 3 through 18/220+
 */
const ADJ_INT_DEV: readonly number[] = [
  0,   // 3
  0,   // 4
  0,   // 5
  0,   // 6
  0,   // 7
  1,   // 8
  1,   // 9
  1,   // 10
  1,   // 11
  1,   // 12
  1,   // 13
  1,   // 14
  2,   // 15
  2,   // 16
  2,   // 17
  3,   // 18/00-18/09
  3,   // 18/10-18/19
  4,   // 18/20-18/29
  4,   // 18/30-18/39
  5,   // 18/40-18/49
  5,   // 18/50-18/59
  6,   // 18/60-18/69
  6,   // 18/70-18/79
  7,   // 18/80-18/89
  7,   // 18/90-18/99
  8,   // 18/100-18/109
  9,   // 18/110-18/119
  10,  // 18/120-18/129
  11,  // 18/130-18/139
  12,  // 18/140-18/149
  13,  // 18/150-18/159
  14,  // 18/160-18/169
  15,  // 18/170-18/179
  16,  // 18/180-18/189
  17,  // 18/190-18/199
  18,  // 18/200-18/209
  19,  // 18/210-18/219
  20,  // 18/220+
];

/**
 * WIS adjustment for saving throw (stored as 128 + value, we return the actual bonus).
 */
const ADJ_WIS_SAV: readonly number[] = [
  -20,  // 3
  -17,  // 4
  -14,  // 5
  -11,  // 6
  -8,   // 7
  -5,   // 8
  -2,   // 9
  0,    // 10
  2,    // 11
  5,    // 12
  8,    // 13
  10,   // 14
  13,   // 15
  15,   // 16
  18,   // 17
  20,   // 18/00-18/09
  22,   // 18/10-18/19
  25,   // 18/20-18/29
  27,   // 18/30-18/39
  29,   // 18/40-18/49
  31,   // 18/50-18/59
  33,   // 18/60-18/69
  35,   // 18/70-18/79
  37,   // 18/80-18/89
  39,   // 18/90-18/99
  41,   // 18/100-18/109
  43,   // 18/110-18/119
  45,   // 18/120-18/129
  46,   // 18/130-18/139
  48,   // 18/140-18/149
  50,   // 18/150-18/159
  51,   // 18/160-18/169
  53,   // 18/170-18/179
  54,   // 18/180-18/189
  56,   // 18/190-18/199
  57,   // 18/200-18/209
  58,   // 18/210-18/219
  60,   // 18/220+
];

/**
 * DEX adjustment for disarming.
 */
const ADJ_DEX_DIS: readonly number[] = [
  0,   // 3
  0,   // 4
  0,   // 5
  0,   // 6
  0,   // 7
  0,   // 8
  0,   // 9
  0,   // 10
  0,   // 11
  0,   // 12
  1,   // 13
  1,   // 14
  1,   // 15
  2,   // 16
  2,   // 17
  4,   // 18/00-18/09
  4,   // 18/10-18/19
  4,   // 18/20-18/29
  4,   // 18/30-18/39
  5,   // 18/40-18/49
  5,   // 18/50-18/59
  5,   // 18/60-18/69
  6,   // 18/70-18/79
  6,   // 18/80-18/89
  7,   // 18/90-18/99
  8,   // 18/100-18/109
  8,   // 18/110-18/119
  8,   // 18/120-18/129
  8,   // 18/130-18/139
  8,   // 18/140-18/149
  9,   // 18/150-18/159
  9,   // 18/160-18/169
  9,   // 18/170-18/179
  9,   // 18/180-18/189
  9,   // 18/190-18/199
  10,  // 18/200-18/209
  10,  // 18/210-18/219
  10,  // 18/220+
];

/**
 * INT adjustment for disarming.
 */
const ADJ_INT_DIS: readonly number[] = [
  0,   // 3
  0,   // 4
  0,   // 5
  0,   // 6
  0,   // 7
  1,   // 8
  1,   // 9
  1,   // 10
  1,   // 11
  1,   // 12
  1,   // 13
  1,   // 14
  2,   // 15
  2,   // 16
  2,   // 17
  3,   // 18/00-18/09
  3,   // 18/10-18/19
  3,   // 18/20-18/29
  4,   // 18/30-18/39
  4,   // 18/40-18/49
  5,   // 18/50-18/59
  6,   // 18/60-18/69
  7,   // 18/70-18/79
  8,   // 18/80-18/89
  9,   // 18/90-18/99
  10,  // 18/100-18/109
  10,  // 18/110-18/119
  11,  // 18/120-18/129
  12,  // 18/130-18/139
  13,  // 18/140-18/149
  14,  // 18/150-18/159
  15,  // 18/160-18/169
  16,  // 18/170-18/179
  17,  // 18/180-18/189
  18,  // 18/190-18/199
  19,  // 18/200-18/209
  19,  // 18/210-18/219
  20,  // 18/220+
];

/**
 * STR adjustment for digging.
 */
const ADJ_STR_DIG: readonly number[] = [
  0,   // 3
  0,   // 4
  1,   // 5
  2,   // 6
  3,   // 7
  4,   // 8
  4,   // 9
  5,   // 10
  5,   // 11
  6,   // 12
  6,   // 13
  7,   // 14
  7,   // 15
  8,   // 16
  8,   // 17
  9,   // 18/00-18/09
  10,  // 18/10-18/19
  12,  // 18/20-18/29
  15,  // 18/30-18/39
  20,  // 18/40-18/49
  25,  // 18/50-18/59
  30,  // 18/60-18/69
  35,  // 18/70-18/79
  40,  // 18/80-18/89
  45,  // 18/90-18/99
  50,  // 18/100-18/109
  55,  // 18/110-18/119
  60,  // 18/120-18/129
  65,  // 18/130-18/139
  70,  // 18/140-18/149
  75,  // 18/150-18/159
  80,  // 18/160-18/169
  85,  // 18/170-18/179
  90,  // 18/180-18/189
  95,  // 18/190-18/199
  100, // 18/200-18/209
  100, // 18/210-18/219
  100, // 18/220+
];

// Export stat adjustment functions
export function adjIntDev(intStat: number): number {
  const idx = statToIndex(intStat);
  return ADJ_INT_DEV[Math.min(idx, ADJ_INT_DEV.length - 1)];
}

export function adjWisSav(wisStat: number): number {
  const idx = statToIndex(wisStat);
  return ADJ_WIS_SAV[Math.min(idx, ADJ_WIS_SAV.length - 1)];
}

export function adjDexDis(dexStat: number): number {
  const idx = statToIndex(dexStat);
  return ADJ_DEX_DIS[Math.min(idx, ADJ_DEX_DIS.length - 1)];
}

export function adjIntDis(intStat: number): number {
  const idx = statToIndex(intStat);
  return ADJ_INT_DIS[Math.min(idx, ADJ_INT_DIS.length - 1)];
}

export function adjStrDig(strStat: number): number {
  const idx = statToIndex(strStat);
  return ADJ_STR_DIG[Math.min(idx, ADJ_STR_DIG.length - 1)];
}
