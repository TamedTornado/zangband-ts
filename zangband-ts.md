# Zangband TypeScript Port - Project Plan

## Overview

Port ZangbandTK to a modern TypeScript codebase, targeting browser-first with rot.js as the display/utility layer. The goal is a faithful recreation of Zangband gameplay in a maintainable, extensible architecture.

### Design Principles

1. **Data-driven**: Game content (monsters, items, spells, terrain) lives in JSON/YAML, not code
2. **Separation of concerns**: Core game logic has zero UI dependencies
3. **Type safety**: Leverage TypeScript to catch errors at compile time
4. **Faithful first**: V1.0 reproduces Zangband; divergence comes later

### Non-Goals

- Multiplayer support
- Mobile-first (responsive is fine, but desktop keyboard is primary)
- ECS architecture (traditional OOP is fine for this scope)

---

## Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Language | TypeScript 5.x | Strict mode enabled |
| UI Framework | React | Components for all UI chrome |
| Game Display | rot.js | Dungeon viewport, FOV, pathfinding |
| Build | Vite | Fast dev server, good TS support |
| Testing | Vitest | Compatible with Vite, fast |
| Data Format | JSON | With JSON schemas for validation |
| Optional Later | Electron/Tauri | Native wrapper if desired |

---

## Project Structure

```
zangband-ts/
├── src/
│   ├── core/                    # Pure game logic - NO UI imports
│   │   ├── entities/
│   │   │   ├── Entity.ts        # Base class
│   │   │   ├── Actor.ts         # Anything that takes turns
│   │   │   ├── Player.ts
│   │   │   ├── Monster.ts
│   │   │   └── Item.ts
│   │   ├── systems/
│   │   │   ├── Combat.ts        # Damage calculation, melee, ranged
│   │   │   ├── Magic.ts         # Spell resolution, effect execution
│   │   │   ├── AI.ts            # Monster behavior
│   │   │   ├── Generation.ts    # Dungeon generation orchestration
│   │   │   ├── FOV.ts           # Wraps rot.js FOV for core use
│   │   │   └── Scheduler.ts     # Turn management (wraps rot.js)
│   │   ├── world/
│   │   │   ├── GameWorld.ts     # Top-level state container
│   │   │   ├── Level.ts         # Single dungeon level
│   │   │   ├── Tile.ts          # Terrain
│   │   │   └── WorldMap.ts      # Wilderness/town connections
│   │   ├── data/
│   │   │   ├── types.ts         # All data interfaces
│   │   │   ├── DataManager.ts   # Loads and indexes game data
│   │   │   └── Formulas.ts      # Combat/magic formulas from Zangband
│   │   └── index.ts             # Core public API
│   │
│   ├── data/                    # JSON game content
│   │   ├── monsters/
│   │   │   ├── animals.json
│   │   │   ├── demons.json
│   │   │   ├── dragons.json
│   │   │   ├── uniques.json
│   │   │   └── ...
│   │   ├── items/
│   │   │   ├── weapons.json
│   │   │   ├── armor.json
│   │   │   ├── potions.json
│   │   │   ├── scrolls.json
│   │   │   ├── artifacts.json
│   │   │   └── ...
│   │   ├── spells/
│   │   │   ├── life.json
│   │   │   ├── sorcery.json
│   │   │   ├── nature.json
│   │   │   ├── chaos.json
│   │   │   ├── death.json
│   │   │   ├── trump.json
│   │   │   ├── arcane.json
│   │   │   └── ...
│   │   ├── terrain/
│   │   │   └── terrain.json
│   │   ├── classes/
│   │   │   └── classes.json
│   │   ├── races/
│   │   │   └── races.json
│   │   └── meta/
│   │       ├── experience.json  # XP table
│   │       └── config.json      # Game constants
│   │
│   ├── ui/                      # React + rot.js hybrid (matches ZangbandTK)
│   │   ├── App.tsx              # Root layout
│   │   ├── components/
│   │   │   ├── GameViewport.tsx # rot.js canvas wrapper
│   │   │   ├── Autobar.tsx      # Quick-use buttons
│   │   │   ├── StatsPanel.tsx   # HP/MP/stats with bars
│   │   │   ├── MessageWindow.tsx # Current messages
│   │   │   ├── MessageHistory.tsx # Scrollable log
│   │   │   ├── RecallPanel.tsx  # Monster/item memory
│   │   │   ├── Minimap.tsx      # Dungeon minimap
│   │   │   ├── Tooltip.tsx      # Hover tooltips
│   │   │   └── modals/
│   │   │       ├── Modal.tsx
│   │   │       ├── InventoryModal.tsx
│   │   │       ├── EquipmentModal.tsx
│   │   │       ├── CharacterModal.tsx  # Info/Flags/Mutations/Virtues/Notes tabs
│   │   │       ├── SpellbookModal.tsx
│   │   │       ├── KnowledgeModal.tsx
│   │   │       ├── PetsModal.tsx
│   │   │       ├── StoreModal.tsx
│   │   │       ├── ChoiceModal.tsx
│   │   │       └── TargetingOverlay.tsx
│   │   ├── hooks/
│   │   │   ├── useGameState.ts
│   │   │   ├── useKeyboard.ts
│   │   │   └── useTooltip.ts
│   │   └── context/
│   │       └── GameContext.tsx
│   │
│   ├── main.tsx                 # Entry point, renders React app
│   └── index.html
│
├── tools/                       # Data extraction utilities
│   ├── extract-monsters.ts      # Parse C source → JSON
│   ├── extract-items.ts
│   ├── extract-spells.ts
│   └── validate-data.ts         # JSON schema validation
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATA-FORMAT.md
│   └── FORMULAS.md              # Documented game mechanics
│
├── tests/
│   ├── core/
│   └── integration/
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Phase 1: Foundation & Data Extraction

### 1.1 Project Setup [DONE]
- [x] Initialize project with Vite + TypeScript
- [x] Configure strict TypeScript settings
- [x] Set up Vitest
- [x] Add rot.js dependency
- [x] Create folder structure
- [x] Basic "@ walking around empty map" proof of life

### 1.2 Reference Source [DONE]
Reference C codebase is at `../zangband`. Key data files:
- `lib/edit/r_info.txt` - Monster definitions
- `lib/edit/k_info.txt` - Item definitions
- `lib/edit/a_info.txt` - Artifact definitions
- `lib/edit/e_info.txt` - Ego item definitions
- `lib/edit/f_info.txt` - Terrain definitions
- `src/spells*.c` - Spell definitions (in code, not data files)

### 1.3 Data Extraction [DONE]
- [x] Write parser for monster definitions → JSON
- [x] Write parser for item definitions → JSON
- [x] Write parser for artifact definitions → JSON
- [x] Write parser for ego item definitions → JSON
- [x] Extract terrain definitions → JSON
- [x] Extract race/class data → JSON (via C stub + #include)
- [x] Extract spell names and magic_info table → JSON

### 1.4 Data Rationalization [DONE]
- [x] Merge spell definitions with class requirements (no separate ordinal arrays)

### 1.5 Define Core Type System
```typescript
// Example types to define in src/core/data/types.ts

interface MonsterDef {
  id: string;
  name: string;
  symbol: string;
  color: Color;
  level: number;
  rarity: number;
  speed: number;
  hp: DiceRoll;
  ac: number;
  vision: number;
  attacks: Attack[];
  flags: MonsterFlag[];
  spellFreq?: number;
  spells?: string[];
  drop?: DropTable;
  description: string;
}

interface SpellDef {
  id: string;
  name: string;
  realm: SpellRealm;
  index: number;  // position in realm (0-31)
  // Per-class requirements embedded, not in separate ordinal array
  classes: Record<string, {
    level: number;
    mana: number;
    fail: number;
    exp: number;
  }>;
  effects: SpellEffect[];
  description: string;
}

interface SpellEffect {
  type: EffectType;  // 'projectile' | 'ball' | 'beam' | 'heal' | 'buff' | etc.
  element?: Element;
  damage?: DiceRoll | string;  // string for formulas like "plevel * 2"
  radius?: number;
  duration?: DiceRoll;
  // ... other params depending on type
}

type DiceRoll = { dice: number; sides: number; bonus?: number }; // 3d5+2
```

---

## Phase 2: Core Engine

**Parallelization:**
- Wave 1: 2.1 + 2.2 (independent, can parallelize) [DONE]
- Wave 2: 2.3 + 2.5 (each depends on Wave 1) [DONE]
- 2.4 Dungeon Generation moved to Phase 5 (extraction from C reference)

### 2.1 Basic Entity System ⟨Wave 1⟩ [DONE]
- [x] `Entity` base class (id, position, symbol, color)
- [x] `Actor` extends Entity (hp, energy, speed, takeDamage, heal)
- [x] `Player` extends Actor (stats, inventory, spells known, tryMove)
- [x] `Monster` extends Actor (definitionKey, isAwake)
- [x] `Item` extends Entity (name, itemType, quantity)

### 2.2 World Representation ⟨Wave 1⟩ [DONE]
- [x] `Tile` class (TerrainDef reference, occupant, items, explored)
- [x] `Level` class (2D tile grid, terrain from JSON)
- [x] `GameWorld` class (current level, player ref, turn counter)

### 2.3 Turn System ⟨Wave 2⟩ [DONE]
- [x] `Scheduler` class (energy-based turn order)
- [x] Energy system matching Zangband (110 = normal speed)
- [x] Actor turn resolution (highest energy first)

### 2.5 FOV & Memory ⟨Wave 2⟩ [DONE]
- [x] Integrate rot.js FOV (PreciseShadowcasting)
- [x] Compute visible tiles, mark explored

---

## Phase 3: Game Systems [DONE]

### 3.1 Combat System [DONE]
- [x] Document Zangband melee formula from source
- [x] Implement melee hit chance calculation
- [x] Implement damage calculation (weapon dice, slays, brands)
- [x] Critical hits
- [x] Ranged combat (throwing, archery)
- [x] Monster attacks (multiple attack types per monster)

### 3.2 Magic System [DONE]
- [x] `DataManager` loads spell definitions
- [x] Effect executor: generic handler for each `EffectType`
- [x] Projectile effects (bolt, ball, beam)
- [x] Direct effects (heal, teleport, haste)
- [x] Buff/debuff effects (timed status changes)
- [x] Mana cost, failure chance, spell experience

### 3.3 Item System [DONE]
- [x] Extract item generation algorithm from `object2.c`
- [x] Base type selection by depth
- [x] Ego item application rules
- [x] Artifact generation
- [x] Item identification (unknown → tried → identified)
- [x] Equipment slots, bonuses application
- [x] Consumables (potions, scrolls, wands, staves, rods)

### 3.4 Monster AI [DONE]
- [x] Extract AI behaviors from `melee2.c`
- [x] Movement patterns (approach, flee, wander)
- [x] Spellcasting decisions
- [x] Special behaviors (thieves, breeders, etc.)

### 3.5 Character System [DONE]
- [x] Race stat bonuses, abilities
- [x] Class stat bonuses, spell realms, abilities
- [x] Experience and leveling
- [x] Stat gain on level up
- [x] Skills (Zangband uses proficiency system)

### 3.6 Vision System [DONE]
- [x] Light sources (torches, lanterns, glowing items)
- [x] Infravision (see warm-blooded in dark)
- [x] Telepathy, see invisible

### 3.7 Dungeon Generation [DONE]
- [x] Extract room/corridor generation algorithm from `generate.c`
- [x] 25 room types (simple, overlapping, crossed, nested, vaults, caves, crypts, etc.)
- [x] Tunnel generation for room connectivity
- [x] Feature placement (stairs, doors)

---

## Phase 4: UI Layer (React + rot.js Hybrid)

### 4.1 Architecture Overview

Hybrid approach inspired by ZangbandTK: modern clickable UI with full keyboard support.

```
┌─────────────────────────────────────────────────────────────┐
│  React App                                                  │
│  ┌──────────────┬────────────────────────┬───────────────┐  │
│  │ StatsPanel   │  GameViewport          │ SidePanel     │  │
│  │ (React)      │  (rot.js canvas)       │ (React)       │  │
│  │              │                        │               │  │
│  │ HP/MP bars   │  @ . . # # . .        │ Minimap?      │  │
│  │ Stats        │  . . k . . . .        │ Equipment     │  │
│  │ Buffs        │  . . . . $ . .        │ Quick slots   │  │
│  │              │                        │               │  │
│  ├──────────────┴────────────────────────┴───────────────┤  │
│  │ MessageLog (React) - scrollable, clickable links      │  │
│  └───────────────────────────────────────────────────────┘  │
│  Modal overlays: Inventory, Character, Spells, etc.         │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Core Principles
- **Keyboard-first, mouse-friendly**: Every action has a hotkey, but also clickable
- **No mode confusion**: Clear visual state for targeting, inventory, etc.
- **Responsive panels**: Resize gracefully, hide on small screens if needed
- **Tooltips everywhere**: Hover on anything for details

### 4.3 React Component Structure (matching ZangbandTK)
```
src/ui/
├── App.tsx                     # Root layout, game state subscription
├── components/
│   ├── GameViewport.tsx        # rot.js canvas wrapper, click→tile
│   ├── Autobar.tsx             # Quick buttons: food, potions, scrolls, rods, wands, staves, books
│   ├── StatsPanel.tsx          # HP/MP/stats with bars, stat icons
│   ├── MessageWindow.tsx       # Current turn messages
│   ├── MessageHistory.tsx      # Scrollable full message log
│   ├── RecallPanel.tsx         # Monster/item memory with icons
│   ├── Minimap.tsx             # Dungeon/world minimap
│   ├── Tooltip.tsx             # Context-aware hover tooltips
│   └── modals/
│       ├── Modal.tsx           # Base modal with keyboard trap
│       ├── InventoryModal.tsx  # Item list, use/drop/equip actions
│       ├── EquipmentModal.tsx  # Equipped gear, swap slots
│       ├── CharacterModal.tsx  # Tabs: Info, Flags, Mutations, Virtues, Notes
│       ├── CharInfoTab.tsx     # Stats, experience, gold, depth
│       ├── CharFlagsTab.tsx    # Resistances/abilities grid
│       ├── MutationsTab.tsx    # Character mutations
│       ├── VirtuesTab.tsx      # Virtue scores
│       ├── NotesTab.tsx        # Player notes
│       ├── SpellbookModal.tsx  # Spell selection by realm/book
│       ├── KnowledgeModal.tsx  # Discovered monsters/items/artifacts
│       ├── PetsModal.tsx       # Pet/summon management
│       ├── StoreModal.tsx      # Buy/sell interface
│       ├── ChoiceModal.tsx     # Generic selection dialog
│       ├── TargetingOverlay.tsx # Overlays viewport for targeting
│       └── TipsModal.tsx       # Gameplay tips/help
├── hooks/
│   ├── useGameState.ts         # Subscribe to game world changes
│   ├── useKeyboard.ts          # Global keyboard handler
│   └── useTooltip.ts           # Tooltip positioning logic
└── context/
    └── GameContext.tsx         # Provides game instance to tree
```

### 4.4 Input System
```typescript
// Unified input: keyboard and clicks produce the same Actions
type GameAction =
  | { type: 'move'; direction: Direction }
  | { type: 'interact'; target: Position }  // click or 'g'et/open
  | { type: 'openInventory' }
  | { type: 'openSpells' }
  | { type: 'useItem'; slot: number }
  | { type: 'cast'; spellId: string }
  | { type: 'target'; position: Position }
  | { type: 'cancel' }
  // ...

// Keyboard bindings configurable, stored in localStorage
const defaultBindings: Record<string, GameAction> = {
  'k': { type: 'move', direction: Direction.North },
  'ArrowUp': { type: 'move', direction: Direction.North },
  'i': { type: 'openInventory' },
  'm': { type: 'openSpells' },
  'Escape': { type: 'cancel' },
  // ...
};
```

### 4.5 Viewport Interaction
- **Click tile**: Select/target that tile
- **Right-click**: Context menu (look, attack, interact)
- **Hover**: Tooltip shows monster/item info
- **Drag**: Possible scroll for large viewports? Or click minimap
- **Keyboard targeting**: Tab cycles targets, Enter confirms

### 4.6 Modal System
- Modals are React portals, rendered above viewport
- Keyboard trapped within modal (Tab cycles, Escape closes)
- Can stack (Inventory → Item details → Confirm drop)
- Smooth open/close transitions

### 4.7 Implementation Order
1. [ ] Set up React with Vite (replace current main.ts)
2. [ ] GameViewport component wrapping rot.js
3. [ ] Basic layout: viewport + StatsPanel + MessageWindow
4. [ ] Keyboard input system (useKeyboard hook)
5. [ ] Player input blocking (async/await game loop)
6. [ ] Remembered tile rendering (show old terrain, not current monsters)
7. [ ] StatsPanel with HP/MP bars, stat icons
8. [ ] MessageWindow + MessageHistory
9. [ ] Autobar (quick-use buttons)
10. [ ] InventoryModal + EquipmentModal
11. [ ] CharacterModal with all tabs (Info, Flags, Mutations, Virtues, Notes)
12. [ ] SpellbookModal
13. [ ] TargetingOverlay
14. [ ] RecallPanel (monster/item memory)
15. [ ] KnowledgeModal (discovered things)
16. [ ] StoreModal
17. [ ] PetsModal
18. [ ] Minimap
19. [ ] Tooltips and polish

---

## Phase 5: Content & Polish

### 5.1 Full Data Import
- [ ] All monsters from Zangband
- [ ] All items (base types, ego types, artifacts)
- [ ] All spells across all realms
- [ ] All races and classes

### 5.2 Wilderness & Overworld
- [ ] Extract wilderness system (w_info.txt terrain types, procedural generation params)
- [ ] Town/dungeon placement rules
- [ ] Wilderness travel

### 5.3 Level Population
- [ ] Monster placement (depth-appropriate, out-of-depth rare)
- [ ] Item placement (floor drops, room treasures)
- [ ] Town level layout

### 5.4 Special Levels
- [ ] Quest levels (Thieves' Hideout, etc.)
- [ ] Unique lairs
- [ ] Special room vaults

### 5.5 Final Systems
- [ ] Save/load to localStorage (+ export/import file)
- [ ] Character dump generation
- [ ] High score tracking
- [ ] In-game help / monster memory / item memory

### 5.6 Testing & Balance
- [ ] Verify monster stats match original
- [ ] Verify damage formulas produce expected ranges
- [ ] Playtest through midgame
- [ ] Playtest to endgame / winning

### 5.7 Seed System & Reproducibility
- [ ] Create centralized RNG manager with seedable rot.js RNG
- [ ] Seed display on UI (short hash for sharing)
- [ ] Seed input on new game (paste friend's seed)
- [ ] Same seed = same overworld, dungeons, monsters, drops
- [ ] Store seed in save file for replay
- [ ] Test: verify identical seed produces identical game state

---

## Key Technical Decisions

### Dice Rolls
```typescript
// Representation
type DiceRoll = { dice: number; sides: number; bonus: number };

// Parsing from strings like "3d5+2"
function parseDice(str: string): DiceRoll { ... }

// Rolling
function rollDice(roll: DiceRoll, rng: ROT.RNG): number {
  let total = roll.bonus;
  for (let i = 0; i < roll.dice; i++) {
    total += rng.getUniformInt(1, roll.sides);
  }
  return total;
}
```

### RNG Strategy
- Use rot.js `ROT.RNG` throughout for seedability
- All random systems (combat, magic, item generation, monster AI) accept RNG via constructor
- Store seed in save file for sharing/replay
- Seed from `Date.now()` for normal play, or user-provided seed
- Centralized GameRNG class manages seeding and provides consistent RNG access

### Effect System Architecture
```typescript
// Each effect type has a handler
type EffectHandler = (
  world: GameWorld,
  caster: Actor,
  target: Position | Actor | null,
  params: EffectParams
) => EffectResult;

const effectHandlers: Record<EffectType, EffectHandler> = {
  projectile: handleProjectile,
  ball: handleBall,
  beam: handleBeam,
  heal: handleHeal,
  teleportSelf: handleTeleportSelf,
  summon: handleSummon,
  // ... 
};

// Executing a spell
function castSpell(world: GameWorld, caster: Actor, spell: SpellDef, target: ...): void {
  for (const effect of spell.effects) {
    const handler = effectHandlers[effect.type];
    handler(world, caster, target, effect);
  }
}
```

### Message System
```typescript
class MessageLog {
  private messages: Message[] = [];
  
  add(text: string, type: MessageType = 'normal'): void {
    this.messages.push({ text, type, turn: currentTurn });
  }
  
  // Combine repeated messages: "You hit the kobold. (x3)"
  // Different colors for types: combat, magic, danger, etc.
}
```

---

## Source Reference Files (to locate in ZangbandTK)

These are the likely locations based on Angband conventions - actual ZangbandTK structure may vary:

| Content | Likely Location |
|---------|-----------------|
| Monster definitions | `lib/edit/r_info.txt` or `src/monster*.c` |
| Item definitions | `lib/edit/k_info.txt` or `src/object*.c` |
| Artifact definitions | `lib/edit/a_info.txt` |
| Ego item definitions | `lib/edit/e_info.txt` |
| Spell definitions | `src/spells*.c` (probably switch statements) |
| Combat formulas | `src/cmd-attack.c` or similar |
| Race definitions | `lib/edit/p_race.txt` or source |
| Class definitions | `lib/edit/p_class.txt` or source |
| Terrain | `lib/edit/f_info.txt` |

The `lib/edit/*.txt` files, if present, are the easiest to parse - they're already in a structured text format.

---

## Open Questions for Investigation

1. **Wilderness**: Does ZangbandTK have the wilderness map? Is it worth implementing for V1?
2. **Mutations**: Zangband has a mutation system - how complex is it?
3. **Pets**: Are pets/summons a significant system?
4. **Quests**: What quest system exists beyond "kill unique X"?
5. **Building Actions**: Alchemy, enchanting, etc.?

---

## Success Criteria for V1.0

- [ ] Can create a character (choose race, class, stat allocation)
- [ ] Can descend through dungeon levels
- [ ] Combat works: melee, ranged, monster attacks
- [ ] Magic works: learn spells, cast from all realms
- [ ] Items work: find, identify, use, equip
- [ ] Monsters behave correctly: AI, abilities, drops
- [ ] Can win the game (defeat Serpent of Chaos)
- [ ] Save/load works
- [ ] Gameplay feel matches original Zangband