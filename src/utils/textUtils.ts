/**
 * textUtils.ts
 * Bilingual text cleaning and D&D 2024 / SRD 5.2.1 localization dictionaries (English & Russian).
 * Standard official terminology based on SRD 5.2.1 and official Russian editions (Hobby World / D&D 2024).
 */

import { useSettingsStore } from '../store/settingsStore';

/**
 * Resolves active language ('en' | 'ru').
 * Falls back to settingsStore's language or 'en'.
 */
export function resolveLanguage(lang?: 'en' | 'ru'): 'en' | 'ru' {
  if (lang === 'en' || lang === 'ru') return lang;
  try {
    const storeLang = useSettingsStore.getState().language;
    if (storeLang === 'en' || storeLang === 'ru') return storeLang;
  } catch {}
  return 'en';
}

// 1. 13 Damage Types in English & Russian D&D
export const DAMAGE_TYPES_EN: Record<string, string> = {
  slashing: 'Slashing',
  piercing: 'Piercing',
  bludgeoning: 'Bludgeoning',
  fire: 'Fire',
  cold: 'Cold',
  lightning: 'Lightning',
  thunder: 'Thunder',
  poison: 'Poison',
  acid: 'Acid',
  psychic: 'Psychic',
  necrotic: 'Necrotic',
  radiant: 'Radiant',
  force: 'Force',
  // Capitalized variants
  Slashing: 'Slashing',
  Piercing: 'Piercing',
  Bludgeoning: 'Bludgeoning',
  Fire: 'Fire',
  Cold: 'Cold',
  Lightning: 'Lightning',
  Thunder: 'Thunder',
  Poison: 'Poison',
  Acid: 'Acid',
  Psychic: 'Psychic',
  Necrotic: 'Necrotic',
  Radiant: 'Radiant',
  Force: 'Force',
  // Russian inputs mapping to canonical English
  рубящий: 'Slashing',
  колющий: 'Piercing',
  дробящий: 'Bludgeoning',
  огонь: 'Fire',
  холод: 'Cold',
  электричество: 'Lightning',
  молния: 'Lightning',
  звук: 'Thunder',
  гром: 'Thunder',
  яд: 'Poison',
  кислота: 'Acid',
  психический: 'Psychic',
  некротический: 'Necrotic',
  излучение: 'Radiant',
  'силовое поле': 'Force',
  Рубящий: 'Slashing',
  Колющий: 'Piercing',
  Дробящий: 'Bludgeoning',
  Огонь: 'Fire',
  Холод: 'Cold',
  Электричество: 'Lightning',
  Молния: 'Lightning',
  Звук: 'Thunder',
  Гром: 'Thunder',
  Яд: 'Poison',
  Кислота: 'Acid',
  Психический: 'Psychic',
  Некротический: 'Necrotic',
  Излучение: 'Radiant',
  'Силовое поле': 'Force',
};

export const DAMAGE_NAMES_EN = DAMAGE_TYPES_EN;

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
  // Russian inputs to normalized Russian
  рубящий: 'Рубящий',
  колющий: 'Колющий',
  дробящий: 'Дробящий',
  огонь: 'Огонь',
  холод: 'Холод',
  электричество: 'Электричество',
  молния: 'Электричество',
  звук: 'Звук',
  гром: 'Звук',
  яд: 'Яд',
  кислота: 'Кислота',
  психический: 'Психический',
  некротический: 'Некротический',
  излучение: 'Излучение',
  'силовое поле': 'Силовое поле',
  Рубящий: 'Рубящий',
  Колющий: 'Колющий',
  Дробящий: 'Дробящий',
  Огонь: 'Огонь',
  Холод: 'Холод',
  Электричество: 'Электричество',
  Молния: 'Электричество',
  Звук: 'Звук',
  Гром: 'Звук',
  Яд: 'Яд',
  Кислота: 'Кислота',
  Психический: 'Психический',
  Некротический: 'Некротический',
  Излучение: 'Излучение',
  'Силовое поле': 'Силовое поле',
};

// Alias for backwards compatibility
export const DAMAGE_NAMES_RU = DAMAGE_TYPES_RU;

// 2. 6 Ability Scores in English & Russian D&D
export const STAT_NAMES_EN: Record<string, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  intellect: 'INT',
  wis: 'WIS',
  cha: 'CHA',
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
  Str: 'STR',
  Dex: 'DEX',
  Con: 'CON',
  Int: 'INT',
  Wis: 'WIS',
  Cha: 'CHA',
  Strength: 'STR',
  Dexterity: 'DEX',
  Constitution: 'CON',
  Intelligence: 'INT',
  Wisdom: 'WIS',
  Charisma: 'CHA',
  // Russian inputs mapping to English abbreviations
  сил: 'STR',
  лов: 'DEX',
  тел: 'CON',
  инт: 'INT',
  мдр: 'WIS',
  хар: 'CHA',
  сила: 'STR',
  ловкость: 'DEX',
  телосложение: 'CON',
  интеллект: 'INT',
  мудрость: 'WIS',
  харизма: 'CHA',
  СИЛ: 'STR',
  ЛОВ: 'DEX',
  ТЕЛ: 'CON',
  ИНТ: 'INT',
  МДР: 'WIS',
  ХАР: 'CHA',
  Сила: 'STR',
  Ловкость: 'DEX',
  Телосложение: 'CON',
  Интеллект: 'INT',
  Мудрость: 'WIS',
  Харизма: 'CHA',
};

export const STAT_FULL_NAMES_EN: Record<string, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  intellect: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma',
  Str: 'Strength',
  Dex: 'Dexterity',
  Con: 'Constitution',
  Int: 'Intelligence',
  Wis: 'Wisdom',
  Cha: 'Charisma',
  Strength: 'Strength',
  Dexterity: 'Dexterity',
  Constitution: 'Constitution',
  Intelligence: 'Intelligence',
  Wisdom: 'Wisdom',
  Charisma: 'Charisma',
  // Russian inputs mapping to English full names
  сил: 'Strength',
  лов: 'Dexterity',
  тел: 'Constitution',
  инт: 'Intelligence',
  мдр: 'Wisdom',
  хар: 'Charisma',
  сила: 'Strength',
  ловкость: 'Dexterity',
  телосложение: 'Constitution',
  интеллект: 'Intelligence',
  мудрость: 'Wisdom',
  харизма: 'Charisma',
  СИЛ: 'Strength',
  ЛОВ: 'Dexterity',
  ТЕЛ: 'Constitution',
  ИНТ: 'Intelligence',
  МДР: 'Wisdom',
  ХАР: 'Charisma',
  Сила: 'Strength',
  Ловкость: 'Dexterity',
  Телосложение: 'Constitution',
  Интеллект: 'Intelligence',
  Мудрость: 'Wisdom',
  Харизма: 'Charisma',
};

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
  сила: 'СИЛ',
  ловкость: 'ЛОВ',
  телосложение: 'ТЕЛ',
  интеллект: 'ИНТ',
  мудрость: 'МДР',
  харизма: 'ХАР',
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
  Str: 'Сила',
  Dex: 'Ловкость',
  Con: 'Телосложение',
  Int: 'Интеллект',
  Wis: 'Мудрость',
  Cha: 'Харизма',
  Strength: 'Сила',
  Dexterity: 'Ловкость',
  Constitution: 'Телосложение',
  Intelligence: 'Интеллект',
  Wisdom: 'Мудрость',
  Charisma: 'Харизма',
  сил: 'Сила',
  лов: 'Ловкость',
  тел: 'Телосложение',
  инт: 'Интеллект',
  мдр: 'Мудрость',
  хар: 'Харизма',
  сила: 'Сила',
  ловкость: 'Ловкость',
  телосложение: 'Телосложение',
  интеллект: 'Интеллект',
  мудрость: 'Мудрость',
  харизма: 'Харизма',
};

// 3. 18 Skills in English & Russian D&D 2024 / 5e
export const SKILL_NAMES_EN: Record<string, string> = {
  acrobatics: 'Acrobatics',
  animal_handling: 'Animal Handling',
  'animal handling': 'Animal Handling',
  animalhandling: 'Animal Handling',
  arcana: 'Arcana',
  athletics: 'Athletics',
  deception: 'Deception',
  history: 'History',
  insight: 'Insight',
  intimidation: 'Intimidation',
  investigation: 'Investigation',
  medicine: 'Medicine',
  nature: 'Nature',
  perception: 'Perception',
  performance: 'Performance',
  persuasion: 'Persuasion',
  religion: 'Religion',
  sleight_of_hand: 'Sleight of Hand',
  'sleight of hand': 'Sleight of Hand',
  sleightofhand: 'Sleight of Hand',
  stealth: 'Stealth',
  survival: 'Survival',
  Acrobatics: 'Acrobatics',
  'Animal Handling': 'Animal Handling',
  AnimalHandling: 'Animal Handling',
  Arcana: 'Arcana',
  Athletics: 'Athletics',
  Deception: 'Deception',
  History: 'History',
  Insight: 'Insight',
  Intimidation: 'Intimidation',
  Investigation: 'Investigation',
  Medicine: 'Medicine',
  Nature: 'Nature',
  Perception: 'Perception',
  Performance: 'Performance',
  Persuasion: 'Persuasion',
  Religion: 'Religion',
  'Sleight of Hand': 'Sleight of Hand',
  SleightOfHand: 'Sleight of Hand',
  Stealth: 'Stealth',
  Survival: 'Survival',
  // Russian inputs mapping to canonical English
  акробатика: 'Acrobatics',
  'уход за животными': 'Animal Handling',
  уход_за_животными: 'Animal Handling',
  дрессировка: 'Animal Handling',
  магия: 'Arcana',
  атлетика: 'Athletics',
  обман: 'Deception',
  история: 'History',
  проницательность: 'Insight',
  запугивание: 'Intimidation',
  анализ: 'Investigation',
  расследование: 'Investigation',
  медицина: 'Medicine',
  природа: 'Nature',
  внимательность: 'Perception',
  восприятие: 'Perception',
  выступление: 'Performance',
  убеждение: 'Persuasion',
  религия: 'Religion',
  'ловкость рук': 'Sleight of Hand',
  ловкость_рук: 'Sleight of Hand',
  скрытность: 'Stealth',
  выживание: 'Survival',
  Акробатика: 'Acrobatics',
  'Уход за животными': 'Animal Handling',
  Магия: 'Arcana',
  Атлетика: 'Athletics',
  Обман: 'Deception',
  История: 'History',
  Проницательность: 'Insight',
  Запугивание: 'Intimidation',
  Анализ: 'Investigation',
  Медицина: 'Medicine',
  Природа: 'Nature',
  Внимательность: 'Perception',
  Выступление: 'Performance',
  Убеждение: 'Persuasion',
  Религия: 'Religion',
  'Ловкость рук': 'Sleight of Hand',
  Скрытность: 'Stealth',
  Выживание: 'Survival',
};

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
  // Russian self-mappings
  акробатика: 'Акробатика',
  'уход за животными': 'Уход за животными',
  магия: 'Магия',
  атлетика: 'Атлетика',
  обман: 'Обман',
  история: 'История',
  проницательность: 'Проницательность',
  запугивание: 'Запугивание',
  анализ: 'Анализ',
  медицина: 'Медицина',
  природа: 'Природа',
  внимательность: 'Внимательность',
  выступление: 'Выступление',
  убеждение: 'Убеждение',
  религия: 'Религия',
  'ловкость рук': 'Ловкость рук',
  скрытность: 'Скрытность',
  выживание: 'Выживание',
};

// 4. Standard Conditions in D&D 2024 / 5e (16 conditions)
export const CONDITION_NAMES_EN: Record<string, string> = {
  blinded: 'Blinded',
  charmed: 'Charmed',
  deafened: 'Deafened',
  dazed: 'Dazed',
  exhaustion: 'Exhaustion',
  frightened: 'Frightened',
  grappled: 'Grappled',
  incapacitated: 'Incapacitated',
  invisible: 'Invisible',
  paralyzed: 'Paralyzed',
  petrified: 'Petrified',
  poisoned: 'Poisoned',
  prone: 'Prone',
  restrained: 'Restrained',
  stunned: 'Stunned',
  unconscious: 'Unconscious',
  // Capitalized
  Blinded: 'Blinded',
  Charmed: 'Charmed',
  Deafened: 'Deafened',
  Dazed: 'Dazed',
  Exhaustion: 'Exhaustion',
  Frightened: 'Frightened',
  Grappled: 'Grappled',
  Incapacitated: 'Incapacitated',
  Invisible: 'Invisible',
  Paralyzed: 'Paralyzed',
  Petrified: 'Petrified',
  Poisoned: 'Poisoned',
  Prone: 'Prone',
  Restrained: 'Restrained',
  Stunned: 'Stunned',
  Unconscious: 'Unconscious',
  // Russian inputs mapping to English
  ослеплённый: 'Blinded',
  ослепленный: 'Blinded',
  очарованный: 'Charmed',
  глухой: 'Deafened',
  ошеломлённый: 'Dazed',
  ошеломленный: 'Dazed',
  истощение: 'Exhaustion',
  испуганный: 'Frightened',
  захваченный: 'Grappled',
  недееспособный: 'Incapacitated',
  невидимый: 'Invisible',
  парализованный: 'Paralyzed',
  окаменевший: 'Petrified',
  отравленный: 'Poisoned',
  'сбит с ног': 'Prone',
  сбит_с_ног: 'Prone',
  опутанный: 'Restrained',
  оглушённый: 'Stunned',
  оглушенный: 'Stunned',
  бессознательный: 'Unconscious',
  Ослеплённый: 'Blinded',
  Ослепленный: 'Blinded',
  Очарованный: 'Charmed',
  Глухой: 'Deafened',
  Ошеломлённый: 'Dazed',
  Ошеломленный: 'Dazed',
  Истощение: 'Exhaustion',
  Испуганный: 'Frightened',
  Захваченный: 'Grappled',
  Недееспособный: 'Incapacitated',
  Невидимый: 'Invisible',
  Парализованный: 'Paralyzed',
  Окаменевший: 'Petrified',
  Отравленный: 'Poisoned',
  'Сбит с ног': 'Prone',
  Опутанный: 'Restrained',
  Оглушённый: 'Stunned',
  Оглушенный: 'Stunned',
  Бессознательный: 'Unconscious',
};

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
  // Russian self-mappings
  ослеплённый: 'Ослеплённый',
  ослепленный: 'Ослеплённый',
  очарованный: 'Очарованный',
  глухой: 'Глухой',
  ошеломлённый: 'Ошеломлённый',
  ошеломленный: 'Ошеломлённый',
  истощение: 'Истощение',
  испуганный: 'Испуганный',
  захваченный: 'Захваченный',
  недееспособный: 'Недееспособный',
  невидимый: 'Невидимый',
  парализованный: 'Парализованный',
  окаменевший: 'Окаменевший',
  отравленный: 'Отравленный',
  'сбит с ног': 'Сбит с ног',
  сбит_с_ног: 'Сбит с ног',
  опутанный: 'Опутанный',
  оглушённый: 'Оглушённый',
  оглушенный: 'Оглушённый',
  бессознательный: 'Бессознательный',
};

// 5. 14 Creature Types in English & Russian D&D 2024 / 5e
export const CREATURE_TYPES_EN: Record<string, string> = {
  aberration: 'Aberration',
  beast: 'Beast',
  celestial: 'Celestial',
  construct: 'Construct',
  dragon: 'Dragon',
  elemental: 'Elemental',
  fey: 'Fey',
  fiend: 'Fiend',
  giant: 'Giant',
  humanoid: 'Humanoid',
  monstrosity: 'Monstrosity',
  monster: 'Monster',
  ooze: 'Ooze',
  plant: 'Plant',
  undead: 'Undead',
  // Capitalized
  Aberration: 'Aberration',
  Beast: 'Beast',
  Celestial: 'Celestial',
  Construct: 'Construct',
  Dragon: 'Dragon',
  Elemental: 'Elemental',
  Fey: 'Fey',
  Fiend: 'Fiend',
  Giant: 'Giant',
  Humanoid: 'Humanoid',
  Monstrosity: 'Monstrosity',
  Monster: 'Monster',
  Ooze: 'Ooze',
  Plant: 'Plant',
  Undead: 'Undead',
  // Plural English
  aberrations: 'Aberrations',
  beasts: 'Beasts',
  celestials: 'Celestials',
  constructs: 'Constructs',
  dragons: 'Dragons',
  elementals: 'Elementals',
  fiends: 'Fiends',
  giants: 'Giants',
  humanoids: 'Humanoids',
  monstrosities: 'Monstrosities',
  monsters: 'Monsters',
  oozes: 'Oozes',
  plants: 'Plants',
  // Russian inputs mapping to English
  аберрация: 'Aberration',
  зверь: 'Beast',
  небожитель: 'Celestial',
  конструкт: 'Construct',
  дракон: 'Dragon',
  элементаль: 'Elemental',
  фея: 'Fey',
  исчадие: 'Fiend',
  великан: 'Giant',
  гуманоид: 'Humanoid',
  чудовище: 'Monstrosity',
  монстр: 'Monster',
  слизь: 'Ooze',
  растение: 'Plant',
  нежить: 'Undead',
  существо: 'Creature',
  аберрации: 'Aberrations',
  звери: 'Beasts',
  небожители: 'Celestials',
  конструкты: 'Constructs',
  драконы: 'Dragons',
  элементали: 'Elementals',
  исчадия: 'Fiends',
  великаны: 'Giants',
  гуманоиды: 'Humanoids',
  чудовища: 'Monstrosities',
  монстры: 'Monsters',
  слизи: 'Oozes',
  растения: 'Plants',
  Аберрация: 'Aberration',
  Зверь: 'Beast',
  Небожитель: 'Celestial',
  Конструкт: 'Construct',
  Дракон: 'Dragon',
  Элементаль: 'Elemental',
  Фея: 'Fey',
  Исчадие: 'Fiend',
  Великан: 'Giant',
  Гуманоид: 'Humanoid',
  Чудовище: 'Monstrosity',
  Монстр: 'Monster',
  Слизь: 'Ooze',
  Растение: 'Plant',
  Нежить: 'Undead',
  Существо: 'Creature',
};

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
  // Russian self-mappings
  аберрация: 'Аберрация',
  зверь: 'Зверь',
  небожитель: 'Небожитель',
  конструкт: 'Конструкт',
  дракон: 'Дракон',
  элементаль: 'Элементаль',
  фея: 'Фея',
  исчадие: 'Исчадие',
  великан: 'Великан',
  гуманоид: 'Гуманоид',
  чудовище: 'Чудовище',
  монстр: 'Монстр',
  слизь: 'Слизь',
  растение: 'Растение',
  нежить: 'Нежить',
  существо: 'Существо',
  аберрации: 'Аберрации',
  звери: 'Звери',
  небожители: 'Небожители',
  конструкты: 'Конструкты',
  драконы: 'Драконы',
  элементали: 'Элементали',
  исчадия: 'Исчадия',
  великаны: 'Великаны',
  гуманоиды: 'Гуманоиды',
  чудовища: 'Чудовища',
  монстры: 'Монстры',
  слизи: 'Слизи',
  растения: 'Растения',
};

// 6. Magic Item Rarities in English & Russian
export const RARITY_NAMES_EN: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  'very rare': 'Very Rare',
  very_rare: 'Very Rare',
  legendary: 'Legendary',
  artifact: 'Artifact',
  Common: 'Common',
  Uncommon: 'Uncommon',
  Rare: 'Rare',
  'Very Rare': 'Very Rare',
  Legendary: 'Legendary',
  Artifact: 'Artifact',
  // Russian inputs mapping to English
  обычный: 'Common',
  необычный: 'Uncommon',
  редкий: 'Rare',
  'очень редкий': 'Very Rare',
  очень_редкий: 'Very Rare',
  легендарный: 'Legendary',
  артефакт: 'Artifact',
  магический: 'Magical',
  Обычный: 'Common',
  Необычный: 'Uncommon',
  Редкий: 'Rare',
  'Очень редкий': 'Very Rare',
  Легендарный: 'Legendary',
  Артефакт: 'Artifact',
  Магический: 'Magical',
};

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

// 7. Item Types in English & Russian
export const ITEM_TYPE_NAMES_EN: Record<string, string> = {
  weapon: 'Weapon',
  weapons: 'Weapon',
  armor: 'Armor',
  potion: 'Potion',
  potions: 'Potion',
  scroll: 'Scroll',
  scrolls: 'Scroll',
  ring: 'Ring',
  rings: 'Ring',
  rod: 'Rod',
  rods: 'Rod',
  wand: 'Wand',
  wands: 'Wand',
  staff: 'Staff',
  staffs: 'Staff',
  staves: 'Staff',
  'wondrous item': 'Wondrous Item',
  wondrous: 'Wondrous Item',
  Weapon: 'Weapon',
  Weapons: 'Weapon',
  Armor: 'Armor',
  Potion: 'Potion',
  Potions: 'Potion',
  Scroll: 'Scroll',
  Scrolls: 'Scroll',
  Ring: 'Ring',
  Rings: 'Ring',
  Rod: 'Rod',
  Rods: 'Rod',
  Wand: 'Wand',
  Wands: 'Wand',
  Staff: 'Staff',
  Staffs: 'Staff',
  Staves: 'Staff',
  'Wondrous Item': 'Wondrous Item',
  Wondrous: 'Wondrous Item',
  // Russian inputs mapping to English
  оружие: 'Weapon',
  'доспехи и щиты': 'Armor',
  доспехи: 'Armor',
  зелье: 'Potion',
  зелья: 'Potion',
  свиток: 'Scroll',
  свитки: 'Scroll',
  кольцо: 'Ring',
  кольца: 'Ring',
  жезл: 'Rod',
  жезлы: 'Rod',
  'волшебная палочка': 'Wand',
  'волшебные палочки': 'Wand',
  посох: 'Staff',
  посохи: 'Staff',
  'чудесный предмет': 'Wondrous Item',
  Оружие: 'Weapon',
  'Доспехи и щиты': 'Armor',
  Доспехи: 'Armor',
  Зелье: 'Potion',
  Зелья: 'Potion',
  Свиток: 'Scroll',
  Свитки: 'Scroll',
  Кольцо: 'Ring',
  Кольца: 'Ring',
  Жезл: 'Rod',
  Жезлы: 'Rod',
  'Волшебная палочка': 'Wand',
  'Волшебные палочки': 'Wand',
  Посох: 'Staff',
  Посохи: 'Staff',
  'Чудесный предмет': 'Wondrous Item',
};

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

/**
 * Reverse mapping from Russian monster names to English canonical names.
 */
export const MONSTER_NAMES_EN: Record<string, string> = Object.entries(
  MONSTER_NAMES_RU
).reduce((acc, [enName, ruName]) => {
  acc[ruName] = enName;
  acc[ruName.toLowerCase()] = enName;
  return acc;
}, {} as Record<string, string>);

function localizeMonsterSuffix(inner: string, lang: 'en' | 'ru'): string {
  const SUFFIX_MAP_EN: Record<string, string> = {
    'босс': 'Boss',
    'миньон': 'Minion',
    'лидер': 'Leader',
    'капитан': 'Captain',
    'маг': 'Mage',
    'воин': 'Warrior',
    'владыка склепа': 'Crypt Lord',
    'главарь': 'Chief',
    'альфа': 'Alpha',
    'страж': 'Guard',
    'вечерник': 'Nightbringer',
  };
  const SUFFIX_MAP_RU: Record<string, string> = {
    'boss': 'Босс',
    'minion': 'Миньон',
    'leader': 'Лидер',
    'captain': 'Капитан',
    'mage': 'Маг',
    'warrior': 'Воин',
    'crypt lord': 'Владыка склепа',
    'chief': 'Главарь',
    'alpha': 'Альфа',
    'guard': 'Страж',
    'nightbringer': 'Вечерник',
  };
  const lower = inner.trim().toLowerCase();
  if (lang === 'en') {
    if (SUFFIX_MAP_EN[lower]) return SUFFIX_MAP_EN[lower];
    const lvlMatch = inner.match(/^(?:ур\.?|уровень)\s*(\d+)$/i);
    if (lvlMatch) return `Lvl ${lvlMatch[1]}`;
    return inner;
  } else {
    if (SUFFIX_MAP_RU[lower]) return SUFFIX_MAP_RU[lower];
    const lvlMatch = inner.match(/^(?:lvl|level)\.?\s*(\d+)$/i);
    if (lvlMatch) return `Ур. ${lvlMatch[1]}`;
    return cleanRussianText(inner);
  }
}

export function localizeSceneName(name?: string | null, lang: 'en' | 'ru' = 'ru'): string {
  if (!name) return lang === 'en' ? 'Main Scene' : 'Главная сцена';
  const trimmed = name.trim();
  if (lang === 'en') {
    if (trimmed === 'Главная сцена' || trimmed === 'Главная Сцена') return 'Main Scene';
    return trimmed.replace(/^Сцена\s+(\d+)$/i, 'Scene $1');
  } else {
    if (trimmed === 'Main Scene' || trimmed === 'main scene') return 'Главная сцена';
    return trimmed.replace(/^Scene\s+(\d+)$/i, 'Сцена $1');
  }
}

export function extractEnglishParenthetical(text?: string | null): string | null {
  if (!text) return null;
  const match = text.match(/\(([^)]+)\)/);
  if (match) {
    const candidate = match[1].trim();
    if (!/[а-яА-ЯёЁ]/.test(candidate)) {
      return candidate;
    }
  }
  return null;
}

const TRAIT_NAMES_MAP: Record<string, string> = {
  'регенерация': 'Regeneration',
  'паучье лазание': 'Spider Climb',
  'слабости вампира': 'Vampire Weaknesses',
  'туманный побег': 'Misty Escape',
  'амфибия': 'Amphibious',
  'сопротивление магии': 'Magic Resistance',
  'легендарное сопротивление': 'Legendary Resistance',
  'острое обоняние': 'Keen Smell',
  'острый слух': 'Keen Hearing',
  'острое зрение': 'Keen Sight',
  'острые чувства': 'Keen Senses',
  'скрытная атака': 'Sneak Attack',
  'пахтание': 'Pounce',
  'наскок': 'Pounce',
  'свирепость': 'Relentless',
  'безупречный побег': 'Nimble Escape',
  'тактика стаи': 'Pack Tactics',
  'агрессивный': 'Aggressive',
  'хамелеон': 'Chameleon',
  'огненное тело': 'Fire Form',
  'водная форма': 'Water Form',
  'освещение': 'Illumination',
  'неизменный облик': 'Immutable Form',
  'обманчивая внешность': 'False Appearance',
  'ужасающий вид': 'Horrific Appearance',
  'врожденное колдовство': 'Innate Spellcasting',
  'колдовство': 'Spellcasting',
};

const TRAIT_NAMES_RU_MAP: Record<string, string> = Object.entries(TRAIT_NAMES_MAP).reduce((acc, [ru, en]) => {
  acc[en.toLowerCase()] = ru.charAt(0).toUpperCase() + ru.slice(1);
  return acc;
}, {} as Record<string, string>);

export function localizeTraitName(name?: string | null, lang: 'en' | 'ru' = 'ru'): string {
  if (!name) return '';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (lang === 'en') {
    const enParenthetical = extractEnglishParenthetical(trimmed);
    if (enParenthetical) return enParenthetical;
    if (TRAIT_NAMES_MAP[lower]) return TRAIT_NAMES_MAP[lower];
    return trimmed;
  } else {
    if (TRAIT_NAMES_RU_MAP[lower]) return TRAIT_NAMES_RU_MAP[lower];
    return cleanRussianText(trimmed);
  }
}

export function localizeMonsterName(name?: string | null, lang?: 'en' | 'ru'): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  const effectiveLang = resolveLanguage(lang);

  // Colon match e.g. "Вампир (Босс): d20" or "Vampire (Boss): d20"
  const colonMatch = trimmed.match(/^(.+?)\s*:\s*(.+)$/);
  if (colonMatch) {
    const left = colonMatch[1].trim();
    const right = colonMatch[2].trim();
    const locLeft = localizeMonsterName(left, effectiveLang);
    return `${locLeft}: ${right}`;
  }

  // Numbered copies e.g. "Стражник #1" or "Guard #2"
  const numMatch = trimmed.match(/^(.+?)\s*([#№]\s*\d+)$/);
  if (numMatch) {
    const baseName = numMatch[1].trim();
    const numSuffix = numMatch[2].trim();
    const locBase = localizeMonsterName(baseName, effectiveLang);
    return `${locBase} ${numSuffix}`;
  }

  // Handle parentheticals e.g. "Вампир (Босс)" or "Wolf (Alpha)"
  const parenMatch = trimmed.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    const baseName = parenMatch[1].trim();
    const inner = parenMatch[2].trim();
    const locBase = localizeMonsterName(baseName, effectiveLang);
    const locInner = localizeMonsterSuffix(inner, effectiveLang);
    return `${locBase} (${locInner})`;
  }

  if (effectiveLang === 'en') {
    if (MONSTER_NAMES_EN[trimmed]) {
      return MONSTER_NAMES_EN[trimmed];
    }
    if (MONSTER_NAMES_RU[trimmed]) {
      return trimmed;
    }
    const lower = trimmed.toLowerCase();
    for (const [ru, en] of Object.entries(MONSTER_NAMES_EN)) {
      if (ru.toLowerCase() === lower) {
        return en;
      }
    }
    for (const en of Object.keys(MONSTER_NAMES_RU)) {
      if (en.toLowerCase() === lower) {
        return en;
      }
    }
    return trimmed;
  }

  // Russian logic
  if (MONSTER_NAMES_RU[trimmed]) {
    return MONSTER_NAMES_RU[trimmed];
  }

  const lower = trimmed.toLowerCase();
  for (const [en, ru] of Object.entries(MONSTER_NAMES_RU)) {
    if (en.toLowerCase() === lower) {
      return ru;
    }
  }

  return cleanRussianText(trimmed);
}

// Localization Helpers
export function localizeDamageType(dmg?: string | null, lang?: 'en' | 'ru'): string {
  if (!dmg) return '';
  const effectiveLang = resolveLanguage(lang);
  const key = dmg.toLowerCase().trim();
  if (effectiveLang === 'en') {
    return DAMAGE_TYPES_EN[key] || DAMAGE_TYPES_EN[dmg.trim()] || dmg;
  }
  return DAMAGE_TYPES_RU[key] || DAMAGE_TYPES_RU[dmg.trim()] || dmg;
}

export function localizeRarity(rarity?: string | null, lang?: 'en' | 'ru'): string {
  const effectiveLang = resolveLanguage(lang);
  if (!rarity) return effectiveLang === 'en' ? 'Magical' : 'Магический';
  const key = rarity.toLowerCase().trim();
  if (effectiveLang === 'en') {
    return RARITY_NAMES_EN[key] || RARITY_NAMES_EN[rarity.trim()] || rarity;
  }
  return RARITY_NAMES_RU[key] || RARITY_NAMES_RU[rarity.trim()] || rarity;
}

export function localizeItemType(type?: string | null, lang?: 'en' | 'ru'): string {
  if (!type) return '';
  const effectiveLang = resolveLanguage(lang);
  const key = type.toLowerCase().trim();
  if (effectiveLang === 'en') {
    return ITEM_TYPE_NAMES_EN[key] || ITEM_TYPE_NAMES_EN[type.trim()] || type;
  }
  return ITEM_TYPE_NAMES_RU[key] || ITEM_TYPE_NAMES_RU[type.trim()] || type;
}

export function localizeCondition(condition?: string | null, lang?: 'en' | 'ru'): string {
  if (!condition) return '';
  const effectiveLang = resolveLanguage(lang);
  const key = condition.toLowerCase().trim();
  if (effectiveLang === 'en') {
    return CONDITION_NAMES_EN[key] || CONDITION_NAMES_EN[condition.trim()] || condition;
  }
  return CONDITION_NAMES_RU[key] || CONDITION_NAMES_RU[condition.trim()] || condition;
}

export const COMPOUND_CREATURE_TYPES_EN: Record<string, string> = {
  'or small humanoid': 'Humanoid (Medium or Small)',
  'or small humanoid (cleric)': 'Humanoid (Cleric)',
  'or small humanoid (wizard)': 'Humanoid (Wizard)',
  'or small monstrosity (lycanthrope)': 'Monstrosity (Lycanthrope)',
  'or small undead': 'Undead (Medium or Small)',
  'or small undead (cleric)': 'Undead (Cleric)',
  'swarm of tiny beasts': 'Swarm of Tiny Beasts',
  'swarm of tiny undead': 'Swarm of Tiny Undead',
  'swarm of tiny constructs': 'Swarm of Tiny Constructs',
  'beast (dinosaur)': 'Beast (Dinosaur)',
  'celestial (angel)': 'Celestial (Angel)',
  'dragon (chromatic)': 'Dragon (Chromatic)',
  'dragon (metallic)': 'Dragon (Metallic)',
  'elemental (genie)': 'Elemental (Genie)',
  'fey (goblinoid)': 'Fey (Goblinoid)',
  'fiend (demon)': 'Fiend (Demon)',
  'fiend (devil)': 'Fiend (Devil)',
  'monstrosity (titan)': 'Monstrosity (Titan)',
  'undead (wizard)': 'Undead (Wizard)',
  // Russian compound types mapped to English
  'гуманоид (средний или маленький)': 'Humanoid (Medium or Small)',
  'гуманоид (жрец)': 'Humanoid (Cleric)',
  'гуманоид (волшебник)': 'Humanoid (Wizard)',
  'чудовище (ликантроп)': 'Monstrosity (Lycanthrope)',
  'нежить (средняя или маленькая)': 'Undead (Medium or Small)',
  'нежить (жрец)': 'Undead (Cleric)',
  'рой крошечных зверей': 'Swarm of Tiny Beasts',
  'рой крошечной нежити': 'Swarm of Tiny Undead',
  'рой крошечных конструктов': 'Swarm of Tiny Constructs',
  'зверь (динозавр)': 'Beast (Dinosaur)',
  'небожитель (ангел)': 'Celestial (Angel)',
  'дракон (хроматический)': 'Dragon (Chromatic)',
  'дракон (металлический)': 'Dragon (Metallic)',
  'элементаль (джинн)': 'Elemental (Genie)',
  'фея (гоблиноид)': 'Fey (Goblinoid)',
  'исчадие (демон)': 'Fiend (Demon)',
  'исчадие (дьявол)': 'Fiend (Devil)',
  'чудовище (титан)': 'Monstrosity (Titan)',
  'нежить (волшебник)': 'Undead (Wizard)',
};

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

export function localizeCreatureType(type?: string | null, lang?: 'en' | 'ru'): string {
  const effectiveLang = resolveLanguage(lang);
  if (!type) return effectiveLang === 'en' ? 'Creature' : 'существо';
  const clean = type.trim();
  const lower = clean.toLowerCase();

  if (effectiveLang === 'en') {
    if (COMPOUND_CREATURE_TYPES_EN[lower]) return COMPOUND_CREATURE_TYPES_EN[lower];
    if (CREATURE_TYPES_EN[lower]) return CREATURE_TYPES_EN[lower];

    for (const [key, val] of Object.entries(COMPOUND_CREATURE_TYPES_EN)) {
      if (lower.startsWith(key)) return val;
    }
    for (const [key, val] of Object.entries(CREATURE_TYPES_EN)) {
      if (lower.startsWith(key.toLowerCase())) {
        const remainder = clean.slice(key.length).trim();
        return remainder ? `${val} ${remainder}` : val;
      }
    }
    return clean;
  }

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

export function localizeSkill(skill?: string | null, lang?: 'en' | 'ru'): string {
  if (!skill) return '';
  const effectiveLang = resolveLanguage(lang);
  const key = skill.toLowerCase().trim().replace(/[\s_-]+/g, '_');
  const spaceKey = skill.toLowerCase().trim();
  if (effectiveLang === 'en') {
    return SKILL_NAMES_EN[key] || SKILL_NAMES_EN[spaceKey] || skill;
  }
  return SKILL_NAMES_RU[key] || SKILL_NAMES_RU[spaceKey] || skill;
}

export function localizeStat(stat?: string | null, full = false, lang?: 'en' | 'ru'): string {
  if (!stat) return '';
  const effectiveLang = resolveLanguage(lang);
  const key = stat.toLowerCase().trim();
  if (effectiveLang === 'en') {
    return full ? (STAT_FULL_NAMES_EN[key] || stat) : (STAT_NAMES_EN[key] || stat);
  }
  return full ? (STAT_FULL_NAMES_RU[key] || stat) : (STAT_NAMES_RU[key] || stat);
}

export function formatSpeed(speed?: string | null, lang?: 'en' | 'ru'): string {
  const effectiveLang = resolveLanguage(lang);
  if (effectiveLang === 'ru') {
    return formatSpeedRu(speed);
  }
  if (!speed) return '30 ft.';
  return String(speed).trim()
    .replace(/скорость\s+пол[её]та/gi, 'fly speed')
    .replace(/скорость\s+плавания/gi, 'swim speed')
    .replace(/скорость\s+лазания/gi, 'climb speed')
    .replace(/скорость\s+копания/gi, 'burrow speed')
    .replace(/пол[её]т/gi, 'fly')
    .replace(/плавание/gi, 'swim')
    .replace(/лазание/gi, 'climb')
    .replace(/копание/gi, 'burrow')
    .replace(/парение/gi, 'hover')
    .replace(/футов/gi, 'ft.')
    .replace(/(\d+)\s*фт\.?/gi, '$1 ft.')
    .replace(/(?:^|\s)фт\.?(?:\s|$)/gi, ' ft. ')
    .replace(/\bSpeed\b/g, 'Speed')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function formatSpeedRu(speed?: string | null): string {
  if (!speed) return '30 фт.';
  return cleanRussianText(speed)
    .replace(/\bft\.?(?!\w)/gi, 'фт.')
    .replace(/\bfly\s*speed\b/gi, 'скорость полёта')
    .replace(/\bswim\s*speed\b/gi, 'скорость плавания')
    .replace(/\bclimb\s*speed\b/gi, 'скорость лазания')
    .replace(/\bburrow\s*speed\b/gi, 'скорость копания')
    .replace(/\bflying\b/gi, 'полёт')
    .replace(/\bfly\b/gi, 'полёт')
    .replace(/\bswimming\b/gi, 'плавание')
    .replace(/\bswim\b/gi, 'плавание')
    .replace(/\bclimbing\b/gi, 'лазание')
    .replace(/\bclimb\b/gi, 'лазание')
    .replace(/\bburrowing\b/gi, 'копание')
    .replace(/\bburrow\b/gi, 'копание')
    .replace(/\bhover\b/gi, 'парение')
    .replace(/\bSpeed\b/g, 'Скорость')
    .replace(/фт\.+/g, 'фт.');
}

export function localizeSenses(senses?: string | null, lang?: 'en' | 'ru'): string {
  const effectiveLang = resolveLanguage(lang);
  if (effectiveLang === 'en') {
    if (!senses) return 'Normal senses';
    return String(senses).trim()
      .replace(/т[её]мное\s+зрение/gi, 'darkvision')
      .replace(/слепое\s+зрение/gi, 'blindsight')
      .replace(/истинное\s+зрение/gi, 'truesight')
      .replace(/чувство\s+вибрации/gi, 'tremorsense')
      .replace(/пассивная\s+[вВ]нимательность|пасс\.?\s*[вВ]нимание/gi, 'passive Perception')
      .replace(/не затруднено магической тьмой/gi, 'unimpeded by magical darkness')
      .replace(/(\d+)\s*фт\.?/gi, '$1 ft.')
      .replace(/(?:^|\s)фт\.?(?:\s|$)/gi, ' ft. ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  if (!senses) return 'Обычные чувства';
  return cleanRussianText(senses)
    .replace(/\bdarkvision\b/gi, 'тёмное зрение')
    .replace(/\bblindsight\b/gi, 'слепое зрение')
    .replace(/\btruesight\b/gi, 'истинное зрение')
    .replace(/\btremorsense\b/gi, 'чувство вибрации')
    .replace(/\bpassive\s+[pP]erception\b/gi, 'пассивная Внимательность')
    .replace(/unimpeded by magical Darkness/gi, 'не затруднено магической тьмой')
    .replace(/unimpeded by magical darkness/gi, 'не затруднено магической тьмой')
    .replace(/\bft\.?(?!\w)/gi, 'фт.')
    .replace(/фт\.+/g, 'фт.');
}

export function localizeDefenses(defenses?: string | null, lang?: 'en' | 'ru'): string {
  const effectiveLang = resolveLanguage(lang);
  if (!defenses) return '';
  if (effectiveLang === 'en') {
    return String(defenses).trim()
      .replace(/дробящий/gi, 'bludgeoning')
      .replace(/колющий/gi, 'piercing')
      .replace(/рубящий/gi, 'slashing')
      .replace(/огонь/gi, 'fire')
      .replace(/холод/gi, 'cold')
      .replace(/электричество|молния/gi, 'lightning')
      .replace(/звук|гром/gi, 'thunder')
      .replace(/яд/gi, 'poison')
      .replace(/кислота/gi, 'acid')
      .replace(/психический/gi, 'psychic')
      .replace(/некротический/gi, 'necrotic')
      .replace(/излучение/gi, 'radiant')
      .replace(/силовое поле/gi, 'force')
      .replace(/от немагических атак/gi, 'from nonmagical attacks')
      .replace(/кроме серебряного оружия/gi, 'except silvered weapons')
      .replace(/кроме адамантинового оружия/gi, 'except adamantine weapons')
      .replace(/магический/gi, 'magical')
      .replace(/немагический/gi, 'nonmagical')
      .replace(/\s+и\s+/gi, ', ')
      .replace(/,\s*,/g, ',')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  return cleanRussianText(defenses)
    .replace(/\bbludgeoning\b/gi, 'дробящий')
    .replace(/\bpiercing\b/gi, 'колющий')
    .replace(/\bslashing\b/gi, 'рубящий')
    .replace(/\bfire\b/gi, 'огонь')
    .replace(/\bcold\b/gi, 'холод')
    .replace(/\blightning\b/gi, 'электричество')
    .replace(/\bthunder\b/gi, 'звук')
    .replace(/\bpoison\b/gi, 'яд')
    .replace(/\bacid\b/gi, 'кислота')
    .replace(/\bpsychic\b/gi, 'психический')
    .replace(/\bnecrotic\b/gi, 'некротический')
    .replace(/\bradiant\b/gi, 'излучение')
    .replace(/\bforce\b/gi, 'силовое поле')
    .replace(/\bfrom nonmagical attacks\b/gi, 'от немагических атак')
    .replace(/\band\b/gi, 'и');
}

export function localizeConditionImmunities(conds?: string | null, lang?: 'en' | 'ru'): string {
  const effectiveLang = resolveLanguage(lang);
  if (!conds) return '';
  if (effectiveLang === 'en') {
    return String(conds).trim()
      .replace(/ослеплённый|ослепленный|ослепление/gi, 'blinded')
      .replace(/очарованный|очарование/gi, 'charmed')
      .replace(/глухой|глухота/gi, 'deafened')
      .replace(/испуганный|испуг/gi, 'frightened')
      .replace(/захваченный|захват/gi, 'grappled')
      .replace(/недееспособный|недееспособность/gi, 'incapacitated')
      .replace(/невидимый|невидимость/gi, 'invisible')
      .replace(/парализованный|паралич/gi, 'paralyzed')
      .replace(/окаменевший|окаменение/gi, 'petrified')
      .replace(/отравленный|отравление/gi, 'poisoned')
      .replace(/сбивание с ног|сбит с ног/gi, 'prone')
      .replace(/опутанный|опутывание/gi, 'restrained')
      .replace(/оглушённый|оглушенный|оглушение/gi, 'stunned')
      .replace(/бессознательный|бессознательность/gi, 'unconscious')
      .replace(/истощение/gi, 'exhaustion')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  return cleanRussianText(conds)
    .replace(/\bblinded\b/gi, 'ослепление')
    .replace(/\bcharmed\b/gi, 'очарование')
    .replace(/\bdeafened\b/gi, 'глухота')
    .replace(/\bfrightened\b/gi, 'испуг')
    .replace(/\bgrappled\b/gi, 'захват')
    .replace(/\bincapacitated\b/gi, 'недееспособность')
    .replace(/\binvisible\b/gi, 'невидимость')
    .replace(/\bparalyzed\b/gi, 'паралич')
    .replace(/\bpetrified\b/gi, 'окаменение')
    .replace(/\bpoisoned\b/gi, 'отравление')
    .replace(/\bprone\b/gi, 'сбивание с ног')
    .replace(/\brestrained\b/gi, 'опутывание')
    .replace(/\bstunned\b/gi, 'оглушение')
    .replace(/\bunconscious\b/gi, 'бессознательность')
    .replace(/\bexhaustion\b/gi, 'истощение');
}

export function localizeLanguages(languages?: string | null, lang?: 'en' | 'ru'): string {
  const effectiveLang = resolveLanguage(lang);
  if (!languages) return '';
  if (effectiveLang === 'en') {
    return String(languages).trim()
      .replace(/общий/gi, 'Common')
      .replace(/драконий/gi, 'Draconic')
      .replace(/эльфийский/gi, 'Elvish')
      .replace(/дварфский/gi, 'Dwarvish')
      .replace(/великаний/gi, 'Giant')
      .replace(/гномий/gi, 'Gnomish')
      .replace(/гоблинский/gi, 'Goblin')
      .replace(/полуросликов/gi, 'Halfling')
      .replace(/орочий/gi, 'Orc')
      .replace(/бездны/gi, 'Abyssal')
      .replace(/небесный/gi, 'Celestial')
      .replace(/инфернальный/gi, 'Infernal')
      .replace(/первородный/gi, 'Primordial')
      .replace(/сильван/gi, 'Sylvan')
      .replace(/подземный/gi, 'Undercommon')
      .replace(/телепатия/gi, 'telepathy')
      .replace(/и\s+(\d+)\s+других\s+языка?/gi, 'and $1 other languages')
      .replace(/и\s+любой\s+другой\s+язык/gi, 'and any one language')
      .replace(/(\d+)\s*фт\.?/gi, '$1 ft.')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  return cleanRussianText(languages)
    .replace(/\bCommon\b/gi, 'общий')
    .replace(/\bDraconic\b/gi, 'драконий')
    .replace(/\bElvish\b/gi, 'эльфийский')
    .replace(/\bDwarvish\b/gi, 'дварфский')
    .replace(/\bGiant\b/gi, 'великаний')
    .replace(/\bGnomish\b/gi, 'гномий')
    .replace(/\bGoblin\b/gi, 'гоблинский')
    .replace(/\bHalfling\b/gi, 'полуросликов')
    .replace(/\bOrc\b/gi, 'орочий')
    .replace(/\bAbyssal\b/gi, 'бездны')
    .replace(/\bCelestial\b/gi, 'небесный')
    .replace(/\bInfernal\b/gi, 'инфернальный')
    .replace(/\bPrimordial\b/gi, 'первородный')
    .replace(/\bSylvan\b/gi, 'сильван')
    .replace(/\bUndercommon\b/gi, 'подземный')
    .replace(/\btelepathy\b/gi, 'телепатия')
    .replace(/(?:and|plus)\s+(\d+)\s+other\s+languages?/gi, 'и $1 других языка')
    .replace(/plus\s+any\s+(?:one|other)\s+languages?/gi, 'плюс любой другой язык')
    .replace(/\bft\.?\b/gi, 'фт.');
}

export function localizeSize(size?: string | null, lang?: 'en' | 'ru'): string {
  const effectiveLang = resolveLanguage(lang);
  if (!size) return effectiveLang === 'en' ? 'Medium' : 'Средний';
  const clean = size.trim();
  const lower = clean.toLowerCase();
  const mapEn: Record<string, string> = {
    tiny: 'Tiny',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    huge: 'Huge',
    gargantuan: 'Gargantuan',
    крошечный: 'Tiny',
    маленький: 'Small',
    средний: 'Medium',
    большой: 'Large',
    огромный: 'Huge',
    громадный: 'Gargantuan',
  };
  const mapRu: Record<string, string> = {
    tiny: 'Крошечный',
    small: 'Маленький',
    medium: 'Средний',
    large: 'Большой',
    huge: 'Огромный',
    gargantuan: 'Громадный',
    крошечный: 'Крошечный',
    маленький: 'Маленький',
    средний: 'Средний',
    большой: 'Большой',
    огромный: 'Огромный',
    громадный: 'Громадный',
  };
  if (effectiveLang === 'en') {
    return mapEn[lower] || clean;
  }
  return mapRu[lower] || clean;
}

export function localizeAlignment(alignment?: string | null, lang?: 'en' | 'ru'): string {
  const effectiveLang = resolveLanguage(lang);
  if (!alignment) return '';
  const clean = alignment.trim();
  const lower = clean.toLowerCase();
  const alignEn: Record<string, string> = {
    'законно-добрый': 'Lawful Good',
    'нейтрально-добрый': 'Neutral Good',
    'хаотично-добрый': 'Chaotic Good',
    'законно-нейтральный': 'Lawful Neutral',
    'нейтральный': 'Neutral',
    'истинно-нейтральный': 'True Neutral',
    'хаотично-нейтральный': 'Chaotic Neutral',
    'законно-злой': 'Lawful Evil',
    'нейтрально-злой': 'Neutral Evil',
    'хаотично-злой': 'Chaotic Evil',
    'без мировоззрения': 'Unaligned',
    'любое мировоззрение': 'Any Alignment',
    'lawful good': 'Lawful Good',
    'neutral good': 'Neutral Good',
    'chaotic good': 'Chaotic Good',
    'lawful neutral': 'Lawful Neutral',
    'neutral': 'Neutral',
    'true neutral': 'True Neutral',
    'chaotic neutral': 'Chaotic Neutral',
    'lawful evil': 'Lawful Evil',
    'neutral evil': 'Neutral Evil',
    'chaotic evil': 'Chaotic Evil',
    'unaligned': 'Unaligned',
    'any alignment': 'Any Alignment',
  };
  const alignRu: Record<string, string> = {
    'lawful good': 'Законно-добрый',
    'neutral good': 'Нейтрально-добрый',
    'chaotic good': 'Хаотично-добрый',
    'lawful neutral': 'Законно-нейтральный',
    'neutral': 'Нейтральный',
    'true neutral': 'Истинно-нейтральный',
    'chaotic neutral': 'Хаотично-нейтральный',
    'lawful evil': 'Законно-злой',
    'neutral evil': 'Нейтрально-злой',
    'chaotic evil': 'Хаотично-злой',
    'unaligned': 'Без мировоззрения',
    'any alignment': 'Любое мировоззрение',
    'законно-добрый': 'Законно-добрый',
    'нейтрально-добрый': 'Нейтрально-добрый',
    'хаотично-добрый': 'Хаотично-добрый',
    'законно-нейтральный': 'Законно-нейтральный',
    'нейтральный': 'Нейтральный',
    'истинно-нейтральный': 'Истинно-нейтральный',
    'хаотично-нейтральный': 'Хаотично-нейтральный',
    'законно-злой': 'Законно-злой',
    'нейтрально-злой': 'Нейтрально-злой',
    'хаотично-злой': 'Хаотично-злой',
    'без мировоззрения': 'Без мировоззрения',
    'любое мировоззрение': 'Любое мировоззрение',
  };
  if (effectiveLang === 'en') {
    return alignEn[lower] || clean;
  }
  return alignRu[lower] || clean;
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
    .replace(/\breach\s*(\d+)\s*ft\.?(?!\w)/gi, 'досягаемость $1 фт.')
    .replace(/\brange\s*(\d+)\/(\d+)\s*ft\.?(?!\w)/gi, 'дистанция $1/$2 фт.')
    .replace(/\brange\s*(\d+)\s*ft\.?(?!\w)/gi, 'дистанция $1 фт.')
    .replace(/\bfeet\b/gi, 'футов')
    .replace(/\b(\d+)\s*ft\.?(?!\w)/gi, '$1 фт.')
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
    .replace(/фт\.+/g, 'фт.')
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
