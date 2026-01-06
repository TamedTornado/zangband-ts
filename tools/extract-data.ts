/**
 * Extract game data from Zangband C source files to JSON
 * Run with: bun tools/extract-data.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { parseTerrain } from '../src/core/data/terrain';
import { parseMonsters } from '../src/core/data/monsters';
import { parseItems } from '../src/core/data/items';
import { parseArtifacts } from '../src/core/data/artifacts';
import { parseEgoItems } from '../src/core/data/ego-items';

const ZANGBAND_PATH = '../zangband';
const OUTPUT_PATH = './src/data';

function extract(
  name: string,
  parser: (text: string) => Record<string, unknown>,
  inputPath: string,
  outputPath: string
): void {
  console.log('Extracting ' + name + '...');
  const text = readFileSync(inputPath, 'utf-8');
  const data = parser(text);
  const count = Object.keys(data).length;
  writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log('  Wrote ' + count + ' entries to ' + outputPath);
}

// Ensure output directories exist
mkdirSync(OUTPUT_PATH + '/terrain', { recursive: true });
mkdirSync(OUTPUT_PATH + '/monsters', { recursive: true });
mkdirSync(OUTPUT_PATH + '/items', { recursive: true });

extract('terrain', parseTerrain, ZANGBAND_PATH + '/lib/edit/f_info.txt', OUTPUT_PATH + '/terrain/terrain.json');
extract('monsters', parseMonsters, ZANGBAND_PATH + '/lib/edit/r_info.txt', OUTPUT_PATH + '/monsters/monsters.json');
extract('items', parseItems, ZANGBAND_PATH + '/lib/edit/k_info.txt', OUTPUT_PATH + '/items/items.json');
extract('artifacts', parseArtifacts, ZANGBAND_PATH + '/lib/edit/a_info.txt', OUTPUT_PATH + '/items/artifacts.json');
extract('ego items', parseEgoItems, ZANGBAND_PATH + '/lib/edit/e_info.txt', OUTPUT_PATH + '/items/ego-items.json');

console.log('Done!');
