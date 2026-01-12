/**
 * Parse graf-new.prf tile mappings into JSON format
 *
 * Usage: bun run scripts/parse-prf.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TileCoord {
  col: number;
  row: number;
}

interface TileMappings {
  features: Record<string, TileCoord>;
  monsters: Record<string, TileCoord>;
  items: Record<string, TileCoord>;
  spells: Record<string, TileCoord>;
  player: TileCoord;
}

function parseHex(hex: string): number {
  return parseInt(hex, 16);
}

function parseLine(line: string): { type: string; index: number; col: number; row: number } | null {
  // Skip comments and empty lines
  if (line.startsWith('#') || line.trim() === '' || line.startsWith('##')) {
    return null;
  }

  // Match format: TYPE:INDEX:ATTR/CHAR
  // Types: F=features, R=monsters, K=items, S=spells, T=fields (stores/traps)
  // Examples: F:0:0x80/0x80, R:123:0x92/0x80, T:34:0x82/0x87
  const match = line.match(/^([FRKST]):(\d+|0x[0-9A-Fa-f]+):(0x[0-9A-Fa-f]+)\/(0x[0-9A-Fa-f]+)/);
  if (!match) {
    return null;
  }

  const [, type, indexStr, attrStr, charStr] = match;
  const index = indexStr.startsWith('0x') ? parseHex(indexStr.slice(2)) : parseInt(indexStr, 10);
  // The .prf format is TYPE:INDEX:ATTR/CHAR where:
  // - ATTR (first hex value) = row in tileset
  // - CHAR (second hex value) = column in tileset
  // Both use 0x80 (128) as a base offset - subtract it to get actual tile indices
  const row = parseHex(attrStr.slice(2)) - 0x80;
  const col = parseHex(charStr.slice(2)) - 0x80;

  return { type, index, col, row };
}

// Mapping from Zangband field indices (T:) to TypeScript terrain indices
// In Zangband, stores are "fields" (t_info.txt), but in TypeScript they're terrain features
const FIELD_TO_TERRAIN_MAP: Record<number, number> = {
  // Main stores (T:34-41 → terrain 140-147)
  // Note: TS terrain indices 140-147 are stores, 148 is "road" (not a store!)
  34: 140,  // General Store
  35: 141,  // Armoury
  36: 142,  // Weapon Smiths
  37: 143,  // Temple
  38: 144,  // Alchemy Shop
  39: 145,  // Magic Wares (Magic Shop)
  40: 146,  // Black Market
  41: 147,  // Home
  // 42: Book Store - no corresponding terrain in TS (148 is "road")

  // Buildings (TS terrain 149-155)
  43: 153,  // Weaponmaster → building_weaponsmith
  138: 151, // Library → building_library
  140: 149, // Inn → building_inn
  141: 150, // Healer → building_healer
};

function main() {
  const prfPath = join(__dirname, '../../zangband/lib/pref/graf-new.prf');
  const outputDir = join(__dirname, '../src/data/tiles');
  const outputPath = join(outputDir, 'adam-bolt-mappings.json');

  console.log(`Reading ${prfPath}...`);
  const content = readFileSync(prfPath, 'utf-8');
  const lines = content.split('\n');

  const mappings: TileMappings = {
    features: {},
    monsters: {},
    items: {},
    spells: {},
    player: { col: 0, row: 18 }, // R:0 in graf-new.prf is 0x92/0x80 = row 18, col 0
  };

  let featureCount = 0;
  let monsterCount = 0;
  let itemCount = 0;
  let spellCount = 0;
  let fieldCount = 0;

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) continue;

    const { type, index, col, row } = parsed;
    const coord: TileCoord = { col, row };

    switch (type) {
      case 'F':
        mappings.features[index.toString()] = coord;
        featureCount++;
        break;
      case 'R':
        mappings.monsters[index.toString()] = coord;
        monsterCount++;
        break;
      case 'K':
        mappings.items[index.toString()] = coord;
        itemCount++;
        break;
      case 'S':
        mappings.spells[index.toString()] = coord;
        spellCount++;
        break;
      case 'T':
        // Map field indices to TypeScript terrain indices for stores/buildings
        const terrainIndex = FIELD_TO_TERRAIN_MAP[index];
        if (terrainIndex !== undefined) {
          mappings.features[terrainIndex.toString()] = coord;
          fieldCount++;
        }
        break;
    }
  }

  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true });

  // Write JSON output
  writeFileSync(outputPath, JSON.stringify(mappings, null, 2));

  console.log(`Parsed tile mappings:`);
  console.log(`  Features: ${featureCount}`);
  console.log(`  Fields (stores/buildings): ${fieldCount}`);
  console.log(`  Monsters: ${monsterCount}`);
  console.log(`  Items: ${itemCount}`);
  console.log(`  Spells: ${spellCount}`);
  console.log(`Output written to ${outputPath}`);
}

main();
