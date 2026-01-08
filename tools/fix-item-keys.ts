/**
 * Fix item keys with numeric suffixes
 *
 * Renames keys like "light_306" to "staff_of_light" based on item type.
 * Handles special naming patterns like *Identify* -> star_identify
 */

import * as fs from 'fs';

const itemsPath = './src/data/items/items.json';
const items = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));

// Helper to convert name to key-friendly format
function nameToKey(name: string): string {
  let processed = name;

  // Handle *Name* pattern (stronger versions) - convert to "star_name"
  if (processed.startsWith('*') && processed.endsWith('*')) {
    processed = 'star_' + processed.slice(1, -1);
  } else if (processed.startsWith('*')) {
    processed = 'star_' + processed.slice(1);
  }

  // Handle [Name] pattern (special items)
  if (processed.startsWith('[') && processed.endsWith(']')) {
    processed = processed.slice(1, -1);
  }

  // Handle & prefix (plural marker in Angband)
  if (processed.startsWith('& ')) {
    processed = processed.slice(2);
  }

  // Handle ~ suffix (plural)
  processed = processed.replace(/~$/, '');

  return processed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// Check if key has numeric suffix
function hasNumericSuffix(key: string): boolean {
  return /_\d+$/.test(key);
}

// First pass: collect all items that need renaming and detect collisions
interface ItemInfo {
  oldKey: string;
  newKey: string;
  type: string;
  name: string;
  sval: number;
  item: any;
}

const itemsToRename: ItemInfo[] = [];
const newKeyMap = new Map<string, ItemInfo[]>();

// Items to skip (gold piles, artifact templates, generic templates)
function shouldSkip(item: any, oldKey: string): boolean {
  // Skip gold type entirely (multiple pile sizes)
  if (item.type === 'gold') return true;

  // Skip artifact templates (INSTA_ART flag)
  if (item.flags?.includes('INSTA_ART')) return true;

  // Skip generic template names
  if (item.name === '& Ring~' || item.name === '& Amulet~') return true;

  return false;
}

for (const [oldKey, item] of Object.entries(items)) {
  const typedItem = item as any;

  if (hasNumericSuffix(oldKey) && !shouldSkip(typedItem, oldKey)) {
    const baseName = nameToKey(typedItem.name);

    // Generate base new key
    const noOfTypes = ['food', 'ring', 'amulet', 'gold'];
    let newKey = noOfTypes.includes(typedItem.type)
      ? `${typedItem.type}_${baseName}`
      : `${typedItem.type}_of_${baseName}`;

    const info: ItemInfo = {
      oldKey,
      newKey,
      type: typedItem.type,
      name: typedItem.name,
      sval: typedItem.sval,
      item: typedItem,
    };

    itemsToRename.push(info);

    if (!newKeyMap.has(newKey)) {
      newKeyMap.set(newKey, []);
    }
    newKeyMap.get(newKey)!.push(info);
  }
}

// Report collisions (items that would get the same key)
const collisions = [...newKeyMap.entries()].filter(([_, items]) => items.length > 1);

if (collisions.length > 0) {
  console.log('=== COLLISIONS DETECTED ===\n');
  console.log('These items have the same name but different svals. Review manually:\n');

  for (const [newKey, items] of collisions) {
    console.log(`${newKey}:`);
    for (const item of items) {
      console.log(`  ${item.oldKey}: "${item.name}" (sval=${item.sval})`);
    }
    console.log();
  }

  console.log('Fix the names in items.json or add distinguishing info, then re-run.\n');
  console.log('Aborting without changes.');
  process.exit(1);
}

// No collisions - proceed with rename
const newItems: Record<string, any> = {};
const renames: Array<{ old: string; new: string }> = [];

for (const [oldKey, item] of Object.entries(items)) {
  const typedItem = item as any;
  const info = itemsToRename.find(i => i.oldKey === oldKey);

  if (info) {
    // Item is being renamed
    typedItem.key = info.newKey;
    newItems[info.newKey] = typedItem;
    renames.push({ old: oldKey, new: info.newKey });
  } else {
    // Keep as-is (no numeric suffix or skipped)
    newItems[oldKey] = typedItem;
  }
}

// Write updated items
fs.writeFileSync(itemsPath, JSON.stringify(newItems, null, 2) + '\n');

console.log(`Successfully renamed ${renames.length} items.\n`);

// Group by type for cleaner output
const byType = new Map<string, typeof renames>();
for (const r of renames) {
  const type = (items as any)[r.old].type;
  if (!byType.has(type)) byType.set(type, []);
  byType.get(type)!.push(r);
}

for (const [type, items] of [...byType.entries()].sort()) {
  console.log(`${type.toUpperCase()} (${items.length}):`);
  for (const r of items) {
    console.log(`  ${r.old} -> ${r.new}`);
  }
  console.log();
}
