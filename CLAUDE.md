# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeScript port of Zangband, a roguelike game. Browser-first with rot.js for display/utilities.

Reference C codebase is at `../zangband`. See `zangband-ts.md` for the full project plan.

## Development Rules

- **Test-first**: Write tests before implementation (TDD)
- **GitHub**: Use GitHub for version control (master branch)
- **Data-driven**: Game content lives in JSON, not code
- **Separation of concerns**: Core game logic (`src/core/`) has zero UI dependencies

## Commands

```bash
bun install        # Install dependencies
bun run dev        # Start dev server
bun run build      # Type-check and build
bun run test       # Run tests in watch mode
bun run test:run   # Run tests once
```

## Architecture

```
src/
├── core/           # Pure game logic - NO UI imports
│   ├── entities/   # Entity, Actor, Player, Monster, Item
│   ├── systems/    # Combat, Magic, AI, Generation, FOV, Scheduler
│   ├── world/      # GameWorld, Level, Tile, WorldMap
│   └── data/       # Types, DataManager, Formulas
├── data/           # JSON game content (monsters, items, spells, etc.)
├── ui/             # rot.js display layer
│   ├── screens/    # GameScreen, InventoryScreen, etc.
│   ├── panels/     # StatsPanel, MessageLog, etc.
│   └── rendering/  # TileRenderer, EntityRenderer
tests/
├── core/           # Unit tests for core logic
└── integration/    # Integration tests
```

## Tech Stack

- TypeScript 5.x (strict mode)
- Vite (build)
- Vitest (testing)
- rot.js (display, FOV, pathfinding)
- JSON (game data with schemas)
