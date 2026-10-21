import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Combatant, createDefaultCombatant } from '../types/combat';

// Statblock subcomponents
import {
  StatblockHeader,
  StatblockSurvival,
  StatblockAbilities,
  StatblockSavingThrows,
  StatblockDefenses,
  StatblockActions,
  StatblockSpells,
  SpellDetailsModal,
} from '../components/tracker/statblock';
import { StatblockInspector } from '../components/tracker/StatblockInspector';

// Targeted attack subcomponents
import {
  TargetSelector,
  AdvantageToggle,
  DamagePreview,
} from '../components/combat/targeted';
import { TargetedAttackModal } from '../components/combat/TargetedAttackModal';

// Combatant card subcomponents
import {
  CombatantHeader,
  CombatantHealthControls,
  CombatantConditions,
  CombatantConditionToggles,
  CombatantQuickActions,
} from '../components/tracker/combatant';
import { CombatantCard } from '../components/tracker/CombatantCard';
import { useCombatStore } from '../store/combatStore';

const clean = (h: string) => h.replace(/<!--.*?-->/g, '');

const dummyMonster: Combatant = createDefaultCombatant({
  id: 'goblin-1',
  name: 'Goblin',
  nameRu: 'Гоблин',
  isPlayer: false,
  hp: 7,
  maxHp: 7,
  tempHp: 0,
  ac: 15,
  initiative: 14,
  speed: '30 фт.',
  cr: '1/4',
  size: 'Small',
  creatureType: 'Гуманоид',
  conditions: [
    { type: 'Prone' },
    { type: 'Exhaustion', level: 2, durationRounds: 1, triggerOn: 'end_of_turn' },
  ],
  statblock: {
    id: 'goblin-1',
    name_en: 'Goblin',
    name_ru: 'Гоблин',
    size: 'Small',
    creature_type: 'humanoid',
    alignment: 'neutral evil',
    ac: 15,
    hp_average: 7,
    hp_formula: '2d6',
    speed: '30 ft.',
    str: 8,
    dex: 14,
    con: 10,
    intellect: 10,
    wis: 8,
    cha: 8,
    pb: 2,
    saves: { DEX: 4 },
    skills: { stealth: 6 },
    damage_resistances: 'poison',
    damage_immunities: '',
    condition_immunities: '',
    senses: 'darkvision 60 ft., passive Perception 9',
    languages: 'Common, Goblin',
    cr: '1/4',
    xp: 50,
    actions: [
      {
        name: 'Скимитар',
        attack_bonus: 4,
        damage_dice: '1d6+2',
        damage_type: 'slashing',
        desc: 'Рукопашная атака оружием: +4 к попаданию, досягаемость 5 фт., одна цель. Попадание: 5 (1d6 + 2) рубящего урона.',
      },
    ],
    spells: ['Магический доспех', 'Щит'],
  } as any,
});

const dummyTarget: Combatant = createDefaultCombatant({
  id: 'player-1',
  name: 'Valeros',
  nameRu: 'Валерос',
  isPlayer: true,
  hp: 28,
  maxHp: 28,
  tempHp: 5,
  ac: 18,
  initiative: 12,
  speed: '30 фт.',
  size: 'Medium',
  isConcentrating: true,
});

describe('Decomposed UI Components Suite', () => {
  beforeEach(() => {
    (useCombatStore as any).getInitialState = () => useCombatStore.getState();
    useCombatStore.setState({
      combatants: [dummyMonster, dummyTarget],
      inspectedCombatantId: dummyMonster.id,
      currentTargetId: dummyTarget.id,
      targetedAttackModalOpen: false,
      targetedAttackAttackerId: null,
      targetedAttackActionName: null,
    });
  });

  describe('1. StatblockInspector Subcomponents', () => {
    it('renders StatblockHeader with correct name, CR, and tags', () => {
      const html = clean(
        renderToString(
          <StatblockHeader
            combatant={dummyMonster}
            currentTarget={dummyTarget}
            onClearTarget={() => {}}
            onPerformAttack={() => {}}
            onOpenTargetedAttack={() => {}}
            onShowcase={() => {}}
            onUpdateSize={() => {}}
          />
        )
      );

      expect(html).toContain('Гоблин');
      expect(html).toContain('КО 1/4');
      expect(html).toContain('БМ +2');
      expect(html).toContain('Валерос');
      expect(html).toContain('КД 18');
    });

    it('renders StatblockSurvival with AC, HP progress, and Speed', () => {
      const html = clean(
        renderToString(<StatblockSurvival combatant={dummyMonster} />)
      );

      expect(html).toContain('КД');
      expect(html).toContain('15');
      expect(html).toContain('7');
      expect(html).toContain('(2d6)');
      expect(html).toContain('30 фт.');
      expect(html).toContain('14');
    });

    it('renders StatblockAbilities grid and StatblockSavingThrows', () => {
      const stats = [
        { label: 'СИЛ', key: 'str', fullRu: 'Сила', score: 8 },
        { label: 'ЛОВ', key: 'dex', fullRu: 'Ловкость', score: 14 },
      ];
      const saves = [
        { stat: 'dex', nameRu: 'ЛОВ', fullName: 'Ловкость', bonus: 4, isProficient: true },
      ];

      const htmlGrid = clean(
        renderToString(
          <StatblockAbilities
            stats={stats}
            onRollAbilityScore={() => {}}
            variant="grid"
          />
        )
      );
      expect(htmlGrid).toContain('СИЛ');
      expect(htmlGrid).toContain('-1');
      expect(htmlGrid).toContain('ЛОВ');
      expect(htmlGrid).toContain('+2');

      const htmlSaves = clean(
        renderToString(
          <StatblockSavingThrows
            saves={saves}
            onRollSavingThrow={() => {}}
          />
        )
      );
      expect(htmlSaves).toContain('Спасброски');
      expect(htmlSaves).toContain('+4');
      expect(htmlSaves).toContain('★');
    });

    it('renders StatblockDefenses with skills, resistances, and senses', () => {
      const html = clean(
        renderToString(<StatblockDefenses combatant={dummyMonster} />)
      );

      expect(html).toContain('Навыки:');
      expect(html).toContain('Скрытность');
      expect(html).toContain('Сопротивления к урону:');
      expect(html).toContain('яд');
      expect(html).toContain('Чувства:');
      expect(html).toContain('темное зрение');
      expect(html).toContain('Языки:');
    });

    it('renders StatblockActions with attack buttons and advantage modes', () => {
      const html = clean(
        renderToString(
          <StatblockActions
            combatant={dummyMonster}
            currentTarget={dummyTarget}
            livingTargets={[dummyTarget]}
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

      expect(html).toContain('ДЕЙСТВИЯ');
      expect(html).toContain('Скимитар');
      expect(html).toContain('+4');
      expect(html).toContain('1d6 + 2');
      expect(html).toContain('УДАР');
      expect(html).toContain('Преим.');
      expect(html).toContain('Помеха');
    });

    it('renders StatblockSpells and SpellDetailsModal', () => {
      const htmlSpells = clean(
        renderToString(
          <StatblockSpells
            combatant={dummyMonster}
            spellSlotsData={{ 1: { max: 4, used: 1 } }}
            onInspectSpell={() => {}}
            onToggleSpellSlot={() => {}}
            onRestoreAllSpellSlots={() => {}}
          />
        )
      );

      expect(htmlSpells).toContain('ЗАКЛИНАНИЯ СУЩЕСТВА');
      expect(htmlSpells).toContain('Магический доспех');
      expect(htmlSpells).toContain('ЯЧЕЙКИ ЗАКЛИНАНИЙ');
      expect(htmlSpells).toContain('1 круг');

      const htmlModal = clean(
        renderToString(
          <SpellDetailsModal
            spell={{
              id: 'shield',
              name_ru: 'Щит',
              name_en: 'Shield',
              level: 1,
              school: 'Abjuration',
              school_ru: 'Ограждение',
              casting_time: '1 reaction',
              range: 'Self',
              duration: '1 round',
              description_ru: 'Невидимый барьер магической силы...',
            } as any}
            onClose={() => {}}
          />
        )
      );
      expect(htmlModal).toContain('Щит');
      expect(htmlModal).toContain('1 круг, Ограждение');
    });

    it('renders StatblockInspector without crashing when empty or with monster', () => {
      useCombatStore.setState({
        combatants: [],
        inspectedCombatantId: null,
      });

      const emptyHtml = clean(renderToString(<StatblockInspector />));
      expect(emptyHtml).toContain('Инспектор характеристик');

      useCombatStore.setState({
        combatants: [dummyMonster],
        inspectedCombatantId: dummyMonster.id,
      });

      const monsterHtml = clean(renderToString(<StatblockInspector />));
      expect(monsterHtml).toContain('Гоблин');
      expect(monsterHtml).toContain('КД');
    });
  });

  describe('2. TargetedAttackModal Subcomponents', () => {
    it('renders TargetSelector with targets and AoE options', () => {
      const html = clean(
        renderToString(
          <TargetSelector
            availableTargets={[dummyTarget]}
            attacker={dummyMonster}
            selectedTargetId={dummyTarget.id}
            onSelectTarget={() => {}}
            target={dummyTarget}
            isAoEMode={false}
            onToggleAoEMode={() => {}}
            selectedAoETargetIds={[]}
            onSelectAoETargetIds={() => {}}
          />
        )
      );

      expect(html).toContain('1. Выбор цели атаки:');
      expect(html).toContain('Валерос');
      expect(html).toContain('КД цели:');
      expect(html).toContain('18');
    });

    it('renders AdvantageToggle with normal, advantage, and disadvantage', () => {
      const html = clean(
        renderToString(
          <AdvantageToggle
            advMode="normal"
            onAdvModeChange={() => {}}
          />
        )
      );

      expect(html).toContain('Модификатор броска:');
      expect(html).toContain('Обычный (1d20)');
      expect(html).toContain('Преимущество (2d20kh1)');
      expect(html).toContain('Помеха (2d20kl1)');
    });

    it('renders DamagePreview with outcome, damage badge, and concentration alert', () => {
      const html = clean(
        renderToString(
          <DamagePreview
            hasCalculated={true}
            isHit={true}
            finalCalculatedDamage={14}
            hitOutcomeText="ПОПАДАНИЕ!"
            damageDetailText="Бросок урона: 1d6+2"
            concentrationCheckDc={10}
            multiattackLogs={[]}
          />
        )
      );

      expect(html).toContain('ПОПАДАНИЕ!');
      expect(html).toContain('14');
      expect(html).toContain('урона');
      expect(html).toContain('концентрацию');
      expect(html).toContain('10');
    });

    it('renders TargetedAttackModal container when open', () => {
      useCombatStore.setState({
        combatants: [dummyMonster, dummyTarget],
        targetedAttackModalOpen: true,
        targetedAttackAttackerId: dummyMonster.id,
        targetedAttackActionName: 'Скимитар',
      });

      const html = clean(renderToString(<TargetedAttackModal />));
      expect(html).toContain('Таргетированная атака и расчёт КД');
      expect(html).toContain('Гоблин');
    });
  });

  describe('3. CombatantCard Subcomponents', () => {
    it('renders CombatantHeader with name, initiative, and badges', () => {
      const html = clean(
        renderToString(
          <CombatantHeader
            combatant={dummyMonster}
            isActiveTurn={true}
            isTarget={false}
            isEditingInit={false}
            tempInit="14"
            setTempInit={() => {}}
            onSaveInit={() => {}}
            onStartEditingInit={() => {}}
            onCancelEditingInit={() => {}}
            onToggleTarget={() => {}}
            onShowcase={() => {}}
            onRemove={() => {}}
          />
        )
      );

      expect(html).toContain('⚡ ТЕКУЩИЙ ХОД');
      expect(html).toContain('14');
      expect(html).toContain('Гоблин');
    });

    it('renders CombatantHealthControls with HealthBar and quick buttons', () => {
      const html = clean(
        renderToString(
          <CombatantHealthControls
            combatant={dummyMonster}
            isDying={false}
            deathSaves={{ successes: 0, failures: 0 }}
            onRollDeathSave={() => {}}
            onDamage={() => {}}
            onHeal={() => {}}
            onApplyCustom={() => {}}
            isHpPopoverOpen={true}
            setIsHpPopoverOpen={() => {}}
          />
        )
      );

      expect(html).toContain('-10');
      expect(html).toContain('-5');
      expect(html).toContain('+5');
      expect(html).toContain('+10');
      expect(html).toContain('Урон');
      expect(html).toContain('Лечение');
    });

    it('renders CombatantConditions chips and CombatantConditionToggles', () => {
      const htmlConditions = clean(
        renderToString(
          <CombatantConditions
            combatant={dummyMonster}
            onRemoveCondition={() => {}}
          />
        )
      );

      expect(htmlConditions).toContain('Сбитый с ног');
      expect(htmlConditions).toContain('Истощение');
      expect(htmlConditions).toContain('2');
      expect(htmlConditions).toContain('до конца хода');

      const htmlToggles = clean(
        renderToString(
          <CombatantConditionToggles
            combatant={dummyMonster}
            roundCounter={1}
            onToggleReaction={() => {}}
            onToggleConcentration={() => {}}
            onAddCondition={() => {}}
          />
        )
      );
      expect(htmlToggles).toContain('+');
      expect(htmlToggles).toContain('Сост.');
    });

    it('renders CombatantQuickActions on active turn with action shortcuts and save buttons', () => {
      const html = clean(
        renderToString(
          <CombatantQuickActions
            combatant={dummyMonster}
            onAttack={() => {}}
            onToggleHpPopover={() => {}}
            onRollSave={() => {}}
            onNextTurn={() => {}}
          />
        )
      );

      expect(html).toContain('Атака');
      expect(html).toContain('Урон / ОЗ');
      expect(html).toContain('Спасбросок');
      expect(html).toContain('Ход');
    });

    it('renders full CombatantCard container properly', () => {
      const html = clean(
        renderToString(
          <CombatantCard
            combatant={dummyMonster}
            isActiveTurn={false}
            isInspected={false}
          />
        )
      );

      expect(html).toContain('Гоблин');
      expect(html).toContain('КД');
      expect(html).toContain('15');
      expect(html).toContain('КО 1/4');
    });
  });
});
