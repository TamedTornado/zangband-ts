/**
 * Extract monster data from Zangband r_info.txt and output JSON
 *
 * Usage: bun run scripts/extract-monsters.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { parseMonsters } from '../src/core/data/monsters';

const INPUT_PATH = '../zangband/lib/edit/r_info.txt';
const OUTPUT_PATH = './src/data/monsters/monsters.json';

// Read the source file
const text = readFileSync(INPUT_PATH, 'utf-8');

// Parse monsters
const monsters = parseMonsters(text);

// Write output
writeFileSync(OUTPUT_PATH, JSON.stringify(monsters, null, 2));

console.log(`Extracted ${Object.keys(monsters).length} monsters to ${OUTPUT_PATH}`);

// Report monsters with spells
const monstersWithSpells = Object.values(monsters).filter(m => m.spellFlags.length > 0);
console.log(`${monstersWithSpells.length} monsters have spell abilities`);

// Sample output
const sample = monstersWithSpells.slice(0, 5);
for (const m of sample) {
  console.log(`  ${m.name}: freq=${m.spellFrequency}, spells=[${m.spellFlags.join(', ')}]`);
}
