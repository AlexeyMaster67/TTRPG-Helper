/**
 * TTRPG Helper - Cyberpunk RED Starter NPC Templates
 * 25 Archetype Statblocks across Night City factions, roles, and threat levels.
 * Full bilingual support (Official English Cyberpunk RED Core Rulebook & Russian translations).
 */

import { UniversalCreature, CreatureAction } from '../../types/system';
import { SupportedLanguage } from '../../i18n/types';
import { getCurrentLanguage } from '../../i18n';

interface LocalizedAction extends CreatureAction {
  nameEn?: string;
  nameRu?: string;
  descEn?: string;
  descRu?: string;
}

interface TemplateConfig {
  id: string;
  nameEn: string;
  nameRu: string;
  role: string;
  roleRu?: string;
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
  actions: LocalizedAction[];
  notesEn: string;
  notesRu: string;
}

function calculateCprHp(body: number, will: number): number {
  return 10 + 5 * Math.ceil((body + will) / 2);
}

function buildTemplateCreature(cfg: TemplateConfig, lang: SupportedLanguage): UniversalCreature {
  const hp = calculateCprHp(cfg.stats.body, cfg.stats.will);
  const humanity = cfg.stats.emp * 10;
  const isRu = lang === 'ru';

  const localizedActions: CreatureAction[] = cfg.actions.map((act) => ({
    id: act.id,
    name: isRu ? (act.nameRu || act.name) : (act.nameEn || act.name),
    actionType: act.actionType,
    attackBonus: act.attackBonus,
    damageDice: act.damageDice,
    damageType: act.damageType,
    description: isRu ? (act.descRu || act.description) : (act.descEn || act.description),
  }));

  return {
    id: cfg.id,
    name: isRu ? cfg.nameRu : cfg.nameEn,
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
          { index: 1, label: isRu ? 'Раунд 1' : 'Round 1' },
          { index: 2, label: isRu ? 'Раунд 2 (+1)' : 'Round 2 (+1)' },
          { index: 3, label: isRu ? 'Раунд 3 (+2)' : 'Round 3 (+2)' },
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
    actions: localizedActions,
    senses: {},
    speeds: {
      walk: cfg.stats.move * 2,
    },
    notes: isRu ? cfg.notesRu : cfg.notesEn,
    customFields: {
      role: isRu ? (cfg.roleRu || cfg.role) : cfg.role,
      roleEn: cfg.role,
      roleRu: cfg.roleRu || cfg.role,
      archetype: cfg.id,
      nameEn: cfg.nameEn,
      nameRu: cfg.nameRu,
    },
  };
}

export const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {
  // 1. Boosterganger
  boosterganger: {
    id: 'boosterganger',
    nameEn: 'Boosterganger',
    nameRu: 'Бустергенгер (Boosterganger)',
    role: 'Ganger',
    roleRu: 'Гангер',
    stats: { int: 3, ref: 6, dex: 6, tech: 3, cool: 4, will: 4, luck: 2, move: 6, body: 6, emp: 3 },
    headSp: 4,
    bodySp: 4,
    actions: [
      {
        id: 'rippers',
        name: 'Ripper Blades',
        nameEn: 'Ripper Blades',
        nameRu: 'Лезвия-Потрошители (Ripper Blades)',
        actionType: 'action',
        attackBonus: 10,
        damageDice: '2d6',
        damageType: 'slashing',
        description: 'Implanted carbo-glass claws in the fingertips.',
        descEn: 'Implanted carbo-glass claws in the fingertips.',
        descRu: 'Имплантированные когти в кончиках пальцев.',
      },
      {
        id: 'smg_light',
        name: 'Light SMG',
        nameEn: 'Light SMG',
        nameRu: 'Лёгкий ПП (Light SMG)',
        actionType: 'action',
        attackBonus: 10,
        damageDice: '2d6',
        damageType: 'kinetic',
        description: 'Rapid-fire close quarters submachinegun.',
        descEn: 'Rapid-fire close quarters submachinegun.',
        descRu: 'Скорострельный пистолет-пулемёт ближнего боя.',
      },
    ],
    notesEn: 'Street punk with cheap cyberware and violent disposition.',
    notesRu: 'Уличный головорез с дешёвым хромом и агрессивным поведением.',
  },

  // 2. Solo
  solo_veteran: {
    id: 'solo_veteran',
    nameEn: 'Solo Veteran',
    nameRu: 'Ветеран-Соло (Solo Veteran)',
    role: 'Solo',
    roleRu: 'Соло',
    stats: { int: 6, ref: 8, dex: 7, tech: 5, cool: 7, will: 7, luck: 5, move: 6, body: 8, emp: 4 },
    headSp: 11,
    bodySp: 11,
    actions: [
      {
        id: 'assault_rifle',
        name: 'Assault Rifle',
        nameEn: 'Assault Rifle',
        nameRu: 'Штурмовая винтовка (Assault Rifle)',
        actionType: 'action',
        attackBonus: 14,
        damageDice: '5d6',
        damageType: 'kinetic',
        description: 'High-precision military assault rifle with smart scope.',
        descEn: 'High-precision military assault rifle with smart scope.',
        descRu: 'Высокоточное армейское оружие с оптическим прицелом.',
      },
      {
        id: 'heavy_pistol',
        name: 'Heavy Pistol',
        nameEn: 'Heavy Pistol',
        nameRu: 'Тяжёлый пистолет (Heavy Pistol)',
        actionType: 'action',
        attackBonus: 13,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Heavy caliber sidearm of choice for professional Solos.',
        descEn: 'Heavy caliber sidearm of choice for professional Solos.',
        descRu: 'Крупнокалиберный личный сайдарм Solo.',
      },
    ],
    notesEn: 'Corporate war veteran hardened by decades on The Street; master of Combat Awareness.',
    notesRu: 'Закалённый корпоративными войнами наёмник, мастер боевого искусства Combat Awareness.',
  },

  // 3. Netrunner
  netrunner: {
    id: 'netrunner',
    nameEn: 'Netrunner',
    nameRu: 'Нетраннер (Netrunner)',
    role: 'Netrunner',
    roleRu: 'Нетраннер',
    stats: { int: 8, ref: 6, dex: 6, tech: 7, cool: 6, will: 6, luck: 4, move: 5, body: 5, emp: 5 },
    headSp: 7,
    bodySp: 7,
    actions: [
      {
        id: 'neural_shock',
        name: 'Neural Shock Virus',
        nameEn: 'Neural Shock Virus',
        nameRu: 'Нейрошок (Neural Shock Virus)',
        actionType: 'action',
        attackBonus: 14,
        damageDice: '3d6',
        damageType: 'electrical',
        description: 'Invasive cyberdeck black-ICE program frying synapses.',
        descEn: 'Invasive cyberdeck black-ICE program frying synapses.',
        descRu: 'Взлом нейролинка цели через интерфейс кибердеки.',
      },
      {
        id: 'heavy_pistol',
        name: 'Heavy Pistol',
        nameEn: 'Heavy Pistol',
        nameRu: 'Тяжёлый пистолет (Heavy Pistol)',
        actionType: 'action',
        attackBonus: 10,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Backup pistol for meatspace emergencies.',
        descEn: 'Backup pistol for meatspace emergencies.',
        descRu: 'Оружие самообороны на случай отключения от Сети.',
      },
    ],
    notesEn: 'Deep-dive hacker equipped with custom cyberdeck and Interface neural plugs.',
    notesRu: 'Хакер Сети с кибердекой Cybermod 2000 и глубокими нейроинтерфейсами.',
  },

  // 4. Tech
  tech_specialist: {
    id: 'tech_specialist',
    nameEn: 'Tech Specialist',
    nameRu: 'Полевой техник (Tech Specialist)',
    role: 'Tech',
    roleRu: 'Техник',
    stats: { int: 7, ref: 6, dex: 6, tech: 8, cool: 5, will: 6, luck: 4, move: 5, body: 6, emp: 5 },
    headSp: 7,
    bodySp: 7,
    actions: [
      {
        id: 'shotgun',
        name: 'Shotgun',
        nameEn: 'Shotgun',
        nameRu: 'Дробовик (Shotgun)',
        actionType: 'action',
        attackBonus: 11,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Pump-action 12-gauge scattergun.',
        descEn: 'Pump-action 12-gauge scattergun.',
        descRu: 'Помповый дробовик калибра 12G.',
      },
      {
        id: 'cyberarm_tool',
        name: 'Cyberarm Tool',
        nameEn: 'Cyberarm Tool',
        nameRu: 'Инструментальная киберрука (Cyberarm Tool)',
        actionType: 'action',
        attackBonus: 10,
        damageDice: '2d6',
        damageType: 'bludgeoning',
        description: 'Hydraulic manipulator with integrated cutting torch.',
        descEn: 'Hydraulic manipulator with integrated cutting torch.',
        descRu: 'Гидравлический манипулятор со сварочной горелкой.',
      },
    ],
    notesEn: 'Master mechanic and tinkerer capable of field-modifying hardware under fire (Maker).',
    notesRu: 'Инженер-изобретатель, способный починить или модифицировать любую технику под огнём.',
  },

  // 5. Nomad
  nomad_outrider: {
    id: 'nomad_outrider',
    nameEn: 'Nomad Outrider',
    nameRu: 'Следопыт клана (Nomad Outrider)',
    role: 'Nomad',
    roleRu: 'Номад',
    stats: { int: 5, ref: 8, dex: 7, tech: 6, cool: 6, will: 6, luck: 5, move: 7, body: 7, emp: 5 },
    headSp: 11,
    bodySp: 11,
    actions: [
      {
        id: 'heavy_pistol',
        name: 'Heavy Revolver',
        nameEn: 'Heavy Revolver',
        nameRu: 'Тяжёлый револьвер (Heavy Revolver)',
        actionType: 'action',
        attackBonus: 13,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Custom nomad high-caliber revolver.',
        descEn: 'Custom nomad high-caliber revolver.',
        descRu: 'Модифицированный крупнокалиберный револьвер.',
      },
      {
        id: 'hunting_knife',
        name: 'Hunting Knife',
        nameEn: 'Hunting Knife',
        nameRu: 'Охотничий нож (Hunting Knife)',
        actionType: 'action',
        attackBonus: 12,
        damageDice: '1d6',
        damageType: 'slashing',
        description: 'Tough carbide field blade.',
        descEn: 'Tough carbide field blade.',
        descRu: 'Охотничий нож из закалённого карбида.',
      },
    ],
    notesEn: 'Wasteland convoy scout and vehicular combat expert (Moto).',
    notesRu: 'Боец клана Пустошей, мастер вождения и конвойного сопровождения (Moto).',
  },

  // 6. Cop / Lawman
  cop_patrol: {
    id: 'cop_patrol',
    nameEn: 'NCPD Beat Cop',
    nameRu: 'Офицер полиции NCPD (NCPD Beat Cop)',
    role: 'Lawman',
    roleRu: 'Законник',
    stats: { int: 5, ref: 7, dex: 6, tech: 4, cool: 6, will: 6, luck: 3, move: 6, body: 7, emp: 5 },
    headSp: 11,
    bodySp: 11,
    actions: [
      {
        id: 'heavy_pistol',
        name: 'Service Heavy Pistol',
        nameEn: 'Service Heavy Pistol',
        nameRu: 'Табельный пистолет (Service Heavy Pistol)',
        actionType: 'action',
        attackBonus: 12,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Standard issue NCPD heavy sidearm.',
        descEn: 'Standard issue NCPD heavy sidearm.',
        descRu: 'Стандартный табельный пистолет NCPD с лазерным целеуказателем.',
      },
      {
        id: 'stun_baton',
        name: 'Stun Baton',
        nameEn: 'Stun Baton',
        nameRu: 'Электродубинка (Stun Baton)',
        actionType: 'action',
        attackBonus: 11,
        damageDice: '2d6',
        damageType: 'electrical',
        description: 'Non-lethal riot control crowd-pacifier.',
        descEn: 'Non-lethal riot control crowd-pacifier.',
        descRu: 'Шоковое нелетальное спецсредство.',
      },
    ],
    notesEn: 'Night City patrol officer with emergency dispatch call for Backup.',
    notesRu: 'Патрульный полицейский Night City, способный вызвать подкрепление Backup.',
  },

  // 7. Fixer
  fixer_broker: {
    id: 'fixer_broker',
    nameEn: 'Fixer Broker',
    nameRu: 'Уличный фиксер (Fixer Broker)',
    role: 'Fixer',
    roleRu: 'Фиксер',
    stats: { int: 7, ref: 6, dex: 6, tech: 4, cool: 8, will: 7, luck: 6, move: 5, body: 5, emp: 7 },
    headSp: 7,
    bodySp: 7,
    actions: [
      {
        id: 'very_heavy_pistol',
        name: 'Very Heavy Pistol',
        nameEn: 'Very Heavy Pistol',
        nameRu: 'Очень тяжёлый пистолет (Very Heavy Pistol)',
        actionType: 'action',
        attackBonus: 11,
        damageDice: '4d6',
        damageType: 'kinetic',
        description: 'Concealed chromed .454 Casull hand-cannon.',
        descEn: 'Concealed chromed .454 Casull hand-cannon.',
        descRu: 'Скрытый хромированный монстр калибра .454 Casull.',
      },
    ],
    notesEn: 'Information broker, contractor, and Midnight Market operator.',
    notesRu: 'Торговец информацией и контрактами, связи на всех уровнях мегаполиса.',
  },

  // 8. Cyberpsycho
  cyberpsycho: {
    id: 'cyberpsycho',
    nameEn: 'Cyberpsycho',
    nameRu: 'Киберпсихопат (Cyberpsycho)',
    role: 'Cyberpsycho',
    roleRu: 'Киберпсихопат',
    stats: { int: 3, ref: 8, dex: 8, tech: 4, cool: 2, will: 8, luck: 1, move: 7, body: 11, emp: 0 },
    headSp: 14,
    bodySp: 14,
    actions: [
      {
        id: 'gorilla_arms',
        name: 'Gorilla Arms Heavy Slam',
        nameEn: 'Gorilla Arms Heavy Slam',
        nameRu: 'Руки-Гориллы (Gorilla Arms Heavy Slam)',
        actionType: 'action',
        attackBonus: 15,
        damageDice: '4d6',
        damageType: 'bludgeoning',
        description: 'Crushing slam powered by industrial cybernetic hydraulics.',
        descEn: 'Crushing slam powered by industrial cybernetic hydraulics.',
        descRu: 'Сокрушительный удар гидравлическими киберруками.',
      },
      {
        id: 'heavy_lmg',
        name: 'Heavy LMG',
        nameEn: 'Heavy LMG',
        nameRu: 'Тяжёлый пулемёт (Heavy LMG)',
        actionType: 'action',
        attackBonus: 14,
        damageDice: '5d6',
        damageType: 'kinetic',
        description: 'Belt-fed devastating suppressive fire.',
        descEn: 'Belt-fed devastating suppressive fire.',
        descRu: 'Шквал пуль из тяжелого пулемёта с ленточной подачей.',
      },
    ],
    notesEn: 'Deranged chrome addict who lost all Empathy; top-priority target for MaxTac.',
    notesRu: 'Человек, потерявший рассудок из-за чрезмерной киберизации. Угроза наивысшего приоритета MaxTac.',
  },

  // 9. Corp Security
  corp_security: {
    id: 'corp_security',
    nameEn: 'Corp Security Guard',
    nameRu: 'Корпоративный оперативник (Corp Security Guard)',
    role: 'Security',
    roleRu: 'Охрана',
    stats: { int: 5, ref: 7, dex: 6, tech: 5, cool: 6, will: 6, luck: 3, move: 6, body: 7, emp: 4 },
    headSp: 11,
    bodySp: 11,
    actions: [
      {
        id: 'tactical_smg',
        name: 'Tactical SMG',
        nameEn: 'Tactical SMG',
        nameRu: 'Тактический ПП (Tactical SMG)',
        actionType: 'action',
        attackBonus: 12,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Submachinegun calibrated for corporate corridor defense.',
        descEn: 'Submachinegun calibrated for corporate corridor defense.',
        descRu: 'Автоматическое корпоративное оружие средней дальности.',
      },
      {
        id: 'shock_baton',
        name: 'Shock Baton',
        nameEn: 'Shock Baton',
        nameRu: 'Шоковая дубинка (Shock Baton)',
        actionType: 'action',
        attackBonus: 10,
        damageDice: '2d6',
        damageType: 'electrical',
        description: 'Non-lethal intruder subjugator.',
        descEn: 'Non-lethal intruder subjugator.',
        descRu: 'Тактический нейтрализатор нарушителей.',
      },
    ],
    notesEn: 'Megacorp private asset security (Militech / Arasaka / Kang Tao).',
    notesRu: 'Служба безопасности мегакорпорации (Militech / Arasaka / Kang Tao).',
  },

  // 10. Medtech
  medtech_street: {
    id: 'medtech_street',
    nameEn: 'Street Medtech',
    nameRu: 'Уличный медтех (Street Medtech)',
    role: 'Medtech',
    roleRu: 'Медтех',
    stats: { int: 8, ref: 6, dex: 6, tech: 8, cool: 6, will: 6, luck: 4, move: 5, body: 5, emp: 6 },
    headSp: 7,
    bodySp: 7,
    actions: [
      {
        id: 'dartgun',
        name: 'Dartgun',
        nameEn: 'Dartgun',
        nameRu: 'Фармацевтический пистолет (Dartgun)',
        actionType: 'action',
        attackBonus: 11,
        damageDice: '2d6',
        damageType: 'piercing',
        description: 'Pneumatic dartgun delivering sedatives or biotoxins.',
        descEn: 'Pneumatic dartgun delivering sedatives or biotoxins.',
        descRu: 'Стреляет дротиками с транквилизаторами или токсинами.',
      },
      {
        id: 'cryo_stabilizer',
        name: 'Cryopump Kit',
        nameEn: 'Cryopump Kit',
        nameRu: 'Криостабилизатор (Cryopump Kit)',
        actionType: 'action',
        attackBonus: 0,
        damageDice: '0',
        damageType: 'healing',
        description: 'Instantly stabilizes mortally wounded patient in the field.',
        descEn: 'Instantly stabilizes mortally wounded patient in the field.',
        descRu: 'Стабилизирует смертельно раненого пациента в полевых условиях.',
      },
    ],
    notesEn: 'Combat clinic medic, master of pharmaceutical synthesis and field trauma treatment.',
    notesRu: 'Полевой медик скорой помощи, знаток имплантов и фармацевтики.',
  },

  // 11. Rockerboy
  rockerboy_rebel: {
    id: 'rockerboy_rebel',
    nameEn: 'Rockerboy Rebel',
    nameRu: 'Бунтарь-Рокербой (Rockerboy Rebel)',
    role: 'Rockerboy',
    roleRu: 'Рокербой',
    stats: { int: 5, ref: 6, dex: 7, tech: 4, cool: 8, will: 7, luck: 6, move: 6, body: 5, emp: 7 },
    headSp: 4,
    bodySp: 4,
    actions: [
      {
        id: 'heavy_pistol',
        name: 'Chromed Heavy Pistol',
        nameEn: 'Chromed Heavy Pistol',
        nameRu: 'Хромированный пистолет (Chromed Heavy Pistol)',
        actionType: 'action',
        attackBonus: 11,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Flashy engraved sidearm with neon detailing.',
        descEn: 'Flashy engraved sidearm with neon detailing.',
        descRu: 'Эффектный пистолет со светящимися неоновыми гравировками.',
      },
    ],
    notesEn: 'Underground rock icon commanding riots through Charismatic Impact.',
    notesRu: 'Лидер протеста, поднимающий толпы людей на восстание силой харизмы (Charismatic Impact).',
  },

  // 12. Media
  media_reporter: {
    id: 'media_reporter',
    nameEn: 'Media Investigator',
    nameRu: 'Репортёр расследований (Media Investigator)',
    role: 'Media',
    roleRu: 'Медиа',
    stats: { int: 8, ref: 5, dex: 6, tech: 5, cool: 7, will: 6, luck: 5, move: 5, body: 4, emp: 6 },
    headSp: 4,
    bodySp: 4,
    actions: [
      {
        id: 'medium_pistol',
        name: 'Concealed Medium Pistol',
        nameEn: 'Concealed Medium Pistol',
        nameRu: 'Компактный пистолет (Concealed Medium Pistol)',
        actionType: 'action',
        attackBonus: 9,
        damageDice: '2d6',
        damageType: 'kinetic',
        description: 'Lightweight sidearm tucked into shoulder holster.',
        descEn: 'Lightweight sidearm tucked into shoulder holster.',
        descRu: 'Скрытый пистолет в наплечной кобуре.',
      },
    ],
    notesEn: 'Investigative reporter unmasking corporate scandals with public Credibility.',
    notesRu: 'Журналист, охотящийся за грязными тайнами корпораций (Credibility).',
  },

  // 13. Exec
  exec_manager: {
    id: 'exec_manager',
    nameEn: 'Exec Junior',
    nameRu: 'Корпоративный менеджер (Exec Junior)',
    role: 'Exec',
    roleRu: 'Экзек',
    stats: { int: 7, ref: 5, dex: 5, tech: 4, cool: 8, will: 6, luck: 5, move: 5, body: 4, emp: 6 },
    headSp: 7,
    bodySp: 7,
    actions: [
      {
        id: 'smart_pistol',
        name: 'Executive Smart Pistol',
        nameEn: 'Executive Smart Pistol',
        nameRu: 'Смарт-пистолет (Executive Smart Pistol)',
        actionType: 'action',
        attackBonus: 11,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Sleek smartgun linked to personal cyberoptics.',
        descEn: 'Sleek smartgun linked to personal cyberoptics.',
        descRu: 'Пистолет с автоприцелом через корпоративный смартлинк.',
      },
    ],
    notesEn: 'Mid-level corporate asset backed by corporate legal funds and personal Teamwork.',
    notesRu: 'Менеджер среднего звена с корпоративным счётом и телохранителями на связи.',
  },

  // 14. Exec Bodyguard
  exec_bodyguard: {
    id: 'exec_bodyguard',
    nameEn: 'Exec Bodyguard',
    nameRu: 'Телохранитель топ-менеджера (Exec Bodyguard)',
    role: 'Solo',
    roleRu: 'Соло',
    stats: { int: 5, ref: 7, dex: 7, tech: 4, cool: 7, will: 7, luck: 3, move: 6, body: 8, emp: 4 },
    headSp: 11,
    bodySp: 11,
    actions: [
      {
        id: 'heavy_smg',
        name: 'Heavy SMG',
        nameEn: 'Heavy SMG',
        nameRu: 'Тяжёлый ПП (Heavy SMG)',
        actionType: 'action',
        attackBonus: 13,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'High-fire-rate weapon for close protection fire-fights.',
        descEn: 'High-fire-rate weapon for close protection fire-fights.',
        descRu: 'Оружие плотного огня для подавления нападающих.',
      },
      {
        id: 'knife',
        name: 'Tactical Knife',
        nameEn: 'Tactical Knife',
        nameRu: 'Тактический нож (Tactical Knife)',
        actionType: 'action',
        attackBonus: 12,
        damageDice: '1d6',
        damageType: 'piercing',
        description: 'Ceramic blade for close quarters combat.',
        descEn: 'Ceramic blade for close quarters combat.',
        descRu: 'Керамическое лезвие для ближнего боя.',
      },
    ],
    notesEn: 'Professional shield for VIPs, prepared to take lethal hits for clients.',
    notesRu: 'Профессиональный щит руководства, готовый закрыть цель своим телом.',
  },

  // 15. Street Punk
  street_punk: {
    id: 'street_punk',
    nameEn: 'Street Punk',
    nameRu: 'Уличный панк (Street Punk)',
    role: 'Ganger',
    roleRu: 'Гангер',
    stats: { int: 4, ref: 5, dex: 5, tech: 3, cool: 4, will: 4, luck: 2, move: 6, body: 5, emp: 5 },
    headSp: 4,
    bodySp: 4,
    actions: [
      {
        id: 'baseball_bat',
        name: 'Nailed Bat',
        nameEn: 'Nailed Bat',
        nameRu: 'Бита с гвоздями (Nailed Bat)',
        actionType: 'action',
        attackBonus: 9,
        damageDice: '2d6',
        damageType: 'bludgeoning',
        description: 'Crude improvised melee weapon.',
        descEn: 'Crude improvised melee weapon.',
        descRu: 'Самодельное дробящее оружие.',
      },
      {
        id: 'light_pistol',
        name: 'Light Pistol 9mm',
        nameEn: 'Light Pistol 9mm',
        nameRu: 'Лёгкий пистолет (Light Pistol 9mm)',
        actionType: 'action',
        attackBonus: 8,
        damageDice: '1d6',
        damageType: 'kinetic',
        description: 'Cheap street junk disposable gun.',
        descEn: 'Cheap street junk disposable gun.',
        descRu: 'Дешёвый одноразовый пистолет уличной сборки.',
      },
    ],
    notesEn: 'Desperate street runaway seeking quick cash in combat zones.',
    notesRu: 'Молодой уличный бродяга, ищущий легкой наживы в трущобах.',
  },

  // 16. Arasaka Ninja
  arasaka_ninja: {
    id: 'arasaka_ninja',
    nameEn: 'Arasaka Black Ops Agent',
    nameRu: 'Штурмовик Арасака (Arasaka Black Ops Agent)',
    role: 'Solo',
    roleRu: 'Соло',
    stats: { int: 6, ref: 8, dex: 8, tech: 6, cool: 7, will: 7, luck: 4, move: 7, body: 7, emp: 3 },
    headSp: 11,
    bodySp: 11,
    actions: [
      {
        id: 'monokatana',
        name: 'Monokatana',
        nameEn: 'Monokatana',
        nameRu: 'Монокатана (Monokatana)',
        actionType: 'action',
        attackBonus: 15,
        damageDice: '4d6',
        damageType: 'slashing',
        description: 'Monofilament-edged blade cleaving through armored Kevlar.',
        descEn: 'Monofilament-edged blade cleaving through armored Kevlar.',
        descRu: 'Лезвие с молекулярной заточкой, рассекающее броню.',
      },
      {
        id: 'smart_smg',
        name: 'Smart SMG',
        nameEn: 'Smart SMG',
        nameRu: 'Смарт-ПП Arasaka (Smart SMG)',
        actionType: 'action',
        attackBonus: 14,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'High-tech smartgun tracking moving targets.',
        descEn: 'High-tech smartgun tracking moving targets.',
        descRu: 'Высокотехнологичный скорострельный автомат с трекингом пуль.',
      },
    ],
    notesEn: 'Elite operative of Arasaka Corporation equipped with active camouflage.',
    notesRu: 'Элитный оперативник корпорации Arasaka с оптическим камуфляжем.',
  },

  // 17. Militech Trooper
  militech_heavy_trooper: {
    id: 'militech_heavy_trooper',
    nameEn: 'Militech Heavy Trooper',
    nameRu: 'Тяжёлый штурмовик Militech (Militech Heavy Trooper)',
    role: 'Solo',
    roleRu: 'Соло',
    stats: { int: 5, ref: 7, dex: 6, tech: 5, cool: 6, will: 7, luck: 2, move: 5, body: 10, emp: 2 },
    headSp: 15,
    bodySp: 15,
    actions: [
      {
        id: 'assault_rifle_heavy',
        name: 'Heavy Assault Rifle',
        nameEn: 'Heavy Assault Rifle',
        nameRu: 'Армейская винтовка Militech (Heavy Assault Rifle)',
        actionType: 'action',
        attackBonus: 13,
        damageDice: '5d6',
        damageType: 'kinetic',
        description: 'Hard-hitting military battle rifle with armor-piercing rounds.',
        descEn: 'Hard-hitting military battle rifle with armor-piercing rounds.',
        descRu: 'Тяжёлое автоматическое армейское оружие.',
      },
      {
        id: 'frag_grenade',
        name: 'Frag Grenade',
        nameEn: 'Frag Grenade',
        nameRu: 'Осколочная граната (Frag Grenade)',
        actionType: 'action',
        attackBonus: 11,
        damageDice: '6d6',
        damageType: 'explosive',
        description: '10m blast radius high-explosive ordnance.',
        descEn: '10m blast radius high-explosive ordnance.',
        descRu: 'Радиус взрыва 10м.',
      },
    ],
    notesEn: 'Heavy shock trooper in powered flak armor crushing urban insurgencies.',
    notesRu: 'Штурмовик в тяжёлой броне Metalgear, подавляющий любые очаги сопротивления.',
  },

  // 18. Trauma Team Paramedic
  trauma_team_paramedic: {
    id: 'trauma_team_paramedic',
    nameEn: 'Trauma Team Paramedic',
    nameRu: 'Боевой парамедик TT (Trauma Team Paramedic)',
    role: 'Medtech',
    roleRu: 'Медтех',
    stats: { int: 7, ref: 7, dex: 6, tech: 7, cool: 7, will: 7, luck: 3, move: 6, body: 8, emp: 5 },
    headSp: 11,
    bodySp: 11,
    actions: [
      {
        id: 'shotgun',
        name: 'Tactical Shotgun',
        nameEn: 'Tactical Shotgun',
        nameRu: 'Тактический дробовик (Tactical Shotgun)',
        actionType: 'action',
        attackBonus: 13,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'AV landing zone clearing shotgun.',
        descEn: 'AV landing zone clearing shotgun.',
        descRu: 'Оружие расчистки посадочной зоны авиакара.',
      },
      {
        id: 'rapid_hemostat',
        name: 'Rapid Hemostat',
        nameEn: 'Rapid Hemostat',
        nameRu: 'Гемостатик быстрого действия (Rapid Hemostat)',
        actionType: 'action',
        attackBonus: 0,
        damageDice: '0',
        damageType: 'healing',
        description: 'Halts catastrophic blood loss instantly.',
        descEn: 'Halts catastrophic blood loss instantly.',
        descRu: 'Мгновенно останавливает кровотечение и стабилизирует пациента.',
      },
    ],
    notesEn: 'Combat paramedic for Trauma Team International, protecting platinum subscribers at all costs.',
    notesRu: 'Сотрудник службы Trauma Team International, спасающий платиновых клиентов любой ценой.',
  },

  // 19. Maelstrom Ganger
  maelstrom_ganger: {
    id: 'maelstrom_ganger',
    nameEn: 'Maelstrom Ganger',
    nameRu: 'Боец банды Мальстрём (Maelstrom Ganger)',
    role: 'Ganger',
    roleRu: 'Гангер',
    stats: { int: 4, ref: 7, dex: 7, tech: 5, cool: 5, will: 7, luck: 2, move: 6, body: 8, emp: 1 },
    headSp: 11,
    bodySp: 11,
    actions: [
      {
        id: 'heavy_shotgun',
        name: 'Heavy Sawed-off Shotgun',
        nameEn: 'Heavy Sawed-off Shotgun',
        nameRu: 'Тяжёлый обрез дробовика (Heavy Sawed-off Shotgun)',
        actionType: 'action',
        attackBonus: 12,
        damageDice: '4d6',
        damageType: 'kinetic',
        description: 'Devastating point-blank blast.',
        descEn: 'Devastating point-blank blast.',
        descRu: 'Опустошительный выстрел в упор.',
      },
      {
        id: 'cyber_claws',
        name: 'Cyber Claws',
        nameEn: 'Cyber Claws',
        nameRu: 'Киберкогти (Cyber Claws)',
        actionType: 'action',
        attackBonus: 12,
        damageDice: '2d6',
        damageType: 'slashing',
        description: 'Reinforced serrated titanium claws.',
        descEn: 'Reinforced serrated titanium claws.',
        descRu: 'Усиленные хромированные лезвия.',
      },
    ],
    notesEn: 'Cyber-psychotic gang member with signature multi-optic red optic faceplates.',
    notesRu: 'Член психованной банды Мальстрём с пятиглазым красным оптическим кластером.',
  },

  // 20. Tyger Claw
  tyger_claw_enforcer: {
    id: 'tyger_claw_enforcer',
    nameEn: 'Tyger Claw Enforcer',
    nameRu: 'Боевик «Тигриных Когтей» (Tyger Claw Enforcer)',
    role: 'Ganger',
    roleRu: 'Гангер',
    stats: { int: 5, ref: 8, dex: 8, tech: 4, cool: 6, will: 6, luck: 3, move: 7, body: 6, emp: 4 },
    headSp: 7,
    bodySp: 7,
    actions: [
      {
        id: 'katana',
        name: 'High-Carbon Katana',
        nameEn: 'High-Carbon Katana',
        nameRu: 'Катана (High-Carbon Katana)',
        actionType: 'action',
        attackBonus: 14,
        damageDice: '3d6',
        damageType: 'slashing',
        description: 'Lightning-fast kenjutsu slashing strike.',
        descEn: 'Lightning-fast kenjutsu slashing strike.',
        descRu: 'Быстрый рубящий выпад.',
      },
      {
        id: 'heavy_pistol',
        name: 'Heavy Pistol',
        nameEn: 'Heavy Pistol',
        nameRu: 'Тяжёлый пистолет (Heavy Pistol)',
        actionType: 'action',
        attackBonus: 13,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Pistol etched with intricate golden dragon motif.',
        descEn: 'Pistol etched with intricate golden dragon motif.',
        descRu: 'Пистолет с татуировкой дракона на рукояти.',
      },
    ],
    notesEn: 'Japantown street syndicate enforcer, motorcycle rider, and blade specialist.',
    notesRu: 'Японский уличный боевик из Japantown, мотоциклист и мастер фехтования.',
  },

  // 21. Edgerunner Veteran
  edgerunner_mercenary: {
    id: 'edgerunner_mercenary',
    nameEn: 'Edgerunner Mercenary',
    nameRu: 'Ветеран-Эджраннер (Edgerunner Mercenary)',
    role: 'Solo',
    roleRu: 'Соло',
    stats: { int: 6, ref: 8, dex: 7, tech: 6, cool: 7, will: 7, luck: 5, move: 6, body: 7, emp: 4 },
    headSp: 11,
    bodySp: 11,
    actions: [
      {
        id: 'battle_rifle',
        name: 'Battle Rifle',
        nameEn: 'Battle Rifle',
        nameRu: 'Боевая винтовка (Battle Rifle)',
        actionType: 'action',
        attackBonus: 14,
        damageDice: '5d6',
        damageType: 'kinetic',
        description: 'Customized precision rifle with smartlink interface.',
        descEn: 'Customized precision rifle with smartlink interface.',
        descRu: 'Модифицированная винтовка со смартлинком.',
      },
      {
        id: 'heavy_pistol',
        name: 'Custom Heavy Pistol',
        nameEn: 'Custom Heavy Pistol',
        nameRu: 'Кастомный пистолет (Custom Heavy Pistol)',
        actionType: 'action',
        attackBonus: 13,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Tuned heavy handgun for point-blank gunfights.',
        descEn: 'Tuned heavy handgun for point-blank gunfights.',
        descRu: 'Отрегулированный для максимальной отдачи пистолет.',
      },
    ],
    notesEn: 'Seasoned Afterlife mercenary who survived dozens of high-risk contracts.',
    notesRu: 'Опытный наёмник Посмертия (Afterlife), прошедший десятки опасных рейдов.',
  },

  // 22. Sniper Operative
  sniper_operative: {
    id: 'sniper_operative',
    nameEn: 'Corporate Sniper',
    nameRu: 'Снайпер-ликвидатор (Corporate Sniper)',
    role: 'Solo',
    roleRu: 'Соло',
    stats: { int: 6, ref: 8, dex: 7, tech: 5, cool: 7, will: 6, luck: 4, move: 5, body: 5, emp: 4 },
    headSp: 7,
    bodySp: 7,
    actions: [
      {
        id: 'sniper_rifle',
        name: 'Heavy Sniper Rifle',
        nameEn: 'Heavy Sniper Rifle',
        nameRu: 'Снайперская винтовка (Heavy Sniper Rifle)',
        actionType: 'action',
        attackBonus: 15,
        damageDice: '5d6',
        damageType: 'kinetic',
        description: '10x digital magnification scope, effective out to 800m.',
        descEn: '10x digital magnification scope, effective out to 800m.',
        descRu: 'Оптический зум 10x, дальность до 800м.',
      },
      {
        id: 'light_smg',
        name: 'Compact SMG',
        nameEn: 'Compact SMG',
        nameRu: 'Лёгкий ПП скрытого ношения (Compact SMG)',
        actionType: 'action',
        attackBonus: 11,
        damageDice: '2d6',
        damageType: 'kinetic',
        description: 'Point-defense sidearm for tight spaces.',
        descEn: 'Point-defense sidearm for tight spaces.',
        descRu: 'Оружие прикрытия на короткой дистанции.',
      },
    ],
    notesEn: 'Cold-blooded marksman operating from Night City high-rise rooftops.',
    notesRu: 'Хладнокровный стрелок, работающий с высотных крыш Night City.',
  },

  // 23. Heavy Mercenary
  heavy_mercenary: {
    id: 'heavy_mercenary',
    nameEn: 'Heavy Mercenary',
    nameRu: 'Тяжёлый наёмник (Heavy Mercenary)',
    role: 'Solo',
    roleRu: 'Соло',
    stats: { int: 4, ref: 7, dex: 6, tech: 4, cool: 6, will: 7, luck: 3, move: 5, body: 10, emp: 2 },
    headSp: 13,
    bodySp: 13,
    actions: [
      {
        id: 'rocket_launcher',
        name: 'Rocket Launcher',
        nameEn: 'Rocket Launcher',
        nameRu: 'Ракетная установка (Rocket Launcher)',
        actionType: 'action',
        attackBonus: 12,
        damageDice: '8d6',
        damageType: 'explosive',
        description: 'Shoulder-fired anti-tank rocket devastating vehicles and bunkers.',
        descEn: 'Shoulder-fired anti-tank rocket devastating vehicles and bunkers.',
        descRu: 'Уничтожает транспорт и фортификации.',
      },
      {
        id: 'heavy_pistol',
        name: 'Heavy Pistol',
        nameEn: 'Heavy Pistol',
        nameRu: 'Тяжёлый пистолет (Heavy Pistol)',
        actionType: 'action',
        attackBonus: 12,
        damageDice: '3d6',
        damageType: 'kinetic',
        description: 'Secondary heavy caliber sidearm.',
        descEn: 'Secondary heavy caliber sidearm.',
        descRu: 'Запасное крупнокалиберное оружие.',
      },
    ],
    notesEn: 'Heavily armored cyborg hired for base assault and demolition.',
    notesRu: 'Тяжело вооружённый киборг, нанимаемый для штурма укреплённых баз.',
  },

  // 24. Club Bouncer
  club_bouncer: {
    id: 'club_bouncer',
    nameEn: 'Club Bouncer',
    nameRu: 'Вышибала клуба (Club Bouncer)',
    role: 'Solo',
    roleRu: 'Соло',
    stats: { int: 4, ref: 6, dex: 6, tech: 3, cool: 6, will: 6, luck: 2, move: 5, body: 9, emp: 4 },
    headSp: 7,
    bodySp: 7,
    actions: [
      {
        id: 'brass_knuckles',
        name: 'Heavy Fist',
        nameEn: 'Heavy Fist',
        nameRu: 'Кастет / Кулачный удар (Heavy Fist)',
        actionType: 'action',
        attackBonus: 12,
        damageDice: '3d6',
        damageType: 'bludgeoning',
        description: 'Heavy right hook from a seasoned brawler.',
        descEn: 'Heavy right hook from a seasoned brawler.',
        descRu: 'Мощный хук тренированного громилы.',
      },
      {
        id: 'heavy_stunner',
        name: 'Stun Baton',
        nameEn: 'Stun Baton',
        nameRu: 'Шокер повышенной мощности (Stun Baton)',
        actionType: 'action',
        attackBonus: 10,
        damageDice: '2d6',
        damageType: 'electrical',
        description: 'Pacifies unruly club patrons.',
        descEn: 'Pacifies unruly club patrons.',
        descRu: 'Успокаивает буйных посетителей клуба.',
      },
    ],
    notesEn: 'Security guard at Afterlife or Totentanz club, skilled in brawling and crowd control.',
    notesRu: 'Охрана ночного клуба «Посмертие» или «Totentanz», знаток рукопашного боя.',
  },

  // 25. Drone Operator
  drone_operator: {
    id: 'drone_operator',
    nameEn: 'Drone Operator',
    nameRu: 'Оператор боевых дронов (Drone Operator)',
    role: 'Tech',
    roleRu: 'Техник',
    stats: { int: 8, ref: 6, dex: 6, tech: 8, cool: 5, will: 6, luck: 4, move: 5, body: 5, emp: 5 },
    headSp: 7,
    bodySp: 7,
    actions: [
      {
        id: 'drone_attack',
        name: 'Attack Drone MG',
        nameEn: 'Attack Drone MG',
        nameRu: 'Огонь боевого дрона (Attack Drone MG)',
        actionType: 'action',
        attackBonus: 13,
        damageDice: '4d6',
        damageType: 'kinetic',
        description: 'Remote linked machine gun fire from hovering aerial drone.',
        descEn: 'Remote linked machine gun fire from hovering aerial drone.',
        descRu: 'Дистанционный огонь летающего разведывательно-ударного дрона.',
      },
      {
        id: 'smg',
        name: 'Compact SMG',
        nameEn: 'Compact SMG',
        nameRu: 'Компактный ПП (Compact SMG)',
        actionType: 'action',
        attackBonus: 10,
        damageDice: '2d6',
        damageType: 'kinetic',
        description: 'Personal self-defense firearm for operator safety.',
        descEn: 'Personal self-defense firearm for operator safety.',
        descRu: 'Оружие оператора для личной защиты.',
      },
    ],
    notesEn: 'Remote specialist piloting ground and air combat drones.',
    notesRu: 'Специалист по дистанционному управлению наземными и воздушными боевыми дронами.',
  },
};

/**
 * Static dictionary of pre-built starter NPCs.
 * Built with English names by default for canonical system interoperability.
 */
export const CYBERPUNK_STARTER_NPCS: Record<string, UniversalCreature> = Object.fromEntries(
  Object.entries(TEMPLATE_CONFIGS).map(([key, cfg]) => [key, buildTemplateCreature(cfg, 'en')])
);

/**
 * Retrieves a single Cyberpunk RED template by ID, localized to the requested language.
 */
export function getCyberpunkTemplate(id: string, lang?: SupportedLanguage): UniversalCreature | undefined {
  const cfg = TEMPLATE_CONFIGS[id];
  if (!cfg) return undefined;
  const effectiveLang = lang || getCurrentLanguage();
  return buildTemplateCreature(cfg, effectiveLang);
}

/**
 * Retrieves all 25 Cyberpunk RED starter NPC templates, localized to the requested language.
 */
export function getAllCyberpunkTemplates(lang?: SupportedLanguage): UniversalCreature[] {
  const effectiveLang = lang || getCurrentLanguage();
  return Object.values(TEMPLATE_CONFIGS).map((cfg) => buildTemplateCreature(cfg, effectiveLang));
}
