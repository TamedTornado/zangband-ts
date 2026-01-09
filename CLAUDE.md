# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeScript port of Zangband, a roguelike game. Browser-first with rot.js for display/utilities.

Reference C codebase is at `../zangband`. See `zangband-ts.md` for the full project plan.

## Commands

```bash
bun install        # Install dependencies
bun run dev        # Start dev server
bun run build      # Type-check and build
bun run test       # Run tests in watch mode
bun run test:run   # Run tests once
```

## Development Rules

- **We use BUN not NODE**
- **Prefer Painful Refactors**: When replacing a legacy system, it's better to rip it out and break code then use backwards compatibility shims and invite bugs.
- **No self-credit**: Don't add co-authored-by or credit yourself in commit messages
- **Issues and Bugs**: Do not push a fix to a bug or an issue or mark the issue closed until user confirms fix!
- **TDD**: Tests define contracts FIRST, then write code to make them pass
- **TDD Part 2**: When fixing bugs tests didn't catch, write tests that catch that bug FIRST.
- **Data-driven**: Game content lives in JSON (`src/data/`), not code
- **Separation of concerns**: Core logic (`src/core/`) has ZERO UI dependencies
- **No enums**: TypeScript strict mode with `erasableSyntaxOnly` - use const objects instead
- **No integer keys**: Never key data by integers or sval/tval - data belongs on the item definition itself

## Architecture

```
src/
├── core/           # Pure game logic - NO UI imports
│   ├── entities/   # Entity → Actor → Player/Monster, Item, Trap
│   ├── systems/    # Combat, Magic, AI, FOV, Scheduler, RunSystem
│   │   └── dungeon/  # DungeonGenerator + 25 room builders
│   ├── world/      # Level, Tile, GameWorld
│   ├── fsm/        # GameFSM + states (PlayingState, DeadState, TargetingState)
│   └── data/       # Type definitions for JSON data
├── data/           # JSON game content (monsters, items, spells, terrain, etc.)
├── ui/             # React + rot.js display layer
│   ├── components/ # GameViewport, StatsPanel, MessageLog
│   │   └── modals/ # InventoryModal, EquipmentModal, CharacterModal
│   ├── context/    # GameContext (FSM subscription), ModalContext
│   └── hooks/      # useKeyboard, useROTDisplay, useGame, useModal
tests/core/         # Unit tests (one per class)
```

## FSM Architecture

All game actions flow through the FSM:

```
User Input → useKeyboard → GameAction → FSM.dispatch() → State.handleAction()
                                                              ↓
                                          mutates FSM.data, calls FSM.notify()
                                                              ↓
                                          React re-renders via subscription
```

**States:**
- `PlayingState` - Normal gameplay (movement, combat, items, rest)
- `DeadState` - Game over screen
- `TargetingState` - Look/target cursor mode

**Actions** are defined in `src/core/fsm/Actions.ts` as a union type.

## Key Patterns

### No Enums - Use Const Objects
```typescript
export const Direction = {
  North: 'north',
  South: 'south',
  // ...
} as const;
export type Direction = (typeof Direction)[keyof typeof Direction];
```

### Entity Hierarchy
```
Entity (id, position, symbol, color)
└── Actor (hp, energy, speed, takeDamage, heal)
    ├── Player (stats, inventory, equipment)
    └── Monster (definitionKey, isAwake)
```

### Dice Rolls
```typescript
interface DiceRoll { dice: number; sides: number; bonus: number }
// "3d5+2" → { dice: 3, sides: 5, bonus: 2 }
```

### Energy System
- Speed 110 = normal (Zangband standard)
- Actors gain energy based on speed
- Action when energy ≥ 100

### Data Flow to UI
```typescript
// GameContext subscribes to FSM
fsm.subscribe(() => setGameState(extractState(fsm)));

// Components use hook
const { state, actions } = useGame();
```

## Keyboard Input System

Defined in `src/ui/hooks/useKeyboard.ts`:

- **Axis bindings**: Direction keys (vi: hjklyubn, arrows, numpad)
- **Action bindings**: Array of `{ key, modifiers, action }` objects
- **Mode-aware**: Different behavior in targeting mode vs playing mode

Add new keybindings to `ACTION_BINDINGS` array, handlers to `ACTION_HANDLERS`.

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `Player`, `GameFSM` |
| Interfaces | PascalCase (no I prefix) | `MonsterDef`, `State` |
| Methods | camelCase | `getTile`, `isWalkable` |
| Constants | UPPER_SNAKE_CASE | `ENERGY_PER_TURN` |
| Files | PascalCase for classes | `Player.ts`, `Combat.ts` |

## Imports

Always use `@/` path alias:
```typescript
import { Player } from '@/core/entities/Player';
import { type Position, Direction } from '@/core/types';
import monstersData from '@/data/monsters/monsters.json';
```

## Testing

- Framework: Vitest
- Location: `tests/core/<classname>.test.ts`
- Pattern: `describe` blocks per method, `it` blocks per behavior
- Run: `bun run test:run` (CI) or `bun run test` (watch)

## Tech Stack

- TypeScript 5.x (strict mode)
- React (UI components)
- Vite (build)
- Vitest (testing)
- rot.js (display, FOV, pathfinding, RNG)
- JSON (game data)
