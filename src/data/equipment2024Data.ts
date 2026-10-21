export interface ArmorItem {
  id: string;
  nameRu: string;
  nameEn: string;
  category: 'none' | 'light' | 'medium' | 'heavy';
  baseAc: number;
  maxDexBonus?: number;
  stealthDisadvantage?: boolean;
  strengthRequired?: number;
}

export interface WeaponItem {
  id: string;
  nameRu: string;
  nameEn: string;
  damage: string;
  damageType: string;
  mastery?: string;
  properties: string[];
}

export const ARMOR_2024_DATA: ArmorItem[] = [
  { id: 'none', nameRu: 'Без доспеха', nameEn: 'None (Unarmored)', category: 'none', baseAc: 10 },
  // Light
  { id: 'padded', nameRu: 'Стёганый доспех', nameEn: 'Padded', category: 'light', baseAc: 11, stealthDisadvantage: true },
  { id: 'leather', nameRu: 'Кожаный доспех', nameEn: 'Leather', category: 'light', baseAc: 11 },
  { id: 'studded_leather', nameRu: 'Проклёпанный кожаный', nameEn: 'Studded Leather', category: 'light', baseAc: 12 },
  // Medium
  { id: 'hide', nameRu: 'Шкурный доспех', nameEn: 'Hide', category: 'medium', baseAc: 12, maxDexBonus: 2 },
  { id: 'chain_shirt', nameRu: 'Кольчужная рубаха', nameEn: 'Chain Shirt', category: 'medium', baseAc: 13, maxDexBonus: 2 },
  { id: 'scale_mail', nameRu: 'Чешуйчатый доспех', nameEn: 'Scale Mail', category: 'medium', baseAc: 14, maxDexBonus: 2, stealthDisadvantage: true },
  { id: 'breastplate', nameRu: 'Кираса', nameEn: 'Breastplate', category: 'medium', baseAc: 14, maxDexBonus: 2 },
  { id: 'half_plate', nameRu: 'Полулаты', nameEn: 'Half Plate', category: 'medium', baseAc: 15, maxDexBonus: 2, stealthDisadvantage: true },
  // Heavy
  { id: 'ring_mail', nameRu: 'Колечный доспех', nameEn: 'Ring Mail', category: 'heavy', baseAc: 14, stealthDisadvantage: true },
  { id: 'chain_mail', nameRu: 'Кольчуга', nameEn: 'Chain Mail', category: 'heavy', baseAc: 16, stealthDisadvantage: true, strengthRequired: 13 },
  { id: 'splint', nameRu: 'Наборный доспех', nameEn: 'Splint', category: 'heavy', baseAc: 17, stealthDisadvantage: true, strengthRequired: 15 },
  { id: 'plate', nameRu: 'Латы', nameEn: 'Plate', category: 'heavy', baseAc: 18, stealthDisadvantage: true, strengthRequired: 15 },
];

export const WEAPONS_2024_DATA: WeaponItem[] = [
  { id: 'dagger', nameRu: 'Кинжал', nameEn: 'Dagger', damage: '1d4', damageType: 'Колющий', mastery: 'Nick', properties: ['Фехтовальное', 'Лёгкое', 'Метательное (20/60)'] },
  { id: 'shortsword', nameRu: 'Короткий меч', nameEn: 'Shortsword', damage: '1d6', damageType: 'Колющий', mastery: 'Vex', properties: ['Фехтовальное', 'Лёгкое'] },
  { id: 'scimitar', nameRu: 'Скимитар', nameEn: 'Scimitar', damage: '1d6', damageType: 'Рубящий', mastery: 'Nick', properties: ['Фехтовальное', 'Лёгкое'] },
  { id: 'rapier', nameRu: 'Рапира', nameEn: 'Rapier', damage: '1d8', damageType: 'Колющий', mastery: 'Vex', properties: ['Фехтовальное'] },
  { id: 'longsword', nameRu: 'Длинный меч', nameEn: 'Longsword', damage: '1d8', damageType: 'Рубящий', mastery: 'Sap', properties: ['Универсальное (1d10)'] },
  { id: 'greatsword', nameRu: 'Двуручный меч', nameEn: 'Greatsword', damage: '2d6', damageType: 'Рубящий', mastery: 'Graze', properties: ['Тяжёлое', 'Двуручное'] },
  { id: 'battleaxe', nameRu: 'Боевой топор', nameEn: 'Battleaxe', damage: '1d8', damageType: 'Рубящий', mastery: 'Topple', properties: ['Универсальное (1d10)'] },
  { id: 'greataxe', nameRu: 'Секира', nameEn: 'Greataxe', damage: '1d12', damageType: 'Рубящий', mastery: 'Topple', properties: ['Тяжёлое', 'Двуручное'] },
  { id: 'warhammer', nameRu: 'Боевой молот', nameEn: 'Warhammer', damage: '1d8', damageType: 'Дробящий', mastery: 'Push', properties: ['Универсальное (1d10)'] },
  { id: 'maul', nameRu: 'Молот', nameEn: 'Maul', damage: '2d6', damageType: 'Дробящий', mastery: 'Topple', properties: ['Тяжёлое', 'Двуручное'] },
  { id: 'quarterstaff', nameRu: 'Боевой посох', nameEn: 'Quarterstaff', damage: '1d6', damageType: 'Дробящий', mastery: 'Topple', properties: ['Универсальное (1d8)'] },
  { id: 'mace', nameRu: 'Булава', nameEn: 'Mace', damage: '1d6', damageType: 'Дробящий', mastery: 'Sap', properties: [] },
  { id: 'spear', nameRu: 'Копьё', nameEn: 'Spear', damage: '1d6', damageType: 'Колющий', mastery: 'Sap', properties: ['Метательное (20/60)', 'Универсальное (1d8)'] },
  { id: 'halberd', nameRu: 'Алебарда', nameEn: 'Halberd', damage: '1d10', damageType: 'Рубящий', mastery: 'Cleave', properties: ['Досягаемость', 'Тяжёлое', 'Двуручное'] },
  { id: 'shortbow', nameRu: 'Короткий лук', nameEn: 'Shortbow', damage: '1d6', damageType: 'Колющий', mastery: 'Vex', properties: ['Боеприпас (80/320)', 'Двуручное'] },
  { id: 'longbow', nameRu: 'Длинный лук', nameEn: 'Longbow', damage: '1d8', damageType: 'Колющий', mastery: 'Slow', properties: ['Боеприпас (150/600)', 'Тяжёлое', 'Двуручное'] },
  { id: 'light_crossbow', nameRu: 'Лёгкий арбалет', nameEn: 'Light Crossbow', damage: '1d8', damageType: 'Колющий', mastery: 'Slow', properties: ['Боеприпас (80/320)', 'Перезарядка', 'Двуручное'] },
  { id: 'heavy_crossbow', nameRu: 'Тяжёлый арбалет', nameEn: 'Heavy Crossbow', damage: '1d10', damageType: 'Колющий', mastery: 'Push', properties: ['Боеприпас (100/400)', 'Тяжёлое', 'Перезарядка', 'Двуручное'] },
  { id: 'hand_crossbow', nameRu: 'Ручной арбалет', nameEn: 'Hand Crossbow', damage: '1d6', damageType: 'Колющий', mastery: 'Vex', properties: ['Боеприпас (30/120)', 'Лёгкое', 'Перезарядка'] },
];
