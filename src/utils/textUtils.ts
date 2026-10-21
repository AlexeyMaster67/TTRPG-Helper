/**
 * textUtils.ts
 * Shared text cleaning and Russian D&D 2024 / 5e localization dictionaries.
 * Standard official terminology based on official Russian editions (Hobby World / D&D 2024).
 */

// 1. 13 Damage Types in Russian D&D
export const DAMAGE_TYPES_RU: Record<string, string> = {
  slashing: 'Рубящий',
  piercing: 'Колющий',
  bludgeoning: 'Дробящий',
  fire: 'Огонь',
  cold: 'Холод',
  lightning: 'Электричество',
  thunder: 'Звук', // Официальный термин PHB (также широко известен как Гром)
  poison: 'Яд',
  acid: 'Кислота',
  psychic: 'Психический',
  necrotic: 'Некротический',
  radiant: 'Излучение',
  force: 'Силовое поле',
  // Capitalized variants
  Slashing: 'Рубящий',
  Piercing: 'Колющий',
  Bludgeoning: 'Дробящий',
  Fire: 'Огонь',
  Cold: 'Холод',
  Lightning: 'Электричество',
  Thunder: 'Звук',
  Poison: 'Яд',
  Acid: 'Кислота',
  Psychic: 'Психический',
  Necrotic: 'Некротический',
  Radiant: 'Излучение',
  Force: 'Силовое поле',
};

// Alias for backwards compatibility
export const DAMAGE_NAMES_RU = DAMAGE_TYPES_RU;

// 2. 6 Ability Scores in Russian D&D
export const STAT_NAMES_RU: Record<string, string> = {
  str: 'СИЛ',
  dex: 'ЛОВ',
  con: 'ТЕЛ',
  int: 'ИНТ',
  intellect: 'ИНТ',
  wis: 'МДР',
  cha: 'ХАР',
  strength: 'СИЛ',
  dexterity: 'ЛОВ',
  constitution: 'ТЕЛ',
  intelligence: 'ИНТ',
  wisdom: 'МДР',
  charisma: 'ХАР',
  // Capitalized
  Str: 'СИЛ',
  Dex: 'ЛОВ',
  Con: 'ТЕЛ',
  Int: 'ИНТ',
  Wis: 'МДР',
  Cha: 'ХАР',
  Strength: 'СИЛ',
  Dexterity: 'ЛОВ',
  Constitution: 'ТЕЛ',
  Intelligence: 'ИНТ',
  Wisdom: 'МДР',
  Charisma: 'ХАР',
  // Russian abbreviations mapped to uppercase
  сил: 'СИЛ',
  лов: 'ЛОВ',
  тел: 'ТЕЛ',
  инт: 'ИНТ',
  мдр: 'МДР',
  хар: 'ХАР',
};

export const STAT_FULL_NAMES_RU: Record<string, string> = {
  str: 'Сила',
  dex: 'Ловкость',
  con: 'Телосложение',
  int: 'Интеллект',
  intellect: 'Интеллект',
  wis: 'Мудрость',
  cha: 'Харизма',
  strength: 'Сила',
  dexterity: 'Ловкость',
  constitution: 'Телосложение',
  intelligence: 'Интеллект',
  wisdom: 'Мудрость',
  charisma: 'Харизма',
};

// 3. 18 Skills in Russian D&D 2024 / 5e
export const SKILL_NAMES_RU: Record<string, string> = {
  acrobatics: 'Акробатика',
  animal_handling: 'Уход за животными',
  'animal handling': 'Уход за животными',
  animalhandling: 'Уход за животными',
  arcana: 'Магия',
  athletics: 'Атлетика',
  deception: 'Обман',
  history: 'История',
  insight: 'Проницательность',
  intimidation: 'Запугивание',
  investigation: 'Анализ',
  medicine: 'Медицина',
  nature: 'Природа',
  perception: 'Внимательность',
  performance: 'Выступление',
  persuasion: 'Убеждение',
  religion: 'Религия',
  sleight_of_hand: 'Ловкость рук',
  'sleight of hand': 'Ловкость рук',
  sleightofhand: 'Ловкость рук',
  stealth: 'Скрытность',
  survival: 'Выживание',
  // Capitalized & aliases
  Acrobatics: 'Акробатика',
  'Animal Handling': 'Уход за животными',
  AnimalHandling: 'Уход за животными',
  Arcana: 'Магия',
  Athletics: 'Атлетика',
  Deception: 'Обман',
  History: 'История',
  Insight: 'Проницательность',
  Intimidation: 'Запугивание',
  Investigation: 'Анализ',
  Medicine: 'Медицина',
  Nature: 'Природа',
  Perception: 'Внимательность',
  Performance: 'Выступление',
  Persuasion: 'Убеждение',
  Religion: 'Религия',
  'Sleight of Hand': 'Ловкость рук',
  SleightOfHand: 'Ловкость рук',
  Stealth: 'Скрытность',
  Survival: 'Выживание',
  // Common Russian alternative translations
  расследование: 'Анализ',
  дрессировка: 'Уход за животными',
  восприятие: 'Внимательность',
};

// 4. Standard Conditions in D&D 2024 / 5e (16 conditions)
export const CONDITION_NAMES_RU: Record<string, string> = {
  blinded: 'Ослеплённый',
  charmed: 'Очарованный',
  deafened: 'Глухой',
  dazed: 'Ошеломлённый',
  exhaustion: 'Истощение',
  frightened: 'Испуганный',
  grappled: 'Захваченный',
  incapacitated: 'Недееспособный',
  invisible: 'Невидимый',
  paralyzed: 'Парализованный',
  petrified: 'Окаменевший',
  poisoned: 'Отравленный',
  prone: 'Сбит с ног',
  restrained: 'Опутанный',
  stunned: 'Оглушённый',
  unconscious: 'Бессознательный',
  // Capitalized
  Blinded: 'Ослеплённый',
  Charmed: 'Очарованный',
  Deafened: 'Глухой',
  Dazed: 'Ошеломлённый',
  Exhaustion: 'Истощение',
  Frightened: 'Испуганный',
  Grappled: 'Захваченный',
  Incapacitated: 'Недееспособный',
  Invisible: 'Невидимый',
  Paralyzed: 'Парализованный',
  Petrified: 'Окаменевший',
  Poisoned: 'Отравленный',
  Prone: 'Сбит с ног',
  Restrained: 'Опутанный',
  Stunned: 'Оглушённый',
  Unconscious: 'Бессознательный',
};

// 5. 14 Creature Types in D&D 2024 / 5e
export const CREATURE_TYPES_RU: Record<string, string> = {
  aberration: 'Аберрация',
  beast: 'Зверь',
  celestial: 'Небожитель',
  construct: 'Конструкт',
  dragon: 'Дракон',
  elemental: 'Элементаль',
  fey: 'Фея',
  fiend: 'Исчадие',
  giant: 'Великан',
  humanoid: 'Гуманоид',
  monstrosity: 'Чудовище',
  monster: 'Монстр',
  ooze: 'Слизь',
  plant: 'Растение',
  undead: 'Нежить',
  // Capitalized
  Aberration: 'Аберрация',
  Beast: 'Зверь',
  Celestial: 'Небожитель',
  Construct: 'Конструкт',
  Dragon: 'Дракон',
  Elemental: 'Элементаль',
  Fey: 'Фея',
  Fiend: 'Исчадие',
  Giant: 'Великан',
  Humanoid: 'Гуманоид',
  Monstrosity: 'Чудовище',
  Monster: 'Монстр',
  Ooze: 'Слизь',
  Plant: 'Растение',
  Undead: 'Нежить',
  // Plural English
  aberrations: 'Аберрации',
  beasts: 'Звери',
  celestials: 'Небожители',
  constructs: 'Конструкты',
  dragons: 'Драконы',
  elementals: 'Элементали',
  fiends: 'Исчадия',
  giants: 'Великаны',
  humanoids: 'Гуманоиды',
  monstrosities: 'Чудовища',
  monsters: 'Монстры',
  oozes: 'Слизи',
  plants: 'Растения',
};

// 6. Magic Item Rarities
export const RARITY_NAMES_RU: Record<string, string> = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  'very rare': 'Очень редкий',
  very_rare: 'Очень редкий',
  legendary: 'Легендарный',
  artifact: 'Артефакт',
  Common: 'Обычный',
  Uncommon: 'Необычный',
  Rare: 'Редкий',
  'Very Rare': 'Очень редкий',
  Legendary: 'Легендарный',
  Artifact: 'Артефакт',
};

// 7. Item Types
export const ITEM_TYPE_NAMES_RU: Record<string, string> = {
  weapon: 'Оружие',
  weapons: 'Оружие',
  armor: 'Доспехи и щиты',
  potion: 'Зелье',
  potions: 'Зелья',
  scroll: 'Свиток',
  scrolls: 'Свитки',
  ring: 'Кольцо',
  rings: 'Кольца',
  rod: 'Жезл',
  rods: 'Жезлы',
  wand: 'Волшебная палочка',
  wands: 'Волшебные палочки',
  staff: 'Посох',
  staffs: 'Посохи',
  staves: 'Посохи',
  'wondrous item': 'Чудесный предмет',
  wondrous: 'Чудесный предмет',
};

import { MONSTER_NAMES_RU } from './monsterNamesRu';
export { MONSTER_NAMES_RU };

export function localizeMonsterName(name?: string | null): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  if (MONSTER_NAMES_RU[trimmed]) {
    return MONSTER_NAMES_RU[trimmed];
  }

  const lower = trimmed.toLowerCase();
  for (const [en, ru] of Object.entries(MONSTER_NAMES_RU)) {
    if (en.toLowerCase() === lower) {
      return ru;
    }
  }

  // Handle parentheticals e.g. "Wolf (Alpha)"
  const parenMatch = trimmed.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    const baseName = parenMatch[1].trim();
    const inner = parenMatch[2].trim();
    const locBase = localizeMonsterName(baseName);
    const locInner = cleanRussianText(inner);
    if (locBase !== baseName) {
      return `${locBase} (${locInner})`;
    }
  }

  return cleanRussianText(trimmed);
}

// Localization Helpers
export function localizeDamageType(dmg?: string | null): string {
  if (!dmg) return '';
  const key = dmg.toLowerCase().trim();
  return DAMAGE_TYPES_RU[key] || dmg;
}

export function localizeRarity(rarity?: string | null): string {
  if (!rarity) return 'Магический';
  const key = rarity.toLowerCase().trim();
  return RARITY_NAMES_RU[key] || rarity;
}

export function localizeItemType(type?: string | null): string {
  if (!type) return '';
  const key = type.toLowerCase().trim();
  return ITEM_TYPE_NAMES_RU[key] || type;
}

export function localizeCondition(condition?: string | null): string {
  if (!condition) return '';
  const key = condition.toLowerCase().trim();
  return CONDITION_NAMES_RU[key] || condition;
}

const COMPOUND_CREATURE_TYPES: Record<string, string> = {
  'or small humanoid': 'Гуманоид (Средний или Маленький)',
  'or small humanoid (cleric)': 'Гуманоид (Жрец)',
  'or small humanoid (wizard)': 'Гуманоид (Волшебник)',
  'or small monstrosity (lycanthrope)': 'Чудовище (Ликантроп)',
  'or small undead': 'Нежить (Средняя или Маленькая)',
  'or small undead (cleric)': 'Нежить (Жрец)',
  'swarm of tiny beasts': 'Рой крошечных зверей',
  'swarm of tiny undead': 'Рой крошечной нежити',
  'swarm of tiny constructs': 'Рой крошечных конструктов',
  'beast (dinosaur)': 'Зверь (динозавр)',
  'celestial (angel)': 'Небожитель (ангел)',
  'dragon (chromatic)': 'Дракон (хроматический)',
  'dragon (metallic)': 'Дракон (металлический)',
  'elemental (genie)': 'Элементаль (джинн)',
  'fey (goblinoid)': 'Фея (гоблиноид)',
  'fiend (demon)': 'Исчадие (демон)',
  'fiend (devil)': 'Исчадие (дьявол)',
  'monstrosity (titan)': 'Чудовище (титан)',
  'undead (wizard)': 'Нежить (волшебник)',
};

export function localizeCreatureType(type?: string | null): string {
  if (!type) return 'существо';
  const clean = type.trim();
  const lower = clean.toLowerCase();

  if (COMPOUND_CREATURE_TYPES[lower]) return COMPOUND_CREATURE_TYPES[lower];
  if (CREATURE_TYPES_RU[lower]) return CREATURE_TYPES_RU[lower];

  // Check sub-matches
  for (const [en, ru] of Object.entries(COMPOUND_CREATURE_TYPES)) {
    if (lower.startsWith(en)) {
      return ru;
    }
  }

  for (const [en, ru] of Object.entries(CREATURE_TYPES_RU)) {
    if (lower.startsWith(en.toLowerCase())) {
      const remainder = clean.slice(en.length).trim();
      return remainder ? `${ru} ${cleanRussianText(remainder)}` : ru;
    }
  }
  return cleanRussianText(clean);
}

export function localizeSkill(skill?: string | null): string {
  if (!skill) return '';
  const key = skill.toLowerCase().trim().replace(/[\s_-]+/g, '_');
  return SKILL_NAMES_RU[key] || skill;
}

export function localizeStat(stat?: string | null, full = false): string {
  if (!stat) return '';
  const key = stat.toLowerCase().trim();
  return full ? (STAT_FULL_NAMES_RU[key] || stat) : (STAT_NAMES_RU[key] || stat);
}

export function formatSpeedRu(speed?: string | null): string {
  if (!speed) return '30 фт.';
  return cleanRussianText(speed)
    .replace(/\bft\.?\b/gi, 'фт.')
    .replace(/\bfly\s*speed\b/gi, 'скорость полёта')
    .replace(/\bswim\s*speed\b/gi, 'скорость плавания')
    .replace(/\bclimb\s*speed\b/gi, 'скорость лазания')
    .replace(/\bburrow\s*speed\b/gi, 'скорость копания')
    .replace(/\bfly\b/gi, 'полёт')
    .replace(/\bswim\b/gi, 'плавание')
    .replace(/\bclimb\b/gi, 'лазание')
    .replace(/\bburrow\b/gi, 'копание')
    .replace(/\bhover\b/gi, 'парение')
    .replace(/\bSpeed\b/g, 'Скорость');
}

export function localizeSenses(senses?: string | null): string {
  if (!senses) return 'Обычные чувства';
  return cleanRussianText(senses)
    .replace(/\bdarkvision\b/gi, 'тёмное зрение')
    .replace(/\bblindsight\b/gi, 'слепое зрение')
    .replace(/\btruesight\b/gi, 'истинное зрение')
    .replace(/\btremorsense\b/gi, 'чувство вибрации')
    .replace(/\bpassive\s+Perception\b/gi, 'пассивная Внимательность')
    .replace(/unimpeded by magical Darkness/gi, 'не затруднено магической тьмой')
    .replace(/unimpeded by magical darkness/gi, 'не затруднено магической тьмой')
    .replace(/\bft\.?\b/gi, 'фт.');
}

/**
 * Standard Russian grammatical pluralization (1 клетка, 2 клетки, 5 клеток)
 */
export function pluralizeRussian(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(Math.round(count)) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

/**
 * Cleans text by stripping parenthetical/bracketed English descriptions
 * (e.g. "Мультиатака (Multiattack)" -> "Мультиатака"),
 * replacing D&D abbreviations (CR -> КО, HP -> ХП, AC -> КД, DC -> СЛ),
 * formatting dashes and quotes, and translating D&D combat terms into standard Russian.
 */
export function cleanRussianText(text?: string | null): string {
  if (!text) return '';
  let res = String(text);

  // 0. Check direct match in monster dictionary
  const trimmedKey = res.trim();
  if (MONSTER_NAMES_RU[trimmedKey]) {
    return MONSTER_NAMES_RU[trimmedKey];
  }

  // 1. Normalize typographic quotes and apostrophes
  res = res
    .replace(/[’‘`]/g, "'")
    .replace(/[‒―−]/g, '–');

  // 2. Specific Player and Weapon Mastery translations
  // Translate "Player (Lvl X)" -> "Игрок (Ур. X)"
  res = res.replace(/\b(?:Player|Игрок)\s*\(\s*(?:Lvl|Level|Ур\.?|Уровень)\s*(\d+)\s*\)/gi, 'Игрок (Ур. $1)');
  res = res.replace(/\bPlayer\s+(?:Lvl|Level)\s*(\d+)\b/gi, 'Игрок (Ур. $1)');
  res = res.replace(/\bPlayer\s*\((?:Lvl|Level)\s*([A-Za-z0-9]+)\)/gi, 'Игрок (Ур. $1)');

  // Translate "Weapon Mastery: X" -> "Свойство оружия: X"
  res = res.replace(/\bWeapon Mastery:\s*/gi, 'Свойство оружия: ');
  res = res.replace(/\bWeapon Mastery\b/gi, 'Свойство оружия');

  // Translate specific weapon mastery properties
  const masteryTerms: Record<string, string> = {
    'Slow': 'Замедление',
    'Topple': 'Опрокидывание',
    'Vex': 'Досаждение',
    'Sap': 'Ослабление',
    'Nick': 'Царапина',
    'Push': 'Толчок',
    'Graze': 'Задевание',
    'Cleave': 'Рассечение',
  };
  for (const [enMastery, ruMastery] of Object.entries(masteryTerms)) {
    res = res.replace(new RegExp(`\\b${enMastery}\\b`, 'g'), ruMastery);
  }

  // 3. Known parenthetical descriptions translation
  const parentheticalTranslations: [RegExp, string][] = [
    [/\(\s*Melee Weapon Attack\s*\)/gi, '(Рукопашная атака оружием)'],
    [/\(\s*Ranged Weapon Attack\s*\)/gi, '(Дальнобойная атака оружием)'],
    [/\(\s*Melee or Ranged Weapon Attack\s*\)/gi, '(Рукопашная или дальнобойная атака оружием)'],
    [/\(\s*Vampire Form Only\s*\)/gi, '(Только в облике вампира)'],
    [/\(\s*Bat or Vampire Form Only\s*\)/gi, '(В облике летучей мыши или вампира)'],
    [/\(\s*Recharge\s*(\d+)\s*[-–—]\s*(\d+)\s*\)/gi, '(Перезарядка $1–$2)'],
    [/\(\s*Recharge\s*(\d+)\s*\)/gi, '(Перезарядка $1)'],
    [/\(\s*Chromatic\s*\)/gi, '(хроматический)'],
    [/\(\s*Metallic\s*\)/gi, '(металлический)'],
    [/\(\s*Cost\s*(\d+)\s*Actions\s*\)/gi, '(Тратит $1 действия)'],
    [/\(\s*escape\s*DC\s*(\d+)\s*\)/gi, '(СЛ высвобождения $1)'],
    [/\(\s*spell\s*save\s*DC\s*(\d+)\s*\)/gi, '(СЛ спасброска $1)'],
    [/\(\s*hover\s*\)/gi, '(парение)'],
    [/\(\s*Fire\s*\)/gi, '(Огонь)'],
    [/\(\s*Frost\s*\)/gi, '(Холод)'],
    [/\(\s*Cold\s*\)/gi, '(Холод)'],
    [/\(\s*Lightning\s*\)/gi, '(Молния)'],
    [/\(\s*Acid\s*\)/gi, '(Кислота)'],
    [/\(\s*Poison\s*\)/gi, '(Яд)'],
    [/\(\s*Radiant\s*\)/gi, '(Излучение)'],
    [/\(\s*Necrotic\s*\)/gi, '(Некротический)'],
    [/\(\s*Force\s*\)/gi, '(Силовое поле)'],
    [/\(\s*Psychic\s*\)/gi, '(Психический)'],
    [/\(\s*Thunder\s*\)/gi, '(Звук)'],
    [/\(\s*Angel\s*\)/gi, '(ангел)'],
    [/\(\s*Demon\s*\)/gi, '(демон)'],
    [/\(\s*Devil\s*\)/gi, '(дьявол)'],
    [/\(\s*Genie\s*\)/gi, '(джинн)'],
    [/\(\s*Goblinoid\s*\)/gi, '(гоблиноид)'],
    [/\(\s*Dinosaur\s*\)/gi, '(динозавр)'],
    [/\(\s*Titan\s*\)/gi, '(титан)'],
    [/\(\s*Cleric\s*\)/gi, '(жрец)'],
    [/\(\s*Wizard\s*\)/gi, '(волшебник)'],
    [/\(\s*Lycanthrope\s*\)/gi, '(ликантроп)'],
  ];

  for (const [pattern, repl] of parentheticalTranslations) {
    res = res.replace(pattern, repl);
  }

  // 4. Strip leftover English inside parentheses and brackets, protecting dice formulas like (1d6), (2d8 + 3), (1к6)
  res = res.replace(/\s*\(([A-Za-z0-9\s'.,/\-–—]+)\)/g, (fullMatch, inner: string) => {
    if (/^\s*\d*\s*[dкDК]\s*\d+(\s*[+-]\s*\d+)?\s*$/i.test(inner)) {
      return fullMatch;
    }
    // If it contains Latin words with 2+ letters (and isn't just a number), strip it
    if (/[A-Za-z]{2,}/.test(inner)) {
      return '';
    }
    return fullMatch;
  });

  res = res.replace(/\s*\[([A-Za-z0-9\s'.,/\-–—]+)\]/g, (fullMatch, inner: string) => {
    if (/^\s*\d*\s*[dкDК]\s*\d+(\s*[+-]\s*\d+)?\s*$/i.test(inner)) {
      return fullMatch;
    }
    if (/[A-Za-z]{2,}/.test(inner)) {
      return '';
    }
    return fullMatch;
  });

  // 5. Replace standalone D&D English abbreviations and combat action terms
  res = res
    .replace(/\bvs\.?\b/gi, 'против')
    .replace(/\bCR\b/g, 'КО')
    .replace(/\bHP\b/g, 'ХП')
    .replace(/\bAC\b/g, 'КД')
    .replace(/\bDC\b/g, 'СЛ')
    .replace(/\bXP\b/g, 'опыта')
    .replace(/\bMultiattack\b/gi, 'Мультиатака')
    .replace(/\bMelee or Ranged Weapon Attack:\b/gi, 'Рукопашная или дальнобойная атака оружием:')
    .replace(/\bMelee Weapon Attack:\b/gi, 'Рукопашная атака оружием:')
    .replace(/\bRanged Weapon Attack:\b/gi, 'Дальнобойная атака оружием:')
    .replace(/\bMelee Spell Attack:\b/gi, 'Рукопашная атака заклинанием:')
    .replace(/\bRanged Spell Attack:\b/gi, 'Дальнобойная атака заклинанием:')
    .replace(/\bMelee Attack Roll:\s*\+(\d+),\s*reach\s*(\d+)\s*ft\.?/gi, 'Бросок рукопашной атаки: +$1, досягаемость $2 фт.')
    .replace(/\bRanged Attack Roll:\s*\+(\d+),\s*range\s*(\d+)\/(\d+)\s*ft\.?/gi, 'Бросок дальнобойной атаки: +$1, дистанция $2/$3 фт.')
    .replace(/\bConstitution Saving Throw:\s*DC\s*(\d+)/gi, 'Спасбросок Телосложения: СЛ $1')
    .replace(/\bDexterity Saving Throw:\s*DC\s*(\d+)/gi, 'Спасбросок Ловкости: СЛ $1')
    .replace(/\bStrength Saving Throw:\s*DC\s*(\d+)/gi, 'Спасбросок Силы: СЛ $1')
    .replace(/\bWisdom Saving Throw:\s*DC\s*(\d+)/gi, 'Спасбросок Мудрости: СЛ $1')
    .replace(/\bIntelligence Saving Throw:\s*DC\s*(\d+)/gi, 'Спасбросок Интеллекта: СЛ $1')
    .replace(/\bCharisma Saving Throw:\s*DC\s*(\d+)/gi, 'Спасбросок Харизмы: СЛ $1')
    .replace(/\bSaving Throw:\s*DC\s*(\d+)/gi, 'Спасбросок: СЛ $1')
    .replace(/\bFailure:\b/gi, 'Провал:')
    .replace(/\bSuccess:\b/gi, 'Успех:')
    .replace(/\bHit:\b/gi, 'Попадание:')
    .replace(/\breach\s*(\d+)\s*ft\.?\b/gi, 'досягаемость $1 фт.')
    .replace(/\brange\s*(\d+)\/(\d+)\s*ft\.?\b/gi, 'дистанция $1/$2 фт.')
    .replace(/\brange\s*(\d+)\s*ft\.?\b/gi, 'дистанция $1 фт.')
    .replace(/\bfeet\b/gi, 'футов')
    .replace(/\b(\d+)\s*ft\.?\b/gi, '$1 фт.')
    .replace(/\bHit Points\b/gi, 'ОЗ')
    .replace(/\bplus\s+(\d+)\s*\(([^)]+)\)\s*([A-Za-zА-Яа-яЁё]+)\s+damage\b/gi, 'плюс $1 ($2) $3 урона')
    .replace(/\b(\d+)\s*\(([^)]+)\)\s*([A-Za-zА-Яа-яЁё]+)\s+damage\b/gi, '$1 ($2) $3 урона')
    .replace(/\bslashing\s+damage\b/gi, 'рубящего урона')
    .replace(/\bpiercing\s+damage\b/gi, 'колющего урона')
    .replace(/\bbludgeoning\s+damage\b/gi, 'дробящего урона')
    .replace(/\bfire\s+damage\b/gi, 'урона огнём')
    .replace(/\bcold\s+damage\b/gi, 'урона холодом')
    .replace(/\blightning\s+damage\b/gi, 'урона электричеством')
    .replace(/\bthunder\s+damage\b/gi, 'урона звуком')
    .replace(/\bpoison\s+damage\b/gi, 'урона ядом')
    .replace(/\bacid\s+damage\b/gi, 'урона кислотой')
    .replace(/\bpsychic\s+damage\b/gi, 'психического урона')
    .replace(/\bnecrotic\s+damage\b/gi, 'некротического урона')
    .replace(/\bradiant\s+damage\b/gi, 'урона излучением')
    .replace(/\bforce\s+damage\b/gi, 'урона силовым полем')
    .replace(/\bslashing\b/gi, 'рубящий')
    .replace(/\bpiercing\b/gi, 'колющий')
    .replace(/\bbludgeoning\b/gi, 'дробящий')
    .replace(/\bfire\b/gi, 'огонь')
    .replace(/\bcold\b/gi, 'холод')
    .replace(/\blightning\b/gi, 'электричество')
    .replace(/\bthunder\b/gi, 'звук')
    .replace(/\bpoison\b/gi, 'яд')
    .replace(/\bacid\b/gi, 'кислота')
    .replace(/\bpsychic\b/gi, 'психический')
    .replace(/\bnecrotic\b/gi, 'некротический')
    .replace(/\bradiant\b/gi, 'излучение')
    .replace(/\bforce\b/gi, 'силовое поле');

  // 6. Format dashes in numeric ranges (e.g. "1-2" or "10 - 20" -> "1–2", "10–20")
  res = res.replace(/(\d+)\s*[-–—]\s*(\d+)/g, '$1–$2');

  // 7. Cleanup empty parentheses, duplicate punctuation, and spacing
  res = res
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/\s+([,.:;!?])/g, '$1')
    .replace(/,{2,}/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return res;
}

/**
 * Filters Master spoiler tags from combatant names for the Player screen.
 * Removes technical markers in parentheses or brackets like (Босс), (Boss), (Миньон), (Minion), (Лидер), (Leader), etc.
 */
export function filterPlayerCombatantName(name?: string | null): string {
  if (!name) return '';
  let cleaned = String(name);
  cleaned = cleaned
    .replace(/\s*\((?:босс|boss|миньон|minion|лидер|leader|командир|commander|главарь|элита|elite|npc|нпс|игрок|player)\)/gi, '')
    .replace(/\s*\[(?:босс|boss|миньон|minion|лидер|leader|командир|commander|главарь|элита|elite|npc|нпс|игрок|player)\]/gi, '');
  return cleanRussianText(cleaned);
}
