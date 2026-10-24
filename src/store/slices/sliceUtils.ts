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
      name_en: 'Vampire (Boss)',
      nameRu: 'Вампир (Босс)',
      cr: '13',
      creatureType: 'undead',
      creatureTypeRu: 'нежить',
      hp: 195,
      maxHp: 195,
      ac: 16,
      initiative: 22,
      initBonus: 14,
      speed: '40 ft., climb 40 ft.',
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
        hp_formula: '23d8 + 92',
        speed: '40 ft., climb 40 ft.',
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
        damage_resistances: 'Necrotic; Bludgeoning, Piercing, and Slashing from Nonmagical Attacks',
        damage_immunities: '',
        condition_immunities: 'Charmed, Frightened, Poisoned',
        senses: 'Darkvision 120 ft., Passive Perception 17',
        languages: 'Common plus two other languages',
        source: 'SRD 5.2.1 / MM 2024',
        is_srd: true,
        spells: [],
        traits: [
          {
            name: 'Легендарное сопротивление (Legendary Resistance 3/Day)',
            name_en: 'Legendary Resistance (3/Day, or 4/Day in Lair)',
            desc: 'Если вампир проваливает спасбросок, он может вместо этого сделать его успешным.',
            desc_en: 'If the vampire fails a saving throw, it can choose to succeed instead.',
          },
          {
            name: 'Ускользание в туман (Misty Escape)',
            name_en: 'Misty Escape',
            desc: 'Если хиты вампира опускаются до 0 вне места отдыха, он превращается в облако тумана. Он должен добраться до места отдыха в течение 2 часов.',
            desc_en: 'If the vampire drops to 0 Hit Points outside its resting place, the vampire uses Shape-Shift to become mist (no action required). It must reach its resting place within 2 hours or be destroyed.',
          },
          {
            name: 'Паучье лазание (Spider Climb)',
            name_en: 'Spider Climb',
            desc: 'Вампир может лазать по сложным вертикальным поверхностям и потолкам без проверок характеристик.',
            desc_en: 'The vampire can climb difficult surfaces, including along ceilings, without needing to make an ability check.',
          },
          {
            name: 'Слабости вампира (Vampire Weaknesses)',
            name_en: 'Vampire Weaknesses',
            desc: 'Запрет на вход в жилище без приглашения; 20 урона кислотой от проточной воды в конце хода; кол в сердце парализует; 20 урона излучением от солнечного света в начале хода.',
            desc_en: "Forbiddance: The vampire can't enter a residence without an invitation from an occupant. Running Water: Takes 20 Acid damage if it ends its turn in running water. Stake to the Heart: Paralyzed if wooden piercing weapon is driven into heart in resting place. Sunlight: Takes 20 Radiant damage if it starts its turn in sunlight.",
          },
        ],
        actions: [
          {
            name: 'Мультиатака (Multiattack)',
            name_en: 'Multiattack',
            desc: 'Вампир совершает две атаки Могильным ударом и применяет Укус.',
            desc_en: 'The vampire makes two Grave Strike attacks and uses Bite.',
          },
          {
            name: 'Могильный удар (Grave Strike)',
            name_en: 'Grave Strike',
            attack_bonus: 9,
            damage_dice: '1d8+4',
            damage_bonus: 4,
            damage_type: 'Slashing',
            desc: 'Рукопашная атака оружием: +9 к попаданию, досягаемость 5 фт. Попадание: 8 (1d8 + 4) дробящего урона плюс 7 (2d6) некротического урона. Захват цели (СЛ высвобождения 14).',
            desc_en: 'Melee Attack Roll: +9, reach 5 ft. Hit: 8 (1d8 + 4) Bludgeoning damage plus 7 (2d6) Necrotic damage. If the target is Large or smaller, it is Grappled (escape DC 14).',
          },
          {
            name: 'Укус (Bite)',
            name_en: 'Bite',
            attack_bonus: 9,
            damage_dice: '1d4+4',
            damage_bonus: 4,
            damage_type: 'Piercing',
            desc: 'Спасбросок Телосложения: СЛ 17. Провал: 6 (1d4 + 4) колющего урона плюс 13 (3d8) некротического урона. Максимум ОЗ цели уменьшается на количество некротического урона, вампир восстанавливает столько же ОЗ.',
            desc_en: 'Constitution Saving Throw: DC 17, one creature within 5 feet that is willing or Grappled/Incapacitated/Restrained. Failure: 6 (1d4 + 4) Piercing damage plus 13 (3d8) Necrotic damage. Target HP max decreases by necrotic damage, vampire regains HP.',
          },
        ],
        bonus_actions: [
          {
            name: 'Очарование (Charm)',
            name_en: 'Charm (Recharge 5–6)',
            desc: 'Вампир творит Очарование личности (СЛ 17), не требуя компонентов заклинания.',
            desc_en: 'The vampire casts Charm Person (spell save DC 17), requiring no spell components. The duration is 24 hours.',
          },
          {
            name: 'Смена формы (Shape-Shift)',
            name_en: 'Shape-Shift',
            desc: 'Вампир превращается в крошечную летучую мышь или облако тумана.',
            desc_en: 'The vampire shape-shifts into a Tiny bat (Speed 5 ft., Fly 30 ft.) or a Medium cloud of mist (Speed 5 ft., Fly 20 ft. hover), or returns to vampire form.',
          },
        ],
        reactions: [
          {
            name: 'Превращение в туман (Misty Escape)',
            name_en: 'Misty Escape',
            desc: 'Когда вампир получает урон, он превращается в туман и перемещается до 30 фт. без провоцирования атак.',
            desc_en: 'When the vampire takes damage, it transforms into mist and moves up to 30 ft. without provoking opportunity attacks.',
          },
        ],
        legendary_actions: [
          {
            name: 'Обмануть (Beguile)',
            name_en: 'Beguile',
            desc: 'Вампир сотворяет Приказ (СЛ 17), не требуя компонентов заклинания. Не может повторять это действие до начала своего следующего хода.',
            desc_en: 'The vampire casts Command, requiring no spell components and using Charisma as spellcasting ability (spell save DC 17). The vampire cannot take this action again until the start of its next turn.',
          },
          {
            name: 'Бессмертный удар (Deathless Strike)',
            name_en: 'Deathless Strike',
            desc: 'Вампир перемещается на половину своей скорости и совершает одну атаку Могильным ударом.',
            desc_en: 'The vampire moves up to half its Speed, and it makes one Grave Strike attack.',
          },
          {
            name: 'Перемещение (Move)',
            name_en: 'Move',
            desc: 'Вампир перемещается на свою скорость без провоцирования атак.',
            desc_en: 'The vampire moves up to its speed without provoking opportunity attacks.',
          },
          {
            name: 'Удар когтями (Claw Attack)',
            name_en: 'Claw Attack',
            desc: 'Вампир совершает одну атаку Ударом когтями.',
            desc_en: 'The vampire makes one claw attack.',
          },
          {
            name: 'Укус (Bite - 2 действия)',
            name_en: 'Bite (Costs 2 Actions)',
            desc: 'Вампир совершает атаку Укусом (тратит 2 действия).',
            desc_en: 'The vampire makes one bite attack.',
          },
        ],
      },
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
      speed: '35 ft.',
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
        speed: '35 ft.',
        init_bonus: 3,
        passive_init: 13,
        cr: 'Player (Lvl 5)',
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
        senses: 'Darkvision 60 ft., Passive Perception 15',
        languages: 'Common, Elvish',
        source: 'PHB 2024',
        is_srd: true,
        spells: [],
        traits: [
          {
            name: 'Наследие фей (Fey Ancestry)',
            name_en: 'Fey Ancestry',
            desc: 'Преимущество на спасброски против очарования, магия не может усыпить.',
            desc_en: 'You have advantage on saving throws against being charmed, and magic cannot put you to sleep.',
          },
          {
            name: 'Метка охотника (Hunter’s Mark)',
            name_en: "Hunter's Mark",
            desc: 'Бонусным действием накладывает метку: +1d6 урона при попадании оружием.',
            desc_en: 'As a bonus action, mark a creature: +1d6 damage whenever you hit it with a weapon attack.',
          },
        ],
        actions: [
          {
            name: 'Длинный лук (Longbow)',
            name_en: 'Longbow',
            attack_bonus: 8,
            damage_dice: '1d8+3',
            damage_bonus: 3,
            damage_type: 'Piercing',
            desc: 'Дальнобойная атака: +8 к попаданию, дистанция 150/600 фт. Попадание: 7 (1d8 + 3) колющего урона. Weapon Mastery: Slow.',
            desc_en: 'Ranged Attack Roll: +8, range 150/600 ft., one target. Hit: 7 (1d8 + 3) Piercing damage. Weapon Mastery: Slow.',
          },
          {
            name: 'Короткий меч (Shortsword)',
            name_en: 'Shortsword',
            attack_bonus: 6,
            damage_dice: '1d6+3',
            damage_bonus: 3,
            damage_type: 'Piercing',
            desc: 'Рукопашная атака: +6 к попаданию, досягаемость 5 фт. Попадание: 6 (1d6 + 3) колющего урона. Weapon Mastery: Vex.',
            desc_en: 'Melee Attack Roll: +6, reach 5 ft., one target. Hit: 6 (1d6 + 3) Piercing damage. Weapon Mastery: Vex.',
          },
        ],
        bonus_actions: [],
        reactions: [],
        legendary_actions: [],
      },
    }, 1),
    createDefaultCombatant({
      name: 'Guard #1',
      nameRu: 'Стражник #1',
      cr: '1/8',
      creatureType: 'humanoid',
      creatureTypeRu: 'гуманоид',
      hp: 11,
      maxHp: 11,
      ac: 16,
      initiative: 15,
      initBonus: 1,
      speed: '30 ft.',
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
        speed: '30 ft.',
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
        senses: 'Passive Perception 11',
        languages: 'Common',
        source: 'SRD 5.2.1 / MM 2024',
        is_srd: true,
        spells: [],
        traits: [],
        actions: [
          {
            name: 'Копьё (Spear)',
            name_en: 'Spear',
            attack_bonus: 3,
            damage_dice: '1d6+1',
            damage_bonus: 1,
            damage_type: 'Piercing',
            desc: 'Рукопашная или дальнобойная атака: +3 к попаданию, досягаемость 5 фт. или дистанция 20/60 фт. Попадание: 4 (1d6 + 1) колющего урона.',
            desc_en: 'Melee or Ranged Attack Roll: +3, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d6 + 1) Piercing damage.',
          },
        ],
        bonus_actions: [],
        reactions: [],
        legendary_actions: [],
      },
    }, 2),
    createDefaultCombatant({
      name: 'Guard #2',
      nameRu: 'Стражник #2',
      cr: '1/8',
      creatureType: 'humanoid',
      creatureTypeRu: 'гуманоид',
      hp: 11,
      maxHp: 11,
      ac: 16,
      initiative: 11,
      initBonus: 1,
      speed: '30 ft.',
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
        speed: '30 ft.',
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
        senses: 'Passive Perception 11',
        languages: 'Common',
        source: 'SRD 5.2.1 / MM 2024',
        is_srd: true,
        spells: [],
        traits: [],
        actions: [
          {
            name: 'Копьё (Spear)',
            name_en: 'Spear',
            attack_bonus: 3,
            damage_dice: '1d6+1',
            damage_bonus: 1,
            damage_type: 'Piercing',
            desc: 'Рукопашная или дальнобойная атака: +3 к попаданию, досягаемость 5 фт. или дистанция 20/60 фт. Попадание: 4 (1d6 + 1) колющего урона.',
            desc_en: 'Melee or Ranged Attack Roll: +3, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d6 + 1) Piercing damage.',
          },
        ],
        bonus_actions: [],
        reactions: [],
        legendary_actions: [],
      },
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
