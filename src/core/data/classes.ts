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

export interface ClassDef {
  index: number;
  name: string;
  stats: StatBonuses;
  skills: Skills;
  xSkills: Skills;
  hitDie: number;
  expMod: number;
  petUpkeepDiv: number;
  heavySense: boolean;
}

export type ClassRecord = Record<string, ClassDef>;
