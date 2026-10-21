export interface CharacterStats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface PreparedSpell {
  id?: string;
  name: string;
  nameEn?: string;
  level: number;
  school?: string;
  prepared?: boolean;
  ritual?: boolean;
  concentration?: boolean;
}

export interface ClassResource {
  id: string;
  name: string;
  current: number;
  max: number;
  resetOn: 'short' | 'long';
}

export interface EquipmentItem {
  id: string;
  name: string;
  quantity: number;
  weight?: number;
  notes?: string;
}

export interface CharacterWeapon {
  id: string;
  name: string;
  attackBonus?: string;
  damage?: string;
  damageType?: string;
  mastery?: string;
  notes?: string;
}

export interface AttunementSlot {
  id: string;
  name: string;
  description?: string;
  attuned: boolean;
}

export interface PartyMember {
  id: string;
  name: string;
  characterClass?: string;
  ac: number;
  maxHp: number;
  currentHp?: number;
  tempHp?: number;
  initBonus: number;
  passivePerception?: number;
  speed?: string;
  avatarUrl?: string;
  color?: string;
  notes?: string;

  // D&D Beyond Character Sheet Fields
  level?: number;
  species?: string;
  inspiration?: boolean;
  proficiencyBonus?: number;

  // Hit Dice
  hitDiceCurrent?: number;
  hitDiceMax?: number;
  hitDiceType?: string; // e.g. "d10", "d8", "d6", "d12"

  // Exhaustion level (0 to 6)
  exhaustion?: number;

  // 6 Ability Scores
  stats?: CharacterStats;

  // Saving Throws: array of proficient stat keys ('str', 'dex', etc.)
  savingThrowProficiencies?: string[];

  // 18 Skills proficiencies
  skillProficiencies?: Record<string, 'proficient' | 'expertise' | undefined>;

  // Spellcasting
  spellcastingAbility?: 'int' | 'wis' | 'cha';
  spellAttackBonus?: number;
  spellSaveDc?: number;
  spellSlots?: Record<number, { max: number; used: number }>;
  preparedSpells?: PreparedSpell[];

  // Class Resources (Rage, Action Surge, Ki, Lay on Hands...)
  resources?: ClassResource[];

  // Equipment, Weapons, Attunement
  equipment?: EquipmentItem[];
  weapons?: CharacterWeapon[];
  attunementSlots?: AttunementSlot[];
}

export const DND_SKILLS_RU: Array<{ key: string; nameRu: string; ability: keyof CharacterStats }> = [
  { key: 'Athletics', nameRu: 'Атлетика', ability: 'str' },
  { key: 'Acrobatics', nameRu: 'Акробатика', ability: 'dex' },
  { key: 'Sleight of Hand', nameRu: 'Ловкость рук', ability: 'dex' },
  { key: 'Stealth', nameRu: 'Скрытность', ability: 'dex' },
  { key: 'Arcana', nameRu: 'Магия', ability: 'int' },
  { key: 'History', nameRu: 'История', ability: 'int' },
  { key: 'Investigation', nameRu: 'Анализ', ability: 'int' },
  { key: 'Nature', nameRu: 'Природа', ability: 'int' },
  { key: 'Religion', nameRu: 'Религия', ability: 'int' },
  { key: 'Animal Handling', nameRu: 'Уход за животными', ability: 'wis' },
  { key: 'Insight', nameRu: 'Проницательность', ability: 'wis' },
  { key: 'Medicine', nameRu: 'Медицина', ability: 'wis' },
  { key: 'Perception', nameRu: 'Внимательность', ability: 'wis' },
  { key: 'Survival', nameRu: 'Выживание', ability: 'wis' },
  { key: 'Deception', nameRu: 'Обман', ability: 'cha' },
  { key: 'Intimidation', nameRu: 'Запугивание', ability: 'cha' },
  { key: 'Performance', nameRu: 'Выступление', ability: 'cha' },
  { key: 'Persuasion', nameRu: 'Убеждение', ability: 'cha' },
];

export const DEFAULT_SAMPLE_PARTY: PartyMember[] = [
  {
    id: 'party-1',
    name: 'Эльдрих',
    characterClass: 'Паладин (Клятва Преданности)',
    species: 'Человек',
    level: 5,
    ac: 18,
    maxHp: 44,
    currentHp: 44,
    tempHp: 0,
    initBonus: 0,
    passivePerception: 13,
    speed: '30 фт.',
    color: '#3B82F6',
    inspiration: false,
    proficiencyBonus: 3,
    hitDiceCurrent: 5,
    hitDiceMax: 5,
    hitDiceType: 'd10',
    exhaustion: 0,
    notes: 'Тяжелый щит и латы, стиль боя Защита',
    stats: { str: 16, dex: 10, con: 14, int: 10, wis: 12, cha: 16 },
    savingThrowProficiencies: ['wis', 'cha'],
    skillProficiencies: {
      Athletics: 'proficient',
      Persuasion: 'proficient',
      Insight: 'proficient',
      Religion: 'proficient',
    },
    spellcastingAbility: 'cha',
    spellAttackBonus: 6,
    spellSaveDc: 14,
    spellSlots: {
      1: { max: 4, used: 1 },
      2: { max: 2, used: 0 },
    },
    preparedSpells: [
      { name: 'Лечение ран', nameEn: 'Cure Wounds', level: 1, prepared: true, concentration: false },
      { name: 'Благословение', nameEn: 'Bless', level: 1, prepared: true, concentration: true },
      { name: 'Приказ', nameEn: 'Command', level: 1, prepared: true, concentration: false },
      { name: 'Карающий удар', nameEn: 'Wrathful Smite', level: 1, prepared: true, concentration: true },
      { name: 'Магическое оружие', nameEn: 'Magic Weapon', level: 2, prepared: true, concentration: true },
      { name: 'Поиск скакуна', nameEn: 'Find Steed', level: 2, prepared: true, concentration: false },
    ],
    resources: [
      { id: 'res-1', name: 'Наложение рук (ОЗ)', current: 25, max: 25, resetOn: 'long' },
      { id: 'res-2', name: 'Божественный канал', current: 2, max: 2, resetOn: 'short' },
      { id: 'res-3', name: 'Божественное чутьё', current: 4, max: 4, resetOn: 'long' },
    ],
    weapons: [
      { id: 'w-1', name: 'Длинный меч +1', attackBonus: '+7', damage: '1d8+4', damageType: 'Рубящий', mastery: 'Sap', notes: 'Универсальное (1d10)' },
      { id: 'w-2', name: 'Метательное копьё', attackBonus: '+6', damage: '1d6+3', damageType: 'Колющий', notes: 'Дальность 30/120' },
    ],
    equipment: [
      { id: 'eq-1', name: 'Латы', quantity: 1, weight: 65, notes: 'КД 18, помеха на Скрытность' },
      { id: 'eq-2', name: 'Щит рыцаря', quantity: 1, weight: 6, notes: '+2 КД' },
      { id: 'eq-3', name: 'Священный символ (амулет)', quantity: 1, weight: 1 },
      { id: 'eq-4', name: 'Зелье лечения', quantity: 2, weight: 1, notes: 'Восстанавливает 2d4+2 ОЗ' },
    ],
    attunementSlots: [
      { id: 'att-1', name: 'Солнечный клинок', description: 'Наносит урон излучением', attuned: true },
      { id: 'att-2', name: 'Кольцо защиты', description: '+1 КД и ко всем спасброскам', attuned: true },
      { id: 'att-3', name: 'Пустой слот', description: 'Свободен для настройки', attuned: false },
    ],
  },
  {
    id: 'party-2',
    name: 'Шэдоу',
    characterClass: 'Плут (Вор)',
    species: 'Эльф',
    level: 5,
    ac: 16,
    maxHp: 33,
    currentHp: 33,
    tempHp: 0,
    initBonus: 4,
    passivePerception: 17,
    speed: '30 фт.',
    color: '#8B5CF6',
    inspiration: true,
    proficiencyBonus: 3,
    hitDiceCurrent: 5,
    hitDiceMax: 5,
    hitDiceType: 'd8',
    exhaustion: 0,
    notes: 'Скрытная атака 3d6, Хитрое действие, Тёмное зрение 60 фт.',
    stats: { str: 10, dex: 18, con: 12, int: 14, wis: 12, cha: 11 },
    savingThrowProficiencies: ['dex', 'int'],
    skillProficiencies: {
      Stealth: 'expertise',
      'Sleight of Hand': 'expertise',
      Acrobatics: 'proficient',
      Investigation: 'proficient',
      Perception: 'proficient',
      Deception: 'proficient',
    },
    resources: [
      { id: 'res-s1', name: 'Второе дыхание (Черта)', current: 1, max: 1, resetOn: 'short' },
      { id: 'res-s2', name: 'Удача полурослика / Фокус', current: 3, max: 3, resetOn: 'long' },
    ],
    weapons: [
      { id: 'w-s1', name: 'Рапира', attackBonus: '+7', damage: '1d8+4', damageType: 'Колющий', mastery: 'Vex', notes: 'Фехтовальное' },
      { id: 'w-s2', name: 'Короткий лук', attackBonus: '+7', damage: '1d6+4', damageType: 'Колющий', mastery: 'Slow', notes: 'Дальность 80/320' },
      { id: 'w-s3', name: 'Кинжал', attackBonus: '+7', damage: '1d4+4', damageType: 'Колющий', mastery: 'Nick', notes: 'Лёгкое, метательное' },
    ],
    equipment: [
      { id: 'eq-s1', name: 'Проклепанный кожаный доспех', quantity: 1, weight: 13, notes: 'КД 12 + Мод ЛОВ' },
      { id: 'eq-s2', name: 'Воровские инструменты', quantity: 1, weight: 1, notes: 'Комплект отмычек' },
      { id: 'eq-s3', name: 'Верёвка шёлковая (50 фт.)', quantity: 1, weight: 5 },
    ],
    attunementSlots: [
      { id: 'att-s1', name: 'Сапоги скрытности', description: 'Преимущество на проверки Скрытности', attuned: true },
      { id: 'att-s2', name: 'Плащ плащаницы', description: 'Скрывает ауру', attuned: false },
      { id: 'att-s3', name: 'Пустой слот', description: 'Свободен для настройки', attuned: false },
    ],
  },
  {
    id: 'party-3',
    name: 'Магнус',
    characterClass: 'Волшебник (Эвокация)',
    species: 'Гном',
    level: 5,
    ac: 13,
    maxHp: 27,
    currentHp: 27,
    tempHp: 0,
    initBonus: 2,
    passivePerception: 11,
    speed: '30 фт.',
    color: '#EC4899',
    inspiration: false,
    proficiencyBonus: 3,
    hitDiceCurrent: 5,
    hitDiceMax: 5,
    hitDiceType: 'd6',
    exhaustion: 0,
    notes: 'Скульптор заклинаний, Книга заклинаний, Ритуалы',
    stats: { str: 8, dex: 14, con: 13, int: 18, wis: 12, cha: 10 },
    savingThrowProficiencies: ['int', 'wis'],
    skillProficiencies: {
      Arcana: 'expertise',
      History: 'proficient',
      Investigation: 'proficient',
    },
    spellcastingAbility: 'int',
    spellAttackBonus: 7,
    spellSaveDc: 15,
    spellSlots: {
      1: { max: 4, used: 2 },
      2: { max: 3, used: 1 },
      3: { max: 2, used: 0 },
    },
    preparedSpells: [
      { name: 'Огненный шар', nameEn: 'Fireball', level: 3, prepared: true, concentration: false },
      { name: 'Молния', nameEn: 'Lightning Bolt', level: 3, prepared: true, concentration: false },
      { name: 'Туманный шаг', nameEn: 'Misty Step', level: 2, prepared: true, concentration: false },
      { name: 'Паутина', nameEn: 'Web', level: 2, prepared: true, concentration: true },
      { name: 'Щит', nameEn: 'Shield', level: 1, prepared: true, concentration: false },
      { name: 'Волшебная стрела', nameEn: 'Magic Missile', level: 1, prepared: true, concentration: false },
      { name: 'Магический доспех', nameEn: 'Mage Armor', level: 1, prepared: true, concentration: false },
      { name: 'Обнаружение магии', nameEn: 'Detect Magic', level: 1, prepared: true, ritual: true, concentration: true },
    ],
    resources: [
      { id: 'res-m1', name: 'Магическое восстановление', current: 1, max: 1, resetOn: 'short' },
    ],
    weapons: [
      { id: 'w-m1', name: 'Боевой посох (Фокус)', attackBonus: '+2', damage: '1d6-1', damageType: 'Дробящий' },
      { id: 'w-m2', name: 'Кинжал', attackBonus: '+5', damage: '1d4+2', damageType: 'Колющий' },
    ],
    equipment: [
      { id: 'eq-m1', name: 'Мантия ученого', quantity: 1, weight: 4 },
      { id: 'eq-m2', name: 'Книга заклинаний в кожаном переплете', quantity: 1, weight: 3 },
      { id: 'eq-m3', name: 'Мешочек с компонентами', quantity: 1, weight: 2 },
    ],
    attunementSlots: [
      { id: 'att-m1', name: 'Жезл хранителя договоров / магии +1', description: '+1 к атакам заклинаниями и Сл спасбросков', attuned: true },
      { id: 'att-m2', name: 'Жемчужина силы', description: 'Восстанавливает ячейку заклинания до 3 ур.', attuned: true },
      { id: 'att-m3', name: 'Пустой слот', description: 'Свободен для настройки', attuned: false },
    ],
  },
  {
    id: 'party-4',
    name: 'Аларик',
    characterClass: 'Жрец (Домен Жизни)',
    species: 'Дворф',
    level: 5,
    ac: 18,
    maxHp: 38,
    currentHp: 38,
    tempHp: 0,
    initBonus: 1,
    passivePerception: 16,
    speed: '25 фт.',
    color: '#10B981',
    inspiration: false,
    proficiencyBonus: 3,
    hitDiceCurrent: 5,
    hitDiceMax: 5,
    hitDiceType: 'd8',
    exhaustion: 0,
    notes: 'Ученик жизни, Сохранение жизни (лечение 25 ОЗ)',
    stats: { str: 14, dex: 10, con: 15, int: 10, wis: 16, cha: 12 },
    savingThrowProficiencies: ['wis', 'cha'],
    skillProficiencies: {
      Insight: 'proficient',
      Medicine: 'expertise',
      Perception: 'proficient',
      Religion: 'proficient',
    },
    spellcastingAbility: 'wis',
    spellAttackBonus: 6,
    spellSaveDc: 14,
    spellSlots: {
      1: { max: 4, used: 0 },
      2: { max: 3, used: 1 },
      3: { max: 2, used: 0 },
    },
    preparedSpells: [
      { name: 'Возрождение', nameEn: 'Revivify', level: 3, prepared: true, concentration: false },
      { name: 'Духовные стражи', nameEn: 'Spirit Guardians', level: 3, prepared: true, concentration: true },
      { name: 'Духовное оружие', nameEn: 'Spiritual Weapon', level: 2, prepared: true, concentration: false },
      { name: 'Молебен исцеления', nameEn: 'Prayer of Healing', level: 2, prepared: true, concentration: false },
      { name: 'Лечащее слово', nameEn: 'Healing Word', level: 1, prepared: true, concentration: false },
      { name: 'Благословение', nameEn: 'Bless', level: 1, prepared: true, concentration: true },
      { name: 'Направляющий снаряд', nameEn: 'Guiding Bolt', level: 1, prepared: true, concentration: false },
    ],
    resources: [
      { id: 'res-a1', name: 'Божественный канал', current: 2, max: 2, resetOn: 'short' },
    ],
    weapons: [
      { id: 'w-a1', name: 'Боевой молот', attackBonus: '+5', damage: '1d8+2', damageType: 'Дробящий', mastery: 'Push' },
    ],
    equipment: [
      { id: 'eq-a1', name: 'Кольчуга', quantity: 1, weight: 55, notes: 'КД 16' },
      { id: 'eq-a2', name: 'Щит со священным гербом', quantity: 1, weight: 6, notes: '+2 КД' },
    ],
    attunementSlots: [
      { id: 'att-a1', name: 'Амулет набожности +1', description: '+1 к атакам заклинаниями и спасброскам', attuned: true },
      { id: 'att-a2', name: 'Пустой слот', description: 'Свободен для настройки', attuned: false },
      { id: 'att-a3', name: 'Пустой слот', description: 'Свободен для настройки', attuned: false },
    ],
  },
];
