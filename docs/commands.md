# Zangband Commands Reference

This document lists all Zangband commands with their default keybindings and implementation status.

## Legend
- [x] Implemented
- [ ] Not yet implemented

---

## Movement

| Key | Command | Status |
|-----|---------|--------|
| `h` / `4` / `←` | Move west | [x] |
| `j` / `2` / `↓` | Move south | [x] |
| `k` / `8` / `↑` | Move north | [x] |
| `l` / `6` / `→` | Move east | [x] |
| `y` / `7` | Move northwest | [x] |
| `u` / `9` | Move northeast | [x] |
| `b` / `1` | Move southwest | [x] |
| `n` / `3` | Move southeast | [x] |
| `.` / `5` | Stay in place (search) | [ ] |
| `H` | Run west | [ ] |
| `J` | Run south | [ ] |
| `K` | Run north | [ ] |
| `L` | Run east | [ ] |
| `Y` | Run northwest | [ ] |
| `U` | Run northeast | [ ] |
| `B` | Run southwest | [ ] |
| `N` | Run southeast | [ ] |

---

## Stairs & Doors

| Key | Command | Status |
|-----|---------|--------|
| `<` | Go up stairs | [x] |
| `>` | Go down stairs | [x] |
| `o` | Open door/chest | [ ] |
| `c` | Close door | [ ] |
| `D` | Disarm trap/chest | [ ] |
| `+` | Alter adjacent grid (smart context action) | [ ] |
| `T` / `;` | Tunnel into wall | [ ] |
| `S` | Toggle search mode | [ ] |

---

## Inventory Management

| Key | Command | Status |
|-----|---------|--------|
| `i` | Show inventory | [x] (message log) |
| `e` | Show equipment | [x] (message log) |
| `g` | Pick up item | [x] |
| `d` | Drop item | [ ] |
| `w` | Wield/wear item | [ ] |
| `t` | Take off equipment | [ ] |
| `k` | Destroy item | [ ] |
| `I` | Inspect item | [ ] |
| `{` | Inscribe item | [ ] |
| `}` | Uninscribe item | [ ] |

---

## Item Usage

| Key | Command | Status |
|-----|---------|--------|
| `E` | Eat food | [ ] |
| `q` | Quaff potion | [ ] |
| `r` | Read scroll | [ ] |
| `a` | Aim wand | [ ] |
| `z` | Zap rod | [ ] |
| `u` | Use staff | [ ] |
| `A` | Activate artifact | [ ] |
| `F` | Fuel light source | [ ] |
| `f` | Fire missile | [ ] |
| `v` | Throw item | [ ] |

---

## Magic (Class-specific)

| Key | Command | Status |
|-----|---------|--------|
| `m` | Cast spell / Use mental power | [ ] |
| `G` | Gain new spells | [ ] |
| `b` | Browse spellbook | [ ] |
| `p` | Use racial power | [ ] |
| `U` | Use mutation power | [ ] |

---

## Combat & Resting

| Key | Command | Status |
|-----|---------|--------|
| (bump) | Melee attack | [x] |
| `R` | Rest | [ ] |
| `R` + number | Rest for N turns | [ ] |
| `R` + `*` | Rest until HP/SP full | [ ] |
| `R` + `&` | Rest until fully healed | [ ] |

---

## Information & Display

| Key | Command | Status |
|-----|---------|--------|
| `C` | Character screen | [ ] |
| `~` | Knowledge menu | [ ] |
| `|` | List known artifacts | [ ] |
| `M` | Full dungeon map | [ ] |
| `L` | Locate player on map | [ ] |
| `l` / `x` | Look around | [ ] |
| `*` | Target monster/location | [ ] |
| `/` | Identify symbol | [ ] |
| `@` | Interact with macros | [ ] |

---

## Messages & Notes

| Key | Command | Status |
|-----|---------|--------|
| `Ctrl+P` | Show previous messages | [ ] |
| `:` | Take notes | [ ] |
| `Ctrl+O` | Show previous message | [ ] |

---

## System Commands

| Key | Command | Status |
|-----|---------|--------|
| `Ctrl+S` | Save game | [ ] |
| `Ctrl+X` | Save and quit | [ ] |
| `Q` | Quit (commit suicide) | [ ] |
| `?` | Help | [ ] |
| `=` | Options menu | [ ] |
| `$` | Reload prefs | [ ] |
| `%` | Interact with visuals | [ ] |
| `&` | Interact with colors | [ ] |
| `!` | Enter shell (disabled) | N/A |
| `"` | Enter a user pref | [ ] |
| `Ctrl+R` | Redraw screen | [ ] |
| `Ctrl+F` | Repeat level feeling | [ ] |
| `Ctrl+E` | Toggle equipment window | [ ] |
| `Ctrl+I` | Toggle inventory window | [ ] |

---

## Pet Commands (Zangband specific)

| Key | Command | Status |
|-----|---------|--------|
| `p` | Issue pet command | [ ] |

---

# Implementation Tasks

## Phase 1: Core UI System
- [ ] Create modal dialog system for inventory/equipment/character screens
- [ ] Create scrollable list component for long menus
- [ ] Create item selection component (a-z letter selection)
- [ ] Add ESC key to close modals

## Phase 2: Inventory & Equipment UI
- [ ] Modal inventory screen with item details
- [ ] Modal equipment screen with slot display
- [ ] Wield/wear item (`w`) with slot selection
- [ ] Take off equipment (`t`)
- [ ] Drop item (`d`)
- [ ] Destroy item (`k`)
- [ ] Inspect item (`I`) - show full item stats

## Phase 3: Item Usage
- [ ] Eat food (`E`)
- [ ] Quaff potion (`q`)
- [ ] Read scroll (`r`)
- [ ] Aim wand (`a`)
- [ ] Zap rod (`z`)
- [ ] Use staff (`u`)
- [ ] Throw item (`v`)
- [ ] Fire missile (`f`)

## Phase 4: Rest System
- [ ] Rest command (`R`) with prompt
- [ ] Rest for N turns
- [ ] Rest until HP restored (`*`)
- [ ] Rest until fully recovered (`&`)
- [ ] Interrupt rest on monster detection

## Phase 5: Running
- [ ] Implement run mode (shift+direction)
- [ ] Run until wall/intersection/monster
- [ ] Disturb on interesting features

## Phase 6: Door & Trap Interaction
- [ ] Open door (`o`)
- [ ] Close door (`c`)
- [ ] Disarm trap (`D`)
- [ ] Search mode toggle (`S`)
- [ ] Stay in place / search (`.` or `5`)
- [ ] Tunnel (`T`)

## Phase 7: Look & Target
- [ ] Look command (`l`/`x`) - cursor mode
- [ ] Target command (`*`)
- [ ] Identify symbol (`/`)

## Phase 8: Information Screens
- [ ] Character screen (`C`) - stats, skills, history
- [ ] Full dungeon map (`M`)
- [ ] Message history (`Ctrl+P`)
- [ ] Knowledge menu (`~`)

## Phase 9: Magic System
- [ ] Spell casting (`m`)
- [ ] Browse spellbook (`b`)
- [ ] Learn spells (`G`)
- [ ] Mana system
- [ ] Spell failure rates

## Phase 10: Save/Load
- [ ] Save game state to localStorage/IndexedDB
- [ ] Load game
- [ ] Autosave on level change

## Phase 11: Advanced Features
- [ ] Inscriptions (`{`, `}`)
- [ ] Macros (`@`)
- [ ] Options menu (`=`)
- [ ] Artifact activation (`A`)
- [ ] Racial/mutation powers

---

# UI Component Requirements

## Modal System
```
+----------------------------------+
|         INVENTORY                |
|----------------------------------|
| a) Short Sword (1d6) (+2,+3)     |
| b) Leather Armor [4,+2]          |
| c) Wooden Torch (3000 turns)     |
| d) Ration of Food                |
|                                  |
| [ESC to close] [w to wield]      |
+----------------------------------+
```

## Character Screen
```
+----------------------------------+
| Name: Player    Race: Human      |
| Class: Warrior  Level: 1         |
|----------------------------------|
| STR: 16  INT: 12  WIS: 10        |
| DEX: 14  CON: 15  CHR: 8         |
|----------------------------------|
| HP: 100/100   SP: 0/0            |
| AC: 12        Speed: +0          |
| Gold: 0       Depth: 50ft        |
+----------------------------------+
```

## Rest Prompt
```
Rest (0-9999, '*' for HP/SP, '&' for HP/SP/status):
```
