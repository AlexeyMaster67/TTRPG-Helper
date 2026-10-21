/**
 * TTRPG Helper - Multi-System Registry
 * Central declarative registry of all supported, beta, and upcoming rule systems.
 * Loaded dynamically in Settings and Campaign configuration.
 */

import { SystemMetadata, UniversalCreature, SystemRuleEngine } from '../types/system';
import { Combatant } from '../types/combat';

export const RULE_ENGINES: Record<string, SystemRuleEngine> = {};

export function registerRuleEngine(engine: SystemRuleEngine): void {
  RULE_ENGINES[engine.metadata.id] = engine;
}

export function getRuleEngine(id: string): SystemRuleEngine | undefined {
  return RULE_ENGINES[id];
}

export function getAllRuleEngines(): SystemRuleEngine[] {
  return Object.values(RULE_ENGINES);
}

export const SYSTEM_REGISTRY: Record<string, SystemMetadata> = {
  // D&D Family
  srd_5_2_1: {
    id: 'srd_5_2_1',
    name: 'SRD 5.2.1',
    shortName: 'SRD 5.2.1',
    family: 'dnd5e',
    edition: '5.2.1 (CC-BY)',
    version: '1.0.0',
    status: 'stable',
    themeId: 'dnd5e',
    description: 'Официальный открытый свод правил System Reference Document 5.2 под лицензией Creative Commons.',
    shortDescription: 'Открытый контент, правила редакции 2024',
    author: 'Wizards of the Coast / Open Gaming Foundation',
    supportedFeatures: {
      spellSlots: true,
      weaponMastery: true,
      armorAblation: false,
      degreesOfSuccess: false,
      deathSaveTrack: true,
      humanityTrack: false,
      actionEconomy: 'action_bonus_reaction',
    },
  },
  dnd5e_2014: {
    id: 'dnd5e_2014',
    name: 'D&D 5e (2014)',
    shortName: 'D&D 5e (2014)',
    family: 'dnd5e',
    edition: '2014 Classic',
    version: '1.0.0',
    status: 'stable',
    themeId: 'dnd5e',
    description: 'Классическая пятая редакция: базовые классы, слоты заклинаний и классические правила истощения.',
    shortDescription: 'Классическая редакция и бестиарий 2014',
    author: 'Wizards of the Coast',
    supportedFeatures: {
      spellSlots: true,
      weaponMastery: false,
      armorAblation: false,
      degreesOfSuccess: false,
      deathSaveTrack: true,
      humanityTrack: false,
      actionEconomy: 'action_bonus_reaction',
    },
  },
  dnd5e_2024: {
    id: 'dnd5e_2024',
    name: 'D&D 5e (2024)',
    shortName: 'D&D 5e (2024)',
    family: 'dnd5e',
    edition: '2024 Revised',
    version: '2.0.0',
    status: 'beta',
    themeId: 'dnd5e',
    description: 'Обновлённая редакция 2024 года: свойства оружия (Mastery), состояние Ошеломлён (Dazed) и числовое истощение (-2/ур).',
    shortDescription: 'Обновлённые правила, мастерство оружия',
    author: 'Wizards of the Coast',
    supportedFeatures: {
      spellSlots: true,
      weaponMastery: true,
      armorAblation: false,
      degreesOfSuccess: false,
      deathSaveTrack: true,
      humanityTrack: false,
      actionEconomy: 'action_bonus_reaction',
    },
  },

  // Pathfinder Family
  pathfinder2e: {
    id: 'pathfinder2e',
    name: 'Pathfinder 2e (PF2e)',
    shortName: 'Pathfinder 2e',
    family: 'pathfinder',
    edition: 'Remastered',
    version: '1.0.0',
    status: 'beta',
    themeId: 'pathfinder2e',
    description: 'Тактическая система с 3 действиями за ход, четырьмя степенями успеха (±10) и инициативой по Восприятию.',
    shortDescription: 'Три действия за ход, степени успеха',
    author: 'Paizo / ORC License',
    supportedFeatures: {
      spellSlots: true,
      weaponMastery: false,
      armorAblation: false,
      degreesOfSuccess: true,
      deathSaveTrack: false,
      humanityTrack: false,
      actionEconomy: 'three_action',
    },
  },
  pathfinder1e: {
    id: 'pathfinder1e',
    name: 'Pathfinder 1e',
    shortName: 'Pathfinder 1e',
    family: 'pathfinder',
    edition: '1st Edition Classic',
    version: '0.1.0',
    status: 'planned',
    themeId: 'pathfinder2e',
    description: 'Классическая модульная ролевая система на базе d20 3.5 с расширенной кастомизацией классов.',
    shortDescription: 'Классическая редакция',
    author: 'Paizo Inc.',
    supportedFeatures: {
      spellSlots: true,
      weaponMastery: false,
      armorAblation: false,
      degreesOfSuccess: false,
      deathSaveTrack: false,
      humanityTrack: false,
      actionEconomy: 'action_bonus_reaction',
    },
  },

  // Cyberpunk Family
  cyberpunk_red: {
    id: 'cyberpunk_red',
    name: 'Cyberpunk RED',
    shortName: 'Cyberpunk RED',
    family: 'cyberpunk',
    edition: 'Core Rulebook System',
    version: '1.0.0',
    status: 'wip',
    themeId: 'cyberpunk-red',
    description: 'Мрачное киберпанк-будущее: REF+1d10, броня SP по зонам тела с износом при пробитии, Humanity и пороги ранений.',
    shortDescription: 'REF+1d10, броня SP по зонам, Humanity',
    author: 'R. Talsorian Games Mechanics Engine',
    supportedFeatures: {
      spellSlots: false,
      weaponMastery: false,
      armorAblation: true,
      degreesOfSuccess: false,
      deathSaveTrack: true,
      humanityTrack: true,
      actionEconomy: 'move_and_action',
    },
  },

  // Custom / Other
  custom_system: {
    id: 'custom_system',
    name: 'Своя система (Homebrew Engine)',
    shortName: 'Своя система',
    family: 'custom',
    edition: 'Пользовательская',
    version: '0.1.0',
    status: 'planned',
    themeId: 'dnd5e',
    description: 'Конструктор собственных правил: произвольные кости инициативы, настраиваемые шкалы брони и трекеры ресурсов.',
    shortDescription: 'Подключение через плагины',
    author: 'Пользовательский шаблон',
    supportedFeatures: {
      spellSlots: false,
      weaponMastery: false,
      armorAblation: false,
      degreesOfSuccess: false,
      deathSaveTrack: false,
      humanityTrack: false,
      actionEconomy: 'action_points',
    },
  },
};

export function getAllSystems(): SystemMetadata[] {
  return Object.values(SYSTEM_REGISTRY);
}

export function getSystemById(id: string): SystemMetadata {
  return SYSTEM_REGISTRY[id] || SYSTEM_REGISTRY['dnd5e_2024'];
}

export function getSystemsByFamily(family: string): SystemMetadata[] {
  return Object.values(SYSTEM_REGISTRY).filter((sys) => sys.family === family);
}

/**
 * Universal Creature Mapper for backwards compatibility with D&D 5e Combatant.
 */
export function combatantToUniversal(combatant: Combatant, systemId: string = 'dnd5e_2024'): UniversalCreature {
  const numericSpeed = parseInt(String(combatant.speed || '30').replace(/\D/g, ''), 10) || 30;

  return {
    id: combatant.id,
    name: combatant.name,
    systemId,
    systemVersion: '2.0.0',
    isPlayer: combatant.isPlayer,
    avatarUrl: combatant.avatarUrl || combatant.tokenUrl,

    stats: {
      ac: combatant.ac,
      hp: combatant.hp,
      maxHp: combatant.maxHp,
      tempHp: combatant.tempHp || 0,
      initiative: combatant.initiative,
      initBonus: combatant.initBonus || 0,
      passiveInit: combatant.passiveInit || 10,
      speed: numericSpeed,
    },

    resources: {
      hp: {
        current: combatant.hp,
        max: combatant.maxHp,
        temp: combatant.tempHp || 0,
        resetOn: 'long_rest',
      },
      legendaryActions: {
        current: combatant.legendaryActions?.current || 0,
        max: combatant.legendaryActions?.max || 0,
        resetOn: 'encounter',
      },
    },

    tracks: {
      deathSaves: {
        name: 'Спасброски от смерти',
        current: combatant.deathSaves?.successes || 0,
        max: 3,
        steps: [
          { index: 1, label: 'Успех 1' },
          { index: 2, label: 'Успех 2' },
          { index: 3, label: 'Стабилен' },
        ],
      },
    },

    conditions: (combatant.conditions || []).map((cond) => ({
      id: String(cond.type).toLowerCase(),
      name: String(cond.type),
      level: cond.level,
      source: cond.source,
      durationRounds: cond.durationRounds,
      expiryRound: cond.expiryRound,
    })),

    defenses: {
      damageImmunities: (combatant.damageImmunities || []).map(String),
      damageResistances: (combatant.damageResistances || []).map(String),
      damageVulnerabilities: (combatant.damageVulnerabilities || []).map(String),
      conditionImmunities: combatant.conditionImmunities || [],
      damageReductions: {},
    },

    actions: (combatant.statblock?.actions || []).map((a, idx) => ({
      id: `act_${idx}_${a.name}`,
      name: a.name,
      actionType: 'action',
      attackBonus: a.attack_bonus,
      damageDice: a.damage_dice,
      description: a.description,
    })),

    senses: {},
    speeds: {
      walk: numericSpeed,
    },
    notes: '',
    customFields: {
      isConcentrating: combatant.isConcentrating,
      reactionUsed: combatant.reactionUsed,
      cr: combatant.cr,
      size: combatant.size,
    },
  };
}

export function universalToCombatant(u: UniversalCreature): Combatant {
  return {
    id: u.id,
    name: u.name,
    isPlayer: u.isPlayer,
    avatarUrl: u.avatarUrl,
    tokenUrl: u.avatarUrl,
    color: '#f5b920',
    tokenScale: 1.0,
    ac: u.stats.ac || 10,
    hp: u.resources.hp?.current ?? u.stats.hp ?? 10,
    maxHp: u.resources.hp?.max ?? u.stats.maxHp ?? 10,
    tempHp: u.resources.hp?.temp ?? u.stats.tempHp ?? 0,
    initiative: u.stats.initiative || 0,
    initBonus: u.stats.initBonus || 0,
    passiveInit: u.stats.passiveInit || 10,
    speed: `${u.speeds.walk ?? u.stats.speed ?? 30} фт.`,
    conditions: u.conditions.map((c) => ({
      type: c.name as any,
      level: c.level,
      source: c.source,
      durationRounds: c.durationRounds,
      expiryRound: c.expiryRound,
    })),
    damageImmunities: (u.defenses.damageImmunities || []) as any,
    damageResistances: (u.defenses.damageResistances || []) as any,
    damageVulnerabilities: (u.defenses.damageVulnerabilities || []) as any,
    conditionImmunities: u.defenses.conditionImmunities,
    legendaryActions: {
      current: u.resources.legendaryActions?.current || 0,
      max: u.resources.legendaryActions?.max || 0,
    },
    isConcentrating: Boolean(u.customFields?.isConcentrating),
    reactionUsed: Boolean(u.customFields?.reactionUsed),
    cr: (u.customFields?.cr as string) || '1',
    size: (u.customFields?.size as any) || 'Medium',
    deathSaves: {
      successes: (u.tracks.deathSaves?.current as any) || 0,
      failures: 0,
    },
    isDying: (u.resources.hp?.current ?? 0) <= 0 && u.isPlayer,
    isDead: (u.resources.hp?.current ?? 0) <= 0 && !u.isPlayer,
  };
}
