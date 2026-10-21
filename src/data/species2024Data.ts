export interface SpeciesTrait {
  nameRu: string;
  nameEn?: string;
  descriptionRu: string;
  levelRequired?: number;
}

export interface SpeciesLineage {
  id: string;
  nameRu: string;
  nameEn?: string;
  descriptionRu: string;
  speedBonus?: number;
  darkvision?: number;
  spells?: string[];
  resistances?: string[];
  bonusAc?: number;
}

export interface Species2024 {
  id: string;
  nameRu: string;
  nameEn: string;
  creatureType: string;
  size: 'Medium' | 'Small' | 'Medium or Small';
  sizeRu: string;
  speed: number;
  climbSpeed?: number;
  swimSpeed?: number;
  flySpeed?: number;
  darkvision: number;
  traits: SpeciesTrait[];
  lineages?: SpeciesLineage[];
  resistances?: string[];
  defaultSkills?: string[];
  skillChoices?: {
    count: number;
    options?: string[];
  };
  bonusAc?: number;
  hpBonusPerLevel?: number;
  specialRules?: string[];
  source: string;
}

export const SPECIES_2024_DATA: Species2024[] = [
  // 1. Аасимар (Aasimar)
  {
    id: 'aasimar',
    nameRu: 'Аасимар',
    nameEn: 'Aasimar',
    creatureType: 'Гуманоид',
    size: 'Medium or Small',
    sizeRu: 'Средний или Маленький',
    speed: 30,
    darkvision: 60,
    resistances: ['Некротический', 'Излучение'],
    traits: [
      {
        nameRu: 'Небесное сопротивление',
        nameEn: 'Celestial Resistance',
        descriptionRu: 'Устойчивость к некротическому урону и урону излучением.',
      },
      {
        nameRu: 'Исцеляющие ладони',
        nameEn: 'Healing Hands',
        descriptionRu: 'Действием восстанавливает существу хиты (число костей d4 равно бонусу мастерства, 1 раз за долгий отдых).',
      },
      {
        nameRu: 'Несущий свет',
        nameEn: 'Light Bearer',
        descriptionRu: 'Знает заговор Свет (Light). Базовая характеристика: Харизма.',
      },
      {
        nameRu: 'Небесное откровение',
        nameEn: 'Celestial Revelation',
        levelRequired: 3,
        descriptionRu: 'Бонусным действием трансформация на 1 минуту (1 раз за долгий отдых): выбор формы сияния, крыльев или савана.',
      },
    ],
    lineages: [
      {
        id: 'radiant-wings',
        nameRu: 'Небесные крылья',
        nameEn: 'Heavenly Wings',
        descriptionRu: 'Скорость полета равна скорости ходьбы на время трансформации.',
      },
      {
        id: 'radiant-soul',
        nameRu: 'Внутреннее сияние',
        nameEn: 'Radiant Soul',
        descriptionRu: 'Раз за ход при нанесении урона наносит дополнительный урон излучением = бонусу мастерства; излучает яркий свет на 10 фт.',
      },
      {
        id: 'necrotic-shroud',
        nameRu: 'Некротический саван',
        nameEn: 'Necrotic Shroud',
        descriptionRu: 'Враги в пределах 10 футов совершают спасбросок Харизмы или становятся испуганными до конца вашего следующего хода; раз за ход дополнительный некротический урон = бонусу мастерства.',
      },
    ],
    source: 'PH24',
  },

  // 2. Ведьмовская кровь (Hexblood)
  {
    id: 'hexblood',
    nameRu: 'Ведьмовская кровь',
    nameEn: 'Hexblood',
    creatureType: 'Фея',
    size: 'Medium or Small',
    sizeRu: 'Средний или Маленький',
    speed: 30,
    darkvision: 60,
    traits: [
      {
        nameRu: 'Ведьмовская магия',
        nameEn: 'Hex Magic',
        descriptionRu: 'Заклинания Сглаз (Hex) и Маскировка (Disguise Self). Каждое можно сотворить 1 раз за долгий отдых без траты ячеек, а также используя ячейки заклинаний. Базовая характеристика: ИНТ, МУД или ХАР.',
      },
      {
        nameRu: 'Жуткий жетон',
        nameEn: 'Eerie Token',
        descriptionRu: 'Бонусным действием создает магический жетон (прядь волос, ноготь, зуб) на 24 часа. Позволяет отправлять телепатические сообщения до 10 миль и удаленно видеть/слышать область вокруг жетона.',
      },
      {
        nameRu: 'Наследие предков',
        nameEn: 'Ancestral Legacy',
        descriptionRu: 'Если персонаж становится Ведьмовской кровью, он сохраняет владение всеми навыками, а также скорость лазания, полета или плавания от исходной расы (либо получает 2 навыка на выбор).',
      },
    ],
    skillChoices: {
      count: 2,
    },
    specialRules: [
      'Правило перерождения: Ведьмовская кровь может сохранить скорости передвижения (лазание, плавание, полет) и навыки предка.',
    ],
    source: 'RTW',
  },

  // 3. Возрождённый (Reborn)
  {
    id: 'reborn',
    nameRu: 'Возрождённый',
    nameEn: 'Reborn',
    creatureType: 'Гуманоид',
    size: 'Medium or Small',
    sizeRu: 'Средний или Маленький',
    speed: 30,
    darkvision: 0,
    resistances: ['Яд'],
    traits: [
      {
        nameRu: 'Бессмертная природа',
        nameEn: 'Deathless Nature',
        descriptionRu: 'Преимущество на спасброски против яда, болезней и спасброски от смерти. Устойчивость к урону ядом. Не нуждается в еде, питье, сне и воздухе. Долгий отдых длится 4 часа неподвижного медитативного транса.',
      },
      {
        nameRu: 'Знания прошлой жизни',
        nameEn: 'Knowledge from a Past Life',
        descriptionRu: 'Совершая проверку навыка, может добавить бросок кости 1d6 к результату проверки. Число использований = бонусу мастерства за долгий отдых.',
      },
    ],
    source: 'RTW',
  },

  // 4. Волколак (Lupin)
  {
    id: 'lupin',
    nameRu: 'Волколак',
    nameEn: 'Lupin',
    creatureType: 'Гуманоид',
    size: 'Medium',
    sizeRu: 'Средний',
    speed: 35,
    darkvision: 60,
    traits: [
      {
        nameRu: 'Острый нюх и слух',
        nameEn: 'Keen Senses',
        descriptionRu: 'Преимущество на все проверки Внимательности (Восприятия), связанные со слухом и обонянием.',
      },
      {
        nameRu: 'Природное оружие: Укус',
        nameEn: 'Bite Attack',
        descriptionRu: 'Безоружная атака клыками наносит 1d6 + модификатор Силы или Ловкости колющего урона.',
      },
      {
        nameRu: 'Чутьё на ликантропов / Охотник на оборотней',
        nameEn: 'Lycanthrope Scent',
        descriptionRu: 'Преимущество на проверки Выживания для выслеживания ликантропов и нежити; устойчивость к естественным болезням и сопротивление проклятиям ликантропии.',
      },
    ],
    source: 'RTW',
  },

  // 5. Гном (Gnome)
  {
    id: 'gnome',
    nameRu: 'Гном',
    nameEn: 'Gnome',
    creatureType: 'Гуманоид',
    size: 'Small',
    sizeRu: 'Маленький',
    speed: 30,
    darkvision: 60,
    traits: [
      {
        nameRu: 'Гномья хитрость',
        nameEn: 'Gnomish Cunning',
        descriptionRu: 'Постоянное преимущество на все спасброски Интеллекта, Мудрости и Харизмы.',
      },
    ],
    lineages: [
      {
        id: 'forest-gnome',
        nameRu: 'Лесной гном',
        nameEn: 'Forest Gnome',
        descriptionRu: 'Знает заговор Малая иллюзия (Minor Illusion); творит заклинание Разговор с животными (Speak with Animals) без траты ячеек БМ раз за долгий отдых.',
        spells: ['Малая иллюзия', 'Разговор с животными'],
      },
      {
        id: 'rock-gnome',
        nameRu: 'Скальный гном',
        nameEn: 'Rock Gnome',
        descriptionRu: 'Знает заговоры Фокусы (Prestidigitation) и Починка (Mending); тратя 10 минут, может создавать миниатюрные заводные механизмы (музыкальная шкатулка, зажигалка, заводная игрушка).',
        spells: ['Фокусы', 'Починка'],
      },
    ],
    source: 'PH24',
  },

  // 6. Голиаф (Goliath)
  {
    id: 'goliath',
    nameRu: 'Голиаф',
    nameEn: 'Goliath',
    creatureType: 'Гуманоид',
    size: 'Medium',
    sizeRu: 'Средний',
    speed: 35,
    darkvision: 0,
    traits: [
      {
        nameRu: 'Мощное телосложение',
        nameEn: 'Powerful Build',
        descriptionRu: 'Считается на один размер больше при определении грузоподъемности и веса для толкания/подъема; преимущество на спасброски против захватов.',
      },
      {
        nameRu: 'Большая форма',
        nameEn: 'Large Form',
        levelRequired: 5,
        descriptionRu: 'С 5 уровня бонусным действием увеличивается до размера Большой (Large) на 10 минут. Скорость возрастает на +10 фт, проверки Силы совершаются с преимуществом (1 раз за долгий отдых).',
      },
    ],
    lineages: [
      {
        id: 'cloud-giant',
        nameRu: 'Облачный гигант',
        nameEn: 'Cloud Giant',
        descriptionRu: 'Бонусным действием телепортируется на расстояние до 30 футов в видимую свободную точку (БМ раз за долгий отдых).',
      },
      {
        id: 'fire-giant',
        nameRu: 'Огненный гигант',
        nameEn: 'Fire Giant',
        descriptionRu: 'При попадании атакой добавляет 1d10 огненного урона (БМ раз за долгий отдых).',
      },
      {
        id: 'frost-giant',
        nameRu: 'Морозный гигант',
        nameEn: 'Frost Giant',
        descriptionRu: 'При попадании атакой наносит 1d6 урона холодом и снижает скорость цели на 10 футов (БМ раз за долгий отдых).',
      },
      {
        id: 'hill-giant',
        nameRu: 'Холмовой гигант',
        nameEn: 'Hill Giant',
        descriptionRu: 'При попадании атакой сбивает цель размером Большой или меньше с ног без спасброска (БМ раз за долгий отдых).',
      },
      {
        id: 'stone-giant',
        nameRu: 'Каменный гигант',
        nameEn: 'Stone Giant',
        descriptionRu: 'Реакцией при получении урона снижает входящий урон на 1d12 + модификатор Телосложения (БМ раз за долгий отдых).',
      },
      {
        id: 'storm-giant',
        nameRu: 'Штормовой гигант',
        nameEn: 'Storm Giant',
        descriptionRu: 'Реакцией при получении урона от существа в пределах 60 футов наносит атакующему 1d8 урона громом (БМ раз за долгий отдых).',
      },
    ],
    source: 'PH24',
  },

  // 7. Дампир (Dhampir)
  {
    id: 'dhampir',
    nameRu: 'Дампир',
    nameEn: 'Dhampir',
    creatureType: 'Гуманоид',
    size: 'Medium or Small',
    sizeRu: 'Средний или Маленький',
    speed: 35,
    climbSpeed: 35,
    darkvision: 60,
    traits: [
      {
        nameRu: 'Паучье лазание',
        nameEn: 'Spider Climb',
        descriptionRu: 'Скорость лазания равна скорости ходьбы (35 фт). С 3-го уровня может перемещаться по вертикальным поверхностям и потолкам без помощи рук.',
      },
      {
        nameRu: 'Вампирский укус',
        nameEn: 'Vampiric Bite',
        descriptionRu: 'Атака клыками наносит 1d4 + ТЕЛ колющего урона (преимущество, если хиты цели ниже максимума). Позволяет восстановить хиты или получить бонус к следующей атаке/проверке (БМ раз за долгий отдых).',
      },
      {
        nameRu: 'Неживая природа',
        nameEn: 'Undead Nature',
        descriptionRu: 'Не нуждается в дыхании.',
      },
    ],
    source: 'RTW',
  },

  // 8. Дварф (Dwarf)
  {
    id: 'dwarf',
    nameRu: 'Дварф',
    nameEn: 'Dwarf',
    creatureType: 'Гуманоид',
    size: 'Medium',
    sizeRu: 'Средний',
    speed: 30,
    darkvision: 120,
    resistances: ['Яд'],
    hpBonusPerLevel: 1,
    traits: [
      {
        nameRu: 'Дварфская стойкость',
        nameEn: 'Dwarven Resilience',
        descriptionRu: 'Устойчивость к урону ядом, преимущество на спасброски против состояния Отравленный.',
      },
      {
        nameRu: 'Дварфская крепость',
        nameEn: 'Dwarven Toughness',
        descriptionRu: 'Максимум хитов увеличивается на +1 за каждый уровень персонажа.',
      },
      {
        nameRu: 'Знание камня',
        nameEn: 'Stonecunning',
        descriptionRu: 'Бонусным действием на каменной поверхности получает Чувство вибрации (Tremorsense) 60 футов на 10 минут (БМ раз за долгий отдых).',
      },
    ],
    source: 'PH24',
  },

  // 9. Драконорождённый (Dragonborn)
  {
    id: 'dragonborn',
    nameRu: 'Драконорождённый',
    nameEn: 'Dragonborn',
    creatureType: 'Гуманоид',
    size: 'Medium',
    sizeRu: 'Средний',
    speed: 30,
    darkvision: 60,
    traits: [
      {
        nameRu: 'Оружие дыхания',
        nameEn: 'Breath Weapon',
        descriptionRu: 'Вместо одной атаки действием Атака выдыхает разрушительную энергию (конус 15 фт или линия 30 фт). Урон: 1d10 на 1 ур., 2d10 на 5 ур., 3d10 на 11 ур., 4d10 на 17 ур. БМ раз за долгий отдых.',
      },
      {
        nameRu: 'Драконий полёт',
        nameEn: 'Draconic Flight',
        levelRequired: 5,
        descriptionRu: 'С 5 уровня бонусным действием расправляет призрачные драконьи крылья на 10 минут. Скорость полета равна скорости ходьбы (1 раз за долгий отдых).',
      },
    ],
    lineages: [
      { id: 'black', nameRu: 'Чёрный дракон (Кислота, линия 30 фт)', resistances: ['Кислота'], descriptionRu: 'Сопротивление кислоте. Линия 30 фт, спасбросок Ловкости.' },
      { id: 'blue', nameRu: 'Синий дракон (Молния, линия 30 фт)', resistances: ['Молния'], descriptionRu: 'Сопротивление молнии. Линия 30 фт, спасбросок Ловкости.' },
      { id: 'brass', nameRu: 'Латунный дракон (Огонь, линия 30 фт)', resistances: ['Огонь'], descriptionRu: 'Сопротивление огню. Линия 30 фт, спасбросок Ловкости.' },
      { id: 'bronze', nameRu: 'Бронзовый дракон (Молния, линия 30 фт)', resistances: ['Молния'], descriptionRu: 'Сопротивление молнии. Линия 30 фт, спасбросок Ловкости.' },
      { id: 'copper', nameRu: 'Медный дракон (Кислота, линия 30 фт)', resistances: ['Кислота'], descriptionRu: 'Сопротивление кислоте. Линия 30 фт, спасбросок Ловкости.' },
      { id: 'gold', nameRu: 'Золотой дракон (Огонь, конус 15 фт)', resistances: ['Огонь'], descriptionRu: 'Сопротивление огню. Конус 15 фт, спасбросок Ловкости.' },
      { id: 'green', nameRu: 'Зелёный дракон (Яд, конус 15 фт)', resistances: ['Яд'], descriptionRu: 'Сопротивление яду. Конус 15 фт, спасбросок Телосложения.' },
      { id: 'red', nameRu: 'Красный дракон (Огонь, конус 15 фт)', resistances: ['Огонь'], descriptionRu: 'Сопротивление огню. Конус 15 фт, спасбросок Ловкости.' },
      { id: 'silver', nameRu: 'Серебряный дракон (Холод, конус 15 фт)', resistances: ['Холод'], descriptionRu: 'Сопротивление холоду. Конус 15 фт, спасбросок Телосложения.' },
      { id: 'white', nameRu: 'Белый дракон (Холод, конус 15 фт)', resistances: ['Холод'], descriptionRu: 'Сопротивление холоду. Конус 15 фт, спасбросок Телосложения.' },
    ],
    source: 'PH24',
  },

  // 10. Калаштар (Kalashtar)
  {
    id: 'kalashtar',
    nameRu: 'Калаштар',
    nameEn: 'Kalashtar',
    creatureType: 'Гуманоид',
    size: 'Medium',
    sizeRu: 'Средний',
    speed: 30,
    darkvision: 0,
    resistances: ['Психический'],
    traits: [
      {
        nameRu: 'Двойной разум',
        nameEn: 'Dual Mind',
        descriptionRu: 'Постоянное преимущество на все спасброски Мудрости.',
      },
      {
        nameRu: 'Ментальная связь',
        nameEn: 'Mind Link',
        descriptionRu: 'Телепатическая связь с любым видимым существом на расстояние до (10 × уровень персонажа) футов.',
      },
      {
        nameRu: 'Психический щит',
        nameEn: 'Severed from Dreams',
        descriptionRu: 'Постоянное сопротивление психическому урону; иммунитет к эффектам и заклинаниям усыпления или вторжения в сны.',
      },
    ],
    source: 'EFA',
  },

  // 11. Кованый (Warforged)
  {
    id: 'warforged',
    nameRu: 'Кованый',
    nameEn: 'Warforged',
    creatureType: 'Гуманоид',
    size: 'Medium',
    sizeRu: 'Средний',
    speed: 30,
    darkvision: 0,
    resistances: ['Яд'],
    bonusAc: 1,
    traits: [
      {
        nameRu: 'Сконструированная стойкость',
        nameEn: 'Constructed Resilience',
        descriptionRu: 'Преимущество на спасброски против отравления, устойчивость к урону ядом. Иммунитет к болезням. Не нуждается в еде, питье, сне и воздухе.',
      },
      {
        nameRu: 'Режим часового',
        nameEn: "Sentry's Rest",
        descriptionRu: 'Долгий отдых длится 6 часов неподвижного дежурства при сохранении зрения и слуха.',
      },
      {
        nameRu: 'Встроенная защита',
        nameEn: 'Integrated Protection',
        descriptionRu: 'Постоянный бонус +1 к Классу Доспехов (КД). Надеваемый доспех интегрируется в тело в течение 1 часа.',
      },
      {
        nameRu: 'Специализированная конструкция',
        nameEn: 'Specialized Design',
        descriptionRu: 'Владение 1 навыком и 1 ремесленным инструментом на выбор.',
      },
    ],
    skillChoices: {
      count: 1,
    },
    source: 'EFA',
  },

  // 12. Кхоравар (Khoravar)
  {
    id: 'khoravar',
    nameRu: 'Кхоравар',
    nameEn: 'Khoravar',
    creatureType: 'Гуманоид',
    size: 'Medium',
    sizeRu: 'Средний',
    speed: 30,
    darkvision: 60,
    traits: [
      {
        nameRu: 'Наследие фей',
        nameEn: 'Fey Ancestry',
        descriptionRu: 'Преимущество на спасброски против состояния Очарованный, магия не может усыпить.',
      },
      {
        nameRu: 'Универсальность навыков',
        nameEn: 'Skill Versatility',
        descriptionRu: 'Владение двумя любыми навыками по выбору игрока.',
      },
      {
        nameRu: 'Метки Дракона Эберрона',
        nameEn: 'Dragonmarks of Eberron',
        descriptionRu: 'Наследственная связь с домами драконьих меток Эберрона.',
      },
    ],
    skillChoices: {
      count: 2,
    },
    lineages: [
      {
        id: 'mark-storm',
        nameRu: 'Метка Шторма (House Lyrandar)',
        nameEn: 'Mark of Storm',
        descriptionRu: 'Связь с ветрами и морем, сопротивление урону молнией.',
        resistances: ['Молния'],
      },
      {
        id: 'mark-detection',
        nameRu: 'Метка Обнаружения (House Medani)',
        nameEn: 'Mark of Detection',
        descriptionRu: 'Бонус к проверкам Анализа и Внимательности, выявление тайных угроз.',
      },
      {
        id: 'mark-shadow',
        nameRu: 'Метка Тени (House Phiarlan)',
        nameEn: 'Mark of Shadow',
        descriptionRu: 'Бонус к Скрытности и Обману, магия иллюзий и сокрытия.',
      },
    ],
    source: 'EFA',
  },

  // 13. Орк (Orc)
  {
    id: 'orc',
    nameRu: 'Орк',
    nameEn: 'Orc',
    creatureType: 'Гуманоид',
    size: 'Medium',
    sizeRu: 'Средний',
    speed: 30,
    darkvision: 120,
    traits: [
      {
        nameRu: 'Адреналиновый рывок',
        nameEn: 'Adrenaline Rush',
        descriptionRu: 'Бонусным действием совершает Рывок (Dash). При этом получает временные хиты = бонусу мастерства. Использования = бонусу мастерства за долгий отдых.',
      },
      {
        nameRu: 'Несгибаемая стойкость',
        nameEn: 'Relentless Endurance',
        descriptionRu: 'Когда хиты опускаются до 0, но персонаж не погибает мгновенно, хиты становятся равны 1 (1 раз за долгий отдых).',
      },
      {
        nameRu: 'Мощное телосложение',
        nameEn: 'Powerful Build',
        descriptionRu: 'Удвоение грузоподъемности; преимущество на спасброски против захватов.',
      },
    ],
    source: 'PH24',
  },

  // 14. Полурослик (Halfling)
  {
    id: 'halfling',
    nameRu: 'Полурослик',
    nameEn: 'Halfling',
    creatureType: 'Гуманоид',
    size: 'Small',
    sizeRu: 'Маленький',
    speed: 30,
    darkvision: 0,
    traits: [
      {
        nameRu: 'Везучий',
        nameEn: 'Lucky',
        descriptionRu: 'При выпадении 1 на d20 при броске атаки, проверке характеристики или спасброске может перебросить кость и обязан использовать новый результат.',
      },
      {
        nameRu: 'Храбрый',
        nameEn: 'Brave',
        descriptionRu: 'Преимущество на спасброски против состояния Испуганный.',
      },
      {
        nameRu: 'Проворство полуросликов',
        nameEn: 'Halfling Nimbleness',
        descriptionRu: 'Может свободно проходить сквозь пространство любого существа, чей размер больше его собственного.',
      },
      {
        nameRu: 'Природная скрытность',
        nameEn: 'Naturally Stealthy',
        descriptionRu: 'Может спрятаться за спиной существа, которое как минимум на один размер больше него.',
      },
    ],
    source: 'PH24',
  },

  // 15. Тифлинг (Tiefling)
  {
    id: 'tiefling',
    nameRu: 'Тифлинг',
    nameEn: 'Tiefling',
    creatureType: 'Гуманоид',
    size: 'Medium or Small',
    sizeRu: 'Средний или Маленький',
    speed: 30,
    darkvision: 60,
    traits: [
      {
        nameRu: 'Потустороннее присутствие',
        nameEn: 'Otherworldly Presence',
        descriptionRu: 'Знает заговор Тауматургия (Thaumaturgy).',
      },
    ],
    lineages: [
      {
        id: 'abyssal',
        nameRu: 'Бездненный (Abyssal)',
        nameEn: 'Abyssal',
        resistances: ['Яд'],
        spells: ['Брызги яда', 'Луч болезни (3 ур.)', 'Удержание персоны (5 ур.)'],
        descriptionRu: 'Сопротивление яду. Заговор Брызги яда (Poison Spray), заклинания Луч болезни на 3 ур., Удержание персоны на 5 ур.',
      },
      {
        id: 'chthonic',
        nameRu: 'Хтонический (Chthonic)',
        nameEn: 'Chthonic',
        resistances: ['Некротический'],
        spells: ['Увядание', 'Ложная жизнь (3 ур.)', 'Луч истощения (5 ур.)'],
        descriptionRu: 'Сопротивление некротическому урону. Заговор Увядание (Chill Touch), заклинания Ложная жизнь на 3 ур., Луч истощения на 5 ур.',
      },
      {
        id: 'infernal',
        nameRu: 'Инфернальный (Infernal)',
        nameEn: 'Infernal',
        resistances: ['Огонь'],
        spells: ['Огненный снаряд', 'Адское возмездие (3 ур.)', 'Тьма (5 ур.)'],
        descriptionRu: 'Сопротивление урону огнем. Заговор Огненный снаряд (Fire Bolt), заклинания Адское возмездие на 3 ур., Тьма на 5 ур.',
      },
    ],
    source: 'PH24',
  },

  // 16. Человек (Human)
  {
    id: 'human',
    nameRu: 'Человек',
    nameEn: 'Human',
    creatureType: 'Гуманоид',
    size: 'Medium or Small',
    sizeRu: 'Средний или Маленький',
    speed: 30,
    darkvision: 0,
    traits: [
      {
        nameRu: 'Находчивость',
        nameEn: 'Resourceful',
        descriptionRu: 'Получает статус Героического вдохновения (Heroic Inspiration) в конце каждого долгого отдыха.',
      },
      {
        nameRu: 'Мастерство',
        nameEn: 'Skillful',
        descriptionRu: 'Владение 1 дополнительным навыком по выбору игрока.',
      },
      {
        nameRu: 'Черта происхождения',
        nameEn: 'Origin Feat',
        descriptionRu: 'Получает 1 дополнительную черту 1-го уровня по выбору игрока (например, Бдительный, Счастливчик, Магия стихий, Крепкий).',
      },
    ],
    skillChoices: {
      count: 1,
    },
    source: 'PH24',
  },

  // 17. Ченжлинг / Перевёртыш (Changeling)
  {
    id: 'changeling',
    nameRu: 'Ченжлинг (Перевёртыш)',
    nameEn: 'Changeling',
    creatureType: 'Фея или Гуманоид',
    size: 'Medium or Small',
    sizeRu: 'Средний или Маленький',
    speed: 30,
    darkvision: 0,
    traits: [
      {
        nameRu: 'Смена облика',
        nameEn: 'Shapechanger',
        descriptionRu: 'Действием может полностью изменить свою внешность, рост, вес, черты лица, голос и цвет кожи на любого гуманоида того же размера. Форма физическая и сохраняется до отмены или смерти.',
      },
      {
        nameRu: 'Инстинкты подмены',
        nameEn: 'Changeling Instincts',
        descriptionRu: 'Владение двумя навыками на выбор: Обман, Запугивание, Проницательность или Убеждение.',
      },
    ],
    skillChoices: {
      count: 2,
      options: ['Deception', 'Intimidation', 'Insight', 'Persuasion'],
    },
    source: 'EFA',
  },

  // 18. Шифтер (Shifter)
  {
    id: 'shifter',
    nameRu: 'Шифтер',
    nameEn: 'Shifter',
    creatureType: 'Гуманоид',
    size: 'Medium',
    sizeRu: 'Средний',
    speed: 30,
    darkvision: 60,
    traits: [
      {
        nameRu: 'Звериная трансформация',
        nameEn: 'Shifting',
        descriptionRu: 'Бонусным действием на 1 минуту пробуждает звериную форму (БМ раз за долгий отдых). Дарует временные хиты = (2 × бонус мастерства) и черту подрасы.',
      },
    ],
    lineages: [
      {
        id: 'beasthide',
        nameRu: 'Звериная шкура (Beasthide)',
        nameEn: 'Beasthide',
        bonusAc: 1,
        descriptionRu: 'Бонус +1 к КД и дополнительно 1d6 временных хитов при входе в трансформацию.',
      },
      {
        id: 'longtooth',
        nameRu: 'Длиннозубый (Longtooth)',
        nameEn: 'Longtooth',
        descriptionRu: 'Бонусным действием в каждый ход может атаковать укусом (1d6 + СИЛ колющего урона).',
      },
      {
        id: 'swiftstride',
        nameRu: 'Стремительный (Swiftstride)',
        nameEn: 'Swiftstride',
        speedBonus: 10,
        descriptionRu: 'Скорость перемещения увеличивается на +10 футов; реакцией может отойти на 10 футов без провокации атаки.',
      },
      {
        id: 'wildhunt',
        nameRu: 'Дикая охота (Wildhunt)',
        nameEn: 'Wildhunt',
        descriptionRu: 'Преимущество на все проверки Мудрости; ни одно существо в пределах 30 футов не может атаковать вас с преимуществом.',
      },
    ],
    source: 'EFA',
  },

  // 19. Эльф (Elf)
  {
    id: 'elf',
    nameRu: 'Эльф',
    nameEn: 'Elf',
    creatureType: 'Гуманоид',
    size: 'Medium',
    sizeRu: 'Средний',
    speed: 30,
    darkvision: 60,
    defaultSkills: ['Perception'],
    traits: [
      {
        nameRu: 'Наследие фей',
        nameEn: 'Fey Ancestry',
        descriptionRu: 'Преимущество на спасброски против состояния Очарованный, магия не может усыпить.',
      },
      {
        nameRu: 'Обостренные чувства',
        nameEn: 'Keen Senses',
        descriptionRu: 'Постоянное владение навыком Внимательность (Perception).',
      },
      {
        nameRu: 'Транс',
        nameEn: 'Trance',
        descriptionRu: 'Не нуждается во сне. Долгий отдых завершается за 4 часа неподвижной медитации.',
      },
    ],
    lineages: [
      {
        id: 'drow',
        nameRu: 'Дроу (Drow)',
        nameEn: 'Drow',
        darkvision: 120,
        spells: ['Пляшущие огоньки', 'Огонь фей (3 ур.)', 'Тьма (5 ур.)'],
        descriptionRu: 'Тёмное зрение 120 футов. Заговор Пляшущие огоньки, заклинания Огонь фей на 3 ур., Тьма на 5 ур.',
      },
      {
        id: 'high-elf',
        nameRu: 'Высший эльф (High Elf)',
        nameEn: 'High Elf',
        spells: ['Заговор волшебника на выбор', 'Обнаружение магии (3 ур.)', 'Туманный шаг (5 ур.)'],
        descriptionRu: 'Знает 1 заговор волшебника (можно менять после долгого отдыха); заклинания Обнаружение магии на 3 ур., Туманный шаг на 5 ур.',
      },
      {
        id: 'wood-elf',
        nameRu: 'Лесной эльф (Wood Elf)',
        nameEn: 'Wood Elf',
        speedBonus: 5,
        spells: ['Искусство друидов', 'Длинный шаг (3 ур.)', 'Бесследное передвижение (5 ур.)'],
        descriptionRu: 'Базовая скорость ходьбы 35 футов. Заговор Искусство друидов, заклинания Длинный шаг на 3 ур., Бесследное передвижение на 5 ур.',
      },
    ],
    source: 'PH24',
  },
];
