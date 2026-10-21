import { CharacterStats } from '../types/party';

export interface ClassFeature {
  level: number;
  nameRu: string;
  nameEn?: string;
  descriptionRu: string;
}

export interface ClassSubclass {
  id: string;
  nameRu: string;
  nameEn?: string;
  descriptionRu: string;
}

export interface Class2024 {
  id: string;
  nameRu: string;
  nameEn: string;
  hitDie: 'd6' | 'd8' | 'd10' | 'd12';
  hitDieValue: number;
  savingThrows: Array<keyof CharacterStats>;
  armorProficiencies: Array<'light' | 'medium' | 'heavy' | 'shield'>;
  weaponProficiencies: string[];
  casterType: 'none' | 'full' | 'half' | 'pact';
  spellcastingAbility?: 'int' | 'wis' | 'cha';
  availableSkills: string[];
  skillCount: number;
  unarmoredDefense?: 'barbarian' | 'monk';
  weaponMasteriesCount?: number;
  subclasses?: ClassSubclass[];
  features?: ClassFeature[];
}

export const CLASSES_2024_DATA: Class2024[] = [
  // 1. Варвар (Barbarian)
  {
    id: 'barbarian',
    nameRu: 'Варвар',
    nameEn: 'Barbarian',
    hitDie: 'd12',
    hitDieValue: 12,
    savingThrows: ['str', 'con'],
    armorProficiencies: ['shield'],
    weaponProficiencies: ['Простое оружие', 'Воинское оружие'],
    casterType: 'none',
    unarmoredDefense: 'barbarian',
    weaponMasteriesCount: 2,
    skillCount: 2,
    availableSkills: [
      'Animal Handling',
      'Athletics',
      'Intimidation',
      'Nature',
      'Perception',
      'Survival',
    ],
    subclasses: [
      { id: 'berserker', nameRu: 'Путь Берсерка', nameEn: 'Path of the Berserker', descriptionRu: 'Бешеная ярость, дополнительные атаки и неистовство в ближнем бою.' },
      { id: 'wildheart', nameRu: 'Путь Дикого Сердца', nameEn: 'Path of the Wild Heart', descriptionRu: 'Единение с тотемными силами природы: медведь, орел, волк.' },
      { id: 'zealot', nameRu: 'Путь Фанатика', nameEn: 'Path of the Zealot', descriptionRu: 'Божественная ярость, сияющий/некротический урон и несгибаемая стойкость.' },
      { id: 'world_tree', nameRu: 'Путь Мирового Древа', nameEn: 'Path of the World Tree', descriptionRu: 'Сила Иггдрасиля, временные хиты союзникам и перемещение по корням.' },
    ],
  },

  // 2. Бард (Bard)
  {
    id: 'bard',
    nameRu: 'Бард',
    nameEn: 'Bard',
    hitDie: 'd8',
    hitDieValue: 8,
    savingThrows: ['dex', 'cha'],
    armorProficiencies: ['light'],
    weaponProficiencies: ['Простое оружие'],
    casterType: 'full',
    spellcastingAbility: 'cha',
    skillCount: 3,
    availableSkills: [
      'Athletics', 'Acrobatics', 'Sleight of Hand', 'Stealth',
      'Arcana', 'History', 'Investigation', 'Nature', 'Religion',
      'Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival',
      'Deception', 'Intimidation', 'Performance', 'Persuasion',
    ],
    subclasses: [
      { id: 'lore', nameRu: 'Коллегия Знаний', nameEn: 'College of Lore', descriptionRu: 'Дополнительные навыки, магия из любых классов и срезание слов.' },
      { id: 'valor', nameRu: 'Коллегия Доблести', nameEn: 'College of Valor', descriptionRu: 'Владение воинским оружием, средними доспехами и боевое вдохновение.' },
      { id: 'glamour', nameRu: 'Коллегия Очарования', nameEn: 'College of Glamour', descriptionRu: 'Магия страны фей, чарующий голос и царственное величие.' },
      { id: 'dance', nameRu: 'Коллегия Танца', nameEn: 'College of Dance', descriptionRu: 'Танец без доспехов, безоружные удары и манёвренность в бою.' },
    ],
  },

  // 3. Жрец (Cleric)
  {
    id: 'cleric',
    nameRu: 'Жрец',
    nameEn: 'Cleric',
    hitDie: 'd8',
    hitDieValue: 8,
    savingThrows: ['wis', 'cha'],
    armorProficiencies: ['light', 'medium', 'shield'],
    weaponProficiencies: ['Простое оружие'],
    casterType: 'full',
    spellcastingAbility: 'wis',
    skillCount: 2,
    availableSkills: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'],
    subclasses: [
      { id: 'life', nameRu: 'Домен Жизни', nameEn: 'Life Domain', descriptionRu: 'Максимальное исцеление, тяжелые доспехи и сохранение жизни отряда.' },
      { id: 'light', nameRu: 'Домен Света', nameEn: 'Light Domain', descriptionRu: 'Ослепительное сияние, огненные заклинания и защита верой.' },
      { id: 'trickery', nameRu: 'Домен Обмана', nameEn: 'Trickery Domain', descriptionRu: 'Иллюзии, скрытность, дубликат священнослужителя и маскировка.' },
      { id: 'war', nameRu: 'Домен Войны', nameEn: 'War Domain', descriptionRu: 'Владение тяжелым оружием, бонусные атаки и божественный удар.' },
    ],
  },

  // 4. Друид (Druid)
  {
    id: 'druid',
    nameRu: 'Друид',
    nameEn: 'Druid',
    hitDie: 'd8',
    hitDieValue: 8,
    savingThrows: ['int', 'wis'],
    armorProficiencies: ['light', 'shield'],
    weaponProficiencies: ['Простое оружие'],
    casterType: 'full',
    spellcastingAbility: 'wis',
    skillCount: 2,
    availableSkills: [
      'Arcana',
      'Animal Handling',
      'Insight',
      'Medicine',
      'Nature',
      'Perception',
      'Religion',
      'Survival',
    ],
    subclasses: [
      { id: 'land', nameRu: 'Круг Земли', nameEn: 'Circle of the Land', descriptionRu: 'Магия природных биомов, восстановление ячеек и заклинания природы.' },
      { id: 'moon', nameRu: 'Круг Луны', nameEn: 'Circle of the Moon', descriptionRu: 'Боевая дикая форма, мощные звериные трансформации и лунное сияние.' },
      { id: 'stars', nameRu: 'Круг Звезд', nameEn: 'Circle of the Stars', descriptionRu: 'Звездная карта, созвездия Стрельца, Чаши и Дракона.' },
      { id: 'sea', nameRu: 'Круг Моря', nameEn: 'Circle of the Sea', descriptionRu: 'Буря океана, громовой урон, туман и управление волнами.' },
    ],
  },

  // 5. Воин (Fighter)
  {
    id: 'fighter',
    nameRu: 'Воин',
    nameEn: 'Fighter',
    hitDie: 'd10',
    hitDieValue: 10,
    savingThrows: ['str', 'con'],
    armorProficiencies: ['light', 'medium', 'heavy', 'shield'],
    weaponProficiencies: ['Простое оружие', 'Воинское оружие'],
    casterType: 'none',
    weaponMasteriesCount: 3,
    skillCount: 2,
    availableSkills: [
      'Acrobatics',
      'Animal Handling',
      'Athletics',
      'History',
      'Insight',
      'Intimidation',
      'Perception',
      'Survival',
    ],
    subclasses: [
      { id: 'champion', nameRu: 'Чемпион', nameEn: 'Champion', descriptionRu: 'Критический удар на 19-20, атлетическое превосходство и стойкость.' },
      { id: 'battle_master', nameRu: 'Мастер Боевых Искусств', nameEn: 'Battle Master', descriptionRu: 'Тактические приемы, кости превосходства d8 и анализ противника.' },
      { id: 'eldritch_knight', nameRu: 'Мистический Рыцарь', nameEn: 'Eldritch Knight', descriptionRu: 'Связь с оружием, заклинания ограждения и воплощения волшебника.' },
      { id: 'psi_warrior', nameRu: 'Пси-Воин', nameEn: 'Psi Warrior', descriptionRu: 'Телекинетические удары, псионический барьер и прыжок разума.' },
    ],
  },

  // 6. Монах (Monk)
  {
    id: 'monk',
    nameRu: 'Монах',
    nameEn: 'Monk',
    hitDie: 'd8',
    hitDieValue: 8,
    savingThrows: ['str', 'dex'],
    armorProficiencies: [],
    weaponProficiencies: ['Простое оружие', 'Короткий меч'],
    casterType: 'none',
    unarmoredDefense: 'monk',
    skillCount: 2,
    availableSkills: [
      'Acrobatics',
      'Athletics',
      'History',
      'Insight',
      'Religion',
      'Stealth',
    ],
    subclasses: [
      { id: 'open_hand', nameRu: 'Путь Открытой Ладони', nameEn: 'Warrior of the Open Hand', descriptionRu: 'Сбивание с ног, отталкивание и смертоносная вибрация ладони.' },
      { id: 'shadow', nameRu: 'Путь Тени', nameEn: 'Warrior of Shadow', descriptionRu: 'Шаг сквозь тьму, покров теней и бесшумные устранения.' },
      { id: 'elements', nameRu: 'Путь Четырех Стихий', nameEn: 'Warrior of the Elements', descriptionRu: 'Стихийные удары на дистанции: пламя, лед, камень и молния.' },
      { id: 'mercy', nameRu: 'Путь Милосердия', nameEn: 'Warrior of Mercy', descriptionRu: 'Руки исцеления и руки вреда, маска чумного доктора.' },
    ],
  },

  // 7. Паладин (Paladin)
  {
    id: 'paladin',
    nameRu: 'Паладин',
    nameEn: 'Paladin',
    hitDie: 'd10',
    hitDieValue: 10,
    savingThrows: ['wis', 'cha'],
    armorProficiencies: ['light', 'medium', 'heavy', 'shield'],
    weaponProficiencies: ['Простое оружие', 'Воинское оружие'],
    casterType: 'half',
    spellcastingAbility: 'cha',
    weaponMasteriesCount: 2,
    skillCount: 2,
    availableSkills: [
      'Athletics',
      'Insight',
      'Intimidation',
      'Medicine',
      'Persuasion',
      'Religion',
    ],
    subclasses: [
      { id: 'devotion', nameRu: 'Клятва Преданности', nameEn: 'Oath of Devotion', descriptionRu: 'Священное оружие, сияющая аура и защита от зла.' },
      { id: 'ancients', nameRu: 'Клятва Древних', nameEn: 'Oath of the Ancients', descriptionRu: 'Свет природы, аура защиты от урона заклинаний.' },
      { id: 'vengeance', nameRu: 'Клятва Мести', nameEn: 'Oath of Vengeance', descriptionRu: 'Метка врага, непреклонная погоня и кара возмездия.' },
      { id: 'glory', nameRu: 'Клятва Славы', nameEn: 'Oath of Glory', descriptionRu: 'Героические подвиги, аура стремительности и несокрушимость.' },
    ],
  },

  // 8. Следопыт (Ranger)
  {
    id: 'ranger',
    nameRu: 'Следопыт',
    nameEn: 'Ranger',
    hitDie: 'd10',
    hitDieValue: 10,
    savingThrows: ['str', 'dex'],
    armorProficiencies: ['light', 'medium', 'shield'],
    weaponProficiencies: ['Простое оружие', 'Воинское оружие'],
    casterType: 'half',
    spellcastingAbility: 'wis',
    weaponMasteriesCount: 2,
    skillCount: 3,
    availableSkills: [
      'Animal Handling',
      'Athletics',
      'Insight',
      'Investigation',
      'Nature',
      'Perception',
      'Stealth',
      'Survival',
    ],
    subclasses: [
      { id: 'hunter', nameRu: 'Охотник', nameEn: 'Hunter', descriptionRu: 'Убийца великанов, сокрушитель орд и железный вихрь.' },
      { id: 'beast_master', nameRu: 'Повелитель Зверей', nameEn: 'Beast Master', descriptionRu: 'Верный зверь-компаньон неба, земли или моря.' },
      { id: 'gloom_stalker', nameRu: 'Сумрачный Охотник', nameEn: 'Gloom Stalker', descriptionRu: 'Засада в темноте, невидимость для темного зрения.' },
      { id: 'fey_wanderer', nameRu: 'Странник Фей', nameEn: 'Fey Wanderer', descriptionRu: 'Очарование фей, психический урон и дипломатия разума.' },
    ],
  },

  // 9. Плут (Rogue)
  {
    id: 'rogue',
    nameRu: 'Плут',
    nameEn: 'Rogue',
    hitDie: 'd8',
    hitDieValue: 8,
    savingThrows: ['dex', 'int'],
    armorProficiencies: ['light'],
    weaponProficiencies: ['Простое оружие', 'Воинское оружие со свойством Фехтовальное или Легкое'],
    casterType: 'none',
    weaponMasteriesCount: 2,
    skillCount: 4,
    availableSkills: [
      'Acrobatics',
      'Athletics',
      'Deception',
      'Insight',
      'Intimidation',
      'Investigation',
      'Perception',
      'Performance',
      'Persuasion',
      'Sleight of Hand',
      'Stealth',
    ],
    subclasses: [
      { id: 'thief', nameRu: 'Вор', nameEn: 'Thief', descriptionRu: 'Быстрые руки, использование предметов бонусным действием, взлом.' },
      { id: 'assassin', nameRu: 'Убийца', nameEn: 'Assassin', descriptionRu: 'Внезапность, критический урон при неожиданном нападении, яды.' },
      { id: 'arcane_trickster', nameRu: 'Мистический Ловкач', nameEn: 'Arcane Trickster', descriptionRu: 'Магическая рука, иллюзии и заговоры волшебника.' },
      { id: 'soulknife', nameRu: 'Клинок Души', nameEn: 'Soulknife', descriptionRu: 'Псионические клинки, телепатия и броски сквозь пространство.' },
    ],
  },

  // 10. Чародей (Sorcerer)
  {
    id: 'sorcerer',
    nameRu: 'Чародей',
    nameEn: 'Sorcerer',
    hitDie: 'd6',
    hitDieValue: 6,
    savingThrows: ['con', 'cha'],
    armorProficiencies: [],
    weaponProficiencies: ['Простое оружие'],
    casterType: 'full',
    spellcastingAbility: 'cha',
    skillCount: 2,
    availableSkills: [
      'Arcana',
      'Deception',
      'Insight',
      'Intimidation',
      'Persuasion',
      'Religion',
    ],
    subclasses: [
      { id: 'draconic', nameRu: 'Драконья Кровь', nameEn: 'Draconic Sorcery', descriptionRu: 'Драконья чешуя (+3 КД без брони, +1 ХП/ур.), полет и стихийный урон.' },
      { id: 'wild_magic', nameRu: 'Дикая Магия', nameEn: 'Wild Magic', descriptionRu: 'Всплески дикой магии, управление волнами вероятности.' },
      { id: 'aberrant_mind', nameRu: 'Аберрантный Разум', nameEn: 'Aberrant Mind', descriptionRu: 'Псионическая магия, телепатическая связь и искажение плоти.' },
      { id: 'clockwork_soul', nameRu: 'Заводная Душа', nameEn: 'Clockwork Soul', descriptionRu: 'Порядок Механуса, устранение преимущества/помех, щит времени.' },
    ],
  },

  // 11. Колдун (Warlock)
  {
    id: 'warlock',
    nameRu: 'Колдун',
    nameEn: 'Warlock',
    hitDie: 'd8',
    hitDieValue: 8,
    savingThrows: ['wis', 'cha'],
    armorProficiencies: ['light'],
    weaponProficiencies: ['Простое оружие'],
    casterType: 'pact',
    spellcastingAbility: 'cha',
    skillCount: 2,
    availableSkills: [
      'Arcana',
      'Deception',
      'History',
      'Intimidation',
      'Investigation',
      'Nature',
      'Religion',
    ],
    subclasses: [
      { id: 'fiend', nameRu: 'Исчадие', nameEn: 'Fiend Patron', descriptionRu: 'Благословение Темного, временные хиты за убийства, адское пламя.' },
      { id: 'archfey', nameRu: 'Архифея', nameEn: 'Archfey Patron', descriptionRu: 'Туманный шаг, очарование, телепортация при получении урона.' },
      { id: 'great_old_one', nameRu: 'Великий Древний', nameEn: 'Great Old One', descriptionRu: 'Телепатия, психический барьер и шепот безумия.' },
      { id: 'celestial', nameRu: 'Небожитель', nameEn: 'Celestial Patron', descriptionRu: 'Целебный свет (d6 исцеления), излучение и божественные пакты.' },
    ],
  },

  // 12. Волшебник (Wizard)
  {
    id: 'wizard',
    nameRu: 'Волшебник',
    nameEn: 'Wizard',
    hitDie: 'd6',
    hitDieValue: 6,
    savingThrows: ['int', 'wis'],
    armorProficiencies: [],
    weaponProficiencies: ['Простое оружие'],
    casterType: 'full',
    spellcastingAbility: 'int',
    skillCount: 2,
    availableSkills: [
      'Arcana',
      'History',
      'Insight',
      'Investigation',
      'Medicine',
      'Religion',
    ],
    subclasses: [
      { id: 'evocation', nameRu: 'Школа Воплощения', nameEn: 'Evoker', descriptionRu: 'Скульптор заклинаний (безопасные зоны для союзников), мощные взрывы.' },
      { id: 'abjuration', nameRu: 'Школа Ограждения', nameEn: 'Abjurer', descriptionRu: 'Магический щит ограждения, поглощающий урон союзников.' },
      { id: 'divination', nameRu: 'Школа Прорицания', nameEn: 'Diviner', descriptionRu: 'Кости знамения (Portent): замена бросков d20 на заготовленные числа.' },
      { id: 'illusion', nameRu: 'Школа Иллюзий', nameEn: 'Illusionist', descriptionRu: 'Улучшенная малая иллюзия, овеществление иллюзорных объектов.' },
    ],
  },
];
