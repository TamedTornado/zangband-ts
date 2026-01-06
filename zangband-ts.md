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
| Display | rot.js | FOV, pathfinding, map gen, display |
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
│   ├── ui/                      # rot.js display layer
│   │   ├── Display.ts           # Main rot.js display wrapper
│   │   ├── screens/
│   │   │   ├── Screen.ts        # Base screen interface
│   │   │   ├── GameScreen.ts    # Main dungeon view
│   │   │   ├── InventoryScreen.ts
│   │   │   ├── CharacterScreen.ts
│   │   │   ├── SpellScreen.ts
│   │   │   ├── TargetingScreen.ts
│   │   │   ├── MenuScreen.ts
│   │   │   └── ...
│   │   ├── panels/
│   │   │   ├── StatsPanel.ts    # HP/MP/etc sidebar
│   │   │   ├── MessageLog.ts
│   │   │   └── MinimapPanel.ts
│   │   ├── rendering/
│   │   │   ├── TileRenderer.ts
│   │   │   └── EntityRenderer.ts
│   │   └── InputHandler.ts      # Keyboard mapping
│   │
│   ├── App.ts                   # Entry point, screen stack management
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

### 1.1 Project Setup
- [ ] Initialize project with Vite + TypeScript
- [ ] Configure strict TypeScript settings
- [ ] Set up Vitest
- [ ] Add rot.js dependency
- [ ] Create folder structure
- [ ] Basic "@ walking around empty map" proof of life

### 1.2 Clone ZangbandTK Source
- [ ] Clone from GitHub mirror (jjnoo/Zangband or AngbandPlus)
- [ ] Identify key source files:
  - Monster definitions (likely `monster1.c`, `monster2.c`, or `r_info.txt`)
  - Item definitions (`object1.c`, `object2.c`, `k_info.txt`)
  - Spell definitions (`spells1.c`, `spells2.c`, `spells3.c`)
  - Race/class data
  - Combat formulas
  - Generation parameters

### 1.3 Data Extraction Scripts
- [ ] Write parser for monster definitions → JSON
- [ ] Write parser for item definitions → JSON  
- [ ] Write parser for spell definitions → JSON
- [ ] Write parser for race/class data → JSON
- [ ] Extract terrain definitions
- [ ] Validate extracted data against schemas

### 1.4 Define Core Type System
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
  level: number;
  manaCost: number;
  failBase: number;
  experience: number;
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

### 2.1 Basic Entity System
- [ ] `Entity` base class (id, position, symbol, color)
- [ ] `Actor` extends Entity (hp, energy, can take turns)
- [ ] `Player` extends Actor (stats, inventory, spells known)
- [ ] `Monster` extends Actor (AI reference, native abilities)
- [ ] `Item` extends Entity (item type, properties, flags)

### 2.2 World Representation
- [ ] `Tile` class (terrain type, flags, occupant, items)
- [ ] `Level` class (2D tile grid, entity list, level metadata)
- [ ] `GameWorld` class (current level, player ref, global state)
- [ ] Serialization: `toJSON()` / `fromJSON()` for save/load

### 2.3 Turn System
- [ ] Integrate rot.js Scheduler (speed-based)
- [ ] Energy system matching Zangband (110 = normal speed)
- [ ] Actor turn resolution
- [ ] Player input blocking (async/await for player turn)

### 2.4 Dungeon Generation
- [ ] Room + corridor generator (rot.js Digger or Uniform)
- [ ] Feature placement (stairs, doors, traps)
- [ ] Monster placement (depth-appropriate, out-of-depth rare)
- [ ] Item placement (floor drops, room treasures)
- [ ] Town level (static layout? procedural?)
- [ ] Wilderness (if implementing - may defer)

### 2.5 FOV & Memory
- [ ] Integrate rot.js FOV (PreciseShadowcasting)
- [ ] "Remembered" tile state (show old terrain, not current monsters)
- [ ] Light sources, infravision

---

## Phase 3: Game Systems

### 3.1 Combat System
- [ ] Document Zangband melee formula from source
- [ ] Implement melee hit chance calculation
- [ ] Implement damage calculation (weapon dice, slays, brands)
- [ ] Critical hits
- [ ] Ranged combat (throwing, archery)
- [ ] Monster attacks (multiple attack types per monster)

### 3.2 Magic System  
- [ ] `DataManager` loads spell definitions
- [ ] Effect executor: generic handler for each `EffectType`
- [ ] Projectile effects (bolt, ball, beam)
- [ ] Direct effects (heal, teleport, haste)
- [ ] Buff/debuff effects (timed status changes)
- [ ] Mana cost, failure chance, spell experience

### 3.3 Item System
- [ ] Item generation (base type + ego type + artifact)
- [ ] Item identification (unknown → tried → identified)
- [ ] Equipment slots, bonuses application
- [ ] Consumables (potions, scrolls, wands, staves, rods)
- [ ] Pseudo-ID, sensing

### 3.4 Monster AI
- [ ] Basic AI: approach and melee
- [ ] Spellcasting AI (when to cast, spell selection)
- [ ] Fleeing behavior (low HP)
- [ ] Group AI (friends, escorts)
- [ ] Special behaviors (thieves steal, breeders multiply)

### 3.5 Character System
- [ ] Race stat bonuses, abilities
- [ ] Class stat bonuses, spell realms, abilities
- [ ] Experience and leveling
- [ ] Stat gain on level up
- [ ] Skills (if Zangband has them? Need to verify)

---

## Phase 4: UI Layer

### 4.1 Display Foundation
- [ ] rot.js Display setup (sizing, font)
- [ ] Viewport management (scrolling dungeon view)
- [ ] Color scheme matching Zangband aesthetic

### 4.2 Screen Stack Architecture
```typescript
// Simple screen management
interface Screen {
  enter(): void;
  exit(): void;
  render(display: ROT.Display): void;
  handleInput(key: string): Screen | null;  // return new screen or null to stay
}

class App {
  private screenStack: Screen[] = [];
  
  pushScreen(screen: Screen): void { ... }
  popScreen(): void { ... }
  // Input goes to top of stack
}
```

### 4.3 Main Game Screen
- [ ] Dungeon viewport rendering
- [ ] Stats panel (HP, MP, stats, status effects)
- [ ] Message log (bottom)
- [ ] Position/depth indicator

### 4.4 Subscreen Implementation
- [ ] Inventory (view, wield, drop, use)
- [ ] Equipment (current gear, swap slots)
- [ ] Character sheet (stats, resists, abilities)
- [ ] Spell selection (by realm/book)
- [ ] Targeting (for directional/aimed spells)
- [ ] Look/examine mode
- [ ] Store interface
- [ ] Help screens

### 4.5 Input Handling
- [ ] Keybinding system (roguelike-keys, vi-keys, configurable)
- [ ] Movement (8-direction + wait)
- [ ] Run mode (shift+direction or similar)
- [ ] All command keys (i, e, m, c, etc.)
- [ ] Repeat last command

---

## Phase 5: Content & Polish

### 5.1 Full Data Import
- [ ] All monsters from Zangband
- [ ] All items (base types, ego types, artifacts)
- [ ] All spells across all realms
- [ ] All races and classes

### 5.2 Special Levels
- [ ] Quest levels (Thieves' Hideout, etc.)
- [ ] Unique lairs
- [ ] Special room vaults

### 5.3 Final Systems
- [ ] Save/load to localStorage (+ export/import file)
- [ ] Character dump generation
- [ ] High score tracking
- [ ] In-game help / monster memory / item memory

### 5.4 Testing & Balance
- [ ] Verify monster stats match original
- [ ] Verify damage formulas produce expected ranges
- [ ] Playtest through midgame
- [ ] Playtest to endgame / winning

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
- Store RNG state in save file for deterministic replay (optional)
- Seed from `Date.now()` for normal play

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