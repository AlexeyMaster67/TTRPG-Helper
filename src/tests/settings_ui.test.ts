import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SYSTEM_REGISTRY, getAllSystems } from '../systems/registry';
import { useSettingsStore, resolveEffectiveTheme } from '../store/settingsStore';
import { useCombatStore } from '../store/combatStore';
import { SystemSelectionPanel } from '../components/settings/SystemSelectionPanel';
import { SettingsModal } from '../components/settings/SettingsModal';

describe('Settings UI & System Selection Suite', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      currentSystemId: 'dnd5e_2024',
      themeBySystem: true,
      fallbackTheme: 'dnd5e',
      uiScale: 100,
      isModalOpen: true,
    });
    useCombatStore.setState({
      systemId: 'dnd5e_2024',
      combatants: [],
    });
  });

  describe('SYSTEM_REGISTRY & Family Grouping', () => {
    it('contains all required systems with appropriate metadata', () => {
      const systems = getAllSystems();
      const ids = systems.map((s) => s.id);

      expect(ids).toContain('srd_5_2_1');
      expect(ids).toContain('dnd5e_2014');
      expect(ids).toContain('dnd5e_2024');
      expect(ids).toContain('pathfinder2e');
      expect(ids).toContain('pathfinder1e');
      expect(ids).toContain('cyberpunk_red');
      expect(ids).toContain('custom_system');
    });

    it('correctly maps families and statuses according to spec', () => {
      expect(SYSTEM_REGISTRY['srd_5_2_1'].family).toBe('dnd5e');
      expect(SYSTEM_REGISTRY['srd_5_2_1'].status).toBe('stable');

      expect(SYSTEM_REGISTRY['dnd5e_2014'].family).toBe('dnd5e');
      expect(SYSTEM_REGISTRY['dnd5e_2014'].status).toBe('stable');

      expect(SYSTEM_REGISTRY['dnd5e_2024'].family).toBe('dnd5e');
      expect(SYSTEM_REGISTRY['dnd5e_2024'].status).toBe('beta');

      expect(SYSTEM_REGISTRY['pathfinder2e'].family).toBe('pathfinder');
      expect(SYSTEM_REGISTRY['pathfinder2e'].status).toBe('beta');

      expect(SYSTEM_REGISTRY['pathfinder1e'].family).toBe('pathfinder');
      expect(SYSTEM_REGISTRY['pathfinder1e'].status).toBe('planned');

      expect(SYSTEM_REGISTRY['cyberpunk_red'].family).toBe('cyberpunk');
      expect(SYSTEM_REGISTRY['cyberpunk_red'].status).toBe('wip');

      expect(SYSTEM_REGISTRY['custom_system'].family).toBe('custom');
      expect(SYSTEM_REGISTRY['custom_system'].status).toBe('planned');
    });
  });

  describe('Theme Engine & Resolution', () => {
    it('resolves dynamic theme correctly based on system ID', () => {
      expect(resolveEffectiveTheme('srd_5_2_1', true)).toBe('dnd5e');
      expect(resolveEffectiveTheme('dnd5e_2014', true)).toBe('dnd5e');
      expect(resolveEffectiveTheme('dnd5e_2024', true)).toBe('dnd5e');
      expect(resolveEffectiveTheme('pathfinder2e', true)).toBe('pathfinder2e');
      expect(resolveEffectiveTheme('cyberpunk_red', true)).toBe('cyberpunk-red');
    });

    it('respects fallback theme when themeBySystem is false', () => {
      expect(resolveEffectiveTheme('cyberpunk_red', false, 'dnd5e')).toBe('dnd5e');
      expect(resolveEffectiveTheme('pathfinder2e', false, 'cyberpunk-red')).toBe('cyberpunk-red');
    });
  });

  describe('Store Integration & Campaign Duplication', () => {
    it('updates currentSystemId in SettingsStore and CombatStore', () => {
      const { setCurrentSystemId } = useSettingsStore.getState();
      const { setSystemId } = useCombatStore.getState();

      setCurrentSystemId('pathfinder2e');
      expect(useSettingsStore.getState().currentSystemId).toBe('pathfinder2e');

      const res = setSystemId('pathfinder2e', true);
      expect(res.success).toBe(true);
      expect(useCombatStore.getState().systemId).toBe('pathfinder2e');
    });

    it('duplicates campaign into target system with safe copy', () => {
      const { duplicateCampaignInSystem } = useCombatStore.getState();
      const res = duplicateCampaignInSystem('cyberpunk_red');

      expect(res.success).toBe(true);
      expect(res.duplicatedState?.combatants).toBeDefined();
      expect(res.warning).toContain('Cyberpunk RED');
    });
  });

  describe('SystemSelectionPanel Render & Accessibility', () => {
    it('renders all family sections and system cards', () => {
      useSettingsStore.getState().setLanguage('ru');
      const html = renderToString(React.createElement(SystemSelectionPanel));

      // Title & description
      expect(html).toContain('Система НРИ');
      expect(html).toContain('Выберите правила для вашей кампании');

      // Warning banner
      expect(html).toContain('Система фиксируется при создании кампании');
      expect(html).toContain('Создать копию кампании');

      // Families
      expect(html).toContain('D&amp;D 5e');
      expect(html).toContain('Pathfinder');
      expect(html).toContain('Киберпанк');
      expect(html).toContain('Другое');

      // System cards & badges (SRD 5.2.1 only in D&D, dnd5e_2014 and 2024 removed from panel)
      expect(html).toContain('SRD 5.2.1');
      expect(html).toContain('Готово');
      expect(html).not.toContain('D&amp;D 5e (2014)');
      expect(html).not.toContain('D&amp;D 5e (2024)');
      expect(html).toContain('Pathfinder 2e');
      expect(html).toContain('Pathfinder 1e');
      expect(html).toContain('Скоро');
      expect(html).toContain('Cyberpunk RED');
      expect(html).toContain('В разработке');
      expect(html).toContain('Своя система');

      // Footer buttons
      expect(html).toContain('Сохранить');
      expect(html).toContain('Отмена');

      // Accessibility attributes
      expect(html).toContain('aria-pressed');
      expect(html).toContain('role="button"');

      // Test English mode
      useSettingsStore.getState().setLanguage('en');
      const htmlEn = renderToString(React.createElement(SystemSelectionPanel));
      expect(htmlEn).toContain('TTRPG System');
      expect(htmlEn).toContain('Cancel');
      expect(htmlEn).toContain('Save');
      expect(htmlEn).toContain('Ready');
      expect(htmlEn).toContain('In Development');
    });
  });

  describe('SettingsModal Render & Left Sidebar Navigation', () => {
    it('renders all 5 sidebar navigation tabs', () => {
      useSettingsStore.getState().setLanguage('ru');
      const html = renderToString(React.createElement(SettingsModal, { isOpen: true }));

      // Left sidebar
      expect(html).toContain('Настройки');
      expect(html).toContain('Общие');
      expect(html).toContain('Система НРИ');
      expect(html).toContain('Интерфейс');
      expect(html).toContain('Горячие клавиши');
      expect(html).toContain('Плагины · скоро');
      expect(html).toContain('скоро');

      // Active section is Система НРИ by default
      expect(html).toContain('aria-current="page"');
      expect(html).toContain('SRD 5.2.1');

      // Restore language
      useSettingsStore.getState().setLanguage('en');
    });
  });
});
