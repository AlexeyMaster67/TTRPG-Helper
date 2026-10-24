import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { useSettingsStore } from '../store/settingsStore';
import { useCombatStore } from '../store/combatStore';
import { MasterToolsDropdown } from '../components/navigation/MasterToolsDropdown';
import {
  NpcGeneratorModal,
  NPC_RACES,
  NPC_OCCUPATIONS,
  generateRandomNpc,
} from '../components/tools/NpcGeneratorModal';
import { RulesCheatSheetModal } from '../components/tools/RulesCheatSheetModal';

// Helper to check for emojis
const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

describe('Tools & Rules Localization Test Suite', () => {
  beforeEach(() => {
    // Reset store state
    useSettingsStore.setState({ language: 'ru' });
    useCombatStore.setState({ combatants: [] });
    vi.clearAllMocks();
  });

  describe('1. MasterToolsDropdown Localization', () => {
    const mockProps = {
      onOpenLoot: vi.fn(),
      onOpenHandouts: vi.fn(),
      onOpenEncounters: vi.fn(),
      onOpenSoundboard: vi.fn(),
      onOpenTokenForge: vi.fn(),
      onOpenProceduralMap: vi.fn(),
      onOpenNpcGenerator: vi.fn(),
      onOpenRules: vi.fn(),
      onExportSession: vi.fn(),
      onImportSession: vi.fn(),
    };

    it('renders Russian button label and title when language is "ru"', () => {
      useSettingsStore.setState({ language: 'ru' });
      const html = renderToString(<MasterToolsDropdown {...mockProps} />);

      expect(html).toContain('Инструменты Мастера');
      expect(html).toContain('title="Инструменты Мастера"');
      expect(EMOJI_REGEX.test(html)).toBe(false);
    });

    it('renders English button label and title when language is "en"', () => {
      useSettingsStore.setState({ language: 'en' });
      const html = renderToString(<MasterToolsDropdown {...mockProps} />);

      expect(html).toContain('DM Tools');
      expect(html).toContain('title="DM Tools"');
      expect(EMOJI_REGEX.test(html)).toBe(false);
    });
  });

  describe('2. NpcGeneratorModal Localization & Selectors', () => {
    it('renders Russian UI, selectors, and traits when language is "ru"', () => {
      useSettingsStore.setState({ language: 'ru' });
      const html = renderToString(<NpcGeneratorModal isOpen={true} onClose={vi.fn()} />);

      expect(html).toContain('Генератор случайных NPC «на лету»');
      expect(html).toContain('Оффлайн');
      expect(html).toContain('Раса / Вид');
      expect(html).toContain('Профессия');
      expect(html).toContain('Любая раса');
      expect(html).toContain('Любая профессия');
      expect(html).toContain('Характеристики и модификаторы:');
      expect(html).toContain('Характер:');
      expect(html).toContain('Манера речи:');
      expect(html).toContain('Тайна / Секрет:');
      expect(html).toContain('Другой NPC (Сгенерировать)');
      expect(html).toContain('Копировать');
      expect(html).toContain('Добавить в бой как NPC');
      expect(html).toContain('СИЛ');
      expect(html).toContain('ЛОВ');
      expect(html).toContain('ТЕЛ');
      expect(html).toContain('ИНТ');
      expect(html).toContain('МДР');
      expect(html).toContain('ХАР');
      expect(html).toContain('КД');
      expect(html).toContain('ОЗ');
      expect(EMOJI_REGEX.test(html)).toBe(false);
    });

    it('renders English UI, selectors, and traits when language is "en"', () => {
      useSettingsStore.setState({ language: 'en' });
      const html = renderToString(<NpcGeneratorModal isOpen={true} onClose={vi.fn()} />);

      expect(html).toContain('On-the-Fly NPC Generator');
      expect(html).toContain('Offline');
      expect(html).toContain('Race / Species');
      expect(html).toContain('Occupation');
      expect(html).toContain('Any Race');
      expect(html).toContain('Any Occupation');
      expect(html).toContain('Attributes &amp; Modifiers:');
      expect(html).toContain('Personality:');
      expect(html).toContain('Mannerism:');
      expect(html).toContain('Secret / Hook:');
      expect(html).toContain('Generate Another NPC');
      expect(html).toContain('Copy');
      expect(html).toContain('Add to Combat as NPC');
      expect(html).toContain('STR');
      expect(html).toContain('DEX');
      expect(html).toContain('CON');
      expect(html).toContain('INT');
      expect(html).toContain('WIS');
      expect(html).toContain('CHA');
      expect(html).toContain('AC');
      expect(html).toContain('HP');
      expect(EMOJI_REGEX.test(html)).toBe(false);
    });

    it('filters NPC generation when selecting specific race and occupation', () => {
      const npc = generateRandomNpc('human', 'blacksmith');
      expect(npc.raceId).toBe('human');
      expect(npc.raceRu).toBe('Человек');
      expect(npc.raceEn).toBe('Human');
      expect(npc.occupationId).toBe('blacksmith');
      expect(npc.occupationRu).toBe('Кузнец');
      expect(npc.occupationEn).toBe('Blacksmith');
    });

    it('contains strictly zero emojis in NPC datasets', () => {
      const allStrings = [
        ...NPC_RACES.map((r) => `${r.ru} ${r.en}`),
        ...NPC_OCCUPATIONS.map((o) => `${o.ru} ${o.en}`),
      ].join(' ');
      expect(EMOJI_REGEX.test(allStrings)).toBe(false);
    });
  });

  describe('3. RulesCheatSheetModal Localization', () => {
    it('renders Russian headers, tabs, search bar, and card metadata when language is "ru"', () => {
      useSettingsStore.setState({ language: 'ru' });
      const html = renderToString(<RulesCheatSheetModal isOpen={true} onClose={vi.fn()} />);

      expect(html).toContain('Шпаргалка правил • D&amp;D 2024');
      expect(html).toContain('Состояния, действия, мастерство оружия, классы, виды и механики урона');
      expect(html).toContain('Состояния');
      expect(html).toContain('Действия');
      expect(html).toContain('Мастерство');
      expect(html).toContain('Классы');
      expect(html).toContain('Виды / Расы');
      expect(html).toContain('Отдых и Урон');
      expect(html).toContain('placeholder="Мгновенный поиск по всем правилам..."');
      expect(html).toContain('Автономный справочник D&amp;D 2024 • Полная оффлайн поддержка');
      expect(html).toContain('Закрыть');
      expect(EMOJI_REGEX.test(html)).toBe(false);
    });

    it('renders English headers, tabs, search bar, and card metadata when language is "en"', () => {
      useSettingsStore.setState({ language: 'en' });
      const html = renderToString(<RulesCheatSheetModal isOpen={true} onClose={vi.fn()} />);

      expect(html).toContain('Rules Reference • D&amp;D 2024');
      expect(html).toContain('Conditions, actions, weapon mastery, classes, species, and damage rules');
      expect(html).toContain('Conditions');
      expect(html).toContain('Actions');
      expect(html).toContain('Weapon Mastery');
      expect(html).toContain('Classes');
      expect(html).toContain('Species');
      expect(html).toContain('Rest &amp; Damage');
      expect(html).toContain('placeholder="Instant search across all rules..."');
      expect(html).toContain('Offline Rules Reference • Full offline support');
      expect(html).toContain('Close');
      expect(EMOJI_REGEX.test(html)).toBe(false);
    });
  });
});
