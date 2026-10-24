import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { useSettingsStore } from '../store/settingsStore';
import { SoundboardDrawer as AudioSoundboardDrawer } from '../components/audio/SoundboardDrawer';
import { SoundboardDrawer as SoundSoundboardDrawer } from '../components/sound/SoundboardDrawer';

describe('SoundboardDrawer Localization & Quality Audit', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'ru' });
  });

  it('renders complete Russian UI when language is ru', () => {
    useSettingsStore.setState({ language: 'ru' });
    const html = renderToString(<AudioSoundboardDrawer isOpen={true} onClose={() => {}} />);

    // Header & Titles
    expect(html).toContain('Звуковая панель и плеер');
    expect(html).toContain('100% оффлайн локальный аудиоплеер');

    // Master Volume & Mixer
    expect(html).toContain('Общая громкость');
    expect(html).toContain('Микшер');

    // Tabs
    expect(html).toContain('Плеер и Музыка');
    expect(html).toContain('Быстрые SFX и Эффекты');

    // Add Local Tracks
    expect(html).toContain('Добавить локальные треки');
    expect(html).toContain('Выбрать файлы на ПК');
    expect(html).toContain('Категория для новых треков:');
    expect(html).toContain('Или просто перетащите аудиофайлы мышью прямо в это окно');

    // Search and Filters
    expect(html).toContain('Поиск по названию трека или тегу...');
    expect(html).toContain('Все');
    expect(html).toContain('Бой');
    expect(html).toContain('Таверна / Город');
    expect(html).toContain('Исследование / Подземелье');
    expect(html).toContain('Природа / Амбиент');
    expect(html).toContain('Спецэффекты (SFX)');

    // Tooltips & aria labels
    expect(html).toContain('Закрыть панель (Ctrl+B)');
    expect(html).toContain('Настроить баланс громкости по категориям');
  });

  it('renders complete English UI when language is en', () => {
    useSettingsStore.setState({ language: 'en' });
    const html = renderToString(<AudioSoundboardDrawer isOpen={true} onClose={() => {}} />);

    // Header & Titles
    expect(html).toContain('Soundboard &amp; Player');
    expect(html).toContain('100% offline local audio player');

    // Master Volume & Mixer
    expect(html).toContain('Master Volume');
    expect(html).toContain('Mixer');

    // Tabs
    expect(html).toContain('Player &amp; Music');
    expect(html).toContain('Quick SFX &amp; Effects');

    // Add Local Tracks
    expect(html).toContain('Add Local Tracks');
    expect(html).toContain('Choose Files on PC');
    expect(html).toContain('Category for new tracks:');
    expect(html).toContain('Or drag and drop audio files directly into this window');

    // Search and Filters
    expect(html).toContain('Search by track name or tag...');
    expect(html).toContain('All');
    expect(html).toContain('Combat');
    expect(html).toContain('Tavern / City');
    expect(html).toContain('Exploration / Dungeon');
    expect(html).toContain('Nature / Ambient');
    expect(html).toContain('Sound Effects (SFX)');

    // Tooltips & aria labels
    expect(html).toContain('Close drawer (Ctrl+B)');
    expect(html).toContain('Adjust volume balance by category');
  });

  it('STRICTLY contains NO emojis in any rendered string, tooltip, or element', () => {
    for (const lang of ['ru', 'en'] as const) {
      useSettingsStore.setState({ language: lang });
      const html = renderToString(<AudioSoundboardDrawer isOpen={true} onClose={() => {}} />);
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;
      const matches = html.match(emojiRegex);
      expect(matches).toBeNull();
    }
  });

  it('properly re-exports SoundboardDrawer from src/components/sound/SoundboardDrawer', () => {
    expect(SoundSoundboardDrawer).toBeDefined();
    expect(SoundSoundboardDrawer).toBe(AudioSoundboardDrawer);
  });
});
