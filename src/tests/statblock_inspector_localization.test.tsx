import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Combatant, createDefaultCombatant, DiceRollLogEntry } from '../types/combat';
import { useSettingsStore } from '../store/settingsStore';
import { useCombatStore } from '../store/combatStore';

import {
  StatblockHeader,
  StatblockSurvival,
  StatblockAbilities,
  StatblockSavingThrows,
  StatblockDefenses,
  StatblockActions,
  CombatDiceLog,
  formatCreatureSubtitle,
} from '../components/tracker/statblock';
import { StatblockInspector } from '../components/tracker/StatblockInspector';

const clean = (h: string) => h.replace(/<!--.*?-->/g, '');

const sampleMonster: Combatant = createDefaultCombatant({
  id: 'vampire-spawn-1',
  name: 'Vampire Spawn',
  nameRu: 'Вампирское отродье',
  isPlayer: false,
  hp: 82,
  maxHp: 82,
  ac: 15,
  initiative: 16,
  speed: '30 фт.',
  size: 'Medium',
  creatureType: 'Средняя нежить, законно-злой',
  cr: '5',
  statblock: {
    id: 'vampire-spawn-1',
    name_en: 'Vampire Spawn',
    name_ru: 'Вампирское отродье',
    size: 'Medium',
    type: 'Средняя нежить, законно-злой',
    alignment: 'lawful evil',
    ac: 15,
    hp_average: 82,
    hp_formula: '11d8 + 33',
    speed: '30 ft.',
    str: 16,
    dex: 16,
    con: 16,
    intellect: 11,
    wis: 10,
    cha: 12,
    pb: 3,
    saves: { DEX: 6, WIS: 3 },
    skills: { perception: 3, stealth: 6 },
    damage_resistances: 'necrotic; bludgeoning, piercing, and slashing from nonmagical attacks',
    damage_vulnerabilities: 'radiant',
    damage_immunities: 'poison',
    condition_immunities: 'charmed, exhaustion, poisoned',
    senses: 'darkvision 60 ft., passive Perception 13',
    languages: 'Common',
    cr: '5',
    xp: 1800,
    traits: [
      {
        name: 'Регенерация',
        desc: 'Отродье восстанавливает 10 хитов в начале своего хода.',
      },
    ],
    actions: [
      {
        name: 'Когти',
        name_en: 'Claws',
        attack_bonus: 6,
        damage_dice: '2d4 + 3',
        damage_type: 'slashing',
        desc: 'Рукопашная атака: +6 к попаданию, досягаемость 5 фт. Попадание: 8 (2d4 + 3) рубящего урона.',
      },
      {
        name: 'Мультиатака',
        name_en: 'Multiattack',
        desc: 'Отродье совершает две атаки, только одна из которых может быть укусом.',
      },
    ],
    bonus_actions: [
      {
        name: 'Укус',
        name_en: 'Bite',
        desc: 'Бонусное действие против схваченного существа.',
      },
    ],
    reactions: [
      {
        name: 'Парирование',
        name_en: 'Parry',
        desc: 'Добавляет +3 к КД против одной атаки.',
      },
    ],
    legendary_actions: [
      {
        name: 'Перемещение',
        name_en: 'Move',
        desc: 'Отродье перемещается на расстояние до своей скорости без провоцирования атак.',
      },
    ],
  } as any,
});

const sampleTarget: Combatant = createDefaultCombatant({
  id: 'target-hero-1',
  name: 'Hero Fighter',
  nameRu: 'Герой Боец',
  isPlayer: true,
  hp: 45,
  maxHp: 45,
  ac: 18,
  initiative: 12,
  size: 'Medium',
});

describe('Statblock Inspector Full Localization Suite (RU & EN)', () => {
  beforeEach(() => {
    useCombatStore.setState({
      combatants: [sampleMonster, sampleTarget],
      inspectedCombatantId: sampleMonster.id,
      currentTargetId: null,
      diceLog: [],
    });
  });

  describe('Item 8: Subtitle deduplication bug fix', () => {
    it('cleans up duplicated size/type/alignment in Russian', () => {
      const subtitleRu = formatCreatureSubtitle(sampleMonster, 'ru');
      expect(subtitleRu).toBe('Средняя нежить, законно-злой');
      expect(subtitleRu).not.toContain('Medium');
      expect(subtitleRu).not.toContain('lawful evil');
      expect(subtitleRu.indexOf('Средн')).toBe(subtitleRu.lastIndexOf('Средн'));
    });

    it('cleans up duplicated size/type/alignment in English', () => {
      const subtitleEn = formatCreatureSubtitle(sampleMonster, 'en');
      expect(subtitleEn).toBe('Medium undead, lawful evil');
      expect(subtitleEn).not.toContain('Средн');
      expect(subtitleEn).not.toContain('нежить');
      expect(subtitleEn).not.toContain('законно-злой');
      expect(subtitleEn.indexOf('Medium')).toBe(subtitleEn.lastIndexOf('Medium'));
      expect(subtitleEn.indexOf('lawful evil')).toBe(subtitleEn.lastIndexOf('lawful evil'));
    });

    it('handles player characters correctly in both languages', () => {
      expect(formatCreatureSubtitle(sampleTarget, 'ru')).toBe('Персонаж игрока');
      expect(formatCreatureSubtitle(sampleTarget, 'en')).toBe('Player Character');
    });
  });

  describe('Item 1, 2, 3: StatblockHeader localization', () => {
    it('renders GRID:, TARGETED ATTACK, and To Players in English', () => {
      useSettingsStore.setState({ language: 'en' });
      const html = clean(
        renderToString(
          <StatblockHeader
            combatant={sampleMonster}
            currentTarget={null}
            onClearTarget={() => {}}
            onPerformAttack={() => {}}
            onOpenTargetedAttack={() => {}}
            onShowcase={() => {}}
            onUpdateSize={() => {}}
          />
        )
      );

      expect(html).toContain('GRID:');
      expect(html).toContain('TARGETED ATTACK');
      expect(html).toContain('To Players');
      expect(html).toContain('Medium undead, lawful evil');
    });

    it('renders СЕТКА:, ПРИЦЕЛЬНАЯ АТАКА, and Игрокам in Russian', () => {
      useSettingsStore.setState({ language: 'ru' });
      const html = clean(
        renderToString(
          <StatblockHeader
            combatant={sampleMonster}
            currentTarget={null}
            onClearTarget={() => {}}
            onPerformAttack={() => {}}
            onOpenTargetedAttack={() => {}}
            onShowcase={() => {}}
            onUpdateSize={() => {}}
          />
        )
      );

      expect(html).toContain('СЕТКА:');
      expect(html).toContain('ПРИЦЕЛЬНАЯ АТАКА');
      expect(html).toContain('Игрокам');
      expect(html).toContain('Средняя нежить, законно-злой');
    });
  });

  describe('Item 4: Stat badges in StatblockSurvival', () => {
    it('renders AC, HP, SPEED, INIT. in English', () => {
      useSettingsStore.setState({ language: 'en' });
      const html = clean(
        renderToString(<StatblockSurvival combatant={sampleMonster} />)
      );

      expect(html).toContain('AC');
      expect(html).toContain('HP');
      expect(html).toContain('SPEED');
      expect(html).toContain('INIT.');
    });

    it('renders КД, ОЗ, СКОРОСТЬ, ИНИЦ. in Russian', () => {
      useSettingsStore.setState({ language: 'ru' });
      const html = clean(
        renderToString(<StatblockSurvival combatant={sampleMonster} />)
      );

      expect(html).toContain('КД');
      expect(html).toContain('ОЗ');
      expect(html).toContain('СКОРОСТЬ');
      expect(html).toContain('ИНИЦ.');
    });
  });

  describe('Item 5 & 6: StatblockAbilities & StatblockSavingThrows', () => {
    it('renders Russian stat abbreviations СИЛ, ЛОВ, ТЕЛ, ИНТ, МДР, ХАР and saving throw heading', () => {
      useSettingsStore.setState({ language: 'ru' });
      const stats = [
        { label: 'СИЛ', key: 'str', fullRu: 'Сила', score: 16 },
        { label: 'ЛОВ', key: 'dex', fullRu: 'Ловкость', score: 16 },
        { label: 'ТЕЛ', key: 'con', fullRu: 'Телосложение', score: 16 },
        { label: 'ИНТ', key: 'intellect', fullRu: 'Интеллект', score: 11 },
        { label: 'МДР', key: 'wis', fullRu: 'Мудрость', score: 10 },
        { label: 'ХАР', key: 'cha', fullRu: 'Харизма', score: 12 },
      ];
      const saves = [
        { stat: 'dex', nameRu: 'ЛОВ', fullName: 'Ловкость', bonus: 6, isProficient: true },
        { stat: 'wis', nameRu: 'МДР', fullName: 'Мудрость', bonus: 3, isProficient: true },
      ];

      const htmlGrid = clean(
        renderToString(
          <StatblockAbilities stats={stats} onRollAbilityScore={() => {}} variant="grid" />
        )
      );
      expect(htmlGrid).toContain('СИЛ');
      expect(htmlGrid).toContain('ЛОВ');
      expect(htmlGrid).toContain('ТЕЛ');
      expect(htmlGrid).toContain('ИНТ');
      expect(htmlGrid).toContain('МДР');
      expect(htmlGrid).toContain('ХАР');

      const htmlSaves = clean(
        renderToString(
          <StatblockSavingThrows saves={saves} onRollSavingThrow={() => {}} />
        )
      );
      expect(htmlSaves).toContain('Спасброски (клик для броска):');
      expect(htmlSaves).toContain('ЛОВ');
      expect(htmlSaves).toContain('МДР');
    });

    it('renders English stat abbreviations STR, DEX, CON, INT, WIS, CHA and saving throw heading', () => {
      useSettingsStore.setState({ language: 'en' });
      const stats = [
        { label: 'STR', key: 'str', fullRu: 'Strength', score: 16 },
        { label: 'DEX', key: 'dex', fullRu: 'Dexterity', score: 16 },
        { label: 'CON', key: 'con', fullRu: 'Constitution', score: 16 },
        { label: 'INT', key: 'intellect', fullRu: 'Intelligence', score: 11 },
        { label: 'WIS', key: 'wis', fullRu: 'Wisdom', score: 10 },
        { label: 'CHA', key: 'cha', fullRu: 'Charisma', score: 12 },
      ];
      const saves = [
        { stat: 'dex', nameRu: 'DEX', fullName: 'Dexterity', bonus: 6, isProficient: true },
        { stat: 'wis', nameRu: 'WIS', fullName: 'Wisdom', bonus: 3, isProficient: true },
      ];

      const htmlGrid = clean(
        renderToString(
          <StatblockAbilities stats={stats} onRollAbilityScore={() => {}} variant="grid" />
        )
      );
      expect(htmlGrid).toContain('STR');
      expect(htmlGrid).toContain('DEX');
      expect(htmlGrid).toContain('CON');
      expect(htmlGrid).toContain('INT');
      expect(htmlGrid).toContain('WIS');
      expect(htmlGrid).toContain('CHA');

      const htmlSaves = clean(
        renderToString(
          <StatblockSavingThrows saves={saves} onRollSavingThrow={() => {}} />
        )
      );
      expect(htmlSaves).toContain('Saving Throws (click to roll):');
      expect(htmlSaves).toContain('DEX');
      expect(htmlSaves).toContain('WIS');
    });
  });

  describe('Item 7: StatblockDefenses localization', () => {
    it('renders all defense headers in English', () => {
      useSettingsStore.setState({ language: 'en' });
      const html = clean(
        renderToString(<StatblockDefenses combatant={sampleMonster} />)
      );

      expect(html).toContain('Skills:');
      expect(html).toContain('Damage Vulnerabilities:');
      expect(html).toContain('Damage Resistances:');
      expect(html).toContain('Damage Immunities:');
      expect(html).toContain('Condition Immunities:');
      expect(html).toContain('Senses:');
      expect(html).toContain('Languages:');
      expect(html).toContain('Challenge:');
      expect(html).toContain('Proficiency Bonus');
    });

    it('renders all defense headers in Russian', () => {
      useSettingsStore.setState({ language: 'ru' });
      const html = clean(
        renderToString(<StatblockDefenses combatant={sampleMonster} />)
      );

      expect(html).toContain('Навыки:');
      expect(html).toContain('Уязвимости к урону:');
      expect(html).toContain('Сопротивления к урону:');
      expect(html).toContain('Иммунитеты к урону:');
      expect(html).toContain('Иммунитеты к состояниям:');
      expect(html).toContain('Чувства:');
      expect(html).toContain('Языки:');
      expect(html).toContain('Опасность:');
      expect(html).toContain('Бонус мастерства');
    });
  });

  describe('Item 9: CombatDiceLog & Action section headers', () => {
    it('renders COMBAT DICE LOG and empty prompt in English', () => {
      useSettingsStore.setState({ language: 'en' });
      const html = clean(
        renderToString(<CombatDiceLog diceLog={[]} onClearLog={() => {}} />)
      );

      expect(html).toContain('COMBAT DICE LOG');
      expect(html).toContain('Click an attack or action to roll hit and damage');
    });

    it('renders ЖУРНАЛ БРОСКОВ and empty prompt in Russian', () => {
      useSettingsStore.setState({ language: 'ru' });
      const html = clean(
        renderToString(<CombatDiceLog diceLog={[]} onClearLog={() => {}} />)
      );

      expect(html).toContain('ЖУРНАЛ БРОСКОВ');
      expect(html).toContain('Нажмите на атаку или действие для броска попадания и урона');
    });

    it('renders logged roll entries with localized attack, damage, and target tags', () => {
      useSettingsStore.setState({ language: 'ru' });
      const mockLog: DiceRollLogEntry = {
        id: 'roll-1',
        timestamp: '12:00:00',
        combatantName: 'Вампирское отродье',
        actionName: 'Когти',
        attackRoll: { d20: 18, modifier: 6, total: 24, isNat20: false, isNat1: false },
        damageRoll: { formula: '2d4+3', total: 10, damageType: 'slashing', details: '2d4+3' },
        targetName: 'Герой Боец',
        isHit: true,
        effectiveDamage: 10,
      };

      const html = clean(
        renderToString(<CombatDiceLog diceLog={[mockLog]} onClearLog={() => {}} />)
      );

      expect(html).toContain('Атака:');
      expect(html).toContain('24');
      expect(html).toContain('Урон:');
      expect(html).toContain('10');
      expect(html).toContain('Цель:');
      expect(html).toContain('ПОПАДАНИЕ');
      expect(html).toContain('-10 ОЗ');
    });

    it('renders ACTIONS, BONUS ACTIONS, REACTIONS, LEGENDARY ACTIONS headers', () => {
      useSettingsStore.setState({ language: 'ru' });
      const htmlRu = clean(
        renderToString(
          <StatblockActions
            combatant={sampleMonster}
            currentTarget={null}
            livingTargets={[]}
            activeTargetingActionKey={null}
            attackAdvantageMode="normal"
            setAttackAdvantageMode={() => {}}
            onPerformAttack={() => {}}
            onExecuteActionRoll={() => {}}
            onExecuteMultiattack={() => {}}
            onSelectInlineTarget={() => {}}
            onCloseInlineTargetPicker={() => {}}
            onInspectSpell={() => {}}
          />
        )
      );

      expect(htmlRu).toContain('ДЕЙСТВИЯ');
      expect(htmlRu).toContain('БОНУСНЫЕ ДЕЙСТВИЯ');
      expect(htmlRu).toContain('РЕАКЦИИ');
      expect(htmlRu).toContain('ЛЕГЕНДАРНЫЕ ДЕЙСТВИЯ');

      useSettingsStore.setState({ language: 'en' });
      const htmlEn = clean(
        renderToString(
          <StatblockActions
            combatant={sampleMonster}
            currentTarget={null}
            livingTargets={[]}
            activeTargetingActionKey={null}
            attackAdvantageMode="normal"
            setAttackAdvantageMode={() => {}}
            onPerformAttack={() => {}}
            onExecuteActionRoll={() => {}}
            onExecuteMultiattack={() => {}}
            onSelectInlineTarget={() => {}}
            onCloseInlineTargetPicker={() => {}}
            onInspectSpell={() => {}}
          />
        )
      );

      expect(htmlEn).toContain('ACTIONS');
      expect(htmlEn).toContain('BONUS ACTIONS');
      expect(htmlEn).toContain('REACTIONS');
      expect(htmlEn).toContain('LEGENDARY ACTIONS');
    });

    it('renders TRAITS header in StatblockInspector', () => {
      useSettingsStore.setState({ language: 'ru' });
      const htmlRu = clean(renderToString(<StatblockInspector />));
      expect(htmlRu).toContain('ОСОБЕННОСТИ');

      useSettingsStore.setState({ language: 'en' });
      const htmlEn = clean(renderToString(<StatblockInspector />));
      expect(htmlEn).toContain('TRAITS');
    });
  });
});
