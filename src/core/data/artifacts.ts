export interface ArtifactDef {
  key: string;
  index: number;
  name: string;
  type: string;
  sval: number;
  pval: number;
  depth: number;
  rarity: number;
  weight: number;
  cost: number;
  baseAc: number;
  damage: string;
  toHit: number;
  toDam: number;
  toAc: number;
  flags: string[];
}

export type ArtifactRecord = Record<string, ArtifactDef>;
