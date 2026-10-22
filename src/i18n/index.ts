import { useCallback } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { en } from './locales/en';
import { ru } from './locales/ru';
import {
  SupportedLanguage,
  TranslationDictionary,
  TranslationKey,
  UseTranslationReturn,
} from './types';

export * from './types';
export { en } from './locales/en';
export { ru } from './locales/ru';

export const LOCALES: Record<SupportedLanguage, TranslationDictionary> = {
  en,
  ru,
};

/**
 * Interpolates variables in a translation string.
 * Supports both `{{variable}}` and `{variable}` syntax.
 */
export function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params || !template) return template;
  return Object.entries(params).reduce((str, [key, val]) => {
    const valStr = String(val);
    return str
      .replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), valStr)
      .replace(new RegExp(`\\{${key}\\}`, 'g'), valStr);
  }, template);
}

/**
 * Safely resolves a nested dot-notation path in a dictionary object.
 * e.g. resolvePath(en, 'combat.nextTurn') -> 'Next Turn'
 */
export function resolvePath(
  obj: any,
  path: string
): string | undefined {
  if (!obj || typeof obj !== 'object' || !path) return undefined;
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Gets the current active language from settingsStore safely.
 */
export function getCurrentLanguage(): SupportedLanguage {
  try {
    const lang = useSettingsStore.getState().language;
    if (lang === 'en' || lang === 'ru') return lang;
  } catch {}
  return 'en';
}

/**
 * Retrieves a translated string for a specific language and key, with parameter interpolation.
 * Falls back to English if the key is not found in the target language, and finally to the key itself.
 */
export function getTranslation(
  lang: SupportedLanguage,
  key: TranslationKey | string,
  params?: Record<string, string | number>
): string {
  const dictionary = LOCALES[lang] || LOCALES.en;
  let translated = resolvePath(dictionary, key);

  if (translated === undefined && lang !== 'en') {
    // Fall back to English
    translated = resolvePath(LOCALES.en, key);
  }

  if (translated === undefined) {
    // If key not found, return the key as fallback
    return key;
  }

  return interpolate(translated, params);
}

/**
 * Standalone `t` function for non-component or utility contexts.
 * Uses the reactive store's current language if not explicitly provided.
 */
export function t(
  key: TranslationKey | string,
  params?: Record<string, string | number>,
  langOverride?: SupportedLanguage
): string {
  const lang = langOverride || getCurrentLanguage();
  return getTranslation(lang, key, params);
}

/**
 * React hook for internationalization in components.
 * Subscribes to `useSettingsStore` for reactive language changes.
 */
export function useTranslation(): UseTranslationReturn {
  const storeLanguage = useSettingsStore((state) => state.language);
  // In SSR/Node (e.g. renderToString), React's useSyncExternalStore calls getServerSnapshot / getInitialState.
  // Fall back to live getState() to reflect updated test/runtime state.
  const language = typeof window === 'undefined' ? useSettingsStore.getState().language : storeLanguage;
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const toggleLanguage = useSettingsStore((state) => state.toggleLanguage);

  const activeLocale = LOCALES[language] || LOCALES.en;

  const translate = useCallback(
    (key: TranslationKey | string, params?: Record<string, string | number>) => {
      return getTranslation(language, key, params);
    },
    [language]
  );

  return {
    t: translate,
    language,
    setLanguage,
    toggleLanguage,
    locale: activeLocale,
  };
}
