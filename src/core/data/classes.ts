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
  // Magic system fields
  spellStat: 'int' | 'wis' | null;  // Casting stat (null = no magic)
  spellFirst: number | null;        // First level able to cast
  spellWeight: number | null;       // Max armor weight before spell failure
  realms: string[];                 // Available magic realms
  secondaryRealm: boolean;          // Can choose a second realm
  manaBonus?: number;               // Mana multiplier (e.g., 1.25 for high_mage)
}

export type ClassRecord = Record<string, ClassDef>;
