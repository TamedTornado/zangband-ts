import type { Stats } from '@/core/entities/Player';

export const Sex = {
  Male: 'male',
  Female: 'female',
} as const;
export type Sex = (typeof Sex)[keyof typeof Sex];

export interface AutorollerMinimums {
  str: number;
  int: number;
  wis: number;
  dex: number;
  con: number;
  chr: number;
}

export interface PhysicalAttributes {
  age: number;
  height: number; // in inches
  weight: number; // in pounds
}

export interface CharacterCreationData {
  sex: Sex | null;
  raceKey: string | null;
  classKey: string | null;
  primaryRealm: string | null;
  secondaryRealm: string | null;
  baseStats: Stats | null; // Rolled stats before race/class bonuses
  finalStats: Stats | null; // Stats after applying bonuses
  name: string;
  autorollerMinimums: AutorollerMinimums;
  rollCount: number; // Number of rolls performed
  isAutorolling: boolean; // Currently autorolling
  physicalAttributes: PhysicalAttributes | null;
  // Track which realm selection we're on (for RealmSelectionState)
  isSelectingPrimaryRealm: boolean;
}

export function createInitialCreationData(): CharacterCreationData {
  return {
    sex: null,
    raceKey: null,
    classKey: null,
    primaryRealm: null,
    secondaryRealm: null,
    baseStats: null,
    finalStats: null,
    name: '',
    autorollerMinimums: { str: 8, int: 8, wis: 8, dex: 8, con: 8, chr: 8 },
    rollCount: 0,
    isAutorolling: false,
    physicalAttributes: null,
    isSelectingPrimaryRealm: true,
  };
}
