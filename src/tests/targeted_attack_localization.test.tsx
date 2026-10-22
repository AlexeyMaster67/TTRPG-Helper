import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Combatant, createDefaultCombatant } from '../types/combat';
import { useSettingsStore } from '../store/settingsStore';
import { useCombatStore } from '../store/combatStore';
import {
  TargetSelector,
  AdvantageToggle,
  DamagePreview,
  HitOutcomeBanner,
} from '../components/combat/targeted';
import { TargetedAttackModal } from '../components/combat/TargetedAttackModal';
import { computeDamageWithDefenses } from '../utils/attackParser';
import { localizeDamageType } from '../utils/textUtils';

const clean = (h: string) => h.replace(/<!--.*?-->/g, '');

const monsterCombatant: Combatant = createDefaultCombatant({
  id: 'goblin-1',
  name: 'Goblin',
  nameRu: 'Гоблин',
  isPlayer: false,
  hp: 7,
  maxHp: 7,
  ac: 15,
  initiative: 14,
  statblock: {
    id: 'goblin-1',
    name_en: 'Goblin',
    name_ru: 'Гоблин',
    ac: 15,
    hp_average: 7,
    hp_formula: '2d6',
    actions: [
      {
        name: 'Scimitar',
        attack_bonus: 4,
        damage_dice: '1d6+2',
        damage_type: 'slashing',
        desc: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.',
      },
    ],
  } as any,
});

const playerCombatant: Combatant = createDefaultCombatant({
  id: 'valeros-1',
  name: 'Valeros',
  nameRu: 'Валерос',
  isPlayer: true,
  hp: 28,
  maxHp: 28,
  tempHp: 5,
  ac: 18,
  initiative: 12,
  isConcentrating: true,
});

describe('Targeted Attack Bilingual Localization (English & Russian)', () => {
  beforeEach(() => {
    (useCombatStore as any).getInitialState = () => useCombatStore.getState();
    useCombatStore.setState({
      combatants: [monsterCombatant, playerCombatant],
      targetedAttackModalOpen: false,
      targetedAttackAttackerId: null,
      targetedAttackActionName: null,
    });
  });

  describe('1. AdvantageToggle Localization', () => {
    it('renders English labels when language is en', () => {
      useSettingsStore.setState({ language: 'en' });
      const html = clean(
        renderToString(
          <AdvantageToggle advMode="normal" onAdvModeChange={() => {}} />
        )
      );
      expect(html).toContain('Roll Modifier:');
      expect(html).toContain('Normal (1d20)');
      expect(html).toContain('Advantage (2d20kh1)');
      expect(html).toContain('Disadvantage (2d20kl1)');
    });

    it('renders Russian labels when language is ru', () => {
      useSettingsStore.setState({ language: 'ru' });
      const html = clean(
        renderToString(
          <AdvantageToggle advMode="normal" onAdvModeChange={() => {}} />
        )
      );
      expect(html).toContain('Модификатор броска:');
      expect(html).toContain('Обычный (1d20)');
      expect(html).toContain('Преимущество (2d20kh1)');
      expect(html).toContain('Помеха (2d20kl1)');
    });
  });

  describe('2. TargetSelector Localization', () => {
    it('renders canonical English terms and monster/player names in en mode', () => {
      useSettingsStore.setState({ language: 'en' });
      const html = clean(
        renderToString(
          <TargetSelector
            availableTargets={[playerCombatant]}
            attacker={monsterCombatant}
            selectedTargetId={playerCombatant.id}
            onSelectTarget={() => {}}
            target={playerCombatant}
            isAoEMode={false}
            onToggleAoEMode={() => {}}
            selectedAoETargetIds={[]}
            onSelectAoETargetIds={() => {}}
            cover="none"
            onCoverChange={() => {}}
          />
        )
      );

      expect(html).toContain('1. Select Attack Target:');
      expect(html).toContain('Multi-target / AoE');
      expect(html).toContain('Target AC:');
      expect(html).toContain('Valeros');
      expect(html).toContain('[Player]');
      expect(html).toContain('AC: 18 | HP: 28/28');
      expect(html).toContain('Cover:');
      expect(html).toContain('No Cover (+0 AC)');
      expect(html).toContain('Half Cover (+2 AC)');
      expect(html).toContain('Three-Quarters Cover (+5 AC)');
      expect(html).toContain('Total Cover');
    });

    it('renders Russian terms and monster/player names in ru mode', () => {
      useSettingsStore.setState({ language: 'ru' });
      const html = clean(
        renderToString(
          <TargetSelector
            availableTargets={[playerCombatant]}
            attacker={monsterCombatant}
            selectedTargetId={playerCombatant.id}
            onSelectTarget={() => {}}
            target={playerCombatant}
            isAoEMode={false}
            onToggleAoEMode={() => {}}
            selectedAoETargetIds={[]}
            onSelectAoETargetIds={() => {}}
            cover="none"
            onCoverChange={() => {}}
          />
        )
      );

      expect(html).toContain('1. Выбор цели атаки:');
      expect(html).toContain('Несколько целей / AoE');
      expect(html).toContain('КД цели:');
      expect(html).toContain('Валерос');
      expect(html).toContain('[Игрок]');
      expect(html).toContain('КД: 18 | ОЗ: 28/28');
      expect(html).toContain('Укрытие:');
      expect(html).toContain('Без укрытия (+0 КД)');
      expect(html).toContain('Половинное укрытие (+2 КД)');
      expect(html).toContain('Укрытие на 3/4 (+5 КД)');
      expect(html).toContain('Полное укрытие');
    });
  });

  describe('3. DamagePreview Localization', () => {
    it('renders canonical English terms in en mode', () => {
      useSettingsStore.setState({ language: 'en' });
      const html = clean(
        renderToString(
          <DamagePreview
            hasCalculated={true}
            isHit={true}
            finalCalculatedDamage={14}
            hitOutcomeText="CRITICAL HIT!"
            damageDetailText="Damage roll: 2d6 + 2 = 14 (Slashing)"
            concentrationCheckDc={10}
            multiattackLogs={[
              {
                actionName: 'Scimitar',
                d20Log: '[d20: 18 + 4 = 22] vs Target AC 18',
                isHit: true,
                isCrit: false,
                damage: 7,
                damageType: 'slashing',
                notes: 'HIT!',
              },
            ]}
          />
        )
      );

      expect(html).toContain('CRITICAL HIT!');
      expect(html).toContain('14 damage');
      expect(html).toContain('Target is concentrating! Constitution saving throw required:');
      expect(html).toContain('DC 10');
      expect(html).toContain('Targets &amp; Results Breakdown:');
      expect(html).toContain('7 dmg (HIT!)');
    });

    it('renders Russian terms in ru mode', () => {
      useSettingsStore.setState({ language: 'ru' });
      const html = clean(
        renderToString(
          <DamagePreview
            hasCalculated={true}
            isHit={true}
            finalCalculatedDamage={14}
            hitOutcomeText="ПОПАДАНИЕ!"
            damageDetailText="Бросок урона: 1d6 + 2 = 8 (рубящий)"
            concentrationCheckDc={10}
            multiattackLogs={[]}
          />
        )
      );

      expect(html).toContain('ПОПАДАНИЕ!');
      expect(html).toContain('14 урона');
      expect(html).toContain('Цель удерживает');
      expect(html).toContain('концентрацию');
      expect(html).toContain('Сл. 10');
    });
  });

  describe('4. HitOutcomeBanner Localization', () => {
    it('renders English badge text in en mode', () => {
      useSettingsStore.setState({ language: 'en' });
      const htmlCrit = clean(
        renderToString(
          <HitOutcomeBanner isHit={true} isCrit={true} hitOutcomeText="CRITICAL HIT!" />
        )
      );
      expect(htmlCrit).toContain('CRIT!');

      const htmlHit = clean(
        renderToString(
          <HitOutcomeBanner isHit={true} isCrit={false} hitOutcomeText="HIT!" />
        )
      );
      expect(htmlHit).toContain('HIT!');

      const htmlMiss = clean(
        renderToString(
          <HitOutcomeBanner isHit={false} isCrit={false} hitOutcomeText="MISS!" />
        )
      );
      expect(htmlMiss).toContain('MISS!');
    });

    it('renders Russian badge text in ru mode', () => {
      useSettingsStore.setState({ language: 'ru' });
      const htmlCrit = clean(
        renderToString(
          <HitOutcomeBanner isHit={true} isCrit={true} hitOutcomeText="КРИТ!" />
        )
      );
      expect(htmlCrit).toContain('КРИТ!');

      const htmlHit = clean(
        renderToString(
          <HitOutcomeBanner isHit={true} isCrit={false} hitOutcomeText="ПОПАДАНИЕ!" />
        )
      );
      expect(htmlHit).toContain('ПОПАДАНИЕ');

      const htmlMiss = clean(
        renderToString(
          <HitOutcomeBanner isHit={false} isCrit={false} hitOutcomeText="ПРОМАХ!" />
        )
      );
      expect(htmlMiss).toContain('ПРОМАХ');
    });
  });

  describe('5. TargetedAttackModal Full Modal Localization', () => {
    it('renders complete English D&D 5e / SRD 5.2.1 terms when language is en', () => {
      useSettingsStore.setState({ language: 'en' });
      useCombatStore.setState({
        combatants: [monsterCombatant, playerCombatant],
        targetedAttackModalOpen: true,
        targetedAttackAttackerId: monsterCombatant.id,
        targetedAttackActionName: 'Scimitar',
      });

      const html = clean(renderToString(<TargetedAttackModal />));

      // Title & Header
      expect(html).toContain('Targeted Attack &amp; Spell Resolution');
      expect(html).toContain('Attacker:');
      expect(html).toContain('Goblin');

      // Actions section
      expect(html).toContain('2. Attacker Action:');
      expect(html).toContain('Monster Action');
      expect(html).toContain('Custom Attack');

      // Mode & buttons
      expect(html).toContain('3. ROLL MODE:');
      expect(html).toContain('Digital Dice (3D)');
      expect(html).toContain('Physical Dice (Table)');
      expect(html).toContain('Roll Attack vs AC');

      // Footer
      expect(html).toContain('Broadcast roll to player screen');
      expect(html).toContain('Cancel');
      expect(html).toContain('Apply Damage');
    });

    it('renders complete Russian terms when language is ru', () => {
      useSettingsStore.setState({ language: 'ru' });
      useCombatStore.setState({
        combatants: [monsterCombatant, playerCombatant],
        targetedAttackModalOpen: true,
        targetedAttackAttackerId: monsterCombatant.id,
        targetedAttackActionName: 'Scimitar',
      });

      const html = clean(renderToString(<TargetedAttackModal />));

      expect(html).toContain('Таргетированная атака и расчёт КД');
      expect(html).toContain('Атакует:');
      expect(html).toContain('Гоблин');
      expect(html).toContain('2. Действие атакующего:');
      expect(html).toContain('Действие монстра');
      expect(html).toContain('Своя атака');
      expect(html).toContain('3. РЕЖИМ БРОСКА:');
      expect(html).toContain('Цифровой бросок (d20)');
      expect(html).toContain('Бросок за столом (кости)');
      expect(html).toContain('Бросить атаку против КД');
      expect(html).toContain('Транслировать бросок на экран игроков');
      expect(html).toContain('Отмена');
      expect(html).toContain('Применить урон');
    });
  });

  describe('6. computeDamageWithDefenses Bilingual Support', () => {
    const targetWithDefenses: Combatant = createDefaultCombatant({
      id: 'target-def-1',
      name: 'Demon',
      nameRu: 'Демон',
      statblock: {
        id: 'demon-1',
        damage_immunities: 'fire, poison',
        damage_resistances: 'cold, lightning',
        damage_vulnerabilities: 'radiant',
      } as any,
    });

    it('returns English notices when lang is en', () => {
      const imm = computeDamageWithDefenses(20, 'fire', targetWithDefenses, 'en');
      expect(imm.finalDmg).toBe(0);
      expect(imm.notice).toBe('Target has IMMUNITY to Fire! Damage reduced to 0.');

      const res = computeDamageWithDefenses(20, 'cold', targetWithDefenses, 'en');
      expect(res.finalDmg).toBe(10);
      expect(res.notice).toBe('Target has RESISTANCE to Cold! Damage halved (20 -> 10).');

      const vul = computeDamageWithDefenses(10, 'radiant', targetWithDefenses, 'en');
      expect(vul.finalDmg).toBe(20);
      expect(vul.notice).toBe('Target has VULNERABILITY to Radiant! Damage doubled (10 -> 20).');
    });

    it('returns Russian notices when lang is ru or omitted', () => {
      const imm = computeDamageWithDefenses(20, 'fire', targetWithDefenses, 'ru');
      expect(imm.finalDmg).toBe(0);
      expect(imm.notice).toContain('ИММУНИТЕТ');

      const res = computeDamageWithDefenses(20, 'cold', targetWithDefenses);
      expect(res.finalDmg).toBe(10);
      expect(res.notice).toContain('СОПРОТИВЛЕНИЕ');

      const vul = computeDamageWithDefenses(10, 'radiant', targetWithDefenses);
      expect(vul.finalDmg).toBe(20);
      expect(vul.notice).toContain('УЯЗВИМОСТЬ');
    });
  });

  describe('7. localizeDamageType Bilingual Output', () => {
    it('returns canonical English damage names when lang is en', () => {
      expect(localizeDamageType('slashing', 'en')).toBe('Slashing');
      expect(localizeDamageType('piercing', 'en')).toBe('Piercing');
      expect(localizeDamageType('bludgeoning', 'en')).toBe('Bludgeoning');
      expect(localizeDamageType('fire', 'en')).toBe('Fire');
      expect(localizeDamageType('cold', 'en')).toBe('Cold');
      expect(localizeDamageType('necrotic', 'en')).toBe('Necrotic');
      expect(localizeDamageType('radiant', 'en')).toBe('Radiant');
      expect(localizeDamageType('poison', 'en')).toBe('Poison');
      expect(localizeDamageType('force', 'en')).toBe('Force');
      expect(localizeDamageType('psychic', 'en')).toBe('Psychic');
    });

    it('returns Russian damage names when lang is ru', () => {
      expect(localizeDamageType('slashing', 'ru')).toBe('Рубящий');
      expect(localizeDamageType('fire', 'ru')).toBe('Огонь');
      expect(localizeDamageType('radiant', 'ru')).toBe('Излучение');
    });
  });
});
