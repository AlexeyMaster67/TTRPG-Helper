export type LootMode = 'individual' | 'hoard' | 'magic_table' | 'custom_filter' | 'combat';

export interface LootCoins {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface LootValuable {
  name: string;
  valueGp: number;
  category: 'gem' | 'art';
}

export interface LootMagicItem {
  id?: string;
  name: string;
  name_en?: string;
  rarity?: string;
  type?: string;
  desc?: string;
  cost_gp?: number;
  tableSource?: string;
  rollResult?: number;
  attunement?: boolean;
}

export interface PartyCoinSplit {
  playerCount: number;
  each: {
    gp: number;
    sp: number;
    cp: number;
    ep?: number;
    pp?: number;
  };
  remainder: {
    gp: number;
    sp: number;
    cp: number;
    ep?: number;
    pp?: number;
  };
  summaryRu: string;
}

export interface GeneratedLoot {
  id: string;
  timestamp: number;
  mode: LootMode;
  tierOrCr: string;
  d100Roll?: number;
  bracketInfo?: string;
  coins: LootCoins;
  totalGpEquivalent: number;
  trinkets: string[];
  valuables: LootValuable[];
  magicItems: LootMagicItem[];
  partySplit: PartyCoinSplit;
}
