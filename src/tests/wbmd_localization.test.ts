import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../store/settingsStore';
import { ru } from '../i18n/locales/ru';
import { en } from '../i18n/locales/en';
import { interpolate } from '../i18n';
import { getStarterFiles, STARTER_CAMPAIGN_FILES, STARTER_CAMPAIGN_FILES_EN } from '../services/wbStorageService';

describe('WBmd (Worldbuilding) Bilingual Localization Test Suite', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'en' });
  });

  describe('1. Translation Dictionaries Parity and Completeness', () => {
    it('has "wb" key defined in both Russian and English locales', () => {
      expect(ru.wb).toBeDefined();
      expect(en.wb).toBeDefined();
    });

    it('has identical keys in ru.wb and en.wb without missing entries', () => {
      const ruKeys = Object.keys(ru.wb).sort();
      const enKeys = Object.keys(en.wb).sort();

      expect(ruKeys).toEqual(enKeys);
    });

    it('ensures all translation values are non-empty strings', () => {
      for (const [k, v] of Object.entries(ru.wb)) {
        expect(typeof v, `ru.wb.${k} must be string`).toBe('string');
        expect(v.trim().length, `ru.wb.${k} must not be empty`).toBeGreaterThan(0);
      }

      for (const [k, v] of Object.entries(en.wb)) {
        expect(typeof v, `en.wb.${k} must be string`).toBe('string');
        expect(v.trim().length, `en.wb.${k} must not be empty`).toBeGreaterThan(0);
      }
    });
  });

  describe('2. Parameterized String Interpolation in Both Languages', () => {
    it('interpolates broadcastSuccess message in RU and EN', () => {
      const ruMsg = interpolate(ru.wb.broadcastSuccess, { title: 'Таверна', count: 2 });
      expect(ruMsg).toContain('Таверна');
      expect(ruMsg).toContain('2');

      const enMsg = interpolate(en.wb.broadcastSuccess, { title: 'Tavern', count: 2 });
      expect(enMsg).toContain('Tavern');
      expect(enMsg).toContain('2');
      expect(enMsg).toContain('broadcast');
    });

    it('interpolates dice roll toasts in RU and EN', () => {
      const ruDice = interpolate(ru.wb.diceRollToast, { formula: '1d20+5', total: 19 });
      expect(ruDice).toContain('1d20+5');
      expect(ruDice).toContain('19');

      const enDice = interpolate(en.wb.diceRollToast, { formula: '1d20+5', total: 19 });
      expect(enDice).toContain('1d20+5');
      expect(enDice).toContain('19');
    });

    it('interpolates backlinks and words counters', () => {
      const ruBacklinks = interpolate(ru.wb.backlinksHeader, { count: 5 });
      expect(ruBacklinks).toContain('5');

      const enBacklinks = interpolate(en.wb.backlinksHeader, { count: 5 });
      expect(enBacklinks).toContain('5');
      expect(enBacklinks).toContain('Backlinks');
    });
  });

  describe('3. Language-Aware Starter Campaign Notes', () => {
    it('returns English starter notes when language is set to "en"', () => {
      useSettingsStore.setState({ language: 'en' });
      const files = getStarterFiles();

      expect(files).toEqual(STARTER_CAMPAIGN_FILES_EN);
      expect(files.some((f) => f.path.includes('GM_CheatSheet.md'))).toBe(true);
      expect(files.some((f) => f.content.includes('Welcome to **WBmd'))).toBe(true);
    });

    it('returns Russian starter notes when language is set to "ru"', () => {
      useSettingsStore.setState({ language: 'ru' });
      const files = getStarterFiles();

      expect(files).toEqual(STARTER_CAMPAIGN_FILES);
      expect(files.some((f) => f.path.includes('Памятка_Мастера.md'))).toBe(true);
      expect(files.some((f) => f.content.includes('Добро пожаловать в **WBmd'))).toBe(true);
    });
  });
});
