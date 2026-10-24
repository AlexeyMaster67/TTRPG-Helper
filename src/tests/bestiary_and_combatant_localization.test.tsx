import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { useSettingsStore } from '../store/settingsStore';
import { createDefaultCombatant, Combatant } from '../types/combat';
import { formatSpeed } from '../utils/textUtils';
import { BestiaryLibrary } from '../components/tracker/BestiaryLibrary';
import { CombatantQuickActions } from '../components/tracker/combatant/CombatantQuickActions';
import { CombatantHeader } from '../components/tracker/combatant/CombatantHeader';
import { CombatantConditionToggles } from '../components/tracker/combatant/CombatantConditions';
import { CombatantCard } from '../components/tracker/CombatantCard';

const cleanHtml = (html: string) => html.replace(/<!--.*?-->/g, '');

describe('Bestiary & Combatant Localization (EN & RU)', () => {
  const sampleCombatant: Combatant = createDefaultCombatant({
    id: 'test-goblin-1',
    name: 'Goblin',
    nameRu: 'Гоблин',
    isPlayer: false,
    cr: '1/4',
    speed: '30 фт., лазание 30 фт.',
    hp: 7,
    maxHp: 7,
    ac: 15,
    initiative: 12,
  });

  const playerCombatant: Combatant = createDefaultCombatant({
    id: 'test-player-1',
    name: 'Aelar',
    nameRu: 'Аэлар',
    isPlayer: true,
    speed: '30 ft.',
    hp: 24,
    maxHp: 24,
    ac: 16,
    initiative: 18,
  });

  beforeEach(() => {
    useSettingsStore.setState({ language: 'en' });
  });

  describe('Speed formatting', () => {
    it('formats compound speed correctly in English and Russian', () => {
      expect(formatSpeed('30 фт., лазание 30 фт.', 'en')).toBe('30 ft., climb 30 ft.');
      expect(formatSpeed('30 фт., лазание 30 фт.', 'ru')).toBe('30 фт., лазание 30 фт.');
      expect(formatSpeed('30 ft., climb 30 ft.', 'en')).toBe('30 ft., climb 30 ft.');
      expect(formatSpeed('30 ft., climb 30 ft.', 'ru')).toBe('30 фт., лазание 30 фт.');
    });
  });

  describe('BestiaryLibrary sidebar localization', () => {
    it('renders all required English pills, headers and buttons', () => {
      useSettingsStore.setState({ language: 'en' });
      const html = cleanHtml(renderToString(<BestiaryLibrary />));

      expect(html).toContain('BESTIARY');
      expect(html).toContain('+ Custom');
      expect(html).toContain('+ LSS');
      expect(html).toContain('Search bestiary (Name, type, CR)...');
      expect(html).toContain('FOLDERS:');
      expect(html).toContain('All Folders');

      // Category pills in EN
      expect(html).toContain('All Types');
      expect(html).toContain('Humanoids');
      expect(html).toContain('Undead');
      expect(html).toContain('Beasts');
      expect(html).toContain('Monstrosities');
      expect(html).toContain('Fiends');
      expect(html).toContain('Dragons');
      expect(html).toContain('Elementals');
      expect(html).toContain('Constructs');
      expect(html).toContain('Aberrations');
      expect(html).toContain('Fey');
      expect(html).toContain('Giants');
      expect(html).toContain('Celestials');
      expect(html).toContain('Oozes');
      expect(html).toContain('Plants');

      // CR pills in EN
      expect(html).toContain('ALL CR');
      expect(html).toContain('CR 0-1');
      expect(html).toContain('CR 2-4');
      expect(html).toContain('CR 5-10');
      expect(html).toContain('CR 11+');

      // Bottom hint in EN
      expect(html).toContain('Click [+] rolls initiative (d20)');
    });

    it('renders all required Russian pills, headers and buttons', () => {
      useSettingsStore.setState({ language: 'ru' });
      const html = cleanHtml(renderToString(<BestiaryLibrary />));

      expect(html).toContain('БЕСТИАРИЙ');
      expect(html).toContain('+ Свой');
      expect(html).toContain('+ LSS');
      expect(html).toContain('Поиск по бестиарию (имя, тип, ПО)...');
      expect(html).toContain('ПАПКИ:');
      expect(html).toContain('Все папки');

      // Category pills in RU
      expect(html).toContain('Все типы');
      expect(html).toContain('Гуманоиды');
      expect(html).toContain('Нежить');
      expect(html).toContain('Звери');
      expect(html).toContain('Монстры');
      expect(html).toContain('Исчадия');
      expect(html).toContain('Драконы');
      expect(html).toContain('Элементали');
      expect(html).toContain('Конструкты');
      expect(html).toContain('Аберрации');
      expect(html).toContain('Феи');
      expect(html).toContain('Великаны');
      expect(html).toContain('Небожители');
      expect(html).toContain('Слизи');
      expect(html).toContain('Растения');

      // CR pills in RU
      expect(html).toContain('ВСЕ ПО');
      expect(html).toContain('ПО 0–1');
      expect(html).toContain('ПО 2–4');
      expect(html).toContain('ПО 5–10');
      expect(html).toContain('ПО 11+');

      // Bottom hint in RU
      expect(html).toContain('Клик [+] бросает инициативу (d20)');
    });
  });

  describe('Combatant row quick actions', () => {
    it('renders buttons in English', () => {
      useSettingsStore.setState({ language: 'en' });
      const html = cleanHtml(
        renderToString(
          <CombatantQuickActions
            combatant={sampleCombatant}
            onAttack={() => {}}
            onToggleHpPopover={() => {}}
            onRollSave={() => {}}
            onNextTurn={() => {}}
          />
        )
      );

      expect(html).toContain('Attack');
      expect(html).toContain('Damage / HP');
      expect(html).toContain('Save');
      expect(html).toContain('Turn');
    });

    it('renders buttons in Russian', () => {
      useSettingsStore.setState({ language: 'ru' });
      const html = cleanHtml(
        renderToString(
          <CombatantQuickActions
            combatant={sampleCombatant}
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
  });

  describe('CombatantHeader badge and condition toggle', () => {
    it('renders SHEET badge in EN and ЛИСТ in RU for players', () => {
      useSettingsStore.setState({ language: 'en' });
      const htmlEn = cleanHtml(
        renderToString(
          <CombatantHeader
            combatant={playerCombatant}
            isActiveTurn={false}
            isTarget={false}
            isEditingInit={false}
            tempInit="18"
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
      expect(htmlEn).toContain('SHEET');

      useSettingsStore.setState({ language: 'ru' });
      const htmlRu = cleanHtml(
        renderToString(
          <CombatantHeader
            combatant={playerCombatant}
            isActiveTurn={false}
            isTarget={false}
            isEditingInit={false}
            tempInit="18"
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
      expect(htmlRu).toContain('ЛИСТ');
    });

    it('renders + Cond. in EN and + Сост. in RU', () => {
      useSettingsStore.setState({ language: 'en' });
      const htmlEn = cleanHtml(
        renderToString(
          <CombatantConditionToggles
            combatant={sampleCombatant}
            roundCounter={1}
            onToggleReaction={() => {}}
            onToggleConcentration={() => {}}
            onAddCondition={() => {}}
          />
        )
      );
      expect(htmlEn).toContain('Cond.');

      useSettingsStore.setState({ language: 'ru' });
      const htmlRu = cleanHtml(
        renderToString(
          <CombatantConditionToggles
            combatant={sampleCombatant}
            roundCounter={1}
            onToggleReaction={() => {}}
            onToggleConcentration={() => {}}
            onAddCondition={() => {}}
          />
        )
      );
      expect(htmlRu).toContain('Сост.');
    });
  });

  describe('CombatantCard effects and speed', () => {
    it('renders Effects button in EN and Эффекты in RU', () => {
      useSettingsStore.setState({ language: 'en' });
      const htmlEn = cleanHtml(
        renderToString(
          <CombatantCard
            combatant={sampleCombatant}
            isActiveTurn={false}
            isInspected={false}
          />
        )
      );
      expect(htmlEn).toContain('Effects');
      expect(htmlEn).toContain('30 ft., climb 30 ft.');

      useSettingsStore.setState({ language: 'ru' });
      const htmlRu = cleanHtml(
        renderToString(
          <CombatantCard
            combatant={sampleCombatant}
            isActiveTurn={false}
            isInspected={false}
          />
        )
      );
      expect(htmlRu).toContain('Эффекты');
      expect(htmlRu).toContain('30 фт., лазание 30 фт.');
    });
  });
});
