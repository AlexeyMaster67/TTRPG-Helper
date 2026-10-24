export interface MonsterSearchFilters {
  size?: string;
  type?: string;
  cr?: string;
  limit?: number;
}

export interface MonsterDbRow {
  id: string;
  name_en: string;
  name_ru: string;
  size: string;
  size_ru: string;
  creature_type: string;
  creature_type_ru: string;
  alignment: string;
  ac: number;
  hp_average: number;
  hp_formula: string;
  speed: string;
  init_bonus: number;
  passive_init: number;
  cr: string;
  pb: number;
  str: number;
  dex: number;
  con: number;
  intellect: number; // ВАЖНО: именно intellect, не int!
  wis: number;
  cha: number;
  saves: string; // JSON: Record<string, number>
  skills: string; // JSON: Record<string, number>
  damage_vulnerabilities: string;
  damage_resistances: string;
  damage_immunities: string;
  condition_immunities: string;
  senses: string;
  languages: string;
  traits: string; // JSON: Array<{ name: string; desc: string }>
  actions: string; // JSON: Array<MonsterAction>
  bonus_actions: string; // JSON: Array<MonsterAction>
  reactions: string; // JSON: Array<MonsterAction>
  legendary_actions: string; // JSON: Array<MonsterAction>
  spells: string; // JSON: Array<any> | Record<string, any>
  source: string;
  is_srd: boolean | number;
}

export interface SpellDbRow {
  id: string;
  name_en: string;
  name_ru: string;
  alt_names: string | null;
  level: number;
  school: string;
  school_ru: string;
  casting_time: string;
  range: string;
  target_area_type: string | null;
  target_area_size: number | null;
  components_v: boolean | number;
  components_s: boolean | number;
  components_m: boolean | number;
  materials_ru: string | null;
  materials_cost_gp: number | null;
  materials_consumed: boolean | number;
  duration: string;
  concentration: boolean | number;
  is_ritual: boolean | number;
  description_ru: string;
  higher_levels_ru: string | null;
  classes: string; // JSON: string[]
  source: string;
  is_srd: boolean | number;
  description_en: string | null;
  materials_en?: string | null;
  higher_levels_en?: string | null;
}

export interface ItemDbRow {
  id: string;
  name_en: string;
  name_ru: string;
  category: string;
  item_type: string;
  rarity: string;
  attunement: boolean | number;
  weight_lb: number | null;
  cost_gp: number | null;
  ac: string | null;
  damage_formula: string | null;
  damage_type: string | null;
  weapon_mastery: string | null;
  weapon_mastery_ru: string | null;
  properties: string; // JSON: string[]
  charges: string | null;
  description_en: string | null;
  description_ru: string | null;
  source: string;
  is_srd: boolean | number;
}

export interface MonsterAction {
  name: string;
  name_ru?: string;
  desc?: string;
  attack_bonus?: number;
  damage_dice?: string;
  damage_bonus?: number;
  damage_type?: string;
  range?: string;
  [key: string]: any;
}

export interface ParsedMonster extends Omit<MonsterDbRow, 
  'saves' | 'skills' | 'traits' | 'actions' | 'bonus_actions' | 'reactions' | 'legendary_actions' | 'spells' | 'is_srd'> {
  saves: Record<string, number>;
  skills: Record<string, number>;
  traits: Array<{ name: string; desc: string }>;
  actions: MonsterAction[];
  bonus_actions: MonsterAction[];
  reactions: MonsterAction[];
  legendary_actions: MonsterAction[];
  spells: any[];
  is_srd: boolean;
  hit_dice?: string;
  xp?: number;
  is_custom?: boolean;
  token_url?: string;
}

export interface ParsedSpell extends Omit<SpellDbRow, 
  'classes' | 'components_v' | 'components_s' | 'components_m' | 'materials_consumed' | 'concentration' | 'is_ritual' | 'is_srd'> {
  classes: string[];
  components_v: boolean;
  components_s: boolean;
  components_m: boolean;
  materials_consumed: boolean;
  concentration: boolean;
  is_ritual: boolean;
  is_srd: boolean;
}

export interface ParsedItem extends Omit<ItemDbRow, 'properties' | 'attunement' | 'is_srd'> {
  properties: string[];
  attunement: boolean;
  is_srd: boolean;
}
