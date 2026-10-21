import { ParsedMonster } from '../types/database';

const LOCAL_STORAGE_KEY = 'custom_monsters';

export function getProficiencyBonusByCr(cr: string | number): number {
  const str = String(cr).trim();
  if (str === '0' || str === '1/8' || str === '1/4' || str === '1/2') return 2;
  const num = parseInt(str, 10);
  if (isNaN(num) || num <= 4) return 2;
  if (num <= 8) return 3;
  if (num <= 12) return 4;
  if (num <= 16) return 5;
  if (num <= 20) return 6;
  if (num <= 24) return 7;
  if (num <= 28) return 8;
  return 9;
}

export const homebrewService = {
  getCustomMonstersSync(): ParsedMonster[] {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[HomebrewService] Error reading custom monsters from localStorage:', e);
    }
    return [];
  },

  async getCustomMonsters(): Promise<ParsedMonster[]> {
    try {
      const { readTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      const content = await readTextFile('custom_monsters.json', { baseDir: BaseDirectory.AppData });
      if (content) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          // Keep localStorage in sync
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
          return parsed;
        }
      }
    } catch {
      // Fall back to localStorage
    }
    return this.getCustomMonstersSync();
  },

  async saveCustomMonster(monster: ParsedMonster): Promise<ParsedMonster> {
    const list = this.getCustomMonstersSync();
    const index = list.findIndex((m) => m.id === monster.id);
    let updated: ParsedMonster[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = monster;
    } else {
      updated = [monster, ...list];
    }

    const jsonStr = JSON.stringify(updated, null, 2);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, jsonStr);
    } catch (e) {
      console.warn('[HomebrewService] Error saving to localStorage:', e);
    }

    try {
      const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      await writeTextFile('custom_monsters.json', jsonStr, { baseDir: BaseDirectory.AppData });
    } catch {
      // Ignored in browser/web mode
    }

    window.dispatchEvent(new CustomEvent('custom-monsters-updated', { detail: updated }));
    return monster;
  },

  async deleteCustomMonster(id: string): Promise<void> {
    const list = this.getCustomMonstersSync();
    const updated = list.filter((m) => m.id !== id);
    const jsonStr = JSON.stringify(updated, null, 2);

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, jsonStr);
    } catch (e) {
      console.warn('[HomebrewService] Error saving to localStorage:', e);
    }

    try {
      const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      await writeTextFile('custom_monsters.json', jsonStr, { baseDir: BaseDirectory.AppData });
    } catch {
      // Ignored in browser/web mode
    }

    window.dispatchEvent(new CustomEvent('custom-monsters-updated', { detail: updated }));
  },

  async setCustomMonsters(monsters: ParsedMonster[]): Promise<void> {
    const jsonStr = JSON.stringify(monsters, null, 2);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, jsonStr);
    } catch (e) {
      console.warn('[HomebrewService] Error saving all custom monsters to localStorage:', e);
    }

    try {
      const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      await writeTextFile('custom_monsters.json', jsonStr, { baseDir: BaseDirectory.AppData });
    } catch {
      // Ignored in browser/web mode
    }

    window.dispatchEvent(new CustomEvent('custom-monsters-updated', { detail: monsters }));
  },
};
