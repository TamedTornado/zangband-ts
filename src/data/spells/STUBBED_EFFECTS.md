# Stubbed Spell Effects

This document tracks which spell effect types are implemented vs stubbed (defined in spell JSON but not yet functional).

## Implemented Effects (34)

These effect types have working implementations in `src/core/systems/effects/`:

| Effect Type | File | Description |
|-------------|------|-------------|
| `applyStatus` | ApplyStatusEffect.ts | Apply timed status to player |
| `areaStatus` | AreaStatusEffect.ts | Apply status to monsters in area |
| `ball` | BallEffect.ts | Ball-shaped area damage |
| `bolt` | BoltEffect.ts | Single-target projectile damage |
| `breath` | BreathEffect.ts | Cone-shaped breath attack |
| `cloneMonster` | CloneMonsterEffect.ts | Clone a monster |
| `cure` | CureEffect.ts | Remove negative status |
| `detect` | DetectEffect.ts | Detect monsters/items/terrain |
| `disarm` | DisarmEffect.ts | Disarm a trap |
| `dispel` | DispelEffect.ts | Damage monsters by type |
| `drainLife` | DrainLifeEffect.ts | Drain HP from target |
| `earthquake` | EarthquakeEffect.ts | Shake terrain, damage |
| `enchantArmor` | EnchantEffect.ts | Enchant armor AC |
| `enchantWeapon` | EnchantEffect.ts | Enchant weapon to-hit/damage |
| `genocide` | GenocideEffect.ts | Kill all of a monster type |
| `glyph` | GlyphEffect.ts | Create warding glyph |
| `hasteMonster` | HasteMonsterEffect.ts | Speed up a monster |
| `havoc` | HavocEffect.ts | Random chaos effects |
| `heal` | HealEffect.ts | Restore HP |
| `healMonster` | HealMonsterEffect.ts | Heal a monster |
| `identify` | IdentifyEffect.ts | Identify an item |
| `lightArea` | LightAreaEffect.ts | Light up area |
| `mapping` | MappingEffect.ts | Reveal map |
| `polymorph` | PolymorphEffect.ts | Transform player |
| `recall` | RecallEffect.ts | Word of recall |
| `reduce` | ReduceEffect.ts | Reduce a stat |
| `removeCurse` | RemoveCurseEffect.ts | Remove curses |
| `restoreStat` | RestoreStatEffect.ts | Restore a single stat |
| `stoneToMud` | StoneToMudEffect.ts | Convert wall to floor |
| `summon` | SummonEffect.ts | Summon monsters |
| `tameMonster` | TameMonsterEffect.ts | Charm a monster |
| `teleportOther` | TeleportOtherEffect.ts | Teleport monster away |
| `teleportSelf` | TeleportSelfEffect.ts | Teleport player |
| `trapDoorDestruction` | TrapDoorDestructionEffect.ts | Destroy traps/doors |
| `wonder` | WonderEffect.ts | Random spell effect |

## Stubbed Effects (33)

These effect types are referenced in spell JSON files but **not yet implemented**. Casting these spells will throw "Unknown GPEffect type" errors.

### Combat Effects
| Effect Type | Used By | Zangband Equivalent |
|-------------|---------|---------------------|
| `beam` | Arcane Book 3, Chaos Book 4 | `fire_beam()` - line-of-sight damage |
| `chainLightning` | Chaos Book 3 | Multi-target lightning beam |
| `deathRay` | Death Book 4 | Instant death ray |
| `meteorSwarm` | Chaos Book 4 | Multiple meteor impacts |
| `whirlwindAttack` | Nature Book 4 | Attack all adjacent enemies |
| `wordOfDeath` | Death Book 4 | Mass kill weak monsters |
| `omnicide` | Death Book 4 | Kill all non-unique monsters |
| `callChaos` | Chaos Book 4 | Random powerful chaos effect |
| `callTheVoid` | Chaos Book 4 | Massive destruction |

### Summoning/Monster Control
| Effect Type | Used By | Zangband Equivalent |
|-------------|---------|---------------------|
| `charmAnimals` | Nature Book 3 | `charm_animals()` |
| `charmMonsters` | Life Book 3 | `charm_monsters()` |
| `banishEvil` | Life Book 3 | `banish_evil()` |
| `massGenocide` | Death Book 3 | Kill all nearby monsters |

### Buff/Utility
| Effect Type | Used By | Zangband Equivalent |
|-------------|---------|---------------------|
| `restoreStats` | Life Book 4 | Restore all 6 stats |
| `restoreLevel` | Life Book 4 | Restore experience level |
| `selfKnowledge` | Sorcery Book 3 | Display player info |
| `satisfyHunger` | Arcane Book 3 | Remove hunger |
| `wizLite` | Arcane, Nature Book 4 | Light entire level |
| `phlogiston` | Arcane Book 2 | Refuel light source |

### Teleportation
| Effect Type | Used By | Zangband Equivalent |
|-------------|---------|---------------------|
| `teleport` | Arcane Book 3 | Same as teleportSelf (alias needed) |
| `teleportLevel` | Sorcery, Trump, Arcane | Go up/down dungeon level |
| `dimensionDoor` | Sorcery Book 3 | Controlled teleport |
| `massTeleport` | Trump Book 2 | Teleport all monsters |

### Item Effects
| Effect Type | Used By | Zangband Equivalent |
|-------------|---------|---------------------|
| `recharge` | Arcane Book 4, Chaos Book 3 | Recharge wand/staff |
| `enchant` | Sorcery Book 4 | Generic enchant (weapon/armor) |
| `brandWeapon` | Nature, Chaos, Trump, Death | Add elemental brand to weapon |
| `blessWeapon` | Life Book 4 | Bless a weapon |
| `alchemy` | Sorcery Book 4 | Turn items to gold |
| `fetch` | Trump Book 2, Sorcery Book 4 | Telekinesis - pull item |

### Terrain
| Effect Type | Used By | Zangband Equivalent |
|-------------|---------|---------------------|
| `createDoor` | Nature Book 3 | Create a door |
| `createStairs` | Nature Book 3 | Create stairs |
| `createWalls` | Nature Book 3 | Create walls around player |
| `explosiveRune` | Sorcery Book 4 | Create explosive trap |
| `glyphArea` | Life Book 3 | Create glyphs in area |

### Special
| Effect Type | Used By | Zangband Equivalent |
|-------------|---------|---------------------|
| `alterReality` | Chaos Book 3 | Regenerate current level |
| `polymorphSelf` | Chaos Book 3 | Transform into random form |
| `polymorphMonster` | Chaos Book 3 | Transform a monster |
| `invokeSpirits` | Death Book 3 | Random death magic effect |
| `esoteria` | Death Book 4 | Random utility effect |
| `livingTrump` | Trump Book 3 | Gain teleportitis mutation |
| `deathDealing` | Trump Book 3 | Deal with death/undeath |
| `stasis` | Sorcery Book 4 | Freeze monster in time |

## Priority Implementation Order

### High Priority (commonly used)
1. `teleportLevel` - Important escape spell (3 realms)
2. `wizLite` - Light entire level (2 realms)
3. `restoreStats` / `restoreLevel` - Core healing
4. `teleport` - Alias for teleportSelf
5. `beam` - Line damage (2 spells)

### Medium Priority (useful but less common)
6. `recharge` - Item maintenance
7. `brandWeapon` - Combat enhancement
8. `dimensionDoor` - Tactical teleport
9. `satisfyHunger` - Quality of life
10. `charmAnimals` / `charmMonsters` - Monster control

### Lower Priority (endgame/rare)
11. `callChaos`, `callTheVoid`, `omnicide` - Endgame chaos
12. `meteorSwarm`, `chainLightning` - Flashy attacks
13. `alterReality` - Level regeneration
14. Terrain creation effects
