import React from 'react';
void React;
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { useSettingsStore } from '../store/settingsStore';
import { useMapStore } from '../store/mapStore';
import { useSceneStore } from '../store/sceneStore';
import { SceneDirectorBar } from '../components/map/SceneDirectorBar';
import { MapToolbar, QUICK_PRESETS } from '../components/map/MapToolbar';
import { TokenQuickActions } from '../components/map/TokenQuickActions';
import { createDefaultCombatant } from '../types/combat';

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

describe('Tactical Battlemap Full Localization & Zero Emoji Suite', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'ru' });
    useSceneStore.setState({
      scenes: [
        {
          id: 'scene-1',
          name: 'Сцена 1',
          imageUrl: null,
          imageWidth: 1920,
          imageHeight: 1080,
          isVideoMap: false,
          gridCellSize: 50,
          isGridVisible: true,
          gridType: 'square',
          scale: 1,
          panX: 0,
          panY: 0,
          walls: [],
          fogShapes: [],
          isFogEnabled: false,
          mapTokens: [],
          pins: [],
          weatherEffect: 'none',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      activeSceneId: 'scene-1',
    });
    useMapStore.setState({
      mapTokens: [],
      lights: [],
      pins: [],
      walls: [],
      aoeTemplates: [],
      drawingLines: [],
      activeTool: 'select',
      isGridVisible: true,
      isFogEnabled: false,
    });
  });

  describe('Zero Emoji Guarantee', () => {
    it('ensures zero emojis in MapToolbar presets', () => {
      for (const preset of QUICK_PRESETS) {
        expect(EMOJI_REGEX.test(preset.name)).toBe(false);
        expect(EMOJI_REGEX.test(preset.nameEn)).toBe(false);
        expect(EMOJI_REGEX.test(preset.desc)).toBe(false);
        expect(EMOJI_REGEX.test(preset.descEn)).toBe(false);
      }
    });
  });

  describe('SceneDirectorBar Localization', () => {
    it('renders Russian buttons and titles when language is "ru"', () => {
      useSettingsStore.setState({ language: 'ru' });
      const html = renderToString(<SceneDirectorBar />);

      expect(html).toContain('РЕЖИССЕР СЦЕН');
      expect(html).toContain('Генератор');
      expect(html).toContain('+ Сцена');
      expect(html).toContain('Синхр.');
      expect(EMOJI_REGEX.test(html)).toBe(false);
    });

    it('renders English buttons and titles when language is "en"', () => {
      useSettingsStore.setState({ language: 'en' });
      const html = renderToString(<SceneDirectorBar />);

      expect(html).toContain('SCENE DIRECTOR');
      expect(html).toContain('Generator');
      expect(html).toContain('+ Scene');
      expect(html).toContain('Sync');
      expect(EMOJI_REGEX.test(html)).toBe(false);
    });
  });

  describe('MapToolbar Localization', () => {
    it('renders Russian tool buttons and grid controls when language is "ru"', () => {
      useSettingsStore.setState({ language: 'ru' });
      const html = renderToString(<MapToolbar onFitToViewport={() => {}} isMasterView={true} />);

      // Load Map
      expect(html).toContain('Загрузить карту');
      // Mode buttons
      expect(html).toContain('Выбор');
      expect(html).toContain('Обзор');
      expect(html).toContain('Размещение');
      expect(html).toContain('+ Токен');
      expect(html).toContain('Кузница');
      expect(html).toContain('Линейка');
      expect(html).toContain('Шаблоны');
      expect(html).toContain('Рисование');
      expect(html).toContain('Ластик');
      expect(html).toContain('Отмена');
      expect(html).toContain('Метка');
      expect(html).toContain('Стена');
      expect(html).toContain('Дверь');
      expect(html).toContain('Тайник');
      expect(html).toContain('Окно');
      expect(html).toContain('Освещение');
      expect(html).toContain('Туман');
      // Grid controls
      expect(html).toContain('Сетка');
      expect(html).toContain('Квадрат');
      expect(html).toContain('Гекс В');
      expect(html).toContain('Гекс Г');
      expect(html).toContain('Игроки');
      expect(html).toContain('Генератор карт');

      expect(EMOJI_REGEX.test(html)).toBe(false);
    });

    it('renders English tool buttons and grid controls when language is "en"', () => {
      useSettingsStore.setState({ language: 'en' });
      const html = renderToString(<MapToolbar onFitToViewport={() => {}} isMasterView={true} />);

      // Load Map
      expect(html).toContain('Load Map');
      // Mode buttons
      expect(html).toContain('Select');
      expect(html).toContain('Pan');
      expect(html).toContain('Deploy');
      expect(html).toContain('+ Token');
      expect(html).toContain('Forge');
      expect(html).toContain('Ruler');
      expect(html).toContain('Templates');
      expect(html).toContain('Draw');
      expect(html).toContain('Eraser');
      expect(html).toContain('Undo');
      expect(html).toContain('Pin');
      expect(html).toContain('Wall');
      expect(html).toContain('Door');
      expect(html).toContain('Secret');
      expect(html).toContain('Window');
      expect(html).toContain('Light');
      expect(html).toContain('Fog');
      // Grid controls
      expect(html).toContain('Grid');
      expect(html).toContain('Square');
      expect(html).toContain('Hex V');
      expect(html).toContain('Hex H');
      expect(html).toContain('Players');
      expect(html).toContain('Map Generator');

      expect(EMOJI_REGEX.test(html)).toBe(false);
    });
  });

  describe('TokenQuickActions Localization', () => {
    const mockCombatant = createDefaultCombatant({
      id: 'comb-1',
      name: 'Goblin Warrior',
      nameRu: 'Гоблин-воин',
      hp: 15,
      maxHp: 15,
      isPlayer: false,
    });

    it('renders Russian quick actions when language is "ru"', () => {
      useSettingsStore.setState({ language: 'ru' });
      const html = renderToString(
        <TokenQuickActions
          combatant={mockCombatant}
          scale={1}
          panX={0}
          panY={0}
          gridCellSize={50}
          containerWidth={1000}
          containerHeight={800}
          onClose={() => {}}
        />
      );

      expect(html).toContain('Гоблин-воин');
      expect(html).toContain('-/+ ОЗ');
      expect(html).toContain('Состояние');
      expect(html).toContain('Аура');
      expect(html).toContain('Виден');
      expect(html).toContain('Кузница');
      expect(EMOJI_REGEX.test(html)).toBe(false);
    });

    it('renders English quick actions when language is "en"', () => {
      useSettingsStore.setState({ language: 'en' });
      const html = renderToString(
        <TokenQuickActions
          combatant={mockCombatant}
          scale={1}
          panX={0}
          panY={0}
          gridCellSize={50}
          containerWidth={1000}
          containerHeight={800}
          onClose={() => {}}
        />
      );

      expect(html).toContain('Goblin Warrior');
      expect(html).toContain('-/+ HP');
      expect(html).toContain('Condition');
      expect(html).toContain('Aura');
      expect(html).toContain('Visible');
      expect(html).toContain('Forge');
      expect(EMOJI_REGEX.test(html)).toBe(false);
    });
  });
});
