/**
 * Room Builders Index
 *
 * Exports the room type list for dungeon generation.
 */

import {
  type RoomType,
  RT_SIMPLE,
  RT_FANCY,
  RT_COMPLEX,
  RT_STRANGE,
  RT_NATURAL,
  RT_BUILDING,
  RT_RUIN,
  RT_CRYPT,
  RT_DENSE,
  RT_RVAULT,
  RT_ANIMAL,
  RT_TAG_CROWDED,
} from '../DungeonTypes';

import { buildType1 } from './buildType1';
import { buildType2 } from './buildType2';
import { buildType3 } from './buildType3';
import { buildType4 } from './buildType4';
import { buildType5 } from './buildType5';
import { buildType6 } from './buildType6';
import { buildType7 } from './buildType7';
import { buildType8 } from './buildType8';
import { buildType9 } from './buildType9';
import { buildType10 } from './buildType10';
import { buildType11 } from './buildType11';
import { buildType12 } from './buildType12';
import { buildType13 } from './buildType13';
import { buildType14 } from './buildType14';
import { buildType15 } from './buildType15';
import { buildType16 } from './buildType16';
import { buildType17 } from './buildType17';
import { buildType18 } from './buildType18';
import { buildType19 } from './buildType19';
import { buildType20 } from './buildType20';
import { buildType21 } from './buildType21';
import { buildType22 } from './buildType22';
import { buildType23 } from './buildType23';
import { buildType24 } from './buildType24';
import { buildType25 } from './buildType25';

/** Room type list from Zangband's rooms.c */
export const roomList: RoomType[] = [
  { depth: 1,  chance: 30, buildFunc: buildType1,  flags: RT_SIMPLE },
  { depth: 1,  chance: 10, buildFunc: buildType2,  flags: RT_FANCY },
  { depth: 1,  chance: 10, buildFunc: buildType20, flags: RT_RUIN },
  { depth: 3,  chance: 10, buildFunc: buildType3,  flags: RT_FANCY },
  { depth: 3,  chance: 10, buildFunc: buildType4,  flags: RT_BUILDING | RT_CRYPT },
  { depth: 3,  chance: 10, buildFunc: buildType11, flags: RT_NATURAL | RT_FANCY },
  { depth: 3,  chance: 10, buildFunc: buildType14, flags: RT_COMPLEX },
  { depth: 3,  chance: 10, buildFunc: buildType15, flags: RT_STRANGE },
  { depth: 3,  chance: 10, buildFunc: buildType16, flags: RT_RUIN | RT_NATURAL },
  { depth: 3,  chance: 10, buildFunc: buildType17, flags: RT_RUIN },
  { depth: 3,  chance: 10, buildFunc: buildType23, flags: RT_FANCY },
  { depth: 3,  chance: 10, buildFunc: buildType24, flags: RT_COMPLEX },
  { depth: 3,  chance: 10, buildFunc: buildType25, flags: RT_BUILDING },
  { depth: 5,  chance: 10, buildFunc: buildType9,  flags: RT_NATURAL },
  { depth: 5,  chance: 10, buildFunc: buildType13, flags: RT_NATURAL },
  { depth: 5,  chance: 10, buildFunc: buildType18, flags: RT_BUILDING },
  { depth: 5,  chance: 10, buildFunc: buildType19, flags: RT_STRANGE },
  { depth: 7,  chance: 10, buildFunc: buildType22, flags: RT_COMPLEX },
  { depth: 10, chance: 10, buildFunc: buildType5,  flags: RT_ANIMAL | RT_TAG_CROWDED },
  { depth: 10, chance: 10, buildFunc: buildType12, flags: RT_CRYPT },
  { depth: 10, chance: 10, buildFunc: buildType21, flags: RT_CRYPT },
  { depth: 12, chance: 10, buildFunc: buildType7,  flags: RT_DENSE },
  { depth: 12, chance: 10, buildFunc: buildType10, flags: RT_RVAULT },
  { depth: 15, chance: 10, buildFunc: buildType6,  flags: RT_DENSE | RT_TAG_CROWDED },
  { depth: 20, chance: 10, buildFunc: buildType8,  flags: RT_DENSE },
  { depth: 25, chance: 10, buildFunc: buildType10, flags: RT_RVAULT },
  { depth: 30, chance: 10, buildFunc: buildType5,  flags: RT_ANIMAL | RT_TAG_CROWDED },
  { depth: 35, chance: 10, buildFunc: buildType7,  flags: RT_DENSE },
  { depth: 40, chance: 10, buildFunc: buildType6,  flags: RT_DENSE | RT_TAG_CROWDED },
  { depth: 45, chance: 10, buildFunc: buildType8,  flags: RT_DENSE },
];
