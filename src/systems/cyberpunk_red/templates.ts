/**
 * TTRPG Helper - Cyberpunk RED Starter NPC Templates
 * 25 Archetype Statblocks across Night City factions, roles, and threat levels.
 */

import { UniversalCreature, CreatureAction } from '../../types/system';

interface TemplateConfig {
  id: string;
  name: string;
  role: string;
  stats: {
    int: number;
    ref: number;
    dex: number;
    tech: number;
    cool: number;
    will: number;
    luck: number;
    move: number;
    body: number;
    emp: number;
  };
  headSp: number;
  bodySp: number;
  actions: CreatureAction[];
  notes: string;
}

function calculateCprHp(body: number, will: number): number {
  return 10 + 5 * Math.ceil((body + will) / 2);
}

function createTemplate(cfg: TemplateConfig): UniversalCreature {
  const hp = calculateCprHp(cfg.stats.body, cfg.stats.will);
  const humanity = cfg.stats.emp * 10;

  return {
    id: cfg.id,
    name: cfg.name,
    systemId: 'cyberpunk_red',
    systemVersion: '1.0.0',
    isPlayer: false,
    stats: {
      int: cfg.stats.int,
      ref: cfg.stats.ref,
      dex: cfg.stats.dex,
      tech: cfg.stats.tech,
      cool: cfg.stats.cool,
      will: cfg.stats.will,
      luck: cfg.stats.luck,
      move: cfg.stats.move,
      body: cfg.stats.body,
      emp: cfg.stats.emp,
      hp,
      maxHp: hp,
      headSp: cfg.headSp,
      bodySp: cfg.bodySp,
      spHead: cfg.headSp,
      spBody: cfg.bodySp,
      initiative: cfg.stats.ref,
      initBonus: cfg.stats.ref,
      evasion: cfg.stats.dex + 2,
      ac: 10 + cfg.stats.dex,
      speed: cfg.stats.move * 2,
    },
    resources: {
      hp: { current: hp, max: hp, resetOn: 'dawn' },
      humanity: { current: humanity, max: humanity },
      luck: { current: cfg.stats.luck, max: cfg.stats.luck },
      spHead: { current: cfg.headSp, max: cfg.headSp },
      spBody: { current: cfg.bodySp, max: cfg.bodySp },
    },
    tracks: {
      deathSaves: {
        name: 'Death Saves',
        current: 0,
        max: 10,
        steps: [
          { index: 1, label: 'Round 1' },
          { index: 2, label: 'Round 2 (+1)' },
          { index: 3, label: 'Round 3 (+2)' },
        ],
      },
    },
    conditions: [],
    defenses: {
      damageImmunities: [],
      damageResistances: [],
      damageVulnerabilities: [],
      conditionImmunities: [],
      damageReductions: {
        head: cfg.headSp,
        body: cfg.bodySp,
      },
    },
    actions: cfg.actions,
    senses: {},
    speeds: {
      walk: cfg.stats.move * 2,
    },
    notes: cfg.notes,
    customFields: {
      role: cfg.role,
      archetype: cfg.id,
    },
  };
}

export const CYBERPUNK_STARTER_NPCS: Record<string, UniversalCreature> = {
  // 1. Boosterganger
  boosterganger: createTemplate({
    id: 'boosterganger',
    name: 'Бустергенгер (Boosterganger)',
    role: 'Ganger',
    stats: { int: 3, ref: 6, dex: 6, tech: 3, cool: 4, will: 4, luck: 2, move: 6, body: 6, emp: 3 },
    headSp: 4,
    bodySp: 4,
    actions: [
      {
        id: 'rippers',
        name: 'Лезвия-Потрошители (Ripper Blades)',
        actionType: 'action',
        attackBonus: 10,
        damageDice: '2d6',
        damageType: 'slashing',
        description: 'Имплантированные когти в кончиках пальцев.',
      },
      {
        id: 'smg_light',
        name: 'Лёгкий ПП (Light SMG)',
        actionType: 'action',
        attackBonus: 10,
        damageDice: '2d6',
        damageType: 'kinetic',
        description: 'Скорострельный пистолет-пулемёт ближнего боя.',
      },
    ],
    notes: 'Уличный головорез с дешёвым хромом и агрессивным поведением.',
  }),

  // 2. Solo
  solo_veteran: createTemplate({
    id: 'solo_veteran',
    name: 'Ветеран-Соло (Solo Veteran)',
    role: 'Solo',
    stats: { int: 6, ref: 8, dex: 7, tech: 5, cool: 7, will: 7, luck: 5, move: 6, body: 8, emp: 4 },
    headSp: 11,
    bodySp: 11,
    actions: [
      {
        id: 'assault_rifle',
        name: 'Штурмовая винтовка (Assault Rifle)',
        actionType: 'action',
        attackBonus: 14,
        damageDice: '5d6',
        damageType: 'kinetic',
        description: 'Высокоточное армейское оружие с оптическим прицелом.',
      },
      {
        id: 'heavy_pistol',
        name: 'Тяжёлый пистолет (Heavy Pistol)',
        actionType: 'action',
        attackBonus: 13,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Крупнокалиберный личный сайдарм Solo.',
      },
    ],
    notes: 'Закалённый корпоративными войнами наёмник, мастер боевого искусства Combat Awareness.',
  }),

  // 3. Netrunner
  netrunner: createTemplate({
    id: 'netrunner',
    name: 'Нетраннер (Netrunner)',
    role: 'Netrunner',
    stats: { int: 8, ref: 6, dex: 6, tech: 7, cool: 6, will: 6, luck: 4, move: 5, body: 5, emp: 5 },
    headSp: 7,
    bodySp: 7,
    actions: [
      {
        id: 'neural_shock',
        name: 'Нейрошок (Neural Shock Virus)',
        actionType: 'action',
        attackBonus: 14,
        damageDice: '3d6',
        damageType: 'electrical',
        description: 'Взлом нейролинка цели через интерфейс кибердеки.',
      },
      {
        id: 'heavy_pistol',
        name: 'Тяжёлый пистолет (Heavy Pistol)',
        actionType: 'action',
        attackBonus: 10,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Оружие самообороны на случай отключения от Сети.',
      },
    ],
    notes: 'Хакер Сети с кибердекой Cybermod 2000 и глубокими нейроинтерфейсами.',
  }),

  // 4. Tech
  tech_specialist: createTemplate({
    id: 'tech_specialist',
    name: 'Полевой техник (Tech Specialist)',
    role: 'Tech',
    stats: { int: 7, ref: 6, dex: 6, tech: 8, cool: 5, will: 6, luck: 4, move: 5, body: 6, emp: 5 },
    headSp: 7,
    bodySp: 7,
    actions: [
      {
        id: 'shotgun',
        name: 'Дробовик (Shotgun)',
        actionType: 'action',
        attackBonus: 11,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Помповый дробовик калибра 12G.',
      },
      {
        id: 'cyberarm_tool',
        name: 'Инструментальная киберрука (Cyberarm Tool)',
        actionType: 'action',
        attackBonus: 10,
        damageDice: '2d6',
        damageType: 'bludgeoning',
        description: 'Гидравлический манипулятор со сварочной горелкой.',
      },
    ],
    notes: 'Инженер-изобретатель, способный починить или модифицировать любую технику под огнём.',
  }),

  // 5. Nomad
  nomad_outrider: createTemplate({
    id: 'nomad_outrider',
    name: 'Следопыт клана (Nomad Outrider)',
    role: 'Nomad',
    stats: { int: 5, ref: 8, dex: 7, tech: 6, cool: 6, will: 6, luck: 5, move: 7, body: 7, emp: 5 },
    headSp: 11,
    bodySp: 11,
    actions: [
      {
        id: 'heavy_pistol',
        name: 'Тяжёлый револьвер (Heavy Revolver)',
        actionType: 'action',
        attackBonus: 13,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Надёжный револьвер Пустошей.',
      },
      {
        id: 'combat_knife',
        name: 'Боевой нож (Combat Knife)',
        actionType: 'action',
        attackBonus: 12,
        damageDice: '1d6',
        damageType: 'piercing',
        description: 'Охотничий нож из закалённого карбида.',
      },
    ],
    notes: 'Боец клана Пустошей, мастер вождения и конвойного сопровождения (Moto).',
  }),

  // 6. Cop / Lawman
  cop_patrol: createTemplate({
    id: 'cop_patrol',
    name: 'Офицер полиции NCPD (NCPD Beat Cop)',
    role: 'Lawman',
    stats: { int: 5, ref: 7, dex: 6, tech: 4, cool: 6, will: 6, luck: 3, move: 6, body: 7, emp: 5 },
    headSp: 11,
    bodySp: 11,
    actions: [
      {
        id: 'heavy_pistol',
        name: 'Табельный пистолет (Service Heavy Pistol)',
        actionType: 'action',
        attackBonus: 12,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Стандартный табельный пистолет NCPD с лазерным целеуказателем.',
      },
      {
        id: 'stun_baton',
        name: 'Электродубинка (Stun Baton)',
        actionType: 'action',
        attackBonus: 11,
        damageDice: '2d6',
        damageType: 'electrical',
        description: 'Шоковое нелетальное спецсредство.',
      },
    ],
    notes: 'Патрульный полицейский Night City, способный вызвать подкрепление Backup.',
  }),

  // 7. Fixer
  fixer_broker: createTemplate({
    id: 'fixer_broker',
    name: 'Уличный фиксер (Fixer Broker)',
    role: 'Fixer',
    stats: { int: 7, ref: 6, dex: 6, tech: 4, cool: 8, will: 7, luck: 6, move: 5, body: 5, emp: 7 },
    headSp: 7,
    bodySp: 7,
    actions: [
      {
        id: 'very_heavy_pistol',
        name: 'Очень тяжёлый пистолет (Very Heavy Pistol)',
        actionType: 'action',
        attackBonus: 11,
        damageDice: '4d6',
        damageType: 'kinetic',
        description: 'Скрытый хромированный монстр калибра .454 Casull.',
      },
    ],
    notes: 'Торговец информацией и контрактами, связи на всех уровнях мегаполиса.',
  }),

  // 8. Cyberpsycho
  cyberpsycho: createTemplate({
    id: 'cyberpsycho',
    name: 'Киберпсихопат (Cyberpsycho)',
    role: 'Cyberpsycho',
    stats: { int: 3, ref: 8, dex: 8, tech: 4, cool: 2, will: 8, luck: 1, move: 7, body: 11, emp: 0 },
    headSp: 14,
    bodySp: 14,
    actions: [
      {
        id: 'gorilla_arms',
        name: 'Руки-Гориллы (Gorilla Arms Heavy Slam)',
        actionType: 'action',
        attackBonus: 15,
        damageDice: '4d6',
        damageType: 'bludgeoning',
        description: 'Сокрушительный удар гидравлическими киберруками.',
      },
      {
        id: 'heavy_lmg',
        name: 'Тяжёлый пулемёт (Heavy LMG)',
        actionType: 'action',
        attackBonus: 14,
        damageDice: '5d6',
        damageType: 'kinetic',
        description: 'Шквал пуль из тяжелого пулемёта с ленточной подачей.',
      },
    ],
    notes: 'Человек, потерявший рассудок из-за чрезмерной киберизации. Угроза наивысшего приоритета MaxTac.',
  }),

  // 9. Corp Security
  corp_security: createTemplate({
    id: 'corp_security',
    name: 'Корпоративный оперативник (Corp Security Guard)',
    role: 'Security',
    stats: { int: 5, ref: 7, dex: 6, tech: 5, cool: 6, will: 6, luck: 3, move: 6, body: 7, emp: 4 },
    headSp: 11,
    bodySp: 11,
    actions: [
      {
        id: 'tactical_smg',
        name: 'Тактический ПП (Tactical SMG)',
        actionType: 'action',
        attackBonus: 12,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Автоматическое корпоративное оружие средней дальности.',
      },
      {
        id: 'shock_baton',
        name: 'Шоковая дубинка (Shock Baton)',
        actionType: 'action',
        attackBonus: 10,
        damageDice: '2d6',
        damageType: 'electrical',
        description: 'Тактический нейтрализатор нарушителей.',
      },
    ],
    notes: 'Служба безопасности мегакорпорации (Militech / Arasaka / Kang Tao).',
  }),

  // 10. Medtech
  medtech_street: createTemplate({
    id: 'medtech_street',
    name: 'Уличный медтех (Street Medtech)',
    role: 'Medtech',
    stats: { int: 8, ref: 6, dex: 6, tech: 8, cool: 6, will: 6, luck: 4, move: 5, body: 5, emp: 6 },
    headSp: 7,
    bodySp: 7,
    actions: [
      {
        id: 'dartgun',
        name: 'Фармацевтический пистолет (Dartgun)',
        actionType: 'action',
        attackBonus: 11,
        damageDice: '2d6',
        damageType: 'piercing',
        description: 'Стреляет дротиками с транквилизаторами или токсинами.',
      },
      {
        id: 'cryo_stabilizer',
        name: 'Криостабилизатор (Cryopump Kit)',
        actionType: 'action',
        attackBonus: 0,
        damageDice: '0',
        damageType: 'healing',
        description: 'Стабилизирует смертельно раненого пациента в полевых условиях.',
      },
    ],
    notes: 'Полевой медик скорой помощи, знаток имплантов и фармацевтики.',
  }),

  // 11. Rockerboy
  rockerboy_rebel: createTemplate({
    id: 'rockerboy_rebel',
    name: 'Бунтарь-Рокербой (Rockerboy Rebel)',
    role: 'Rockerboy',
    stats: { int: 5, ref: 6, dex: 7, tech: 4, cool: 8, will: 7, luck: 6, move: 6, body: 5, emp: 7 },
    headSp: 4,
    bodySp: 4,
    actions: [
      {
        id: 'heavy_pistol',
        name: 'Хромированный пистолет (Chromed Heavy Pistol)',
        actionType: 'action',
        attackBonus: 11,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Эффектный пистолет со светящимися неоновыми гравировками.',
      },
    ],
    notes: 'Лидер протеста, поднимающий толпы людей на восстание силой харизмы (Charismatic Impact).',
  }),

  // 12. Media
  media_reporter: createTemplate({
    id: 'media_reporter',
    name: 'Репортёр расследований (Media Investigator)',
    role: 'Media',
    stats: { int: 8, ref: 5, dex: 6, tech: 5, cool: 7, will: 6, luck: 5, move: 5, body: 4, emp: 6 },
    headSp: 4,
    bodySp: 4,
    actions: [
      {
        id: 'medium_pistol',
        name: 'Компактный пистолет (Concealed Medium Pistol)',
        actionType: 'action',
        attackBonus: 9,
        damageDice: '2d6',
        damageType: 'kinetic',
        description: 'Скрытый пистолет в наплечной кобуре.',
      },
    ],
    notes: 'Журналист, охотящийся за грязными тайнами корпораций (Credibility).',
  }),

  // 13. Exec
  exec_manager: createTemplate({
    id: 'exec_manager',
    name: 'Корпоративный менеджер (Exec Junior)',
    role: 'Exec',
    stats: { int: 7, ref: 5, dex: 5, tech: 4, cool: 8, will: 6, luck: 5, move: 5, body: 4, emp: 6 },
    headSp: 7,
    bodySp: 7,
    actions: [
      {
        id: 'smart_pistol',
        name: 'Смарт-пистолет (Executive Smart Pistol)',
        actionType: 'action',
        attackBonus: 11,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Пистолет с автоприцелом через корпоративный смартлинк.',
      },
    ],
    notes: 'Менеджер среднего звена с корпоративным счётом и телохранителями на связи.',
  }),

  // 14. Exec Bodyguard
  exec_bodyguard: createTemplate({
    id: 'exec_bodyguard',
    name: 'Телохранитель топ-менеджера (Exec Bodyguard)',
    role: 'Solo',
    stats: { int: 5, ref: 7, dex: 7, tech: 4, cool: 7, will: 7, luck: 3, move: 6, body: 8, emp: 4 },
    headSp: 11,
    bodySp: 11,
    actions: [
      {
        id: 'heavy_smg',
        name: 'Тяжёлый ПП (Heavy SMG)',
        actionType: 'action',
        attackBonus: 13,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Оружие плотного огня для подавления нападающих.',
      },
      {
        id: 'knife',
        name: 'Тактический нож (Tactical Knife)',
        actionType: 'action',
        attackBonus: 12,
        damageDice: '1d6',
        damageType: 'piercing',
        description: 'Керамическое лезвие для ближнего боя.',
      },
    ],
    notes: 'Профессиональный щит руководства, готовый закрыть цель своим телом.',
  }),

  // 15. Street Punk
  street_punk: createTemplate({
    id: 'street_punk',
    name: 'Уличный панк (Street Punk)',
    role: 'Ganger',
    stats: { int: 4, ref: 5, dex: 5, tech: 3, cool: 4, will: 4, luck: 2, move: 6, body: 5, emp: 5 },
    headSp: 4,
    bodySp: 4,
    actions: [
      {
        id: 'baseball_bat',
        name: 'Бита с гвоздями (Nailed Bat)',
        actionType: 'action',
        attackBonus: 9,
        damageDice: '2d6',
        damageType: 'bludgeoning',
        description: 'Самодельное дробящее оружие.',
      },
      {
        id: 'light_pistol',
        name: 'Лёгкий пистолет (Light Pistol 9mm)',
        actionType: 'action',
        attackBonus: 8,
        damageDice: '1d6',
        damageType: 'kinetic',
        description: 'Дешёвый одноразовый пистолет уличной сборки.',
      },
    ],
    notes: 'Молодой уличный бродяга, ищущий легкой наживы в трущобах.',
  }),

  // 16. Arasaka Ninja
  arasaka_ninja: createTemplate({
    id: 'arasaka_ninja',
    name: 'Штурмовик Арасака (Arasaka Black Ops Agent)',
    role: 'Solo',
    stats: { int: 6, ref: 8, dex: 8, tech: 6, cool: 7, will: 7, luck: 4, move: 7, body: 7, emp: 3 },
    headSp: 11,
    bodySp: 11,
    actions: [
      {
        id: 'monokatana',
        name: 'Монокатана (Monokatana)',
        actionType: 'action',
        attackBonus: 15,
        damageDice: '4d6',
        damageType: 'slashing',
        description: 'Лезвие с молекулярной заточкой, рассекающее броню.',
      },
      {
        id: 'smart_smg',
        name: 'Смарт-ПП Arasaka (Smart SMG)',
        actionType: 'action',
        attackBonus: 14,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Высокотехнологичный скорострельный автомат с трекингом пуль.',
      },
    ],
    notes: 'Элитный оперативник корпорации Arasaka с оптическим камуфляжем.',
  }),

  // 17. Militech Trooper
  militech_heavy_trooper: createTemplate({
    id: 'militech_heavy_trooper',
    name: 'Тяжёлый штурмовик Militech (Militech Heavy Trooper)',
    role: 'Solo',
    stats: { int: 5, ref: 7, dex: 6, tech: 5, cool: 6, will: 7, luck: 2, move: 5, body: 10, emp: 2 },
    headSp: 15,
    bodySp: 15,
    actions: [
      {
        id: 'assault_rifle_heavy',
        name: 'Армейская винтовка Militech (Heavy Assault Rifle)',
        actionType: 'action',
        attackBonus: 13,
        damageDice: '5d6',
        damageType: 'kinetic',
        description: 'Тяжёлое автоматическое армейское оружие.',
      },
      {
        id: 'frag_grenade',
        name: 'Осколочная граната (Frag Grenade)',
        actionType: 'action',
        attackBonus: 11,
        damageDice: '6d6',
        damageType: 'explosive',
        description: 'Радиус взрыва 10м.',
      },
    ],
    notes: 'Штурмовик в тяжёлой броне Metalgear, подавляющий любые очаги сопротивления.',
  }),

  // 18. Trauma Team Paramedic
  trauma_team_paramedic: createTemplate({
    id: 'trauma_team_paramedic',
    name: 'Боевой парамедик TT (Trauma Team Paramedic)',
    role: 'Medtech',
    stats: { int: 7, ref: 7, dex: 6, tech: 7, cool: 7, will: 7, luck: 3, move: 6, body: 8, emp: 5 },
    headSp: 11,
    bodySp: 11,
    actions: [
      {
        id: 'shotgun',
        name: 'Тактический дробовик (Tactical Shotgun)',
        actionType: 'action',
        attackBonus: 13,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Оружие расчистки посадочной зоны авиакара.',
      },
      {
        id: 'rapid_hemostat',
        name: 'Гемостатик быстрого действия (Rapid Hemostat)',
        actionType: 'action',
        attackBonus: 0,
        damageDice: '0',
        damageType: 'healing',
        description: 'Мгновенно останавливает кровотечение и стабилизирует пациента.',
      },
    ],
    notes: 'Сотрудник службы Trauma Team International, спасающий платиновых клиентов любой ценой.',
  }),

  // 19. Maelstrom Ganger
  maelstrom_ganger: createTemplate({
    id: 'maelstrom_ganger',
    name: 'Боец банды Мальстрём (Maelstrom Ganger)',
    role: 'Ganger',
    stats: { int: 4, ref: 7, dex: 7, tech: 5, cool: 5, will: 7, luck: 2, move: 6, body: 8, emp: 1 },
    headSp: 11,
    bodySp: 11,
    actions: [
      {
        id: 'heavy_shotgun',
        name: 'Тяжёлый обрез дробовика (Heavy Sawed-off Shotgun)',
        actionType: 'action',
        attackBonus: 12,
        damageDice: '4d6',
        damageType: 'kinetic',
        description: 'Опустошительный выстрел в упор.',
      },
      {
        id: 'cyber_claws',
        name: 'Киберкогти (Cyber Claws)',
        actionType: 'action',
        attackBonus: 12,
        damageDice: '2d6',
        damageType: 'slashing',
        description: 'Усиленные хромированные лезвия.',
      },
    ],
    notes: 'Член психованной банды Мальстрём с пятиглазым красным оптическим кластером.',
  }),

  // 20. Tyger Claw
  tyger_claw_enforcer: createTemplate({
    id: 'tyger_claw_enforcer',
    name: 'Боевик «Тигриных Когтей» (Tyger Claw Enforcer)',
    role: 'Ganger',
    stats: { int: 5, ref: 8, dex: 8, tech: 4, cool: 6, will: 6, luck: 3, move: 7, body: 6, emp: 4 },
    headSp: 7,
    bodySp: 7,
    actions: [
      {
        id: 'katana',
        name: 'Катана (High-Carbon Katana)',
        actionType: 'action',
        attackBonus: 14,
        damageDice: '3d6',
        damageType: 'slashing',
        description: 'Быстрый рубящий выпад.',
      },
      {
        id: 'heavy_pistol',
        name: 'Тяжёлый пистолет (Heavy Pistol)',
        actionType: 'action',
        attackBonus: 13,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Пистолет с татуировкой дракона на рукояти.',
      },
    ],
    notes: 'Японский уличный боевик из Japantown, мотоциклист и мастер фехтования.',
  }),

  // 21. Edgerunner Veteran
  edgerunner_mercenary: createTemplate({
    id: 'edgerunner_mercenary',
    name: 'Ветеран-Эджраннер (Edgerunner Mercenary)',
    role: 'Solo',
    stats: { int: 6, ref: 8, dex: 7, tech: 6, cool: 7, will: 7, luck: 5, move: 6, body: 7, emp: 4 },
    headSp: 11,
    bodySp: 11,
    actions: [
      {
        id: 'battle_rifle',
        name: 'Боевая винтовка (Battle Rifle)',
        actionType: 'action',
        attackBonus: 14,
        damageDice: '5d6',
        damageType: 'kinetic',
        description: 'Модифицированная винтовка со смартлинком.',
      },
      {
        id: 'heavy_pistol',
        name: 'Кастомный пистолет (Custom Heavy Pistol)',
        actionType: 'action',
        attackBonus: 13,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Отрегулированный для максимальной отдачи пистолет.',
      },
    ],
    notes: 'Опытный наёмник Посмертия (Afterlife), прошедший десятки опасных рейдов.',
  }),

  // 22. Sniper Operative
  sniper_operative: createTemplate({
    id: 'sniper_operative',
    name: 'Снайпер-ликвидатор (Corporate Sniper)',
    role: 'Solo',
    stats: { int: 6, ref: 8, dex: 7, tech: 5, cool: 7, will: 6, luck: 4, move: 5, body: 5, emp: 4 },
    headSp: 7,
    bodySp: 7,
    actions: [
      {
        id: 'sniper_rifle',
        name: 'Снайперская винтовка (Heavy Sniper Rifle)',
        actionType: 'action',
        attackBonus: 15,
        damageDice: '5d6',
        damageType: 'kinetic',
        description: 'Оптический зум 10x, дальность до 800м.',
      },
      {
        id: 'light_smg',
        name: 'Лёгкий ПП скрытого ношения (Compact SMG)',
        actionType: 'action',
        attackBonus: 11,
        damageDice: '2d6',
        damageType: 'kinetic',
        description: 'Оружие прикрытия на короткой дистанции.',
      },
    ],
    notes: 'Хладнокровный стрелок, работающий с высотных крыш Night City.',
  }),

  // 23. Heavy Mercenary
  heavy_mercenary: createTemplate({
    id: 'heavy_mercenary',
    name: 'Тяжёлый бронированный наёмник (Heavy Mercenary)',
    role: 'Solo',
    stats: { int: 4, ref: 7, dex: 6, tech: 4, cool: 6, will: 7, luck: 3, move: 5, body: 10, emp: 2 },
    headSp: 13,
    bodySp: 13,
    actions: [
      {
        id: 'rocket_launcher',
        name: 'Ракетная установка (Rocket Launcher)',
        actionType: 'action',
        attackBonus: 12,
        damageDice: '8d6',
        damageType: 'explosive',
        description: 'Уничтожает транспорт и фортификации.',
      },
      {
        id: 'heavy_pistol',
        name: 'Тяжёлый пистолет (Heavy Pistol)',
        actionType: 'action',
        attackBonus: 12,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Запасное крупнокалиберное оружие.',
      },
    ],
    notes: 'Тяжело вооружённый киборг, нанимаемый для штурма укреплённых баз.',
  }),

  // 24. Club Bouncer
  club_bouncer: createTemplate({
    id: 'club_bouncer',
    name: 'Вышибала клуба (Club Bouncer)',
    role: 'Solo',
    stats: { int: 4, ref: 6, dex: 6, tech: 3, cool: 6, will: 6, luck: 2, move: 5, body: 9, emp: 4 },
    headSp: 7,
    bodySp: 7,
    actions: [
      {
        id: 'brass_knuckles',
        name: 'Кастет / Кулачный удар (Heavy Fist)',
        actionType: 'action',
        attackBonus: 12,
        damageDice: '3d6',
        damageType: 'bludgeoning',
        description: 'Мощный хук тренированного громилы.',
      },
      {
        id: 'heavy_stunner',
        name: 'Шокер повышенной мощности (Stun Baton)',
        actionType: 'action',
        attackBonus: 10,
        damageDice: '2d6',
        damageType: 'electrical',
        description: 'Успокаивает буйных посетителей клуба.',
      },
    ],
    notes: 'Охрана ночного клуба «Посмертие» или «Totentanz», знаток рукопашного боя.',
  }),

  // 25. Drone Operator
  drone_operator: createTemplate({
    id: 'drone_operator',
    name: 'Оператор боевых дронов (Drone Operator)',
    role: 'Tech',
    stats: { int: 8, ref: 6, dex: 6, tech: 8, cool: 5, will: 6, luck: 4, move: 5, body: 5, emp: 5 },
    headSp: 7,
    bodySp: 7,
    actions: [
      {
        id: 'drone_attack',
        name: 'Огонь боевого дрона (Attack Drone MG)',
        actionType: 'action',
        attackBonus: 13,
        damageDice: '4d6',
        damageType: 'kinetic',
        description: 'Дистанционный огонь летающего разведывательно-ударного дрона.',
      },
      {
        id: 'smg',
        name: 'Компактный ПП (Compact SMG)',
        actionType: 'action',
        attackBonus: 10,
        damageDice: '2d6',
        damageType: 'kinetic',
        description: 'Оружие оператора для личной защиты.',
      },
    ],
    notes: 'Специалист по дистанционному управлению наземными и воздушными боевыми дронами.',
  }),
};

export function getCyberpunkTemplate(id: string): UniversalCreature | undefined {
  const tpl = CYBERPUNK_STARTER_NPCS[id];
  return tpl ? JSON.parse(JSON.stringify(tpl)) : undefined;
}

export function getAllCyberpunkTemplates(): UniversalCreature[] {
  return Object.values(CYBERPUNK_STARTER_NPCS).map((t) => JSON.parse(JSON.stringify(t)));
}
