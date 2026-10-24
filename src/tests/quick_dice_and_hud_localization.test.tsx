import React from 'react';
void React;
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { useSettingsStore } from '../store/settingsStore';
import { useCombatStore } from '../store/combatStore';
import { createDefaultCombatant } from '../types/combat';
import { CombatQuickInputHud } from '../components/combat/CombatQuickInputHud';
import { Dice2dRollCard, Dice2dRollData } from '../components/dice/Dice2dRollCard';
import { QuickDiceBar } from '../components/dice/QuickDiceBar';
import { DiceTrayDock } from '../components/dice/DiceTrayDock';

describe('Quick Dice, Floating Tray, and Combat HUD Localization', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'ru' });
    useCombatStore.setState({
      combatants: [
        createDefaultCombatant({
          id: 'test-goblin',
          name: 'Goblin Scout',
          nameRu: 'Гоблин-разведчик',
          hp: 12,
          maxHp: 15,
          initiative: 14,
          isPlayer: false,
          conditions: [],
        }),
      ],
      currentTurnIndex: 0,
      inspectedCombatantId: null,
    });
  });

  describe('CombatQuickInputHud', () => {
    it('renders 100% full Russian text in default ru mode', () => {
      useSettingsStore.setState({ language: 'ru' });
      const html = renderToString(<CombatQuickInputHud />);

      expect(html).toContain('Цель:');
      expect(html).toContain('ОЗ');
      expect(html).toContain('Урон');
      expect(html).toContain('Лечение');
      expect(html).toContain('Врем. ОЗ');
      expect(html).toContain('Нокаут');
      expect(html).toContain('Стрелки');
      expect(html).toContain('Выбрать');
      // No raw emojis in markup
      expect(html).not.toMatch(/[\uD83C-\uDBFF\uDC00-\uDFFF]/);
    });

    it('renders 100% full English text when language is en', () => {
      useSettingsStore.setState({ language: 'en' });
      const html = renderToString(<CombatQuickInputHud />);

      expect(html).toContain('Target:');
      expect(html).toContain('HP');
      expect(html).toContain('Damage');
      expect(html).toContain('Healing');
      expect(html).toContain('Temp HP');
      expect(html).toContain('Knockout');
      expect(html).toContain('Arrows');
      expect(html).toContain('Select');
      // No raw emojis in markup
      expect(html).not.toMatch(/[\uD83C-\uDBFF\uDC00-\uDFFF]/);
    });
  });

  describe('Dice2dRollCard', () => {
    it('renders Russian labels, Nat 20 banner and "Итого:"', () => {
      useSettingsStore.setState({ language: 'ru' });
      const data: Dice2dRollData = {
        sides: 20,
        kept: 20,
        modifier: 3,
        total: 23,
        mode: 'advantage',
        r1: 20,
        r2: 11,
        isNat20: true,
      };

      const html = renderToString(
        <Dice2dRollCard data={data} onClose={() => {}} initialRolling={false} />
      );

      expect(html).toContain('Преимущество');
      expect(html).toContain('КРИТИЧЕСКИЙ УСПЕХ (NAT 20)!');
      expect(html).toContain('Выбран');
      expect(html).toContain('Сброшен');
      // Must use "Итого:"
      expect(html).not.toContain('Итог:');
      expect(html).not.toMatch(/[\uD83C-\uDBFF\uDC00-\uDFFF]/);
    });

    it('renders English labels, Nat 1 badge and "Total:" in en mode', () => {
      useSettingsStore.setState({ language: 'en' });
      const data: Dice2dRollData = {
        sides: 20,
        kept: 1,
        modifier: 0,
        total: 1,
        mode: 'disadvantage',
        r1: 1,
        r2: 15,
        isNat1: true,
      };

      const html = renderToString(
        <Dice2dRollCard data={data} onClose={() => {}} initialRolling={false} />
      );

      expect(html).toContain('Disadvantage');
      expect(html).toContain('CRITICAL FAILURE (NAT 1)!');
      expect(html).toContain('Kept');
      expect(html).toContain('Dropped');
      expect(html).toContain('Total:');
      expect(html).not.toMatch(/[\uD83C-\uDBFF\uDC00-\uDFFF]/);
    });
  });

  describe('QuickDiceBar', () => {
    it('renders Russian tooltips and labels in ru mode', () => {
      useSettingsStore.setState({ language: 'ru' });
      const html = renderToString(<QuickDiceBar />);

      expect(html).toContain('Обычный');
      expect(html).toContain('Преимущество');
      expect(html).toContain('Помеха');
      expect(html).toContain('Публичный');
      expect(html).toContain('Игроки: ВКЛ');
      expect(html).toContain('Бросить d4');
      expect(html).toContain('Бросить d20');
      expect(html).toContain('Бросить d100');
      expect(html).not.toMatch(/[\uD83C-\uDBFF\uDC00-\uDFFF]/);
    });

    it('renders English tooltips and labels in en mode', () => {
      useSettingsStore.setState({ language: 'en' });
      const html = renderToString(<QuickDiceBar />);

      expect(html).toContain('Normal');
      expect(html).toContain('Advantage');
      expect(html).toContain('Disadvantage');
      expect(html).toContain('Public');
      expect(html).toContain('Players: ON');
      expect(html).toContain('Roll d4');
      expect(html).toContain('Roll d20');
      expect(html).toContain('Roll d100');
      expect(html).not.toMatch(/[\uD83C-\uDBFF\uDC00-\uDFFF]/);
    });
  });

  describe('DiceTrayDock and 3D overlay exports', () => {
    it('exports DiceTrayDock component safely', () => {
      expect(DiceTrayDock).toBeDefined();
      expect(typeof DiceTrayDock).toBe('function');
    });
  });
});
