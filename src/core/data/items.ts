import type { Effect } from '@/core/systems/effects';

export interface Allocation {
  depth: number;
  rarity: number;
}

export interface ItemDef {
  key: string;
  index: number;
  name: string;
  symbol: string;
  color: string;
  type: string;
  sval: number;
  pval: number;
  depth: number;
  rarity: number;
  weight: number;
  cost: number;
  allocation: Allocation[];
  baseAc: number;
  damage: string;
  toHit: number;
  toDam: number;
  toAc: number;
  flags: string[];
  effects?: Effect[];
}

export type ItemRecord = Record<string, ItemDef>;
