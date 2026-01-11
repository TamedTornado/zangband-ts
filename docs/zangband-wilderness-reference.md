# Zangband Wilderness Generation System Reference

This document provides comprehensive documentation of the wilderness generation system in the Zangband C reference codebase (`../zangband/src`).

## Overview

The wilderness in Zangband is a large outdoor area that connects towns and dungeons. It is generated procedurally using plasma fractal algorithms and a decision tree for terrain selection.

### Key Source Files

| File | Purpose |
|------|---------|
| `wild.h` | Header with constants, structures, and function declarations |
| `wild1.c` | Core generation: decision tree, plasma fractals, rivers, lakes, roads, terrain conversion |
| `wild2.c` | Towns, dungeons, quests, building placement, city rendering |
| `wild3.c` | Block rendering, player movement, day/night, monster spawning |
| `types.h` | Data structure definitions (`wild_type`, `place_type`, `dun_type`, etc.) |
| `defines.h` | Core constants (`WILD_BLOCK_SIZE`, `WILD_VIEW`, etc.) |
| `externs.h` | Global variable declarations |

---

## Dimensions and Constants

### Core Constants (from `defines.h` and `wild.h`)

```c
WILD_BLOCK_SIZE     16       // Each wilderness block is 16x16 squares
WILD_VIEW           9        // Player sees 9x9 blocks (144x144 squares)
WILD_SIZE           129      // Wilderness grid is 129x129 blocks
WILD_CACHE          (MAX_PLAYERS * WILD_VIEW * WILD_VIEW * 2)  // Cache size
WILD_SEA            65471    // Wilderness type >= this means ocean

SEA_FRACTION        4        // 1/4 of wilderness is ocean
LAKE_NUM            4        // Number of lakes to attempt
RIVER_NUM           4        // River starting point grid (4x4 = 16 rivers)
ROAD_DIST           30       // Maximum road connection distance (blocks)
ROAD_MIN            3        // Minimum fractional road distance

NUM_TOWNS           20       // Total towns to create
NUM_DUNGEON         20       // Total dungeons to create
MIN_DIST_TOWN       10       // Minimum separation between towns (blocks)
MIN_DIST_DUNGEON    8        // Minimum separation between dungeons (blocks)
MIN_DIST_QUEST      10       // Minimum separation between quests (blocks)

MAX_GATES           4        // Gates per city (N, S, E, W)
MAX_CITY_BUILD      150      // Building types available
START_STORE_NUM     7        // Stores in starting town

// Town size thresholds (for naming)
T_SIZE_SMALL        158      // Hamlet threshold
T_SIZE_TOWN         178      // Town threshold
T_SIZE_CITY         198      // City threshold
T_SIZE_CASTLE       228      // Castle threshold

// Road/track width levels
ROAD_LEVEL          (WILD_BLOCK_SIZE * 150)
TRACK_LEVEL         (WILD_BLOCK_SIZE * 140)
ROAD_BORDER         (WILD_BLOCK_SIZE * 120)
GROUND_LEVEL        (WILD_BLOCK_SIZE * 100)
```

---

## Data Structures

### Primary Wilderness Union (`types.h:616-622`)

The wilderness uses a **union** to store different data at different generation stages:

```c
union wild_type {
    wild_gen1_type gen;      // Stage 1: Initial height/pop/law maps (u16b)
    wild_gen2_type trans;    // Stage 2: Scaled values + place/info (byte)
    wild_done_type done;     // Stage 3: Final terrain type + monster info
};
```

### Stage 1: Generation (`wild_gen1_type`)

```c
struct wild_gen1_type {
    u16b hgt_map;     // Height value (0-65535, scaled by 16)
    u16b pop_map;     // Population density
    u16b law_map;     // Lawfulness level
};
```

### Stage 2: Transition (`wild_gen2_type`)

```c
struct wild_gen2_type {
    byte hgt_map;     // Scaled height (0-255)
    byte pop_map;     // Scaled population (0-255)
    byte law_map;     // Scaled lawfulness (0-255)
    byte place;       // Place number (town/dungeon/quest index)
    byte dummy;       // Unused padding
    byte info;        // Feature flags (WILD_INFO_*)
};
```

### Stage 3: Final (`wild_done_type`)

```c
struct wild_done_type {
    u16b wild;        // Wilderness generation type (0-65535)
                      // Values >= WILD_SEA (65471) indicate ocean
    byte place;       // Associated place index (0 = none)
    byte info;        // Info flags (WILD_INFO_*)
    byte mon_gen;     // Monster generation level (0-64)
    byte mon_prob;    // Monster probability (0-16)
};
```

### Info Flags (`wild.h`)

```c
#define WILD_INFO_TRACK  0x01  // Track (narrow path)
#define WILD_INFO_ROAD   0x02  // Road (wide path)
#define WILD_INFO_WATER  0x04  // Water boundary (river/lake/ocean edge)
#define WILD_INFO_LAVA   0x08  // Lava boundary
#define WILD_INFO_DUMMY  0x10  // Unused
#define WILD_INFO_SEEN   0x20  // Player has visited this block
#define WILD_INFO_ACID   0x40  // Acid boundary
#define WILD_INFO_QUEST  0x80  // Quest location
```

### Place Structure (`types.h:1783-1811`)

```c
struct place_type {
    u32b seed;                  // RNG seed for reproducible layout
    store_type *store;          // Array of stores/buildings
    dun_type *dungeon;          // Associated dungeon (if any)

    byte type;                  // Place type (TOWN_OLD, TOWN_FRACT, etc.)
    byte numstores;             // Number of stores
    u16b quest_num;             // Quest number if applicable

    byte x, y;                  // Wilderness block coordinates
    byte xsize, ysize;          // Size in blocks (typically 8x8)

    byte data;                  // Population (for towns)
    byte monst_type;            // Monster type (TOWN_MONST_*)

    s16b region;                // Region pointer for level data

    byte gates_x[MAX_GATES];    // Gate X positions (4 gates)
    byte gates_y[MAX_GATES];    // Gate Y positions

    char name[T_NAME_LEN];      // Town/place name
};
```

### Place Types

```c
#define TOWN_OLD      0   // Vanilla town (predefined layout)
#define TOWN_FRACT    1   // Fractal-generated city
#define TOWN_QUEST    2   // Wilderness quest location
#define TOWN_DUNGEON  3   // Dungeon entrance
```

### Monster Types for Towns

```c
#define TOWN_MONST_VILLAGER    1   // Normal humans
#define TOWN_MONST_ELVES       2   // Elf settlements
#define TOWN_MONST_DWARF       3   // Dwarven halls
#define TOWN_MONST_LIZARD      4   // Lizard people
#define TOWN_MONST_MONST       5   // Monsters
#define TOWN_MONST_ABANDONED   6   // No inhabitants
```

### Dungeon Structure (`types.h:1717-1742`)

```c
struct dun_type {
    obj_theme theme;       // Object theme for drops
    u32b habitat;          // Habitat flags for monster selection

    byte min_level;        // Minimum dungeon level
    byte max_level;        // Maximum dungeon level

    s16b rating;           // Current level difficulty rating
    s16b region;           // Region pointer for current level

    u16b rooms;            // Room type flags available
    byte recall_depth;     // Recall depth (furthest descent)

    bool good_item_flag;   // Artifact on this level?

    byte floor;            // Floor terrain type
    byte liquid;           // Liquid type for lakes/rivers
    byte flags;            // Extra flags (DF_ROAD, DF_TRACK)
};
```

### Terrain Type Decision Tree (`types.h:629-709`)

```c
struct wild_choice_tree_type {
    byte info;          // Node type flags:
                        //   Lower 2 bits: DT_HGT(1), DT_POP(2), DT_LAW(3)
                        //   DT_LEFT(4): Left branch is leaf
                        //   DT_RIGHT(8): Right branch is leaf
    byte cutoff;        // Parameter cutoff value (0 = leaf node)
    byte chance1;       // Probability weight for left branch
    byte chance2;       // Probability weight for right branch
    u16b ptrnode1;      // Left pointer (node index or type)
    u16b ptrnode2;      // Right pointer (node index or type)
};

struct wild_gen_data_type {
    byte feat;          // Feature for overhead map display
    byte gen_routine;   // Generation routine number (1-4)
    byte rough_type;    // Monster habitat type
    byte chance;        // Relative probability weight
    byte data[8];       // Parameters for generation routine
};
```

---

## Global Variables (`externs.h`)

```c
extern wild_type **wild;           // 2D array of wilderness blocks [y][x]
extern u32b wild_seed;             // Seed for reproducible block generation
extern blk_ptr **wild_grid;        // Grid of active block pointers
extern blk_ptr *wild_cache;        // Cache of block pointers
extern int **wild_refcount;        // Reference counts for blocks
extern u32b wc_cnt;                // Current cache count

extern u16b place_count;           // Number of places created
extern place_type *place;          // Array of places (towns/dungeons/quests)

extern wild_gen_data_type *wild_gen_data;  // Terrain type definitions
extern wild_choice_tree_type *wild_choice_tree;  // Decision tree nodes

extern int max_wild;               // Actual wilderness size (set to WILD_SIZE)
extern u16b *temp_block[WILD_BLOCK_SIZE + 1];  // Temporary block for fractals
```

---

## Generation Pipeline

### Main Entry Point: `create_wilderness()` (`wild1.c:3497-3587`)

```c
void create_wilderness(void)
{
    // 1. Generate height/population/law plasma fractals
    create_wild_info(&x, &y);  // Returns best starting town location

    // 2. Add large features
    create_rivers();           // Rivers from high to low points
    create_lakes();            // Random lakes (water/lava/acid)

    // 3. Place towns, dungeons, quests
    init_places(x, y);         // Returns FALSE if failed

    // 4. Connect places with roads
    create_roads();

    // 5. Convert to final data structure
    create_terrain();          // Converts trans -> done, sets mon_gen/prob
}
```

### Phase 1: Height/Population/Law Maps

Three independent plasma fractals are generated:

#### `create_hgt_map()` (`wild1.c:2503-2658`)

- Uses diamond-square plasma fractal algorithm
- Maximum correlation length: 256 squares (`grd = 16 * 16`)
- Stores distribution in `wild_temp_dist[]` for scaling
- Values stored as `u16b` (scaled by 16 for precision)

#### `create_pop_map(sea_level)` (`wild1.c:2684-2839`)

- Same algorithm as height map
- Only counts distribution for above-sea-level squares
- Sea level calculated from height distribution

#### `create_law_map(sea_level)` (`wild1.c:2865-3036`)

- Same algorithm as height/population
- Distribution scaled to 0-255 using cumulative distribution

### Phase 2: Rivers (`wild1.c:2205-2328`)

1. Generate `RIVER_NUM * RIVER_NUM` (16) starting points evenly distributed
2. Sort points by height (highest first)
3. Connect highest points to closest next-highest using `link_river()`
4. `link_river()` uses recursive fractal line with perturbation
5. Sets `WILD_INFO_WATER` flag on river squares
6. Stops when reaching below-sea-level heights

### Phase 3: Lakes (`wild1.c:2344-2464`)

1. Try `LAKE_NUM` (4) times to place lakes
2. Generate 17x17 plasma fractal for lake shape
3. Pick random location, check for 16x16 clear space above sea level
4. Lake type depends on location:
   - Water: if river crosses, or lawful/populous region
   - Lava: high altitude, lawless, low population
   - Acid: low altitude, lawless, low population
5. Sets appropriate `WILD_INFO_*` flag

### Phase 4: Places (`wild2.c:2683-2701`)

```c
bool init_places(int xx, int yy)
{
    place_count = 1;           // Index 0 is reserved/unused

    create_towns(&xx, &yy);    // Create NUM_TOWNS (20) towns
    create_dungeons(xx, yy);   // Create NUM_DUNGEON (20) dungeons
    create_quests(xx, yy);     // Create wilderness quests

    return TRUE;
}
```

### Phase 5: Roads (`wild1.c:1780-2078`)

1. Find all linkable places (towns and dungeons with DF_ROAD/DF_TRACK)
2. Tabulate distances between places < `ROAD_DIST` (30)
3. Connect closest pairs, preferring triangles (3-way crossroads)
4. `road_link()` uses recursive fractal line with perturbation
5. Sets `WILD_INFO_ROAD` or `WILD_INFO_TRACK` based on law+population

### Phase 6: Terrain Conversion (`wild1.c:3361-3477`)

```c
static void create_terrain(void)
{
    for each block (i, j):
        if hgt < 256/SEA_FRACTION:
            // Ocean: wild = 65535 - hgt
            // Higher hgt values = shallower water
        else:
            // Land: Look up terrain from decision tree
            wild = get_gen_type(hgt, pop, law);

        // Set monster generation values
        mon_gen = (256 - law) / 4;  // 0-64, higher in lawless areas
        mon_prob = pop / 16;         // 0-16, higher in populous areas

        // Override for places
        if (place_num):
            set_mon_wild_values(place[place_num].monst_type, &w_ptr->done);
}
```

---

## Town Generation

Towns are stored in a "region" - a separate tile grid that gets overlaid on wilderness.
The region is allocated with all zeros (C_MAKE wipes memory), so all tiles start as
FEAT_NONE (0). Only walls, buildings, and floors are explicitly drawn.

**IMPORTANT**: There are TWO town generation modes controlled by the `vanilla_town` birth option:
- `vanilla_town=TRUE`: Uses `van_town_gen()` (TOWN_OLD) - single rectangular 66x22 town
  with explicit floor fill (no wilderness inside)
- `vanilla_town=FALSE` (wilderness mode): Uses `draw_city()` (TOWN_FRACT) - multiple
  fractal-shaped towns where wilderness may show through between buildings

### Key Data Structures

```c
// temp_block is 16x16 - one cell per BUILDING SLOT (not per tile!)
// Each cell represents an 8x8 tile area where a building can be placed
u16b *temp_block[WILD_BLOCK_SIZE + 1];  // 17x17 for edge handling

// Cell states after find_walls()/fill_town_driver():
#define CITY_OUTSIDE  0       // Outside city boundary
#define CITY_WALL     1       // Boundary wall location
#define CITY_INSIDE   2       // Interior (building slot)

// Building position tracking (filled by fill_town_driver)
static byte build_x[256];     // X coords of building slots
static byte build_y[256];     // Y coords of building slots
static byte build_pop[256];   // Population value for each slot
static byte build_count;      // Number of building slots
```

### Town Dimensions

- `pl_ptr->xsize = pl_ptr->ysize = 8` (blocks)
- Region size = 8 * 16 = 128x128 tiles
- temp_block = 16x16 cells, each cell = 8x8 tiles

### Town Creation: `create_city()` (`wild2.c:597-873`)

```c
static bool create_city(int x, int y, int town_num)
{
    // 1. Calculate population
    // Starting town (town_num==1) uses fixed pop = 192
    pop = ((wild[y][x].trans.pop_map + wild[y][x].trans.law_map) /
           rand_range(4, 32)) + 128;
    if (town_num == 1) pop = 64 + 128;  // = 192

    // 2. Generate town name, store seed
    select_town_name(pl_ptr->name, pop);
    pl_ptr->seed = randint0(0x10000000);
    pl_ptr->data = pop;  // Save for draw_city

    // 3. Generate plasma fractal in temp_block[16][16]
    Rand_value = pl_ptr->seed;
    clear_temp_block();
    set_temp_corner_val(WILD_BLOCK_SIZE * 64);   // = 1024
    set_temp_mid(WILD_BLOCK_SIZE * pop);         // = 16 * pop
    frac_block();

    // 4. Convert plasma values to city shape
    find_walls();       // Mark CITY_OUTSIDE, CITY_WALL
    count = fill_town_driver();  // Flood fill interior, count building slots
    if (count < 7) return FALSE;
    remove_islands();   // Remove disconnected wall segments

    // 5. Find gate positions (N/S/E/W extremes of city shape)
    // Stored in pl_ptr->gates_x[4], gates_y[4]

    // 6. Select buildings for each slot
    // Uses build_pop[] (from plasma), magic, law to weight building types
}
```

### City Shape Algorithm

**find_walls()** (`wild2.c:477-528`):
```c
// 1. Threshold: values < WILD_BLOCK_SIZE * 128 (2048) become CITY_OUTSIDE
for each cell in temp_block:
    if (temp_block[j][i] < WILD_BLOCK_SIZE * 128)
        temp_block[j][i] = CITY_OUTSIDE;

// 2. Mark boundaries: any inside cell adjacent to CITY_OUTSIDE becomes CITY_WALL
for each cell not CITY_OUTSIDE:
    if any neighbor is CITY_OUTSIDE or out-of-bounds:
        temp_block[j][i] = CITY_WALL;
```

**fill_town_driver()** (`wild2.c:533-545`):
```c
// Flood fill from center, marking CITY_INSIDE and recording building positions
fill_town(WILD_BLOCK_SIZE / 2, WILD_BLOCK_SIZE / 2);  // Start at (8,8)

// Recursive fill_town() marks each cell as CITY_INSIDE,
// records position in build_x/y, saves plasma value in build_pop
```

### Town Drawing: `draw_city()` (`wild2.c:1146-1259`)

```c
void draw_city(place_type *pl_ptr)
{
    // 1. Allocate region (128x128 tiles, all zeros = FEAT_NONE)
    create_region(pl_ptr, 8 * WILD_BLOCK_SIZE, 8 * WILD_BLOCK_SIZE, REGION_OVER);

    // 2. Regenerate city shape (same seed = same result)
    Rand_value = pl_ptr->seed;
    // ... plasma, find_walls, fill_town_driver, remove_islands ...

    // 3. Draw walls at boundaries (NOT filling entire cells!)
    for each CITY_WALL cell at (i, j):
        x = i * 8;  y = j * 8;  // Convert to tile coords

        // Draw connecting wall segments (2 tiles wide)
        if neighbor above is CITY_WALL:
            generate_fill(x+3, y, x+4, y+4, FEAT_PERM_SOLID);
        // etc for left, right, down

        // Draw gates at gate positions
        draw_gates(i, j, pl_ptr);

    // 4. Draw buildings at ALL CITY_INSIDE positions
    // Every interior cell gets a building, which fills it with floor
    for each building slot:
        draw_building(build_x[i], build_y[i], building_type, pl_ptr);
}
```

**Floor coverage in fractal towns (TOWN_FRACT)**:
- C code: Buildings are small wall rectangles (~5x5) with a door
- C code: `draw_store()` does NOT fill floor around buildings
- C code: Space between buildings remains FEAT_NONE (transparent)
- **TypeScript port**: We fill all CITY_INSIDE cells with floor before drawing
  walls/buildings to prevent wilderness showing through inside town walls

**Floor coverage in vanilla town (TOWN_OLD)**:
- `van_town_gen()` explicitly fills interior with FEAT_FLOOR (lines 2943-2950)
- Then builds stores on top
- No wilderness shows through - entire interior is floor

### Building Selection: `select_building()` (`wild2.c:315-414`)

Buildings are selected based on:
- Distance in parameter space (pop, magic, law) from building's preferred values
- Building rarity
- Number already placed

```c
// From wild2.c:32-150
wild_building_type wild_build[MAX_CITY_BUILD] = {
    // gen, field, type, pop, magic, law, rarity
    {0, FT_STORE_GENERAL, BT_STORE, 100, 150, 150, 2},
    {0, FT_STORE_ARMOURY, BT_STORE, 150, 150, 100, 1},
    // ... 150 building types total
};
```

### Starting Town Buildings (`wild2.c:152-162`)

```c
static int wild_first_town[START_STORE_NUM] = {
    BUILD_STAIRS,
    BUILD_STORE_HOME,
    BUILD_SUPPLIES0,
    BUILD_WARHALL0,
    BUILD_STORE_TEMPLE,
    BUILD_STORE_MAGIC,
    BUILD_BLACK0
};
```

### Town Naming (`wild2.c:218-311`)

Town names are generated by:
1. Generate random "elvish" name using `get_table_name()`
2. Add suffix based on population:
   - Hamlet (<158): "ville" or plain
   - Tiny town (<178): "Dun" or plain
   - Large town (<198): "ton" or plain
   - City (<228): "ford", "City", "View", "Fort" or plain
   - Castle (>=228): "Castle", "Keep" or plain

---

## Dungeon Placement

### Dungeon Creation: `create_dungeons()` (`wild2.c:2516-2679`)

1. Attempt to place `NUM_DUNGEON` (20) dungeons
2. Require 8x8 block clear space, minimum separation `MIN_DIST_DUNGEON` (8)
3. Dungeons are typed (15 types) and matched to wilderness based on scoring

```c
// Dungeon types (15 total):
// Sewer, Orc Cave, Troll Cave, Giant Cave, Dragon Cave,
// Undead Cave, Ancient Tomb, Demon Cave, Ruins, Graveyards,
// Caverns, Planar Anomaly, Hell, Horror, Mines, Cities
```

---

## Block Generation at Runtime

### Block Allocation: `allocate_block()` (`wild3.c:1840-1886`)

```c
static void allocate_block(int x, int y)
{
    wild_refcount[y][x]++;

    if (!wild_grid[y][x]) {
        // Get block from cache
        wild_grid[y][x] = wild_cache[wc_cnt++];

        if (character_loaded) {
            gen_block(x, y);
        }

        // Handle place region reference counting
        if (place_num) {
            incref_region(place[place_num].region);
        }
    }
}
```

### Block Generation: `gen_block()` (`wild3.c:1542-1647`)

```c
static void gen_block(int x, int y)
{
    // Use deterministic RNG based on position
    Rand_quick = TRUE;
    Rand_value = wild_seed + x + y * max_wild;

    w_type = wild[y][x].done.wild;

    if (w_type >= WILD_SEA) {
        make_wild_sea(block_ptr, w_type - WILD_SEA);
    }
    else if (w_type == 0) {
        fill_perm_wall(block_ptr);  // Vanilla town wall
    }
    else {
        // Generate terrain using type's routine
        gen_block_helper(block_ptr, wild_gen_data[w_type].data,
                        wild_gen_data[w_type].gen_routine, road);

        // Blend with adjacent terrain
        blend_block(x, y, block_ptr, w_type);

        // Add water/lava/acid boundaries
        if (wild_info_bounds(x, y, WILD_INFO_WATER)) {
            frac_block();
            wild_add_gradient(block_ptr, FEAT_SHAL_WATER, FEAT_DEEP_WATER);
        }
        // Similar for LAVA and ACID

        // Add roads
        make_wild_road(block_ptr, x, y);
    }

    Rand_quick = FALSE;

    // Overlay place if present
    if (wild[y][x].done.place) {
        overlay_place(x, y, w_place, block_ptr);
    }

    // Day/night lighting
    light_dark_block(x, y);

    // Add monsters
    add_monsters_block(x, y);
}
```

### Town/Place Overlay: `overlay_place()` (`wild3.c:70-170`)

Town tiles are overlaid on top of wilderness terrain. Transparency is achieved using `FEAT_NONE`:

```c
#define FEAT_NONE  0x00  // defines.h:1131

static void overlay_place(int x, int y, u16b w_place, blk_ptr block_ptr)
{
    // Find block offset within place region
    x1 = (x - place[w_place].x) * WILD_BLOCK_SIZE;
    y1 = (y - place[w_place].y) * WILD_BLOCK_SIZE;

    // Copy 16x16 block from the place region
    for (j = 0; j < WILD_BLOCK_SIZE; j++) {
        for (i = 0; i < WILD_BLOCK_SIZE; i++) {
            c_ptr = access_region(x1 + i, y1 + j, pl_ptr->region);

            // Only copy terrain if there is something there.
            // FEAT_NONE (0) = transparent, wilderness shows through
            if (c_ptr->feat != FEAT_NONE) {
                block_ptr[j][i].feat = c_ptr->feat;
            }

            // Also instantiate fields (doors, buildings, traps, quests)
            // ...
        }
    }
}
```

**Key insight**: Town tiles with `feat == 0` (FEAT_NONE) are transparent - the underlying wilderness terrain shows through. This allows plasma-shaped town boundaries where only the interior is filled.

### Terrain Generation Routines (`wild3.c:931-1200`)

```c
// Type 1: Plasma fractal with weighted terrain probabilities
make_wild_01(block_ptr, data, road);
// data[0,2,4,6] = terrain features
// data[1,3,5,7] = probability weights

// Type 2: Uniform field with rare outcrops
make_wild_02(block_ptr, data, road);
// data[0] = base terrain, data[1+] = rare features with probabilities

// Type 3: Base terrain with circular overlay
make_wild_03(block_ptr, data, road);
// data[0] = base terrain type, data[1-3] = overlay terrains

// Type 4: Farm generation
make_wild_04(block_ptr, data, road);
// Generates building in field (grass/dirt)
```

---

## Player Movement

### Move Handler: `move_wild()` (`wild3.c:1923-2026`)

```c
void move_wild(void)
{
    // Get current block position
    x = p_ptr->wilderness_x / WILD_BLOCK_SIZE;
    y = p_ptr->wilderness_y / WILD_BLOCK_SIZE;

    // Mark block as seen
    wild[y][x].done.info |= WILD_INFO_SEEN;

    // Get viewport corner
    shift_in_bounds(&x, &y);

    // If block changed, update viewport
    if (ox != x || oy != y) {
        // Shift player memory grids
        while (ox < x) { ox++; shift_right(); }
        while (ox > x) { ox--; shift_left(); }
        while (oy < y) { oy++; shift_down(); }
        while (oy > y) { oy--; shift_up(); }

        // Update bounds
        p_ptr->min_wid = x * WILD_BLOCK_SIZE;
        p_ptr->min_hgt = y * WILD_BLOCK_SIZE;
        p_ptr->max_wid = p_ptr->min_wid + WILD_VIEW * WILD_BLOCK_SIZE;
        p_ptr->max_hgt = p_ptr->min_hgt + WILD_VIEW * WILD_BLOCK_SIZE;

        // Allocate new blocks
        for (i = 0; i < WILD_VIEW; i++)
            for (j = 0; j < WILD_VIEW; j++)
                allocate_block(x + i, y + j);

        // Deallocate old blocks
        for (i = 0; i < WILD_VIEW; i++)
            for (j = 0; j < WILD_VIEW; j++)
                del_block(old_x + i, old_y + j);
    }
}
```

---

## Seed/RNG Usage

### Global Wilderness Seed

```c
extern u32b wild_seed;  // Set at game creation, saved in savefile
```

### Block-Level Reproducibility

Each block uses deterministic RNG:

```c
// In gen_block():
Rand_quick = TRUE;
Rand_value = wild_seed + x + y * max_wild;  // Unique seed per block
// ... generation code ...
Rand_quick = FALSE;
```

### Town-Level Reproducibility

Each town stores its own seed:

```c
// In create_city():
pl_ptr->seed = randint0(0x10000000);

// In draw_city():
Rand_quick = TRUE;
Rand_value = pl_ptr->seed;
// ... drawing code ...
Rand_quick = FALSE;
```

---

## Monster Generation

### Block Monster Values (`wild1.c:3420-3433`)

```c
// Toughness (level 0-64): harder in lawless areas
w_ptr->done.mon_gen = (256 - law) / 4;
w_ptr->done.mon_gen = MAX(1, w_ptr->done.mon_gen - 5);

// Probability (0-16): more common in populous areas
w_ptr->done.mon_prob = pop / 16;
```

### Monster Spawning (`wild3.c:1419-1466`)

```c
static void add_monsters_block(int x, int y)
{
    // Base probability per square
    if (daytime)
        prob = 32786;   // Rarer during day
    else
        prob = 20000;   // More common at night

    // Scale by block's monster probability
    prob /= (wild[y][x].done.mon_prob + 1);

    for each square (i, j):
        if (randint0(prob) == 0) {
            // 50% chance awake vs asleep
            place_monster(xx + i, yy + j, !one_in_(2), TRUE, 0);
        }
}
```

---

## Day/Night Cycle

### Lighting: `light_dark_block()` (`wild3.c:1512-1536`)

```c
static void light_dark_block(int x, int y)
{
    // Day check: first half of TOWN_DAWN cycle
    daytime = ((turn % (10L * TOWN_DAWN)) < ((10L * TOWN_DAWN) / 2));

    if (daytime) {
        wild[y][x].done.info |= WILD_INFO_SEEN;
    }

    for each square:
        light_dark_square(x, y, daytime);
}
```

---

## Decision Tree Algorithm

### Terrain Type Lookup: `get_gen_type()` (`wild1.c:52-188`)

The decision tree provides O(log n) lookup for terrain types based on height/population/law values.

```c
static u16b get_gen_type(byte hgt, byte pop, byte law)
{
    int node = 0;

    while (TRUE) {
        tree_ptr = &wild_choice_tree[node];

        if (tree_ptr->cutoff == 0) {
            // Leaf node: randomly choose based on chance weights
            if (randint1(tree_ptr->chance1 + tree_ptr->chance2) > tree_ptr->chance2)
                branch = TRUE;   // Left
            else
                branch = FALSE;  // Right
        }
        else {
            // Internal node: compare parameter to cutoff
            switch (tree_ptr->info & 0x03) {
                case DT_HGT: branch = (tree_ptr->cutoff >= hgt); break;
                case DT_POP: branch = (tree_ptr->cutoff >= pop); break;
                case DT_LAW: branch = (tree_ptr->cutoff >= law); break;
            }
        }

        if (branch) {
            if (tree_ptr->info & DT_LEFT)
                return tree_ptr->ptrnode1;  // Leaf - return type
            else
                node = tree_ptr->ptrnode1;  // Continue traversal
        }
        else {
            if (tree_ptr->info & DT_RIGHT)
                return tree_ptr->ptrnode2;  // Leaf - return type
            else
                node = tree_ptr->ptrnode2;  // Continue traversal
        }
    }
}
```

The tree is built from `w_info.txt` data at game initialization.

---

## Summary: Generation Order

1. **Plasma Fractals**: Generate height, population, law maps
2. **Rivers**: Connect high points with fractal lines
3. **Lakes**: Place water/lava/acid lakes
4. **Towns**: Place NUM_TOWNS (20) cities with plasma-shaped boundaries
5. **Dungeons**: Place NUM_DUNGEON (20) dungeon entrances
6. **Quests**: Place wilderness quest locations
7. **Roads**: Connect towns and dungeons with fractal paths
8. **Terrain Conversion**: Convert transition data to final terrain types
9. **Runtime**: Generate individual 16x16 blocks on demand using deterministic RNG
