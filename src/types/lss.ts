import { MonsterAction } from './database';

export interface LssWeapon {
  name: string;
  attack_bonus?: number;
  damage_dice?: string;
  damage_type?: string;
  desc?: string;
  mod?: string | number;
  dmg?: string;
  type?: string;
}

export interface ParsedLssCharacter {
  id: string;
  name: string;
  charClass: string;
  level: number;
  classAndLevel: string;
  race: string;
  maxHp: number;
  currentHp: number;
  ac: number;
  speed: string;
  initiativeBonus: number;
  passivePerception: number;
  avatarUrl?: string;
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  actions: MonsterAction[];
  notes?: string;
  rawJson?: any;
}
