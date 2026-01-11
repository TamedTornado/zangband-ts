/**
 * Split spells.json into per-realm-per-book files
 *
 * Creates 28 files (7 realms × 4 books):
 *   life_book_1.json, life_book_2.json, etc.
 *
 * Run with: bun scripts/split-spells.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const SPELLS_DIR = path.join(__dirname, '../src/data/spells');
const INPUT_FILE = path.join(SPELLS_DIR, 'spells.json');

const REALMS = ['life', 'sorcery', 'nature', 'chaos', 'death', 'trump', 'arcane'];
const BOOKS = [
  { num: 1, start: 0, end: 7 },
  { num: 2, start: 8, end: 15 },
  { num: 3, start: 16, end: 23 },
  { num: 4, start: 24, end: 31 },
];

interface SpellDef {
  index: number;
  [key: string]: unknown;
}

interface SpellRecord {
  [realm: string]: SpellDef[];
}

function main() {
  // Read the monolithic file
  console.log(`Reading ${INPUT_FILE}...`);
  const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8')) as SpellRecord;

  // Verify structure
  for (const realm of REALMS) {
    if (!data[realm]) {
      console.error(`Missing realm: ${realm}`);
      process.exit(1);
    }
    if (data[realm].length !== 32) {
      console.error(`Realm ${realm} has ${data[realm].length} spells, expected 32`);
      process.exit(1);
    }
  }

  // Split into files
  let filesWritten = 0;
  for (const realm of REALMS) {
    const realmSpells = data[realm];

    for (const book of BOOKS) {
      const bookSpells = realmSpells.filter(
        (s) => s.index >= book.start && s.index <= book.end
      );

      if (bookSpells.length !== 8) {
        console.error(
          `${realm} book ${book.num} has ${bookSpells.length} spells, expected 8`
        );
        process.exit(1);
      }

      const filename = `${realm}_book_${book.num}.json`;
      const filepath = path.join(SPELLS_DIR, filename);

      fs.writeFileSync(filepath, JSON.stringify(bookSpells, null, 2) + '\n');
      console.log(`  Wrote ${filename} (${bookSpells.length} spells)`);
      filesWritten++;
    }
  }

  console.log(`\nCreated ${filesWritten} files.`);

  // Remove original file
  console.log(`\nRemoving ${INPUT_FILE}...`);
  fs.unlinkSync(INPUT_FILE);

  console.log('\nDone! Now update spellLoader.ts to import the new files.');
}

main();
