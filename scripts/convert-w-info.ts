/**
 * Script to convert Zangband w_info.txt to JSON format.
 *
 * Usage: bun run scripts/convert-w-info.ts
 *
 * Reads: ../zangband/lib/edit/w_info.txt
 * Writes: src/data/wilderness/w_info.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

interface WildBoundBox {
  hgtmin: number;
  hgtmax: number;
  popmin: number;
  popmax: number;
  lawmin: number;
  lawmax: number;
}

interface WildGenData {
  id: number;
  comment: string;
  mapFeature: number;
  bounds: WildBoundBox;
  genRoutine: 1 | 2 | 3 | 4;
  chance: number;
  roughType: string[];
  data: number[];
}

function parseWInfo(content: string): WildGenData[] {
  const lines = content.split('\n');
  const entries: WildGenData[] = [];

  let currentEntry: Partial<WildGenData> | null = null;
  let lastComment = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      // Save entry if we have one
      if (currentEntry && currentEntry.id !== undefined) {
        entries.push(currentEntry as WildGenData);
        currentEntry = null;
      }
      continue;
    }

    // Track comments (last comment before entry is the description)
    if (trimmed.startsWith('#')) {
      lastComment = trimmed.slice(1).trim();
      continue;
    }

    // Parse field lines
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const field = trimmed.slice(0, colonIdx);
    const value = trimmed.slice(colonIdx + 1);

    switch (field) {
      case 'N': {
        // Start new entry
        if (currentEntry && currentEntry.id !== undefined) {
          entries.push(currentEntry as WildGenData);
        }
        currentEntry = {
          id: parseInt(value, 10),
          comment: lastComment,
          roughType: [],
          data: [],
        };
        lastComment = '';
        break;
      }

      case 'M': {
        if (currentEntry) {
          currentEntry.mapFeature = parseInt(value, 10);
        }
        break;
      }

      case 'W': {
        if (currentEntry) {
          const parts = value.split(':').map((p) => parseInt(p, 10));
          currentEntry.bounds = {
            hgtmin: parts[0],
            hgtmax: parts[1],
            popmin: parts[2],
            popmax: parts[3],
            lawmin: parts[4],
            lawmax: parts[5],
          };
        }
        break;
      }

      case 'T': {
        if (currentEntry) {
          const parts = value.split(':').map((p) => parseInt(p, 10));
          currentEntry.genRoutine = parts[0] as 1 | 2 | 3 | 4;
          currentEntry.chance = parts[1];
        }
        break;
      }

      case 'F': {
        if (currentEntry) {
          // Parse pipe-separated flags
          currentEntry.roughType = value
            .split('|')
            .map((f) => f.trim())
            .filter((f) => f.length > 0);
        }
        break;
      }

      case 'E': {
        if (currentEntry) {
          currentEntry.data = value.split(':').map((p) => parseInt(p, 10));
        }
        break;
      }
    }
  }

  // Don't forget last entry
  if (currentEntry && currentEntry.id !== undefined) {
    entries.push(currentEntry as WildGenData);
  }

  return entries;
}

function main() {
  // Find paths
  const scriptDir = dirname(new URL(import.meta.url).pathname);
  const projectRoot = join(scriptDir, '..');
  const inputPath = join(projectRoot, '..', 'zangband', 'lib', 'edit', 'w_info.txt');
  const outputDir = join(projectRoot, 'src', 'data', 'wilderness');
  const outputPath = join(outputDir, 'w_info.json');

  console.log('Converting w_info.txt to JSON...');
  console.log(`Input: ${inputPath}`);
  console.log(`Output: ${outputPath}`);

  // Read input
  const content = readFileSync(inputPath, 'utf-8');

  // Parse
  const entries = parseWInfo(content);

  console.log(`Parsed ${entries.length} terrain types`);

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Write output
  const output = JSON.stringify(entries, null, 2);
  writeFileSync(outputPath, output);

  console.log('Done!');

  // Print some stats
  const byRoutine = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const entry of entries) {
    byRoutine[entry.genRoutine]++;
  }
  console.log('\nGeneration routines:');
  console.log(`  Type 1 (plasma fractal): ${byRoutine[1]}`);
  console.log(`  Type 2 (flat probability): ${byRoutine[2]}`);
  console.log(`  Type 3 (overlay circle): ${byRoutine[3]}`);
  console.log(`  Type 4 (farm): ${byRoutine[4]}`);
}

main();
