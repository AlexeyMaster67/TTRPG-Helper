import { create } from 'zustand';

export interface SettingsState {
  uiScale: number; // 80 - 150 (percentage)
  isModalOpen: boolean;

  // Language Setting
  language: 'en' | 'ru'; // default strictly 'en'

  // Multi-System Theme Settings
  currentSystemId: string; // default: 'dnd5e_2024'
  themeBySystem: boolean; // default: true
  fallbackTheme: string; // default: 'dnd5e'
  globalTheme: string; // alias to fallbackTheme for specialist compatibility

  // Actions
  setLanguage: (lang: 'en' | 'ru') => void;
  toggleLanguage: () => void;
  setUiScale: (scale: number) => void;
  resetUiScale: () => void;
  setCurrentSystemId: (systemId: string) => void;
  setThemeBySystem: (enabled: boolean) => void;
  setFallbackTheme: (theme: string) => void;
  setGlobalTheme: (theme: string) => void;
  getEffectiveTheme: () => string;
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
}

const SETTINGS_STORAGE_KEY = 'dnd_ait_settings_v1';

export function resolveEffectiveTheme(
  currentSystemId: string,
  themeBySystem: boolean,
  fallbackTheme: string = 'dnd5e'
): string {
  if (!themeBySystem) {
    return fallbackTheme || 'dnd5e';
  }

  const id = (currentSystemId || '').toLowerCase().trim();
  if (id.includes('cyberpunk') || id === 'cyberpunk-red') {
    return 'cyberpunk-red';
  }
  if (id.includes('pathfinder') || id.includes('pf2e') || id === 'pathfinder2e') {
    return 'pathfinder2e';
  }
  if (id.includes('dnd') || id === 'dnd5e' || id === 'dnd5e_2024') {
    return 'dnd5e';
  }

  return fallbackTheme || 'dnd5e';
}

interface StoredSettings {
  uiScale?: number;
  language?: 'en' | 'ru';
  currentSystemId?: string;
  themeBySystem?: boolean;
  fallbackTheme?: string;
  globalTheme?: string;
}

function getStoredSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {};
}

function saveStoredSettings(partial: Partial<StoredSettings>) {
  try {
    const current = getStoredSettings();
    const merged = { ...current, ...partial };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
  } catch {}
}

const initialSettings = getStoredSettings();
const initialLanguage: 'en' | 'ru' =
  initialSettings.language === 'ru' || initialSettings.language === 'en'
    ? initialSettings.language
    : 'en';

const initialUiScale =
  typeof initialSettings.uiScale === 'number' &&
  initialSettings.uiScale >= 80 &&
  initialSettings.uiScale <= 150
    ? initialSettings.uiScale
    : 100;

const initialSystemId = initialSettings.currentSystemId || 'dnd5e_2024';
const initialThemeBySystem =
  typeof initialSettings.themeBySystem === 'boolean'
    ? initialSettings.themeBySystem
    : true;
const initialFallbackTheme =
  initialSettings.fallbackTheme || initialSettings.globalTheme || 'dnd5e';

export const useSettingsStore = create<SettingsState>((set, get, api) => {
  // Ensure SSR / renderToString tests get the live state rather than frozen initial state
  if (api) {
    api.getInitialState = () => get();
  }

  return {
  language: initialLanguage,
  uiScale: initialUiScale,
  isModalOpen: false,

  currentSystemId: initialSystemId,
  themeBySystem: initialThemeBySystem,
  fallbackTheme: initialFallbackTheme,
  globalTheme: initialFallbackTheme,

  setLanguage: (lang: 'en' | 'ru') => {
    const valid: 'en' | 'ru' = lang === 'ru' ? 'ru' : 'en';
    set({ language: valid });
    saveStoredSettings({ language: valid });
  },

  toggleLanguage: () => {
    const next: 'en' | 'ru' = get().language === 'en' ? 'ru' : 'en';
    set({ language: next });
    saveStoredSettings({ language: next });
  },

  setUiScale: (scale: number) => {
    const clamped = Math.max(80, Math.min(150, Math.round(scale)));
    set({ uiScale: clamped });
    saveStoredSettings({ uiScale: clamped });
  },

  resetUiScale: () => {
    set({ uiScale: 100 });
    saveStoredSettings({ uiScale: 100 });
  },

  setCurrentSystemId: (systemId: string) => {
    const cleaned = systemId.trim() || 'dnd5e_2024';
    set({ currentSystemId: cleaned });
    saveStoredSettings({ currentSystemId: cleaned });
  },

  setThemeBySystem: (enabled: boolean) => {
    set({ themeBySystem: enabled });
    saveStoredSettings({ themeBySystem: enabled });
  },

  setFallbackTheme: (theme: string) => {
    const valid = theme.trim() || 'dnd5e';
    set({ fallbackTheme: valid, globalTheme: valid });
    saveStoredSettings({ fallbackTheme: valid, globalTheme: valid });
  },

  setGlobalTheme: (theme: string) => {
    const valid = theme.trim() || 'dnd5e';
    set({ fallbackTheme: valid, globalTheme: valid });
    saveStoredSettings({ fallbackTheme: valid, globalTheme: valid });
  },

  getEffectiveTheme: () => {
    const { currentSystemId, themeBySystem, fallbackTheme } = get();
    return resolveEffectiveTheme(currentSystemId, themeBySystem, fallbackTheme);
  },

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
  toggleModal: () => set((state) => ({ isModalOpen: !state.isModalOpen })),
  };
});
