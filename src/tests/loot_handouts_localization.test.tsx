import React from 'react';
void React;
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { useSettingsStore } from '../store/settingsStore';
import { LootGeneratorModal } from '../components/loot/LootGeneratorModal';
import { HandoutsModal } from '../components/handouts/HandoutsModal';

describe('Loot & Handouts Localization Suite', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      language: 'ru',
    });
  });

  describe('Zero Emoji Guarantee', () => {
    it('ensures no emojis in source files for LootGeneratorModal and HandoutsModal', () => {
      const targetFiles = [
        path.resolve(process.cwd(), 'src/components/loot/LootGeneratorModal.tsx'),
        path.resolve(process.cwd(), 'src/components/handouts/HandoutsModal.tsx'),
      ];

      const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;

      for (const filePath of targetFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        const matches = [...content.matchAll(emojiRegex)];
        expect(matches.length, `Emojis found in ${path.basename(filePath)}`).toBe(0);
      }
    });
  });

  describe('LootGeneratorModal UI Localization', () => {
    it('renders clean Russian UI by default when language is ru', () => {
      useSettingsStore.setState({ language: 'ru' });

      const html = renderToString(
        <LootGeneratorModal isOpen={true} onClose={() => {}} />
      );

      expect(html).toContain('Генератор сокровищ и кубик d100');
      expect(html).toContain('Кубик d100, официальные таблицы сокровищниц');
      expect(html).toContain('Кубик десятков d100');
      expect(html).toContain('Грани: 10, 20, 30 ... 100');
      expect(html).toContain('Бросить');
      expect(html).toContain('Индивидуальная (КО)');
      expect(html).toContain('Сокровищница (Тиры 1–4)');
      expect(html).toContain('Таблицы магии DMG (A–I)');
      expect(html).toContain('Героев в отряде:');
      expect(html).toContain('Класс опасности (КО / CR):');
      expect(html).toContain('Сгенерировать добычу по d100 (50)');
      expect(html).toContain('Закрыть');

      // Emoji check
      const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;
      expect([...html.matchAll(emojiRegex)].length).toBe(0);
    });

    it('renders clean English UI when language is en', () => {
      useSettingsStore.setState({ language: 'en' });

      const html = renderToString(
        <LootGeneratorModal isOpen={true} onClose={() => {}} />
      );

      expect(html).toContain('Loot Generator &amp; d100 Die');
      expect(html).toContain('d100 die, official DMG hoard tables, party distribution, and direct export');
      expect(html).toContain('d100 Tens Die');
      expect(html).toContain('Faces: 10, 20, 30 ... 100');
      expect(html).toContain('Roll');
      expect(html).toContain('Individual (CR)');
      expect(html).toContain('Hoard (Tiers 1–4)');
      expect(html).toContain('DMG Magic Tables (A–I)');
      expect(html).toContain('Party Members:');
      expect(html).toContain('Challenge Rating (CR):');
      expect(html).toContain('Generate Loot with d100 (50)');
      expect(html).toContain('Close');

      // Emoji check
      const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;
      expect([...html.matchAll(emojiRegex)].length).toBe(0);
    });
  });

  describe('HandoutsModal UI Localization', () => {
    it('renders clean Russian UI and template presets when language is ru', () => {
      useSettingsStore.setState({ language: 'ru' });

      const html = renderToString(
        <HandoutsModal isOpen={true} onClose={() => {}} />
      );

      expect(html).toContain('Транслятор раздаток и тайн игрокам');
      expect(html).toContain('Создавайте старинные письма, свитки, указы и улики');
      expect(html).toContain('Готовые шаблоны');
      expect(html).toContain('Старинное письмо');
      expect(html).toContain('Карта подземелья');
      expect(html).toContain('Портрет персонажа');
      expect(html).toContain('Древний свиток');
      expect(html).toContain('Королевский указ');
      expect(html).toContain('Записка культиста');
      expect(html).toContain('Объявление о награде');
      expect(html).toContain('Загадка древних');
      expect(html).toContain('Стиль оформления');
      expect(html).toContain('Письмо');
      expect(html).toContain('Свиток');
      expect(html).toContain('Заголовок раздатки');
      expect(html).toContain('Текст документа');
      expect(html).toContain('Изображение (URL или файл с диска)');
      expect(html).toContain('С диска');
      expect(html).toContain('Предпросмотр экрана игроков');
      expect(html).toContain('Сохранить раздатку');
      expect(html).toContain('Сброс');
      expect(html).toContain('Экран игроков');
      expect(html).toContain('Транслировать игрокам');
      expect(html).toContain('Закрыть');

      // Emoji check
      const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;
      expect([...html.matchAll(emojiRegex)].length).toBe(0);
    });

    it('renders clean English UI and template presets when language is en', () => {
      useSettingsStore.setState({ language: 'en' });

      const html = renderToString(
        <HandoutsModal isOpen={true} onClose={() => {}} />
      );

      expect(html).toContain('Handouts &amp; Secrets Broadcaster');
      expect(html).toContain('Create letters, scrolls, decrees, and clues and broadcast them instantly to the players screen');
      expect(html).toContain('Templates');
      expect(html).toContain('Ancient Letter');
      expect(html).toContain('Dungeon Map');
      expect(html).toContain('Character Portrait');
      expect(html).toContain('Ancient Scroll');
      expect(html).toContain('Royal Decree');
      expect(html).toContain('Cultist Note');
      expect(html).toContain('Bounty Notice');
      expect(html).toContain('Ancient Riddle');
      expect(html).toContain('Document Style');
      expect(html).toContain('Letter');
      expect(html).toContain('Scroll');
      expect(html).toContain('Handout Title');
      expect(html).toContain('Document Text');
      expect(html).toContain('Image (URL or Local File)');
      expect(html).toContain('From Disk');
      expect(html).toContain('Player Screen Preview');
      expect(html).toContain('Save Handout');
      expect(html).toContain('Reset');
      expect(html).toContain('Player Display');
      expect(html).toContain('Broadcast to Players');
      expect(html).toContain('Close');

      // Emoji check
      const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;
      expect([...html.matchAll(emojiRegex)].length).toBe(0);
    });
  });
});
