/**
 * TTRPG Helper - Cyberpunk RED Rule Engine Types & Canonical Reference Data
 * Core system-specific structures, stats, damage zones, wounded states, and bilingual reference catalog.
 * Follows official R. Talsorian Games Cyberpunk RED Core Rulebook 1.25e & Official Character Sheet.
 */

import { RollContext } from '../../types/system';
import { SupportedLanguage } from '../../i18n/types';

export type CyberpunkStatKey =
  | 'int'
  | 'ref'
  | 'dex'
  | 'tech'
  | 'cool'
  | 'will'
  | 'luck'
  | 'move'
  | 'body'
  | 'emp';

export type CyberpunkArmorZone = 'head' | 'body' | 'shield';

export type CyberpunkWoundState =
  | 'healthy'
  | 'light'
  | 'seriously_wounded'
  | 'mortally_wounded'
  | 'dead';

export interface CyberpunkRollContext extends RollContext {
  /** Deterministic override for the initial 1d10 roll */
  rollOverride?: number;
  /** Deterministic override for exploding 10 or fumbled 1 second 1d10 roll */
  critRollOverride?: number;
  /** Explicit skill bonus to add on top of creature stat */
  skillBonus?: number;
  /** Luck points spent to add to the roll (1:1 bonus) */
  luckSpend?: number;
  /** Whether the attack is an aimed headshot */
  isAimedHeadshot?: boolean;
}

export interface CyberpunkDeathSaveResult {
  roll: number;
  penalty: number;
  effectiveRoll: number;
  bodyStat: number;
  isSuccess: boolean;
  isDead: boolean;
  isCriticalFailure: boolean;
  details: string;
}

export interface CyberpunkArmorState {
  headSp: number;
  maxHeadSp: number;
  bodySp: number;
  maxBodySp: number;
}

export type CyberpunkRole =
  | 'Rockerboy'
  | 'Solo'
  | 'Netrunner'
  | 'Tech'
  | 'Medtech'
  | 'Media'
  | 'Exec'
  | 'Lawman'
  | 'Fixer'
  | 'Nomad';

export interface CyberpunkStatDefinition {
  key: CyberpunkStatKey;
  nameEn: string;
  nameRu: string;
  abbrEn: string;
  abbrRu: string;
  descriptionEn: string;
  descriptionRu: string;
}

export interface CyberpunkRoleDefinition {
  id: string;
  nameEn: string;
  nameRu: string;
  abilityEn: string;
  abilityRu: string;
  descriptionEn: string;
  descriptionRu: string;
}

export interface CyberpunkSkillDefinition {
  id: string;
  nameEn: string;
  nameRu: string;
  stat: CyberpunkStatKey;
  multiplier: 1 | 2;
  category:
    | 'Awareness'
    | 'Body'
    | 'Control'
    | 'Education'
    | 'Fighting'
    | 'Performance'
    | 'Ranged Weapon'
    | 'Social'
    | 'Technique';
}

export interface CyberpunkWeaponDefinition {
  id: string;
  nameEn: string;
  nameRu: string;
  skill: string;
  damage: string;
  rof: number;
  ammoType?: string;
  magSize?: number;
  hands: 1 | 2;
  concealable: boolean;
  costEb: number;
  category: 'ranged' | 'melee';
  altFireModes?: string[];
}

export interface CyberpunkArmorDefinition {
  id: string;
  nameEn: string;
  nameRu: string;
  sp: number;
  penalty: number;
  penaltyStats: CyberpunkStatKey[];
  costEb: number;
  descriptionEn: string;
  descriptionRu: string;
}

export interface CyberpunkCriticalInjuryDefinition {
  roll: number;
  zone: 'body' | 'head';
  nameEn: string;
  nameRu: string;
  effectEn: string;
  effectRu: string;
  quickFixEn: string;
  quickFixRu: string;
  treatmentEn: string;
  treatmentRu: string;
  statPenalty?: Partial<Record<CyberpunkStatKey, number>>;
  deathSavePenaltyDelta?: number;
}

// --------------------------------------------------------------------------
// Canonical Stats Definition
// --------------------------------------------------------------------------
export const CYBERPUNK_STATS: Record<CyberpunkStatKey, CyberpunkStatDefinition> = {
  int: {
    key: 'int',
    nameEn: 'Intelligence',
    nameRu: 'Интеллект',
    abbrEn: 'INT',
    abbrRu: 'ИНТ',
    descriptionEn: 'How generally smart and observant you are.',
    descriptionRu: 'Общая сообразительность, память и внимание.',
  },
  ref: {
    key: 'ref',
    nameEn: 'Reflexes',
    nameRu: 'Рефлексы',
    abbrEn: 'REF',
    abbrRu: 'РЕФ',
    descriptionEn: 'Your response time and coordination in combat and aiming.',
    descriptionRu: 'Время реакции, координация в бою и стрельбе.',
  },
  dex: {
    key: 'dex',
    nameEn: 'Dexterity',
    nameRu: 'Ловкость',
    abbrEn: 'DEX',
    abbrRu: 'ЛОВ',
    descriptionEn: 'Physical agility, dodging, athletics, and fine motor skills.',
    descriptionRu: 'Гибкость тела, уклонение, рукопашный бой и атлетика.',
  },
  tech: {
    key: 'tech',
    nameEn: 'Technique',
    nameRu: 'Техника',
    abbrEn: 'TECH',
    abbrRu: 'ТЕХ',
    descriptionEn: 'Aptitude with cybernetics, machines, weapons, and electronics.',
    descriptionRu: 'Способности к кибернетике, ремонту, крафту и электронике.',
  },
  cool: {
    key: 'cool',
    nameEn: 'Cool',
    nameRu: 'Хладнокровие',
    abbrEn: 'COOL',
    abbrRu: 'ХЛАД',
    descriptionEn: 'Your ability to stay calm, project confidence, and persuade.',
    descriptionRu: 'Самообладание, харизма, убеждение и авторитет под давлением.',
  },
  will: {
    key: 'will',
    nameEn: 'Willpower',
    nameRu: 'Воля',
    abbrEn: 'WILL',
    abbrRu: 'ВОЛЯ',
    descriptionEn: 'Mental fortitude, determination, and resistance to trauma.',
    descriptionRu: 'Сила духа, решимость и психологическая стойкость.',
  },
  luck: {
    key: 'luck',
    nameEn: 'Luck',
    nameRu: 'Удача',
    abbrEn: 'LUCK',
    abbrRu: 'УДАЧ',
    descriptionEn: 'Spendable pool of points to boost any action check 1:1.',
    descriptionRu: 'Пул очков для улучшения проверок 1:1.',
  },
  move: {
    key: 'move',
    nameEn: 'Movement',
    nameRu: 'Скорость',
    abbrEn: 'MOVE',
    abbrRu: 'СКОР',
    descriptionEn: 'Speed and mobility (move action grants 2m/yds per MOVE).',
    descriptionRu: 'Скорость перемещения и преодоления дистанций.',
  },
  body: {
    key: 'body',
    nameEn: 'Body',
    nameRu: 'Телосложение',
    abbrEn: 'BODY',
    abbrRu: 'ТЕЛО',
    descriptionEn: 'Physical size, toughness, damage soaking, and natural healing.',
    descriptionRu: 'Физическая мощь, запас здоровья и сопротивление смерти.',
  },
  emp: {
    key: 'emp',
    nameEn: 'Empathy',
    nameRu: 'Эмпатия',
    abbrEn: 'EMP',
    abbrRu: 'ЭМП',
    descriptionEn: 'Emotional connection with humanity; lowers with cyberware.',
    descriptionRu: 'Связь с человечностью; уменьшается от киберимплантов.',
  },
};

// --------------------------------------------------------------------------
// Canonical Roles Definition
// --------------------------------------------------------------------------
export const CYBERPUNK_ROLES: Record<string, CyberpunkRoleDefinition> = {
  rockerboy: {
    id: 'rockerboy',
    nameEn: 'Rockerboy',
    nameRu: 'Рокербой',
    abilityEn: 'Charismatic Impact',
    abilityRu: 'Харизматическое влияние',
    descriptionEn: 'Rock’n’roll rebels who use music and charisma to fight authority.',
    descriptionRu: 'Бунтари от рок-н-ролла, вдохновляющие толпу на бунт против системы.',
  },
  solo: {
    id: 'solo',
    nameEn: 'Solo',
    nameRu: 'Соло',
    abilityEn: 'Combat Awareness',
    abilityRu: 'Боевое чутьё',
    descriptionEn: 'Hired guns, elite bodyguards, and lethal combat specialists.',
    descriptionRu: 'Наёмные бойцы, телохранители и мастера смертоносной стрельбы.',
  },
  netrunner: {
    id: 'netrunner',
    nameEn: 'Netrunner',
    nameRu: 'Нетраннер',
    abilityEn: 'Interface',
    abilityRu: 'Интерфейс',
    descriptionEn: 'Cybernetic master hackers diving deep into NET architectures.',
    descriptionRu: 'Хакеры с кибердеками, взламывающие виртуальные архитектуры Сети.',
  },
  tech: {
    id: 'tech',
    nameEn: 'Tech',
    nameRu: 'Техник',
    abilityEn: 'Maker',
    abilityRu: 'Мейкер (Создатель)',
    descriptionEn: 'Renegade mechanics, inventors, and post-apocalyptic tinkerers.',
    descriptionRu: 'Инженеры-изобретатели, создающие и модифицирующие оружие и хром.',
  },
  medtech: {
    id: 'medtech',
    nameEn: 'Medtech',
    nameRu: 'Медтех',
    abilityEn: 'Medicine',
    abilityRu: 'Медицина',
    descriptionEn: 'Street doctors, combat surgeons, and biochemical experts.',
    descriptionRu: 'Уличные врачи, хирурги скорой помощи и создатели фармы.',
  },
  media: {
    id: 'media',
    nameEn: 'Media',
    nameRu: 'Медиа',
    abilityEn: 'Credibility',
    abilityRu: 'Авторитет (Доверие)',
    descriptionEn: 'Investigative journalists, truth-seekers, and underground reporters.',
    descriptionRu: 'Журналисты-расследователи, вскрывающие тайны корпораций.',
  },
  exec: {
    id: 'exec',
    nameEn: 'Exec',
    nameRu: 'Экзек (Корпорат)',
    abilityEn: 'Teamwork',
    abilityRu: 'Работа в команде',
    descriptionEn: 'Corporate power brokers commanding company assets and personal suites.',
    descriptionRu: 'Корпоративные топ-менеджеры с охраной, водителями и ресурсами.',
  },
  lawman: {
    id: 'lawman',
    nameEn: 'Lawman',
    nameRu: 'Законник',
    abilityEn: 'Backup',
    abilityRu: 'Подкрепление',
    descriptionEn: 'Maximum-force law enforcers patrolling the dangerous urban frontier.',
    descriptionRu: 'Полицейские Night City, способные вызвать боевое подкрепление.',
  },
  fixer: {
    id: 'fixer',
    nameEn: 'Fixer',
    nameRu: 'Фиксер',
    abilityEn: 'Operator',
    abilityRu: 'Оператор',
    descriptionEn: 'Dealmakers, contraband smugglers, and organizers of Midnight Markets.',
    descriptionRu: 'Торговцы контрабандой, брокеры интриг и хозяева Ночных Рынков.',
  },
  nomad: {
    id: 'nomad',
    nameEn: 'Nomad',
    nameRu: 'Номад (Кочевник)',
    abilityEn: 'Moto',
    abilityRu: 'Мото',
    descriptionEn: 'Highway warriors, convoy drivers, and family clan wanderers.',
    descriptionRu: 'Хозяева Пустошей, управляющие модифицированными боевыми машинами.',
  },
};

// --------------------------------------------------------------------------
// Canonical Skills Definition (Official Character Sheet Page 0)
// --------------------------------------------------------------------------
export const CYBERPUNK_SKILLS: Record<string, CyberpunkSkillDefinition> = {
  // Awareness Skills
  concentration: { id: 'concentration', nameEn: 'Concentration', nameRu: 'Концентрация', stat: 'will', multiplier: 1, category: 'Awareness' },
  conceal_reveal_object: { id: 'conceal_reveal_object', nameEn: 'Conceal/Reveal Object', nameRu: 'Скрыть/Найти объект', stat: 'int', multiplier: 1, category: 'Awareness' },
  lip_reading: { id: 'lip_reading', nameEn: 'Lip Reading', nameRu: 'Чтение по губам', stat: 'int', multiplier: 1, category: 'Awareness' },
  perception: { id: 'perception', nameEn: 'Perception', nameRu: 'Внимательность', stat: 'int', multiplier: 1, category: 'Awareness' },
  tracking: { id: 'tracking', nameEn: 'Tracking', nameRu: 'Выслеживание', stat: 'int', multiplier: 1, category: 'Awareness' },

  // Body Skills
  athletics: { id: 'athletics', nameEn: 'Athletics', nameRu: 'Атлетика', stat: 'dex', multiplier: 1, category: 'Body' },
  contortionist: { id: 'contortionist', nameEn: 'Contortionist', nameRu: 'Изворотливость', stat: 'dex', multiplier: 1, category: 'Body' },
  dance: { id: 'dance', nameEn: 'Dance', nameRu: 'Танцы', stat: 'dex', multiplier: 1, category: 'Body' },
  endurance: { id: 'endurance', nameEn: 'Endurance', nameRu: 'Выносливость', stat: 'will', multiplier: 1, category: 'Body' },
  resist_torture_drugs: { id: 'resist_torture_drugs', nameEn: 'Resist Torture/Drugs', nameRu: 'Сопротивление пыткам/веществам', stat: 'will', multiplier: 1, category: 'Body' },
  stealth: { id: 'stealth', nameEn: 'Stealth', nameRu: 'Скрытность', stat: 'dex', multiplier: 1, category: 'Body' },

  // Control Skills
  drive_land_vehicle: { id: 'drive_land_vehicle', nameEn: 'Drive Land Vehicle', nameRu: 'Вождение наземного транспорта', stat: 'ref', multiplier: 1, category: 'Control' },
  pilot_air_vehicle: { id: 'pilot_air_vehicle', nameEn: 'Pilot Air Vehicle', nameRu: 'Пилотирование воздушного транспорта', stat: 'ref', multiplier: 2, category: 'Control' },
  pilot_sea_vehicle: { id: 'pilot_sea_vehicle', nameEn: 'Pilot Sea Vehicle', nameRu: 'Пилотирование водного транспорта', stat: 'ref', multiplier: 1, category: 'Control' },
  riding: { id: 'riding', nameEn: 'Riding', nameRu: 'Верховая езда', stat: 'ref', multiplier: 1, category: 'Control' },

  // Education Skills
  accounting: { id: 'accounting', nameEn: 'Accounting', nameRu: 'Бухгалтерия', stat: 'int', multiplier: 1, category: 'Education' },
  animal_handling: { id: 'animal_handling', nameEn: 'Animal Handling', nameRu: 'Обращение с животными', stat: 'int', multiplier: 1, category: 'Education' },
  bureaucracy: { id: 'bureaucracy', nameEn: 'Bureaucracy', nameRu: 'Бюрократия', stat: 'int', multiplier: 1, category: 'Education' },
  business: { id: 'business', nameEn: 'Business', nameRu: 'Бизнес', stat: 'int', multiplier: 1, category: 'Education' },
  composition: { id: 'composition', nameEn: 'Composition', nameRu: 'Сочинение (Композиция)', stat: 'int', multiplier: 1, category: 'Education' },
  criminology: { id: 'criminology', nameEn: 'Criminology', nameRu: 'Криминология', stat: 'int', multiplier: 1, category: 'Education' },
  cryptography: { id: 'cryptography', nameEn: 'Cryptography', nameRu: 'Криптография', stat: 'int', multiplier: 1, category: 'Education' },
  deduction: { id: 'deduction', nameEn: 'Deduction', nameRu: 'Дедукция', stat: 'int', multiplier: 1, category: 'Education' },
  education: { id: 'education', nameEn: 'Education', nameRu: 'Образование', stat: 'int', multiplier: 1, category: 'Education' },
  gamble: { id: 'gamble', nameEn: 'Gamble', nameRu: 'Азартные игры', stat: 'int', multiplier: 1, category: 'Education' },
  language_streetslang: { id: 'language_streetslang', nameEn: 'Language (Streetslang)', nameRu: 'Язык (Уличный сленг)', stat: 'int', multiplier: 1, category: 'Education' },
  library_search: { id: 'library_search', nameEn: 'Library Search', nameRu: 'Поиск в архивах', stat: 'int', multiplier: 1, category: 'Education' },
  local_expert: { id: 'local_expert', nameEn: 'Local Expert', nameRu: 'Знание местности', stat: 'int', multiplier: 1, category: 'Education' },
  science: { id: 'science', nameEn: 'Science', nameRu: 'Наука', stat: 'int', multiplier: 1, category: 'Education' },
  tactics: { id: 'tactics', nameEn: 'Tactics', nameRu: 'Тактика', stat: 'int', multiplier: 1, category: 'Education' },
  wilderness_survival: { id: 'wilderness_survival', nameEn: 'Wilderness Survival', nameRu: 'Выживание в пустошах', stat: 'int', multiplier: 1, category: 'Education' },

  // Fighting Skills
  brawling: { id: 'brawling', nameEn: 'Brawling', nameRu: 'Драка', stat: 'dex', multiplier: 1, category: 'Fighting' },
  evasion: { id: 'evasion', nameEn: 'Evasion', nameRu: 'Уклонение', stat: 'dex', multiplier: 1, category: 'Fighting' },
  martial_arts: { id: 'martial_arts', nameEn: 'Martial Arts', nameRu: 'Боевые искусства', stat: 'dex', multiplier: 2, category: 'Fighting' },
  melee_weapon: { id: 'melee_weapon', nameEn: 'Melee Weapon', nameRu: 'Холодное оружие', stat: 'dex', multiplier: 1, category: 'Fighting' },

  // Performance Skills
  acting: { id: 'acting', nameEn: 'Acting', nameRu: 'Актёрская игра', stat: 'cool', multiplier: 1, category: 'Performance' },
  play_instrument: { id: 'play_instrument', nameEn: 'Play Instrument', nameRu: 'Игра на инструменте', stat: 'tech', multiplier: 1, category: 'Performance' },

  // Ranged Weapon Skills
  archery: { id: 'archery', nameEn: 'Archery', nameRu: 'Стрельба из лука', stat: 'ref', multiplier: 1, category: 'Ranged Weapon' },
  autofire: { id: 'autofire', nameEn: 'Autofire', nameRu: 'Автоогонь', stat: 'ref', multiplier: 2, category: 'Ranged Weapon' },
  handgun: { id: 'handgun', nameEn: 'Handgun', nameRu: 'Пистолеты', stat: 'ref', multiplier: 1, category: 'Ranged Weapon' },
  heavy_weapons: { id: 'heavy_weapons', nameEn: 'Heavy Weapons', nameRu: 'Тяжёлое оружие', stat: 'ref', multiplier: 2, category: 'Ranged Weapon' },
  shoulder_arms: { id: 'shoulder_arms', nameEn: 'Shoulder Arms', nameRu: 'Длинноствольное оружие', stat: 'ref', multiplier: 1, category: 'Ranged Weapon' },

  // Social Skills
  bribery: { id: 'bribery', nameEn: 'Bribery', nameRu: 'Подкуп', stat: 'cool', multiplier: 1, category: 'Social' },
  conversation: { id: 'conversation', nameEn: 'Conversation', nameRu: 'Разговор', stat: 'emp', multiplier: 1, category: 'Social' },
  human_perception: { id: 'human_perception', nameEn: 'Human Perception', nameRu: 'Проницательность', stat: 'emp', multiplier: 1, category: 'Social' },
  interrogation: { id: 'interrogation', nameEn: 'Interrogation', nameRu: 'Допрос', stat: 'cool', multiplier: 1, category: 'Social' },
  persuasion: { id: 'persuasion', nameEn: 'Persuasion', nameRu: 'Убеждение', stat: 'cool', multiplier: 1, category: 'Social' },
  personal_grooming: { id: 'personal_grooming', nameEn: 'Personal Grooming', nameRu: 'Уход за собой', stat: 'cool', multiplier: 1, category: 'Social' },
  streetwise: { id: 'streetwise', nameEn: 'Streetwise', nameRu: 'Знание улиц', stat: 'cool', multiplier: 1, category: 'Social' },
  trading: { id: 'trading', nameEn: 'Trading', nameRu: 'Торговля', stat: 'cool', multiplier: 1, category: 'Social' },
  wardrobe_and_style: { id: 'wardrobe_and_style', nameEn: 'Wardrobe & Style', nameRu: 'Стиль и гардероб', stat: 'cool', multiplier: 1, category: 'Social' },

  // Technique Skills
  air_vehicle_tech: { id: 'air_vehicle_tech', nameEn: 'Air Vehicle Tech', nameRu: 'Техника воздушного транспорта', stat: 'tech', multiplier: 1, category: 'Technique' },
  basic_tech: { id: 'basic_tech', nameEn: 'Basic Tech', nameRu: 'Базовая техника', stat: 'tech', multiplier: 1, category: 'Technique' },
  cybertech: { id: 'cybertech', nameEn: 'Cybertech', nameRu: 'Кибертехника', stat: 'tech', multiplier: 1, category: 'Technique' },
  demolitions: { id: 'demolitions', nameEn: 'Demolitions', nameRu: 'Подрывное дело', stat: 'tech', multiplier: 2, category: 'Technique' },
  electronics_security_tech: { id: 'electronics_security_tech', nameEn: 'Electronics/Security Tech', nameRu: 'Электроника и безопасность', stat: 'tech', multiplier: 2, category: 'Technique' },
  first_aid: { id: 'first_aid', nameEn: 'First Aid', nameRu: 'Первая помощь', stat: 'tech', multiplier: 1, category: 'Technique' },
  forgery: { id: 'forgery', nameEn: 'Forgery', nameRu: 'Подделка документов', stat: 'tech', multiplier: 1, category: 'Technique' },
  land_vehicle_tech: { id: 'land_vehicle_tech', nameEn: 'Land Vehicle Tech', nameRu: 'Техника наземного транспорта', stat: 'tech', multiplier: 1, category: 'Technique' },
  paint_draw_sculpt: { id: 'paint_draw_sculpt', nameEn: 'Paint/Draw/Sculpt', nameRu: 'Живопись и скульптура', stat: 'tech', multiplier: 1, category: 'Technique' },
  paramedic: { id: 'paramedic', nameEn: 'Paramedic', nameRu: 'Парамедик', stat: 'tech', multiplier: 2, category: 'Technique' },
  photography_film: { id: 'photography_film', nameEn: 'Photography/Film', nameRu: 'Фото- и видеосъёмка', stat: 'tech', multiplier: 1, category: 'Technique' },
  pick_lock: { id: 'pick_lock', nameEn: 'Pick Lock', nameRu: 'Взлом замков', stat: 'tech', multiplier: 1, category: 'Technique' },
  pick_pocket: { id: 'pick_pocket', nameEn: 'Pick Pocket', nameRu: 'Карманная кража', stat: 'tech', multiplier: 1, category: 'Technique' },
  sea_vehicle_tech: { id: 'sea_vehicle_tech', nameEn: 'Sea Vehicle Tech', nameRu: 'Техника водного транспорта', stat: 'tech', multiplier: 1, category: 'Technique' },
  weaponstech: { id: 'weaponstech', nameEn: 'Weaponstech', nameRu: 'Оружейное дело', stat: 'tech', multiplier: 1, category: 'Technique' },
};

// --------------------------------------------------------------------------
// Canonical Weapons Definition (Official Core Rulebook Page 94 & 340)
// --------------------------------------------------------------------------
export const CYBERPUNK_WEAPONS: Record<string, CyberpunkWeaponDefinition> = {
  medium_pistol: {
    id: 'medium_pistol',
    nameEn: 'Medium Pistol',
    nameRu: 'Средний пистолет',
    skill: 'Handgun',
    damage: '2d6',
    rof: 2,
    magSize: 12,
    ammoType: 'Medium Pistol',
    hands: 1,
    concealable: true,
    costEb: 50,
    category: 'ranged',
  },
  heavy_pistol: {
    id: 'heavy_pistol',
    nameEn: 'Heavy Pistol',
    nameRu: 'Тяжёлый пистолет',
    skill: 'Handgun',
    damage: '3d6',
    rof: 2,
    magSize: 8,
    ammoType: 'Heavy Pistol',
    hands: 1,
    concealable: true,
    costEb: 100,
    category: 'ranged',
  },
  very_heavy_pistol: {
    id: 'very_heavy_pistol',
    nameEn: 'Very Heavy Pistol',
    nameRu: 'Очень тяжёлый пистолет',
    skill: 'Handgun',
    damage: '4d6',
    rof: 1,
    magSize: 8,
    ammoType: 'Very Heavy Pistol',
    hands: 1,
    concealable: false,
    costEb: 100,
    category: 'ranged',
  },
  smg: {
    id: 'smg',
    nameEn: 'SMG',
    nameRu: 'Пистолет-пулемёт (SMG)',
    skill: 'Handgun',
    damage: '2d6',
    rof: 1,
    magSize: 30,
    ammoType: 'Medium Pistol',
    hands: 1,
    concealable: true,
    costEb: 100,
    category: 'ranged',
    altFireModes: ['Autofire (3)', 'Suppressive Fire'],
  },
  heavy_smg: {
    id: 'heavy_smg',
    nameEn: 'Heavy SMG',
    nameRu: 'Тяжёлый пистолет-пулемёт',
    skill: 'Handgun',
    damage: '3d6',
    rof: 1,
    magSize: 40,
    ammoType: 'Heavy Pistol',
    hands: 1,
    concealable: false,
    costEb: 100,
    category: 'ranged',
    altFireModes: ['Autofire (3)', 'Suppressive Fire'],
  },
  shotgun: {
    id: 'shotgun',
    nameEn: 'Shotgun',
    nameRu: 'Дробовик',
    skill: 'Shoulder Arms',
    damage: '5d6',
    rof: 1,
    magSize: 4,
    ammoType: 'Slug / Shell',
    hands: 2,
    concealable: false,
    costEb: 500,
    category: 'ranged',
    altFireModes: ['Shotgun Shell (3x3m area)'],
  },
  assault_rifle: {
    id: 'assault_rifle',
    nameEn: 'Assault Rifle',
    nameRu: 'Штурмовая винтовка',
    skill: 'Shoulder Arms',
    damage: '5d6',
    rof: 1,
    magSize: 25,
    ammoType: 'Rifle',
    hands: 2,
    concealable: false,
    costEb: 500,
    category: 'ranged',
    altFireModes: ['Autofire (4)', 'Suppressive Fire'],
  },
  sniper_rifle: {
    id: 'sniper_rifle',
    nameEn: 'Sniper Rifle',
    nameRu: 'Снайперская винтовка',
    skill: 'Shoulder Arms',
    damage: '5d6',
    rof: 1,
    magSize: 4,
    ammoType: 'Rifle',
    hands: 2,
    concealable: false,
    costEb: 500,
    category: 'ranged',
  },
  bows_and_crossbows: {
    id: 'bows_and_crossbows',
    nameEn: 'Bows & Crossbows',
    nameRu: 'Луки и арбалеты',
    skill: 'Archery',
    damage: '4d6',
    rof: 1,
    ammoType: 'Arrow',
    hands: 2,
    concealable: false,
    costEb: 100,
    category: 'ranged',
  },
  grenade_launcher: {
    id: 'grenade_launcher',
    nameEn: 'Grenade Launcher',
    nameRu: 'Гранатомёт',
    skill: 'Heavy Weapons',
    damage: '6d6',
    rof: 1,
    magSize: 2,
    ammoType: 'Grenade',
    hands: 2,
    concealable: false,
    costEb: 500,
    category: 'ranged',
  },
  rocket_launcher: {
    id: 'rocket_launcher',
    nameEn: 'Rocket Launcher',
    nameRu: 'Ракетная установка',
    skill: 'Heavy Weapons',
    damage: '8d6',
    rof: 1,
    magSize: 1,
    ammoType: 'Rocket',
    hands: 2,
    concealable: false,
    costEb: 500,
    category: 'ranged',
  },

  // Melee Weapons
  light_melee_weapon: {
    id: 'light_melee_weapon',
    nameEn: 'Light Melee Weapon',
    nameRu: 'Лёгкое холодное оружие',
    skill: 'Melee Weapon',
    damage: '1d6',
    rof: 2,
    hands: 1,
    concealable: true,
    costEb: 50,
    category: 'melee',
  },
  medium_melee_weapon: {
    id: 'medium_melee_weapon',
    nameEn: 'Medium Melee Weapon',
    nameRu: 'Среднее холодное оружие',
    skill: 'Melee Weapon',
    damage: '2d6',
    rof: 2,
    hands: 1,
    concealable: false,
    costEb: 50,
    category: 'melee',
  },
  heavy_melee_weapon: {
    id: 'heavy_melee_weapon',
    nameEn: 'Heavy Melee Weapon',
    nameRu: 'Тяжёлое холодное оружие',
    skill: 'Melee Weapon',
    damage: '3d6',
    rof: 2,
    hands: 2,
    concealable: false,
    costEb: 100,
    category: 'melee',
  },
  very_heavy_melee_weapon: {
    id: 'very_heavy_melee_weapon',
    nameEn: 'Very Heavy Melee Weapon',
    nameRu: 'Очень тяжёлое холодное оружие',
    skill: 'Melee Weapon',
    damage: '4d6',
    rof: 1,
    hands: 2,
    concealable: false,
    costEb: 500,
    category: 'melee',
  },
};

// --------------------------------------------------------------------------
// Canonical Armor Definition (Official Core Rulebook Page 97 & 350)
// --------------------------------------------------------------------------
export const CYBERPUNK_ARMOR: Record<string, CyberpunkArmorDefinition> = {
  leathers: {
    id: 'leathers',
    nameEn: 'Leathers',
    nameRu: 'Кожаная броня (Leathers)',
    sp: 4,
    penalty: 0,
    penaltyStats: [],
    costEb: 20,
    descriptionEn: 'Favored by Nomads and bike riders.',
    descriptionRu: 'Популярна среди кочевников и байкеров Night City.',
  },
  kevlar: {
    id: 'kevlar',
    nameEn: 'Kevlar',
    nameRu: 'Кевлар (Kevlar)',
    sp: 7,
    penalty: 0,
    penaltyStats: [],
    costEb: 50,
    descriptionEn: 'Woven clothes, vests, and stylish concealed jackets.',
    descriptionRu: 'Тканые жилеты, куртки и скрытные деловые костюмы.',
  },
  light_armorjack: {
    id: 'light_armorjack',
    nameEn: 'Light Armorjack',
    nameRu: 'Лёгкий арморджек (Light Armorjack)',
    sp: 11,
    penalty: 0,
    penaltyStats: [],
    costEb: 100,
    descriptionEn: 'Kevlar and lightweight plastic mesh combination without mobility loss.',
    descriptionRu: 'Комбинация кевлара и лёгких пластин без потери подвижности.',
  },
  bodyweight_suit: {
    id: 'bodyweight_suit',
    nameEn: 'Bodyweight Suit',
    nameRu: 'Костюм «Второй слой» (Bodyweight Suit)',
    sp: 11,
    penalty: 0,
    penaltyStats: [],
    costEb: 1000,
    descriptionEn: 'Skinsuit with impact-absorbing sintered armorgel with cyberdeck slots.',
    descriptionRu: 'Облегающий скафандр со спечённым армогелем и карманами под кибердеку.',
  },
  medium_armorjack: {
    id: 'medium_armorjack',
    nameEn: 'Medium Armorjack',
    nameRu: 'Средний арморджек (Medium Armorjack)',
    sp: 12,
    penalty: -2,
    penaltyStats: ['ref', 'dex', 'move'],
    costEb: 100,
    descriptionEn: 'Solid plastic plating and thicker Kevlar mesh (-2 REF, DEX, MOVE).',
    descriptionRu: 'Твёрдые пластины и толстый кевлар (штраф -2 к REF, DEX, MOVE).',
  },
  heavy_armorjack: {
    id: 'heavy_armorjack',
    nameEn: 'Heavy Armorjack',
    nameRu: 'Тяжёлый арморджек (Heavy Armorjack)',
    sp: 13,
    penalty: -2,
    penaltyStats: ['ref', 'dex', 'move'],
    costEb: 500,
    descriptionEn: 'Dense layered armorjack resisting serious military fire (-2 REF, DEX, MOVE).',
    descriptionRu: 'Плотный армейский жилет, выдерживающий винтовочный огонь.',
  },
  flak: {
    id: 'flak',
    nameEn: 'Flak',
    nameRu: 'Противоосколочная броня (Flak)',
    sp: 15,
    penalty: -4,
    penaltyStats: ['ref', 'dex', 'move'],
    costEb: 500,
    descriptionEn: 'Heavy combat vest and pants (-4 REF, DEX, MOVE).',
    descriptionRu: 'Тяжёлая тактическая броня для штурмовых операций.',
  },
  metalgear: {
    id: 'metalgear',
    nameEn: 'Metalgear',
    nameRu: 'Металгир (Metalgear)',
    sp: 18,
    penalty: -4,
    penaltyStats: ['ref', 'dex', 'move'],
    costEb: 2000,
    descriptionEn: 'Heavy powered-style plate armor offering maximum ballistic defense.',
    descriptionRu: 'Тяжёлый бронекостюм штурмовика с максимальным классом защиты.',
  },
  bulletproof_shield: {
    id: 'bulletproof_shield',
    nameEn: 'Bulletproof Shield',
    nameRu: 'Пуленепробиваемый щит',
    sp: 10,
    penalty: 0,
    penaltyStats: [],
    costEb: 100,
    descriptionEn: 'Clear ballistic poly-carbonate riot shield with 10 HP.',
    descriptionRu: 'Поликарбонатный баллистический щит с запасом прочности 10 HP.',
  },
};

// --------------------------------------------------------------------------
// Canonical Critical Injuries (Official Core Rulebook Page 187 & 188)
// --------------------------------------------------------------------------
export const CYBERPUNK_CRITICAL_INJURIES_BODY: Record<number, CyberpunkCriticalInjuryDefinition> = {
  2: {
    roll: 2,
    zone: 'body',
    nameEn: 'Dismembered Arm',
    nameRu: 'Оторванная рука',
    effectEn: 'The Dismembered Arm is gone. You drop any items in that arm hand immediately. Base Death Save Penalty is increased by 1.',
    effectRu: 'Рука оторвана. Все удерживаемые предметы брошены. Базовый штраф к спасброскам от смерти +1.',
    quickFixEn: 'N/A',
    quickFixRu: 'Недоступно',
    treatmentEn: 'Surgery DV17',
    treatmentRu: 'Хирургия СЛ17',
    deathSavePenaltyDelta: 1,
  },
  3: {
    roll: 3,
    zone: 'body',
    nameEn: 'Dismembered Hand',
    nameRu: 'Оторванная кисть',
    effectEn: 'The Dismembered Hand is gone. You drop any items in the dismembered hand immediately. Base Death Save Penalty is increased by 1.',
    effectRu: 'Кисть оторвана. Удерживаемые предметы немедленно падают. Базовый штраф к спасброскам от смерти +1.',
    quickFixEn: 'N/A',
    quickFixRu: 'Недоступно',
    treatmentEn: 'Surgery DV17',
    treatmentRu: 'Хирургия СЛ17',
    deathSavePenaltyDelta: 1,
  },
  4: {
    roll: 4,
    zone: 'body',
    nameEn: 'Collapsed Lung',
    nameRu: 'Коллапс лёгкого',
    effectEn: '-2 to MOVE (minimum 1). Base Death Save Penalty is increased by 1.',
    effectRu: 'Штраф -2 к СКОР (минимум 1). Базовый штраф к спасброскам от смерти +1.',
    quickFixEn: 'Paramedic DV15',
    quickFixRu: 'Парамедик СЛ15',
    treatmentEn: 'Surgery DV15',
    treatmentRu: 'Хирургия СЛ15',
    statPenalty: { move: -2 },
    deathSavePenaltyDelta: 1,
  },
  5: {
    roll: 5,
    zone: 'body',
    nameEn: 'Broken Ribs',
    nameRu: 'Сломанные рёбра',
    effectEn: 'At the end of every Turn where you move further than 4m/yds on foot, you re-suffer this Critical Injury bonus damage (5 HP) directly.',
    effectRu: 'В конце хода при перемещении более 4м пешком вы снова получаете 5 урона напрямую по ОЗ.',
    quickFixEn: 'Paramedic DV13',
    quickFixRu: 'Парамедик СЛ13',
    treatmentEn: 'Paramedic DV15 or Surgery DV13',
    treatmentRu: 'Парамедик СЛ15 или Хирургия СЛ13',
  },
  6: {
    roll: 6,
    zone: 'body',
    nameEn: 'Broken Arm',
    nameRu: 'Сломанная рука',
    effectEn: 'The Broken Arm cannot be used. You drop any items in that arm hand immediately.',
    effectRu: 'Сломанная рука не функционирует. Любые удерживаемые предметы выпадают.',
    quickFixEn: 'Paramedic DV13',
    quickFixRu: 'Парамедик СЛ13',
    treatmentEn: 'Paramedic DV15 or Surgery DV13',
    treatmentRu: 'Парамедик СЛ15 или Хирургия СЛ13',
  },
  7: {
    roll: 7,
    zone: 'body',
    nameEn: 'Foreign Object',
    nameRu: 'Инородное тело',
    effectEn: 'At the end of every Turn where you move further than 4m/yds on foot, you re-suffer 5 bonus damage directly to Hit Points.',
    effectRu: 'При перемещении пешком далее 4м за ход наносится 5 урона напрямую по ОЗ.',
    quickFixEn: 'First Aid or Paramedic DV13 (removes injury effect permanently)',
    quickFixRu: 'Первая помощь или Парамедик СЛ13 (снимает эффект навсегда)',
    treatmentEn: 'Quick Fix removes injury permanently',
    treatmentRu: 'Быстрое лечение устраняет травму навсегда',
  },
  8: {
    roll: 8,
    zone: 'body',
    nameEn: 'Broken Leg',
    nameRu: 'Сломанная нога',
    effectEn: '-4 to MOVE (minimum 1).',
    effectRu: 'Штраф -4 к СКОР (минимум 1).',
    quickFixEn: 'Paramedic DV13',
    quickFixRu: 'Парамедик СЛ13',
    treatmentEn: 'Paramedic DV15 or Surgery DV13',
    treatmentRu: 'Парамедик СЛ15 или Хирургия СЛ13',
    statPenalty: { move: -4 },
  },
  9: {
    roll: 9,
    zone: 'body',
    nameEn: 'Torn Muscle',
    nameRu: 'Разорванная мышца',
    effectEn: '-2 to Melee Attacks.',
    effectRu: 'Штраф -2 ко всем рукопашным атакам.',
    quickFixEn: 'First Aid or Paramedic DV13 (removes injury permanently)',
    quickFixRu: 'Первая помощь или Парамедик СЛ13 (снимает эффект)',
    treatmentEn: 'Quick Fix removes injury permanently',
    treatmentRu: 'Быстрое лечение устраняет травму навсегда',
  },
  10: {
    roll: 10,
    zone: 'body',
    nameEn: 'Spinal Injury',
    nameRu: 'Травма позвоночника',
    effectEn: 'Next Turn, you cannot take an Action, but you can still take a Move Action. Base Death Save Penalty is increased by 1.',
    effectRu: 'В следующем ходу нельзя совершать Действие (только Движение). Базовый штраф к спасброскам от смерти +1.',
    quickFixEn: 'Paramedic DV15',
    quickFixRu: 'Парамедик СЛ15',
    treatmentEn: 'Surgery DV15',
    treatmentRu: 'Хирургия СЛ15',
    deathSavePenaltyDelta: 1,
  },
  11: {
    roll: 11,
    zone: 'body',
    nameEn: 'Crushed Fingers',
    nameRu: 'Раздробленные пальцы',
    effectEn: '-4 to all Actions involving that hand.',
    effectRu: 'Штраф -4 ко всем действиям с использованием повреждённой кисти.',
    quickFixEn: 'Paramedic DV13',
    quickFixRu: 'Парамедик СЛ13',
    treatmentEn: 'Surgery DV15',
    treatmentRu: 'Хирургия СЛ15',
  },
  12: {
    roll: 12,
    zone: 'body',
    nameEn: 'Dismembered Leg',
    nameRu: 'Оторванная нога',
    effectEn: 'The Dismembered Leg is gone. -6 to MOVE (minimum 1). You cannot dodge attacks. Base Death Save Penalty is increased by 1.',
    effectRu: 'Нога оторвана. Штраф -6 к СКОР (минимум 1). Нельзя уклоняться от атак. Базовый штраф к спасброскам от смерти +1.',
    quickFixEn: 'N/A',
    quickFixRu: 'Недоступно',
    treatmentEn: 'Surgery DV17',
    treatmentRu: 'Хирургия СЛ17',
    statPenalty: { move: -6 },
    deathSavePenaltyDelta: 1,
  },
};

export const CYBERPUNK_CRITICAL_INJURIES_HEAD: Record<number, CyberpunkCriticalInjuryDefinition> = {
  2: {
    roll: 2,
    zone: 'head',
    nameEn: 'Lost Eye',
    nameRu: 'Потерянный глаз',
    effectEn: 'The Lost Eye is gone. -4 to Ranged Attacks & Perception Checks involving vision. Base Death Save Penalty is increased by 1.',
    effectRu: 'Глаз потерян. Штраф -4 к дистанционным атакам и внимательности на зрение. Базовый штраф к спасброскам +1.',
    quickFixEn: 'N/A',
    quickFixRu: 'Недоступно',
    treatmentEn: 'Surgery DV17',
    treatmentRu: 'Хирургия СЛ17',
    deathSavePenaltyDelta: 1,
  },
  3: {
    roll: 3,
    zone: 'head',
    nameEn: 'Brain Injury',
    nameRu: 'Травма мозга',
    effectEn: '-2 to all Actions. Base Death Save Penalty is increased by 1.',
    effectRu: 'Штраф -2 ко всем действиям. Базовый штраф к спасброскам от смерти +1.',
    quickFixEn: 'N/A',
    quickFixRu: 'Недоступно',
    treatmentEn: 'Surgery DV17',
    treatmentRu: 'Хирургия СЛ17',
    deathSavePenaltyDelta: 1,
  },
  4: {
    roll: 4,
    zone: 'head',
    nameEn: 'Damaged Eye',
    nameRu: 'Повреждённый глаз',
    effectEn: '-2 to Ranged Attacks & Perception Checks involving vision.',
    effectRu: 'Штраф -2 к дальним атакам и проверкам внимательности на зрение.',
    quickFixEn: 'Paramedic DV15',
    quickFixRu: 'Парамедик СЛ15',
    treatmentEn: 'Surgery DV13',
    treatmentRu: 'Хирургия СЛ13',
  },
  5: {
    roll: 5,
    zone: 'head',
    nameEn: 'Concussion',
    nameRu: 'Сотрясение мозга',
    effectEn: '-2 to all Actions.',
    effectRu: 'Штраф -2 ко всем действиям.',
    quickFixEn: 'First Aid or Paramedic DV13 (removes injury effect permanently)',
    quickFixRu: 'Первая помощь или Парамедик СЛ13 (снимает эффект навсегда)',
    treatmentEn: 'Quick Fix removes injury permanently',
    treatmentRu: 'Быстрое лечение снимает травму навсегда',
  },
  6: {
    roll: 6,
    zone: 'head',
    nameEn: 'Broken Jaw',
    nameRu: 'Сломанная челюсть',
    effectEn: '-4 to all Actions involving speech.',
    effectRu: 'Штраф -4 ко всем действиям, связанным с речью.',
    quickFixEn: 'Paramedic DV13',
    quickFixRu: 'Парамедик СЛ13',
    treatmentEn: 'Paramedic or Surgery DV13',
    treatmentRu: 'Парамедик или Хирургия СЛ13',
  },
  7: {
    roll: 7,
    zone: 'head',
    nameEn: 'Foreign Object',
    nameRu: 'Инородное тело в голове',
    effectEn: 'At the end of every Turn where you move further than 4m/yds on foot, you re-suffer 5 bonus damage directly to Hit Points.',
    effectRu: 'При перемещении пешком далее 4м за ход наносится 5 урона напрямую по ОЗ.',
    quickFixEn: 'First Aid or Paramedic DV13 (removes injury effect permanently)',
    quickFixRu: 'Первая помощь или Парамедик СЛ13 (снимает эффект навсегда)',
    treatmentEn: 'Quick Fix removes injury permanently',
    treatmentRu: 'Быстрое лечение снимает травму навсегда',
  },
  8: {
    roll: 8,
    zone: 'head',
    nameEn: 'Whiplash',
    nameRu: 'Хлыстовая травма',
    effectEn: 'Base Death Save Penalty is increased by 1.',
    effectRu: 'Базовый штраф к спасброскам от смерти увеличивается на 1.',
    quickFixEn: 'Paramedic DV13',
    quickFixRu: 'Парамедик СЛ13',
    treatmentEn: 'Paramedic or Surgery DV13',
    treatmentRu: 'Парамедик или Хирургия СЛ13',
    deathSavePenaltyDelta: 1,
  },
  9: {
    roll: 9,
    zone: 'head',
    nameEn: 'Cracked Skull',
    nameRu: 'Трещина в черепе',
    effectEn: 'Aimed Shots to your head multiply damage getting through SP by 3 instead of 2. Base Death Save Penalty is increased by 1.',
    effectRu: 'Прицельные выстрелы в голову умножают пробивающий урон на 3 вместо 2. Базовый штраф к спасброскам от смерти +1.',
    quickFixEn: 'Paramedic DV15',
    quickFixRu: 'Парамедик СЛ15',
    treatmentEn: 'Paramedic or Surgery DV15',
    treatmentRu: 'Парамедик или Хирургия СЛ15',
    deathSavePenaltyDelta: 1,
  },
  10: {
    roll: 10,
    zone: 'head',
    nameEn: 'Damaged Ear',
    nameRu: 'Повреждённое ухо',
    effectEn: 'Whenever you move further than 4m/yds on foot in a Turn, you cannot take a Move Action on your next Turn. -2 to Perception Checks involving hearing.',
    effectRu: 'При движении пешком далее 4м за ход нельзя брать Действие Движения в следующем ходу. Штраф -2 к слуховому восприятию.',
    quickFixEn: 'Paramedic DV13',
    quickFixRu: 'Парамедик СЛ13',
    treatmentEn: 'Surgery DV13',
    treatmentRu: 'Хирургия СЛ13',
  },
  11: {
    roll: 11,
    zone: 'head',
    nameEn: 'Crushed Windpipe',
    nameRu: 'Раздавленная трахея',
    effectEn: 'You cannot speak. Base Death Save Penalty is increased by 1.',
    effectRu: 'Персонаж не может говорить. Базовый штраф к спасброскам от смерти +1.',
    quickFixEn: 'N/A',
    quickFixRu: 'Недоступно',
    treatmentEn: 'Surgery DV15',
    treatmentRu: 'Хирургия СЛ15',
    deathSavePenaltyDelta: 1,
  },
  12: {
    roll: 12,
    zone: 'head',
    nameEn: 'Lost Ear',
    nameRu: 'Оторванное ухо',
    effectEn: 'The Lost Ear is gone. When moving > 4m on foot, no Move Action next Turn. -4 to Perception involving hearing. Base Death Save Penalty +1.',
    effectRu: 'Ухо оторвано. Штраф -4 к слуховой внимательности. Потеря подвижности при беге. Базовый штраф к спасброскам +1.',
    quickFixEn: 'N/A',
    quickFixRu: 'Недоступно',
    treatmentEn: 'Surgery DV17',
    treatmentRu: 'Хирургия СЛ17',
    deathSavePenaltyDelta: 1,
  },
};

// --------------------------------------------------------------------------
// Helper Lookup Functions
// --------------------------------------------------------------------------
export function getCyberpunkStatName(
  stat: CyberpunkStatKey | string,
  lang: SupportedLanguage = 'en',
  abbreviated = false
): string {
  const key = stat.toLowerCase().trim() as CyberpunkStatKey;
  const def = CYBERPUNK_STATS[key];
  if (!def) return stat;
  if (abbreviated) {
    return lang === 'ru' ? def.abbrRu : def.abbrEn;
  }
  return lang === 'ru' ? def.nameRu : def.nameEn;
}

export function getCyberpunkRoleName(role: string, lang: SupportedLanguage = 'en'): string {
  const key = role.toLowerCase().trim();
  const def = CYBERPUNK_ROLES[key];
  if (!def) return role;
  return lang === 'ru' ? def.nameRu : def.nameEn;
}

export function getCyberpunkSkillName(skillId: string, lang: SupportedLanguage = 'en'): string {
  const key = skillId.toLowerCase().replace(/[\s\/-]+/g, '_').trim();
  const def = CYBERPUNK_SKILLS[key];
  if (!def) return skillId;
  return lang === 'ru' ? def.nameRu : def.nameEn;
}

export function getCyberpunkWeaponName(weaponId: string, lang: SupportedLanguage = 'en'): string {
  const key = weaponId.toLowerCase().replace(/[\s\/-]+/g, '_').trim();
  const def = CYBERPUNK_WEAPONS[key];
  if (!def) return weaponId;
  return lang === 'ru' ? def.nameRu : def.nameEn;
}

export function getCyberpunkArmorName(armorId: string, lang: SupportedLanguage = 'en'): string {
  const key = armorId.toLowerCase().replace(/[\s\/-]+/g, '_').trim();
  const def = CYBERPUNK_ARMOR[key];
  if (!def) return armorId;
  return lang === 'ru' ? def.nameRu : def.nameEn;
}

export function getCyberpunkCriticalInjury(
  zone: 'head' | 'body',
  roll: number,
  lang: SupportedLanguage = 'en'
): { injury: CyberpunkCriticalInjuryDefinition; name: string; effect: string; quickFix: string; treatment: string } | undefined {
  const table = zone === 'head' ? CYBERPUNK_CRITICAL_INJURIES_HEAD : CYBERPUNK_CRITICAL_INJURIES_BODY;
  const entry = table[roll];
  if (!entry) return undefined;
  return {
    injury: entry,
    name: lang === 'ru' ? entry.nameRu : entry.nameEn,
    effect: lang === 'ru' ? entry.effectRu : entry.effectEn,
    quickFix: lang === 'ru' ? entry.quickFixRu : entry.quickFixEn,
    treatment: lang === 'ru' ? entry.treatmentRu : entry.treatmentEn,
  };
}
