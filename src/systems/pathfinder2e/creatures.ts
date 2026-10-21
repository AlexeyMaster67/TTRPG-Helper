/**
 * TTRPG Helper - Pathfinder 2e Starter Bestiary Creatures
 * Implements 5 foundational PF2e creatures:
 * Goblin Warrior, Orc Brute, Skeleton Guard, Zombie Shambler, Young Red Dragon.
 */

import { UniversalCreature, CreatureAction } from '../../types/system';

interface Pf2eCreatureConfig {
  id: string;
  name: string;
  level: number;
  hp: number;
  ac: number;
  perception: number;
  speed: number;
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  actions: CreatureAction[];
  immunities?: string[];
  resistances?: Record<string, number>;
  weaknesses?: Record<string, number>;
  notes: string;
}

function createPf2eCreature(cfg: Pf2eCreatureConfig): UniversalCreature {
  return {
    id: cfg.id,
    name: cfg.name,
    systemId: 'pathfinder2e',
    systemVersion: '1.0.0',
    isPlayer: false,
    stats: {
      str: cfg.stats.str,
      dex: cfg.stats.dex,
      con: cfg.stats.con,
      int: cfg.stats.int,
      wis: cfg.stats.wis,
      cha: cfg.stats.cha,
      ac: cfg.ac,
      hp: cfg.hp,
      maxHp: cfg.hp,
      perception: cfg.perception,
      initiative: cfg.perception,
      initBonus: cfg.perception,
      speed: cfg.speed,
      level: cfg.level,
      conMod: cfg.stats.con,
    },
    resources: {
      hp: {
        current: cfg.hp,
        max: cfg.hp,
        resetOn: 'long_rest',
      },
      actions: {
        current: 3,
        max: 3,
        resetOn: 'turn',
      },
    },
    tracks: {},
    conditions: [],
    defenses: {
      damageImmunities: cfg.immunities || [],
      damageResistances: Object.keys(cfg.resistances || {}),
      damageVulnerabilities: Object.keys(cfg.weaknesses || {}),
      conditionImmunities: [],
      damageReductions: cfg.resistances || {},
    },
    actions: cfg.actions,
    senses: {
      perception: cfg.perception,
    },
    speeds: {
      walk: cfg.speed,
    },
    notes: cfg.notes,
    customFields: {
      level: cfg.level,
      weaknesses: cfg.weaknesses || {},
      resistances: cfg.resistances || {},
    },
  };
}

export const PATHFINDER2E_STARTER_CREATURES: Record<string, UniversalCreature> = {
  // 1. Goblin Warrior
  goblin_warrior: createPf2eCreature({
    id: 'goblin_warrior',
    name: 'Гоблин-воин (Goblin Warrior)',
    level: -1,
    hp: 6,
    ac: 16,
    perception: 3,
    speed: 25,
    stats: { str: 0, dex: 4, con: 1, int: 0, wis: -1, cha: 1 },
    actions: [
      {
        id: 'dogslicer',
        name: 'Собакорез (Dogslicer)',
        actionType: 'action',
        attackBonus: 8,
        damageDice: '1d6',
        damageType: 'slashing',
        description: 'Быстрое оружие с чертой Agile (штрафы MAP: -4/-8) и Finesse.',
      },
      {
        id: 'shortbow',
        name: 'Короткий лук (Shortbow)',
        actionType: 'action',
        attackBonus: 8,
        damageDice: '1d6',
        damageType: 'piercing',
        description: 'Дистанционное оружие с чертой Deadly 1d10.',
      },
      {
        id: 'goblin_scuttle',
        name: 'Гоблинское бегство (Goblin Scuttle)',
        actionType: 'reaction',
        description: 'Реакция: когда союзник завершает движение рядом, сделать шаг (Step) на 5 футов.',
      },
    ],
    notes: 'Ловкий и проворный гоблин с кривым ржавым клинком и луком.',
  }),

  // 2. Orc Brute
  orc_brute: createPf2eCreature({
    id: 'orc_brute',
    name: 'Орк-громила (Orc Brute)',
    level: 0,
    hp: 15,
    ac: 15,
    perception: 3,
    speed: 25,
    stats: { str: 4, dex: 1, con: 3, int: -1, wis: 1, cha: -1 },
    actions: [
      {
        id: 'greataxe',
        name: 'Двуручный топор (Greataxe)',
        actionType: 'action',
        attackBonus: 7,
        damageDice: '1d12+4',
        damageType: 'slashing',
        description: 'Мощный рубящий удар секирой с чертой Sweep.',
      },
      {
        id: 'iron_fist',
        name: 'Железный кулак (Fist)',
        actionType: 'action',
        attackBonus: 7,
        damageDice: '1d4+4',
        damageType: 'bludgeoning',
        description: 'Быстрый удар кулаком с чертой Agile.',
      },
      {
        id: 'orc_ferocity',
        name: 'Орочья свирепость (Orc Ferocity)',
        actionType: 'reaction',
        description: 'Реакция: при падении до 0 HP остаётся на 1 HP и получает состояние Wounded 1.',
      },
    ],
    notes: 'Яростный оркский воин, не сдающийся даже перед лицом неминуемой смерти.',
  }),

  // 3. Skeleton Guard
  skeleton_guard: createPf2eCreature({
    id: 'skeleton_guard',
    name: 'Скелет-страж (Skeleton Guard)',
    level: -1,
    hp: 4,
    ac: 16,
    perception: 2,
    speed: 25,
    stats: { str: 2, dex: 4, con: 0, int: -5, wis: 0, cha: 0 },
    immunities: ['death', 'disease', 'paralyzed', 'poison', 'bleed', 'unconscious'],
    resistances: { cold: 5, piercing: 5, slashing: 5 },
    actions: [
      {
        id: 'scythe',
        name: 'Коса (Scythe)',
        actionType: 'action',
        attackBonus: 6,
        damageDice: '1d10+2',
        damageType: 'slashing',
        description: 'Смертоносная коса с чертой Deadly 1d10 и Trip.',
      },
      {
        id: 'claw',
        name: 'Когти (Claw)',
        actionType: 'action',
        attackBonus: 6,
        damageDice: '1d4+2',
        damageType: 'slashing',
        description: 'Быстрый удар костяными когтями с чертой Agile.',
      },
    ],
    notes: 'Оживлённый скелет воина. Костяной остов устойчив к холоду, колющему и рубящему урону (Сопротивление 5).',
  }),

  // 4. Zombie Shambler
  zombie_shambler: createPf2eCreature({
    id: 'zombie_shambler',
    name: 'Бродячий зомби (Zombie Shambler)',
    level: -1,
    hp: 20,
    ac: 12,
    perception: 0,
    speed: 25,
    stats: { str: 3, dex: -2, con: 2, int: -5, wis: 0, cha: -2 },
    immunities: ['death', 'disease', 'paralyzed', 'poison', 'bleed', 'unconscious'],
    weaknesses: { slashing: 5, positive: 5 },
    actions: [
      {
        id: 'fist',
        name: 'Тяжёлый удар кулаком (Fist Slam)',
        actionType: 'action',
        attackBonus: 7,
        damageDice: '1d6+3',
        damageType: 'bludgeoning',
        description: 'Сокрушительный удар гнилой рукой. Черта Grab.',
      },
      {
        id: 'jaws',
        name: 'Челюсти (Jaws Bite)',
        actionType: 'action',
        attackBonus: 7,
        damageDice: '1d8+3',
        damageType: 'piercing',
        description: 'Укус зомби против схваченной цели.',
      },
    ],
    notes: 'Медлительная ходячая нежить. Уязвима к рубящему и позитивному урону (Слабость 5). Постоянно замедлена (Slow 1).',
  }),

  // 5. Young Red Dragon
  young_dragon: createPf2eCreature({
    id: 'young_dragon',
    name: 'Молодой красный дракон (Young Red Dragon)',
    level: 10,
    hp: 210,
    ac: 30,
    perception: 20,
    speed: 40,
    stats: { str: 7, dex: 3, con: 5, int: 2, wis: 4, cha: 4 },
    immunities: ['fire', 'paralyzed', 'sleep'],
    weaknesses: { cold: 10 },
    actions: [
      {
        id: 'dragon_breath',
        name: 'Огненное дыхание (Dragon Breath)',
        actionType: 'action',
        hitDc: 30,
        saveStat: 'reflex',
        damageDice: '11d6',
        damageType: 'fire',
        description: '2 Действия. Конус 40 футов пламени (Спасбросок Рефлексов DC 30). Перезарядка 1d4 раунда.',
      },
      {
        id: 'jaws',
        name: 'Челюсти (Jaws)',
        actionType: 'action',
        attackBonus: 24,
        damageDice: '2d12+12',
        damageType: 'piercing',
        description: 'Дополнительно 2d6 урона огнём.',
      },
      {
        id: 'claw',
        name: 'Когти (Claws)',
        actionType: 'action',
        attackBonus: 24,
        damageDice: '2d8+12',
        damageType: 'slashing',
        description: 'Быстрые когти с чертой Agile (-4/-8 MAP).',
      },
      {
        id: 'draconic_frenzy',
        name: 'Драконье безумие (Draconic Frenzy)',
        actionType: 'action',
        description: '2 Действия. Дракон совершает две атаки когтями и одну атаку челюстями в произвольном порядке.',
      },
    ],
    notes: 'Свирепый владыка огня и пепла. Огнеупорен, но уязвим к холоду (Слабость 10).',
  }),
};

export function getPathfinderCreature(id: string): UniversalCreature | undefined {
  const creature = PATHFINDER2E_STARTER_CREATURES[id];
  return creature ? JSON.parse(JSON.stringify(creature)) : undefined;
}

export function getAllPathfinderCreatures(): UniversalCreature[] {
  return Object.values(PATHFINDER2E_STARTER_CREATURES).map((c) => JSON.parse(JSON.stringify(c)));
}
