/**
 * Add effects to device items (wands, rods, staves)
 *
 * Maps item names to their effects using the GPEffect system.
 */

import * as fs from 'fs';

const itemsPath = './src/data/items/items.json';
const items = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));

// Effect mappings by item name (case-insensitive matching)
const effectsByName: Record<string, any[]> = {
  // Light effects
  'light': [{ type: 'lightArea', radius: 2 }],
  'illumination': [{ type: 'lightArea', radius: 3 }],
  'starlight': [{ type: 'lightArea', radius: 5 }],
  'darkness': [{ type: 'lightArea', radius: 3, darken: true }],

  // Detection effects
  'trap location': [{ type: 'detect', detectType: 'traps' }],
  'treasure location': [{ type: 'detect', detectType: 'treasure' }],
  'object location': [{ type: 'detect', detectType: 'items' }],
  'door/stair location': [{ type: 'detect', detectType: ['doors', 'stairs'] }],
  'detect invisible': [{ type: 'detect', detectType: 'invisible' }],
  'detect evil': [{ type: 'detect', detectType: 'evil' }],
  'detection': [{ type: 'detect', detectType: ['monsters', 'traps', 'doors', 'stairs', 'items'] }],
  'enlightenment': [{ type: 'detect', detectType: 'all' }],
  'probing': [{ type: 'detect', detectType: 'monsters' }],

  // Healing effects
  'cure light wounds': [{ type: 'heal', dice: '2d8' }, { type: 'reduce', status: 'cut', amount: 10 }],
  'healing': [{ type: 'heal', dice: '300' }],

  // Status effects (self)
  'speed': [{ type: 'applyStatus', status: 'haste', duration: '1d20+20' }],
  'slowness': [{ type: 'applyStatus', status: 'slow', duration: '1d20+15' }],

  // Cure effects
  'curing': [
    { type: 'cure', status: 'blind' },
    { type: 'cure', status: 'poisoned' },
    { type: 'cure', status: 'confused' },
    { type: 'cure', status: 'stun' },
    { type: 'reduce', status: 'cut', amount: 9999 },
  ],

  // Stat restoration
  'restoration': [{ type: 'restoreStat', stat: 'all' }],
  'the magi': [{ type: 'restoreStat', stat: ['int', 'wis'] }],

  // Teleportation
  'teleportation': [{ type: 'teleportSelf', range: 100 }],

  // Genocide
  '*destruction*': [{ type: 'genocide' }],
  'genocide': [{ type: 'genocide' }],

  // Identify/Perception
  'perception': [{ type: 'identify' }],

  // Remove curse - placeholder
  'remove curse': [{ type: 'removeCurse' }],

  // Bolt effects - damage values from k_info.txt
  // Wands
  'magic missile': [{ type: 'bolt', dice: '2d6', element: 'magic', target: 'position' }],
  'frost bolts': [{ type: 'bolt', dice: '6d8', element: 'cold', target: 'position' }],
  'fire bolts': [{ type: 'bolt', dice: '10d8', element: 'fire', target: 'position' }],
  'acid bolts': [{ type: 'bolt', dice: '6d8', element: 'acid', target: 'position' }],
  // Rods
  'lightning bolts': [{ type: 'bolt', dice: '5d8', element: 'lightning', target: 'position' }],
  // Note: frost bolts, fire bolts, acid bolts are same for rods as wands
};

let updated = 0;
let skipped = 0;

for (const [key, item] of Object.entries(items)) {
  const typedItem = item as any;

  // Only process wands, rods, staves
  if (!['wand', 'rod', 'staff'].includes(typedItem.type)) continue;

  // Skip if already has effects
  if (typedItem.effects) {
    skipped++;
    continue;
  }

  // Look up effects by name (case-insensitive)
  const name = typedItem.name.toLowerCase();
  const effects = effectsByName[name];

  if (effects) {
    typedItem.effects = effects;
    updated++;
    console.log(`${typedItem.type} ${key}: ${name} -> ${effects.length} effect(s)`);
  }
}

// Write updated items
fs.writeFileSync(itemsPath, JSON.stringify(items, null, 2) + '\n');

console.log(`\nUpdated ${updated} items, skipped ${skipped} (already had effects)`);
console.log('\nItems without effects mapping (need bolt/ball/special effects):');

for (const [key, item] of Object.entries(items)) {
  const typedItem = item as any;
  if (!['wand', 'rod', 'staff'].includes(typedItem.type)) continue;
  if (typedItem.effects) continue;

  console.log(`  ${typedItem.type} ${key}: "${typedItem.name}"`);
}
