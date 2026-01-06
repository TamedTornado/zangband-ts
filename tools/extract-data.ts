/**
 * Extract game data from Zangband C source files to JSON
 * Run with: bun tools/extract-data.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { parseTerrain } from '../src/core/data/terrain';
import { parseMonsters } from '../src/core/data/monsters';

const ZANGBAND_PATH = '../zangband';
const OUTPUT_PATH = './src/data';

function extract(name: string, parser: (text: string) => unknown[], inputPath: string, outputPath: string): void {
  console.log('Extracting ' + name + '...');
  const text = readFileSync(inputPath, 'utf-8');
  const data = parser(text);
  writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log('  Wrote ' + data.length + ' entries to ' + outputPath);
}

// Ensure output directories exist
mkdirSync(OUTPUT_PATH + '/terrain', { recursive: true });
mkdirSync(OUTPUT_PATH + '/monsters', { recursive: true });

extract('terrain', parseTerrain, ZANGBAND_PATH + '/lib/edit/f_info.txt', OUTPUT_PATH + '/terrain/terrain.json');

extract('monsters', parseMonsters, ZANGBAND_PATH + '/lib/edit/r_info.txt', OUTPUT_PATH + '/monsters/monsters.json');

console.log('Done!');
