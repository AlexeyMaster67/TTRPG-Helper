import { Combatant, createDefaultCombatant, CombatLogEntry } from '../../types/combat';
import { broadcastService } from '../../services/broadcastService';
import { debouncedSaveActiveCombat } from '../../services/combatDiskStorage';
import { getSystemById } from '../../systems/registry';
import { CombatSnapshot } from './types';

export function debouncedAutosave(state: {
  combatants: Combatant[];
  currentTurnIndex: number;
  roundCounter: number;
  activeCombatantId: string | null;
  inspectedCombatantId?: string | null;
  combatLog?: CombatLogEntry[];
  systemId?: string;
  systemVersion?: string;
  activeEffects?: Record<string, any[]>;
}) {
  debouncedSaveActiveCombat(state, 300);
  broadcastService.send({
    type: 'SYNC_COMBAT_STATE',
    payload: {
      combatants: state.combatants,
      currentTurnIndex: state.currentTurnIndex,
      roundCounter: state.roundCounter,
      activeCombatantId: state.activeCombatantId,
      activeEffects: state.activeEffects,
    },
  });
}

export function createSnapshot(state: {
  combatants: Combatant[];
  currentTurnIndex: number;
  roundCounter: number;
  activeCombatantId: string | null;
  inspectedCombatantId?: string | null;
  combatLog?: CombatLogEntry[];
  systemId?: string;
  systemVersion?: string;
  activeEffects?: Record<string, any[]>;
}, desc?: string): CombatSnapshot {
  return {
    systemId: state.systemId || 'dnd5e_2024',
    systemVersion: state.systemVersion || '2.0.0',
    combatants: JSON.parse(JSON.stringify(state.combatants)),
    currentTurnIndex: state.currentTurnIndex,
    roundCounter: state.roundCounter,
    activeCombatantId: state.activeCombatantId,
    inspectedCombatantId: state.inspectedCombatantId ?? null,
    combatLog: [...(state.combatLog || [])],
    description: desc,
    activeEffects: state.activeEffects ? JSON.parse(JSON.stringify(state.activeEffects)) : {},
  };
}

export function getCombatantConMod(combatant: Combatant): number {
  const sb = combatant.statblock;
  if (!sb) return 0;
  const saves = sb.saves as Record<string, number> | undefined;
  if (saves) {
    for (const key of ['con', 'Constitution', 'con_save', 'Телосложение', 'тел']) {
      if (typeof saves[key] === 'number') {
        return saves[key];
      }
    }
  }
  const conScore = typeof sb.con === 'number' ? sb.con : 10;
  return Math.floor((conScore - 10) / 2);
}

export function createSampleCombatants(): Combatant[] {
  return [
    createDefaultCombatant({
      name: 'Вампир (Босс)',
      nameRu: 'Вампир (Босс)',
      cr: '13',
      creatureType: 'Средняя нежить, законно-злой',
      hp: 195,
      maxHp: 195,
      ac: 16,
      initiative: 22,
      initBonus: 14,
      speed: '30 фт., лазание 30 фт.',
      color: '#E01A22',
      tokenX: 450,
      tokenY: 150,
      legendaryActions: { current: 3, max: 3 },
      statblock: {
        id: 'vampire',
        name_en: 'Vampire',
        name_ru: 'Вампир',
        size: 'Medium',
        size_ru: 'Средний',
        creature_type: 'undead',
        creature_type_ru: 'нежить',
        alignment: 'lawful evil',
        ac: 16,
        hp_average: 195,
        hp_formula: '17d8 + 68',
        speed: '30 фт., лазание 30 фт.',
        init_bonus: 14,
        passive_init: 24,
        cr: '13',
        pb: 5,
        str: 18,
        dex: 18,
        con: 18,
        intellect: 17,
        wis: 15,
        cha: 18,
        saves: { DEX: 9, WIS: 7, CHA: 9 },
        skills: { Perception: 7, Stealth: 9 },
        damage_vulnerabilities: '',
        damage_resistances: 'Некротический; Дробящий, Колющий и Рубящий от немагических атак',
        damage_immunities: '',
        condition_immunities: 'Очарованный, Испуганный, Отравленный',
        senses: 'Тёмное зрение 120 фт., Пасс. Внимание 17',
        languages: 'Общий и 2 других языка',
        source: 'MM 2024',
        is_srd: true,
        spells: [],
        traits: [
          {
            name: 'Регенерация (Regeneration)',
            desc: 'Вампир восстанавливает 20 хитов в начале своего хода, если у него есть хотя бы 1 хит и он не находится под солнечным светом или проточной водой.'
          },
          {
            name: 'Паучье лазание (Spider Climb)',
            desc: 'Вампир может лазать по сложным вертикальным поверхностям и потолкам без проверок.'
          },
          {
            name: 'Слабости вампира (Vampire Weaknesses)',
            desc: 'Запрет на вход в жилище без приглашения, 20 урона от проточной воды в конце хода, кол в сердце в гробу парализует, солнечный свет наносит 20 урона излучением.'
          }
        ],
        actions: [
          {
            name: 'Мультиатака (Multiattack)',
            desc: 'Вампир совершает две атаки Ударом когтями и применяет Укус.'
          },
          {
            name: 'Удар когтями (Grave Strike)',
            attack_bonus: 9,
            damage_dice: '1d8+4',
            damage_bonus: 4,
            damage_type: 'Slashing',
            desc: 'Рукопашная атака: +9 к попаданию, досягаемость 5 фт. Попадание: 8 (1d8 + 4) рубящего урона плюс 7 (2d6) некротического урона. Захват цели (escape DC 14).'
          },
          {
            name: 'Укус (Bite)',
            attack_bonus: 9,
            damage_dice: '1d6+4',
            damage_bonus: 4,
            damage_type: 'Piercing',
            desc: 'Спасбросок Телосложения Сл 17. Провал: 7 (1d6 + 4) колющего урона плюс 14 (4d6) некротического урона. Максимум ХП цели снижается, вампир исцеляется.'
          }
        ],
        bonus_actions: [],
        reactions: [
          {
            name: 'Ускользание в туман (Misty Escape)',
            desc: 'Когда вампир получает урон, он превращается в туман и перемещается до 30 фт. без провоцирования атак.'
          }
        ],
        legendary_actions: [
          {
            name: 'Перемещение (Move)',
            desc: 'Вампир перемещается на свою скорость без провоцирования атак.'
          },
          {
            name: 'Удар когтями (Claw Attack)',
            desc: 'Вампир совершает одну атаку Ударом когтями.'
          },
          {
            name: 'Укус (Bite - 2 действия)',
            desc: 'Вампир совершает атаку Укусом (тратит 2 действия).'
          }
        ]
      }
    }, 0),
    createDefaultCombatant({
      name: 'Elf Ranger (Player)',
      nameRu: 'Эльф-следопыт (Игрок)',
      isPlayer: true,
      color: '#10B981',
      hp: 48,
      maxHp: 48,
      ac: 15,
      initiative: 18,
      initBonus: 3,
      speed: '35 фт.',
      tokenX: 150,
      tokenY: 150,
      statblock: {
        id: 'player-ranger',
        name_en: 'Elf Ranger (Player)',
        name_ru: 'Эльф-следопыт (Игрок)',
        size: 'Medium',
        size_ru: 'Средний',
        creature_type: 'humanoid',
        creature_type_ru: 'гуманоид (эльф)',
        alignment: 'neutral good',
        ac: 15,
        hp_average: 48,
        hp_formula: '6d10 + 12',
        speed: '35 фт.',
        init_bonus: 3,
        passive_init: 13,
        cr: 'Игрок (Ур. 5)',
        pb: 3,
        str: 12,
        dex: 17,
        con: 14,
        intellect: 10,
        wis: 15,
        cha: 8,
        saves: { STR: 4, DEX: 6 },
        skills: { Perception: 5, Stealth: 6, Survival: 5 },
        damage_vulnerabilities: '',
        damage_resistances: '',
        damage_immunities: '',
        condition_immunities: '',
        senses: 'Тёмное зрение 60 фт., Пасс. Внимание 15',
        languages: 'Общий, Эльфийский',
        source: 'PHB 2024',
        is_srd: true,
        spells: [],
        traits: [
          {
            name: 'Наследие фей (Fey Ancestry)',
            desc: 'Преимущество на спасброски против очарования, магия не может усыпить.'
          },
          {
            name: 'Метка охотника (Hunter’s Mark)',
            desc: 'Бонусным действием накладывает метку: +1d6 урона при попадании оружием.'
          }
        ],
        actions: [
          {
            name: 'Длинный лук (Longbow)',
            attack_bonus: 8,
            damage_dice: '1d8+3',
            damage_bonus: 3,
            damage_type: 'Piercing',
            desc: 'Дальнобойная атака: +8 к попаданию, дистанция 150/600 фт. Попадание: 7 (1d8 + 3) колющего урона. Weapon Mastery: Slow.'
          },
          {
            name: 'Короткий меч (Shortsword)',
            attack_bonus: 6,
            damage_dice: '1d6+3',
            damage_bonus: 3,
            damage_type: 'Piercing',
            desc: 'Рукопашная атака: +6 к попаданию, досягаемость 5 фт. Попадание: 6 (1d6 + 3) колющего урона. Weapon Mastery: Vex.'
          }
        ],
        bonus_actions: [],
        reactions: [],
        legendary_actions: []
      }
    }, 1),
    createDefaultCombatant({
      name: 'Guard #1',
      nameRu: 'Стражник #1',
      cr: '1/8',
      creatureType: 'Средний гуманоид, нейтральный',
      hp: 11,
      maxHp: 11,
      ac: 16,
      initiative: 15,
      initBonus: 1,
      speed: '30 фт.',
      color: '#3B82F6',
      tokenX: 450,
      tokenY: 270,
      statblock: {
        id: 'guard-1',
        name_en: 'Guard #1',
        name_ru: 'Стражник #1',
        size: 'Medium',
        size_ru: 'Средний',
        creature_type: 'humanoid',
        creature_type_ru: 'гуманоид',
        alignment: 'any alignment',
        ac: 16,
        hp_average: 11,
        hp_formula: '2d8 + 2',
        speed: '30 фт.',
        init_bonus: 1,
        passive_init: 11,
        cr: '1/8',
        pb: 2,
        str: 13,
        dex: 12,
        con: 12,
        intellect: 10,
        wis: 11,
        cha: 10,
        saves: {},
        skills: { Perception: 2 },
        damage_vulnerabilities: '',
        damage_resistances: '',
        damage_immunities: '',
        condition_immunities: '',
        senses: 'Пасс. Внимание 12',
        languages: 'Общий',
        source: 'MM 2024',
        is_srd: true,
        spells: [],
        traits: [],
        actions: [
          {
            name: 'Копьё (Spear)',
            attack_bonus: 3,
            damage_dice: '1d6+1',
            damage_bonus: 1,
            damage_type: 'Piercing',
            desc: 'Рукопашная или дальнобойная атака: +3 к попаданию, досягаемость 5 фт. или дистанция 20/60 фт. Попадание: 4 (1d6 + 1) колющего урона.'
          }
        ],
        bonus_actions: [],
        reactions: [],
        legendary_actions: []
      }
    }, 2),
    createDefaultCombatant({
      name: 'Guard #2',
      nameRu: 'Стражник #2',
      cr: '1/8',
      creatureType: 'Средний гуманоид, нейтральный',
      hp: 11,
      maxHp: 11,
      ac: 16,
      initiative: 11,
      initBonus: 1,
      speed: '30 фт.',
      color: '#3B82F6',
      tokenX: 450,
      tokenY: 390,
      statblock: {
        id: 'guard-2',
        name_en: 'Guard #2',
        name_ru: 'Стражник #2',
        size: 'Medium',
        size_ru: 'Средний',
        creature_type: 'humanoid',
        creature_type_ru: 'гуманоид',
        alignment: 'any alignment',
        ac: 16,
        hp_average: 11,
        hp_formula: '2d8 + 2',
        speed: '30 фт.',
        init_bonus: 1,
        passive_init: 11,
        cr: '1/8',
        pb: 2,
        str: 13,
        dex: 12,
        con: 12,
        intellect: 10,
        wis: 11,
        cha: 10,
        saves: {},
        skills: { Perception: 2 },
        damage_vulnerabilities: '',
        damage_resistances: '',
        damage_immunities: '',
        condition_immunities: '',
        senses: 'Пасс. Внимание 12',
        languages: 'Общий',
        source: 'MM 2024',
        is_srd: true,
        spells: [],
        traits: [],
        actions: [
          {
            name: 'Копьё (Spear)',
            attack_bonus: 3,
            damage_dice: '1d6+1',
            damage_bonus: 1,
            damage_type: 'Piercing',
            desc: 'Рукопашная или дальнобойная атака: +3 к попаданию, досягаемость 5 фт. или дистанция 20/60 фт. Попадание: 4 (1d6 + 1) колющего урона.'
          }
        ],
        bonus_actions: [],
        reactions: [],
        legendary_actions: []
      }
    }, 3),
  ];
}

export const defaultInitialCombatants = createSampleCombatants();

/**
 * Safe campaign duplication helper function.
 * Creates a new campaign/combat copy targeted at a new rule system without mutating original.
 */
export function duplicateCampaignInSystem(
  campaignData: {
    name?: string;
    systemId?: string;
    system_id?: string;
    systemVersion?: string;
    combatants?: any[];
    [key: string]: any;
  },
  targetSystemId: string
): {
  success: boolean;
  warning: string;
  duplicatedCampaign: any;
} {
  const targetMeta = getSystemById(targetSystemId);
  const warning = `Кампания успешно скопирована в систему ${targetMeta.name} (${targetSystemId}). Внимание: механики, классы брони, состояния и действия могут отличаться между редакциями. Пожалуйста, проверьте характеристики участников.`;

  const clone = JSON.parse(JSON.stringify(campaignData));
  clone.systemId = targetSystemId;
  clone.systemVersion = targetMeta.version;
  clone.system_id = targetSystemId;
  clone.system_version = targetMeta.version;

  if (clone.name) {
    clone.name = `${clone.name} (${targetMeta.name})`;
  }

  if (Array.isArray(clone.combatants)) {
    clone.combatants = clone.combatants.map((c: any, index: number) => ({
      ...c,
      id: `dup_${Date.now()}_${index}_${c.id || 'c'}`,
      name: `${c.name || 'Существо'} (${targetMeta.name})`,
      system_id: targetSystemId,
      system_version: targetMeta.version,
      systemId: targetSystemId,
      systemVersion: targetMeta.version,
    }));
  }

  return {
    success: true,
    warning,
    duplicatedCampaign: clone,
  };
}
