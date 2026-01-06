export interface StatBonuses {
  str: number;
  int: number;
  wis: number;
  dex: number;
  con: number;
  chr: number;
}

export interface Skills {
  disarm: number;
  device: number;
  save: number;
  stealth: number;
  search: number;
  searchFreq: number;
  melee: number;
  ranged: number;
}

export interface BaseMod {
  base: number;
  mod: number;
}

export interface BodyStats {
  height: BaseMod;
  weight: BaseMod;
}

export interface RaceDef {
  index: number;
  name: string;
  stats: StatBonuses;
  skills: Skills;
  hitDie: number;
  expMod: number;
  age: BaseMod;
  male: BodyStats;
  female: BodyStats;
  infravision: number;
  classChoice: number;
}

export type RaceRecord = Record<string, RaceDef>;
