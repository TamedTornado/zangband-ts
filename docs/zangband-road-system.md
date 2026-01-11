# Zangband C Road System - Comprehensive Reference

## Overview

The Zangband C roguelike implements a sophisticated road system for the wilderness map. Roads connect towns, quests, and dungeons across the wilderness, and are rendered at the tile level using gradient interpolation and smoothing algorithms. This document comprehensively documents the road creation and rendering systems for direct comparison with the TypeScript port.

---

## Part 1: Constants and Data Structures

### Road Width and Rendering Constants

Located in `wild.h` (lines 68-72):

```c
/* Road constants used to define width of the path */
#define ROAD_LEVEL      (WILD_BLOCK_SIZE * 150)
#define TRACK_LEVEL     (WILD_BLOCK_SIZE * 140)
#define ROAD_BORDER     (WILD_BLOCK_SIZE * 120)
#define GROUND_LEVEL    (WILD_BLOCK_SIZE * 100)
```

**Interpretation:**
- `WILD_BLOCK_SIZE` = 16 (standard wilderness block size)
- `ROAD_LEVEL` = 2400 - Innermost "density" for proper roads
- `TRACK_LEVEL` = 2240 - Intermediate density for tracks
- `ROAD_BORDER` = 1920 - Threshold above which tiles become road tiles
- `GROUND_LEVEL` = 1600 - Base ground density value

These are gradient/density values used in the `smooth_block()` interpolation algorithm. Tiles with `temp_block[j][i] >= ROAD_BORDER` (1920) are converted to road terrain.

### Connection Constants

Located in `wild.h` (lines 27-30):

```c
/* Maximum distance a road can connect */
#define ROAD_DIST       30

/* Minimum fractional distance a road can approach a non-connecting town */
#define ROAD_MIN        3
```

**Interpretation:**
- Roads connect towns within `ROAD_DIST` (30) wilderness blocks
- When checking if a road "runs through" another town, the threshold is `dist / ROAD_MIN` (distance / 3)

### Wilderness Information Flags

Located in `defines.h`:

```c
#define WILD_INFO_TRACK    0x01    /* Track (narrow road) flag */
#define WILD_INFO_ROAD     0x02    /* Road (wide road) flag */
#define WILD_INFO_WATER    0x04    /* Water boundary flag */
#define WILD_INFO_LAVA     0x08    /* Lava boundary flag */
#define WILD_INFO_SEEN     0x20    /* Player has seen this square */
#define WILD_INFO_ACID     0x40    /* Acid boundary flag */
```

These flags are set in the `wild[y][x].done.info` field during road creation (`wild1.c`).

### Direction Mapping Arrays

Located in `tables.c`:

```c
const s16b ddx[10] = { 0, -1, 0, 1, -1, 0, 1, -1, 0, 1 };
const s16b ddy[10] = { 0, 1, 1, 1, 0, 0, 0, -1, -1, -1 };
```

**Direction Index Mapping:**
- Index 0: Center (0, 0)
- Index 1: Southwest (-1, 1)
- Index 2: South (0, 1)
- Index 3: Southeast (1, 1)
- Index 4: West (-1, 0)
- Index 5: Center (0, 0)
- Index 6: East (1, 0)
- Index 7: Northwest (-1, -1)
- Index 8: North (0, -1)
- Index 9: Northeast (1, -1)

**Note:** Index 5 is redundant (also center). Indices 2, 4, 6, 8 are orthogonal directions; 1, 3, 7, 9 are diagonals.

---

## Part 2: Road Creation Algorithm

### Overview

The road creation system creates roads between nearby places (towns, dungeons, quests) in three stages:

1. **Distance Calculation** - Compute distances between all road-eligible places
2. **Minimum Spanning Tree** - Connect places using shortest paths, with triangulation for crossroads
3. **Road Linking** - Draw actual road paths using recursive midpoint perturbation

### Stage 1: Eligibility Check - `is_road_place()`

**Location:** `wild1.c:1570-1609`

```c
static bool is_road_place(u16b place_num)
{
    place_type *pl_ptr = &place[place_num];

    switch (pl_ptr->type)
    {
        case TOWN_QUEST:
        {
            /* No roads to wilderness quests */
            return (FALSE);
        }

        case TOWN_DUNGEON:
        {
            dun_type *d_ptr = pl_ptr->dungeon;
            wild_gen2_type *w_ptr = &wild[pl_ptr->y][pl_ptr->x].trans;

            if (w_ptr->law_map + w_ptr->pop_map < 256)
            {
                /* Can we connect a track? */
                if (d_ptr->flags & DF_TRACK) return (TRUE);
            }
            else
            {
                /* Can we connect a road? */
                if (d_ptr->flags & (DF_ROAD)) return (TRUE);
            }

            /* No roads here */
            return (FALSE);
        }

        default:
        {
            /* Default to true otherwise */
            return (TRUE);
        }
    }
}
```

**Logic:**
- **Wilderness quests:** Always ineligible (no roads)
- **Dungeons:** Check if dungeon has `DF_ROAD` or `DF_TRACK` flags set, AND check the location's law + population
  - If `law_map + pop_map < 256`: Allow track if `DF_TRACK` flag set
  - If `law_map + pop_map >= 256`: Allow road if `DF_ROAD` flag set
- **Towns/Other places:** Always eligible by default

### Stage 2: Distance Matrix and Connection Strategy - `create_roads()`

**Location:** `wild1.c:1780-2066`

The algorithm uses a 2D matrix to track connections:

```c
static void create_roads(void)
{
    u16b i, j, places = 0, links = 0;
    u16b x1, x2, x3, y1, y2, y3;
    s16b place1, place2, place3, place4;
    u16b dist, dist2, max_dist;
    u16b **link_list;      /* Distance matrix (or 0 if already connected) */
    u16b *place_number;    /* Maps array index to place number */

    /* 1. Count eligible places */
    for (i = 1; i < place_count; i++)
    {
        if (is_road_place(i))
        {
            places++;
        }
    }

    /* 2. Allocate and populate lookup table */
    C_MAKE(link_list, places, u16b *);
    for (i = 0; i < places; i++)
    {
        C_MAKE(link_list[i], places, u16b);
    }
    C_MAKE(place_number, places, u16b);

    places = 0;
    for (i = 1; i < place_count; i++)
    {
        if (is_road_place(i))
        {
            place_number[places] = i;
            places++;
        }
    }

    /* 3. Build distance matrix - only store distances < ROAD_DIST */
    for (i = 0; i < places; i++)
    {
        for (j = i + 1; j < places; j++)
        {
            dist = distance(place[place_number[i]].x, place[place_number[i]].y,
                            place[place_number[j]].x, place[place_number[j]].y);

            if (dist < ROAD_DIST)  /* ROAD_DIST = 30 */
            {
                link_list[j][i] = dist;
                link_list[i][j] = dist;
                links += 2;  /* Bidirectional */
            }
        }
    }
```

**Connection Strategy:**

The main loop (`while (links)`) iteratively:

1. **Finds the shortest unconnected link**
   ```c
   /* Find shortest link where link_list[j][i] != 0 */
   max_dist = ROAD_DIST;
   place1 = -1;
   place2 = -1;

   for (i = 0; i < places; i++)
   {
       for (j = i + 1; j < places; j++)
       {
           dist = link_list[j][i];
           if (!dist) continue;  /* Already connected */

           if (dist < max_dist)
           {
               max_dist = dist;
               place1 = i;
               place2 = j;
           }
       }
   }
   ```

2. **Searches for a third place to form a triangle/crossroads**
   ```c
   /* Find a third place i that connects to BOTH place1 and place2 */
   for (i = 0; i < places; i++)
   {
       if ((i == place1) || (i == place2)) continue;

       dist = link_list[place1][i];
       if (!dist) continue;

       dist2 = link_list[place2][i];
       if (!dist2) continue;

       /* Found valid triangle - pick the one with smallest combined distance */
       if (dist + dist2 < max_dist)
       {
           place3 = i;
           max_dist = dist + dist2;
       }
   }
   ```

3. **Creates a crossroads at the triangle centroid (if triangle found)**
   ```c
   if (place3 != -1)
   {
       /* Mark all three connections as used */
       link_list[place1][place2] = ROAD_DIST * 2 + 1;
       link_list[place1][place3] = ROAD_DIST * 2 + 1;
       link_list[place2][place1] = ROAD_DIST * 2 + 1;
       link_list[place2][place3] = ROAD_DIST * 2 + 1;
       link_list[place3][place1] = ROAD_DIST * 2 + 1;
       link_list[place3][place2] = ROAD_DIST * 2 + 1;

       links -= 6;  /* Three connections, bidirectional = 6 links */

       /* Convert to real place numbers */
       place1 = place_number[place1];
       place2 = place_number[place2];
       place3 = place_number[place3];

       /* Create crossroads at centroid */
       x2 = (place[place1].x + place[place2].x + place[place3].x) / 3;
       y2 = (place[place1].y + place[place2].y + place[place3].y) / 3;

       /* Connect each place to the crossroads center */
       x1 = x2; y1 = y2;
       road_connect(&x1, &y1, place1);
       road_link(x1, y1, x2, y2);

       /* Repeat for place2 and place3... */
   }
   ```

4. **Otherwise, connects the two places directly (if no obstacles)**
   ```c
   else
   {
       /* Check if any other places lie in the way */
       /* Distance threshold to check: (dist / 2) + 1 */
       max_dist = (dist / 2) + 1;

       j = 0;  /* Flag: 0 = no obstacles, 1 = obstacle found */
       for (i = 0; i < places; i++)
       {
           if ((i == place3) || (i == place4)) continue;

           x3 = place[place_number[i]].x;
           y3 = place[place_number[i]].y;

           /* Must be close to one of the endpoints */
           if ((distance(x1, y1, x3, y3) > max_dist) &&
               (distance(x2, y2, x3, y3) > max_dist)) continue;

           /* Check distance to the road line itself */
           /* If perpendicular distance > dist / ROAD_MIN (i.e., dist / 3), skip it */
           if (dist_to_line(x3, y3, x1, y1, x2, y2) > dist / ROAD_MIN)
           {
               continue;
           }

           /* Place is in the way! */
           j = 1;
           break;
       }

       /* Only connect if no obstacles */
       if (j == 0)
       {
           road_connect(&x1, &y1, place1);
           road_connect(&x2, &y2, place2);
           road_link(x1, y1, x2, y2);
       }
   }
   ```

### Stage 3: Road Linking - `road_link()`

**Location:** `wild1.c:1615-1694`

The core recursive road-drawing algorithm:

```c
static void road_link(u16b x1, u16b y1, u16b x2, u16b y2)
{
    s16b xn, yn, i;
    s16b dx, dy, changex, changey;
    u16b dist = distance(x1, y1, x2, y2);
    wild_gen2_type *w_ptr;

    /* Recursively subdivide long roads */
    if (dist > 6)
    {
        /* Find midpoint */
        dx = (x2 - x1) / 2;
        dy = (y2 - y1) / 2;

        /* Add perpendicular perturbation */
        if (dy != 0)
        {
            changex = randint1(ABS(dy)) - ABS(dy) / 2;
        }
        else
        {
            changex = 0;
        }

        if (dx != 0)
        {
            changey = randint1(ABS(dx)) - ABS(dx) / 2;
        }
        else
        {
            changey = 0;
        }

        xn = x1 + dx + changex;
        yn = y1 + dy + changey;

        /* Bounds checking */
        if (xn < 0) xn = 0;
        if (yn < 0) yn = 0;
        if (xn >= max_wild) xn = max_wild - 1;
        if (yn >= max_wild) yn = max_wild - 1;

        /* Recursively link segments */
        road_link(x1, y1, xn, yn);
        road_link(xn, yn, x2, y2);

        return;
    }

    /* For short segments, mark all squares along the line */
    if (dist < 2) return;

    for (i = 0; i <= dist; i++)
    {
        xn = x1 + i * (x2 - x1) / dist;
        yn = y1 + i * (y2 - y1) / dist;

        w_ptr = &wild[yn][xn].trans;

        /* Skip hazardous terrain */
        if (w_ptr->info & (WILD_INFO_LAVA | WILD_INFO_ACID)) continue;

        /* Skip ocean (deep water) */
        if (w_ptr->hgt_map < 256 / SEA_FRACTION) continue;

        /* Mark as road or track based on location's civilization level */
        if (w_ptr->law_map + w_ptr->pop_map < 256)
        {
            w_ptr->info |= WILD_INFO_TRACK;  /* Narrow road in wilderness */
        }
        else
        {
            w_ptr->info |= WILD_INFO_ROAD;   /* Wide road in towns */
        }
    }
}
```

**Algorithm Details:**

1. **Midpoint Perturbation (Fractal Road Generation)**
   - If distance > 6, subdivide into two segments
   - Find the midpoint between the two endpoints
   - Add a random perpendicular offset proportional to the distance
   - Recursively call `road_link()` on both halves
   - This creates natural-looking curved roads

2. **Linear Interpolation for Final Segments**
   - Once distance <= 6, mark each square along the straight line
   - Use linear interpolation: `xn = x1 + i * (x2 - x1) / dist`
   - Two markers are only placed in wilderness blocks that:
     - Are NOT over lava or acid
     - Are NOT over ocean (checked via `hgt_map < 256 / 4`)

3. **Road vs. Track Selection**
   - Based on the wilderness block's civilization level (`law_map + pop_map`)
   - Less civilized areas get tracks (narrower, less developed)
   - More civilized areas get roads (wider, more developed)

### Stage 4: Connection Point Selection - `road_connect()`

**Location:** `wild1.c:1706-1770`

```c
static void road_connect(u16b *x, u16b *y, u16b place_num)
{
    place_type *pl_ptr = &place[place_num];
    int dist = max_wild * 2;
    int cdist, k;
    u16b x1 = *x, y1 = *y;

    /* Find nearest gate for fractured towns */
    if (pl_ptr->type == TOWN_FRACT)
    {
        for (k = 0; k < MAX_GATES; k++)
        {
            /* Distance from gate center to external point */
            cdist = distance(x1, y1,
                             pl_ptr->x + pl_ptr->gates_x[k] / 2,
                             pl_ptr->y + pl_ptr->gates_y[k] / 2);

            if (cdist < dist)
            {
                dist = cdist;

                /* Update (x,y) to point to this gate */
                *x = pl_ptr->x + pl_ptr->gates_x[k] / 2;
                *y = pl_ptr->y + pl_ptr->gates_y[k] / 2;
            }
        }

        return;
    }

    /* For other place types, use the center */
    *x = pl_ptr->x + pl_ptr->xsize / 2;
    *y = pl_ptr->y + pl_ptr->ysize / 2;
}
```

**Purpose:**
- Given an external point (x, y), find the best connection point at a place
- For towns with gates (TOWN_FRACT): Find the closest gate
- For other types: Use the place's center

---

## Part 3: Road Rendering Algorithm

### Overview

Roads are rendered at the tile level within wilderness blocks. The rendering uses a gradient-based approach where:

1. The `temp_block[][]` array stores "density" values for each position
2. Orthogonal directions (cardinal) and diagonals are set based on adjacent wilderness blocks
3. The `smooth_block()` function interpolates densities between set values
4. Tiles with density >= `ROAD_BORDER` (1920) are rendered as road tiles

### Main Rendering Function - `make_wild_road()`

**Location:** `wild3.c:658-875`

```c
static void make_wild_road(blk_ptr block_ptr, int x, int y)
{
    int i, j, x1, y1;
    u16b grad1[10], grad2[10], any;
    cave_type *c_ptr;
    bool bridge = FALSE, need_bridge = FALSE;

    /* Only draw if road is on the square */
    if (!(wild[y][x].done.info & (WILD_INFO_TRACK | WILD_INFO_ROAD)))
    {
        /* Check only orthogonal directions (indices 2, 4, 6, 8) */
        for (i = 2; i < 10; i += 2)  /* 2, 4, 6, 8 - cardinal directions */
        {
            x1 = x + ddx[i];
            y1 = y + ddy[i];

            grad1[i] = 0;

            if ((x1 >= 0) && (x1 < max_wild) && (y1 >= 0) && (y1 < max_wild))
            {
                if (wild[y1][x1].done.info & WILD_INFO_TRACK)
                {
                    grad1[i] = TRACK_LEVEL;  /* 2240 */
                    any = TRUE;
                }

                if (wild[y1][x1].done.info & WILD_INFO_ROAD)
                {
                    grad1[i] = ROAD_LEVEL;  /* 2400 */
                    any = TRUE;

                    /* Bridges are narrower than roads */
                    if (wild[y1][x1].done.info & WILD_INFO_WATER)
                    {
                        grad1[i] = TRACK_LEVEL;  /* Downgrade to track for bridges */
                    }
                }
            }
        }

        if (!any) return;  /* No adjacent roads, no rendering needed */

        /* Convert grad1 to grad2 by looking at diagonal combinations */
        for (i = 1; i < 10; i++)
        {
            grad2[i] = GROUND_LEVEL;  /* 1600 - default */
        }

        /* Set diagonals based on orthogonal neighbors */

        /* Upper left (index 7): set if BOTH North and West are roads */
        if (grad1[4] && grad1[8])
        {
            grad2[7] = MAX(grad1[4], grad1[8]);
            any = FALSE;
        }

        /* Upper right (index 9) */
        if (grad1[8] && grad1[6])
        {
            grad2[9] = MAX(grad1[8], grad1[6]);
            any = FALSE;
        }

        /* Lower right (index 3) */
        if (grad1[6] && grad1[2])
        {
            grad2[3] = MAX(grad1[6], grad1[2]);
            any = FALSE;
        }

        /* Lower left (index 1) */
        if (grad1[2] && grad1[4])
        {
            grad2[1] = MAX(grad1[2], grad1[4]);
            any = FALSE;
        }

        if (any) return;  /* No diagonals set = no actual road pattern */
    }
    else
    {
        /* This block HAS a road/track flag set - use all 8 directions */
        for (i = 1; i < 10; i++)
        {
            x1 = x + ddx[i];
            y1 = y + ddy[i];

            grad2[i] = GROUND_LEVEL;

            if ((x1 >= 0) && (x1 < max_wild) && (y1 >= 0) && (y1 < max_wild))
            {
                if (wild[y1][x1].done.info & WILD_INFO_TRACK)
                {
                    grad2[i] = TRACK_LEVEL;
                }

                if (wild[y1][x1].done.info & WILD_INFO_ROAD)
                {
                    grad2[i] = ROAD_LEVEL;

                    if (wild[y1][x1].done.info & WILD_INFO_WATER)
                    {
                        grad2[i] = TRACK_LEVEL;
                    }
                }
            }
        }
    }

    /* Determine if we need a bridge (multiple interpretations) */
    for (i = 1; i < 10; i++)
    {
        x1 = x + ddx[i];
        y1 = y + ddy[i];

        if (wild[y1][x1].done.info & WILD_INFO_WATER)
        {
            need_bridge = TRUE;  /* Adjacent to water */
        }
        else
        {
            bridge = TRUE;  /* Adjacent to solid ground */
        }
    }

    /* Only build bridge if BOTH water AND ground adjacent */
    if (!need_bridge) bridge = FALSE;

    /* Clear the temporary block */
    clear_temp_block();

    /* Set sides of the temp block based on grad2[] */
    for (i = 1; i < 10; i++)
    {
        /* Convert direction index to block position */
        x1 = (1 + ddx[i]) * WILD_BLOCK_SIZE / 2;
        y1 = (1 + ddy[i]) * WILD_BLOCK_SIZE / 2;

        temp_block[y1][x1] = grad2[i];
    }

    /* Interpolate the entire block - fill in the middle */
    smooth_block();

    /* Convert densities to actual terrain features */
    for (i = 0; i < WILD_BLOCK_SIZE; i++)
    {
        for (j = 0; j < WILD_BLOCK_SIZE; j++)
        {
            if (temp_block[j][i] >= ROAD_BORDER)  /* >= 1920 */
            {
                c_ptr = &block_ptr[j][i];

                /* Replace hazardous terrain with road-safe alternatives */
                if ((c_ptr->feat == FEAT_SHAL_LAVA) ||
                    (c_ptr->feat == FEAT_DEEP_LAVA) ||
                    (c_ptr->feat == FEAT_SHAL_ACID) ||
                    (c_ptr->feat == FEAT_DEEP_ACID))
                {
                    c_ptr->feat = FEAT_PEBBLES;
                }
                else if (bridge)
                {
                    c_ptr->feat = FEAT_FLOOR_WOOD;  /* Wooden bridge */
                }
                else if ((c_ptr->feat == FEAT_SHAL_WATER) ||
                         (c_ptr->feat == FEAT_DEEP_WATER))
                {
                    c_ptr->feat = FEAT_PEBBLES;  /* Ford */
                }
                else if (c_ptr->feat == FEAT_OCEAN_WATER)
                {
                    c_ptr->feat = FEAT_SHAL_WATER;  /* Shallow it */
                }
                else
                {
                    /* For normal terrain, use dirt or pebbles */
                    if (one_in_(3))
                    {
                        c_ptr->feat = FEAT_PEBBLES;
                    }
                    else
                    {
                        c_ptr->feat = FEAT_DIRT;
                    }
                }
            }
        }
    }
}
```

**Key Points:**

1. **Two Processing Modes**
   - **Mode A**: Block WITHOUT road flag - only look at orthogonal neighbors
   - **Mode B**: Block WITH road flag - look at all 8 neighbors
   - Rationale: Blocks without road flags are only rendered if roads pass through them from adjacent blocks

2. **grad1 vs grad2 Arrays**
   - **grad1[i]**: Raw density from adjacent blocks (set from neighbors' flags)
   - **grad2[i]**: Processed density for this block's edges (orthogonal + diagonals)
   - Diagonals are only set if BOTH their orthogonal neighbors have roads

3. **Bridge Logic**
   - If ANY adjacent block has water: `need_bridge = TRUE`
   - If ANY adjacent block has solid ground: `bridge = TRUE`
   - Final check: `if (!need_bridge) bridge = FALSE`
   - Result: Only true if BOTH water AND ground neighbors exist
   - When `bridge = TRUE`, water is rendered as `FEAT_FLOOR_WOOD` (wooden bridge)

4. **Density Threshold**
   - Only tiles with `temp_block[j][i] >= ROAD_BORDER` (1920) become roads
   - This is about 80% of the maximum block value (WILD_BLOCK_SIZE * 256 = 4096)

### Interpolation Algorithm - `smooth_block()`

**Location:** `wild3.c:474-541`

This is a critical algorithm that smoothly interpolates density values:

```c
static void smooth_block(void)
{
    u16b lstep, hstep, i, j, size;

    size = WILD_BLOCK_SIZE;  /* 16 */
    lstep = hstep = size;

    while (hstep > 1)
    {
        /* Halve the step sizes */
        lstep = hstep;
        hstep /= 2;

        /* PASS 1: Fill vertical lines (top to bottom) */
        for (i = hstep; i <= size - hstep; i += lstep)
        {
            for (j = 0; j <= size; j += lstep)
            {
                if (temp_block[j][i] == MAX_SHORT)  /* Not yet filled */
                {
                    /* Average left and right neighbors */
                    temp_block[j][i] = ((temp_block[j][i - hstep] +
                                        temp_block[j][i + hstep]) / 2);
                }
            }
        }

        /* PASS 2: Fill horizontal lines (left to right) */
        for (j = hstep; j <= size - hstep; j += lstep)
        {
            for (i = 0; i <= size; i += lstep)
            {
                if (temp_block[j][i] == MAX_SHORT)
                {
                    /* Average top and bottom neighbors */
                    temp_block[j][i] = ((temp_block[j - hstep][i] +
                                        temp_block[j + hstep][i]) / 2);
                }
            }
        }

        /* PASS 3: Fill diagonal centers */
        for (i = hstep; i <= size - hstep; i += lstep)
        {
            for (j = hstep; j <= size - hstep; j += lstep)
            {
                if (temp_block[j][i] == MAX_SHORT)
                {
                    /* Average all four corners */
                    temp_block[j][i] = ((temp_block[j - hstep][i - hstep] +
                                        temp_block[j + hstep][i - hstep] +
                                        temp_block[j - hstep][i + hstep] +
                                        temp_block[j + hstep][i + hstep]) / 4);
                }
            }
        }
    }
}
```

**Algorithm Steps:**

1. **Initialize**: `lstep = hstep = WILD_BLOCK_SIZE = 16`

2. **Iteration 1**: `hstep = 8`
   - Pass 1: Fill columns at x = 8 (every 16 units, starting at 8)
   - Pass 2: Fill rows at y = 8 (every 16 units, starting at 8)
   - Pass 3: Fill centers at (8, 8)

3. **Iteration 2**: `hstep = 4`
   - Pass 1: Fill columns at x = 4, 12
   - Pass 2: Fill rows at y = 4, 12
   - Pass 3: Fill centers at (4, 4), (4, 12), (12, 4), (12, 12)

4. **Iteration 3**: `hstep = 2`
   - Pass 1: Fill columns at x = 2, 6, 10, 14
   - Pass 2: Fill rows at y = 2, 6, 10, 14
   - Pass 3: Fill centers at (2, 2), (2, 6), ... (14, 14)

5. **Iteration 4**: `hstep = 1`
   - Pass 1: Fill all remaining columns
   - Pass 2: Fill all remaining rows
   - Pass 3: Fill all remaining centers

6. **Stop** when `hstep = 1`, filling last single-step gaps

**Result:**
- ALL tiles in the 16x16 block are filled with interpolated values
- Linear interpolation in both horizontal and vertical directions
- No random noise (unlike `frac_block()` which adds randomness)

---

## Part 4: Data Flow and Rendering Context

### Block Generation Flow

From `wild3.c:1542-1647`:

```c
static void gen_block(int x, int y)
{
    u16b w_place, w_type;
    blk_ptr block_ptr = wild_grid[y][x];
    bool road = FALSE;

    /* Generate the base terrain */

    /* Get wilderness type */
    w_type = wild[y][x].done.wild;

    /* Check for roads/tracks */
    if (wild[y][x].done.info & (WILD_INFO_TRACK | WILD_INFO_ROAD))
    {
        road = TRUE;
    }

    /* ... generate sea or terrain ... */

    /* Blend with adjacent terrains */
    blend_block(x, y, block_ptr, w_type);

    /* Add water/lava/acid boundary effects */
    if (wild_info_bounds(x, y, WILD_INFO_WATER))
    {
        frac_block();
        wild_add_gradient(block_ptr, FEAT_SHAL_WATER, FEAT_DEEP_WATER);
    }

    /* ... add lava/acid boundaries ... */

    /* ADD ROADS - This overwrites existing terrain! */
    make_wild_road(block_ptr, x, y);

    /* Overlay towns/quests if present */
    w_place = wild[y][x].done.place;
    if (w_place)
    {
        overlay_place(x, y, w_place, block_ptr);
    }

    /* Light/darken based on day/night */
    light_dark_block(x, y);

    /* Add monsters */
    add_monsters_block(x, y);
}
```

**Key Point:** Roads are rendered AFTER terrain but BEFORE town overlay. Towns can overwrite roads within their boundaries.

---

## Part 5: Critical Implementation Details

### The Two-Mode System

**THIS IS THE MOST IMPORTANT PART:**

The C code has TWO completely different behaviors:

#### Mode A: Block WITHOUT road/track flag

```c
if (!(wild[y][x].done.info & (WILD_INFO_TRACK | WILD_INFO_ROAD)))
{
    // Only check orthogonal (cardinal) directions: 2, 4, 6, 8
    // Fill grad1[] with neighbor road levels
    // Convert to grad2[] only at CORNERS where TWO orthogonal neighbors have roads
    // Early return if no valid corners found
}
```

This mode creates "corner connections" - roads that turn corners at block boundaries.

#### Mode B: Block WITH road/track flag

```c
else
{
    // Check ALL 8 directions: 1-9
    // Fill grad2[] directly with neighbor road levels
}
```

This mode creates full road coverage based on all neighbors.

### Coordinate System

**CRITICAL:** The C code uses:
```c
x1 = (1 + ddx[i]) * WILD_BLOCK_SIZE / 2;
y1 = (1 + ddy[i]) * WILD_BLOCK_SIZE / 2;
temp_block[y1][x1] = grad2[i];
```

This maps directions to block positions:
- Direction 7 (NW, ddx=-1, ddy=-1): x1=0, y1=0 (top-left)
- Direction 8 (N, ddx=0, ddy=-1): x1=8, y1=0 (top-center)
- Direction 9 (NE, ddx=1, ddy=-1): x1=16, y1=0 (top-right)
- Direction 4 (W, ddx=-1, ddy=0): x1=0, y1=8 (left-center)
- Direction 5 (C, ddx=0, ddy=0): x1=8, y1=8 (center)
- Direction 6 (E, ddx=1, ddy=0): x1=16, y1=8 (right-center)
- Direction 1 (SW, ddx=-1, ddy=1): x1=0, y1=16 (bottom-left)
- Direction 2 (S, ddx=0, ddy=1): x1=8, y1=16 (bottom-center)
- Direction 3 (SE, ddx=1, ddy=1): x1=16, y1=16 (bottom-right)

### Road Density Values Table

| Constant | Value | When Used |
|----------|-------|-----------|
| ROAD_LEVEL | 2400 | Neighbor has WILD_INFO_ROAD flag |
| TRACK_LEVEL | 2240 | Neighbor has WILD_INFO_TRACK flag, or road over water |
| ROAD_BORDER | 1920 | Threshold for rendering a tile as road |
| GROUND_LEVEL | 1600 | Default value for non-road neighbors |

---

## Comparison Checklist for TypeScript Port

### Must Verify:

1. **Two-mode distinction**
   - [ ] Blocks without road flag: Check only dirs 2,4,6,8
   - [ ] Blocks without road flag: Set corners only if TWO orthogonal neighbors have roads
   - [ ] Blocks with road flag: Check all dirs 1-9

2. **Direction mapping**
   - [ ] ddx/ddy arrays match C code exactly
   - [ ] Position calculation: `(1 + ddx[i]) * 8` for x, `(1 + ddy[i]) * 8` for y
   - [ ] No Y-axis flip

3. **Smooth block algorithm**
   - [ ] Initialize unfilled cells to sentinel (MAX_SHORT or 0)
   - [ ] Three passes per iteration: vertical midpoints, horizontal midpoints, centers
   - [ ] Iterate from step=16 down to step=1
   - [ ] Only fill cells that haven't been set yet

4. **Threshold and values**
   - [ ] ROAD_BORDER = 1920
   - [ ] ROAD_LEVEL = 2400
   - [ ] TRACK_LEVEL = 2240
   - [ ] GROUND_LEVEL = 1600

5. **Early returns**
   - [ ] Return if block has no road flag AND no orthogonal neighbors have roads
   - [ ] Return if block has no road flag AND no valid corner combinations
