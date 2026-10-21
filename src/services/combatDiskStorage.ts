import { Combatant, CombatLogEntry } from '../types/combat';

export interface ActiveCombatSaveData {
  system_id?: string;
  system_version?: string;
  systemId?: string;
  systemVersion?: string;
  combatants: Combatant[];
  currentTurnIndex: number;
  roundCounter: number;
  activeCombatantId: string | null;
  inspectedCombatantId?: string | null;
  combatLog?: CombatLogEntry[];
  timestamp: number;
  version: string;
}

const STORAGE_FILE_NAME = 'combat_active.json';
const LEGACY_FILE_NAME = 'active_session.json';
const LOCAL_STORAGE_KEY = 'dnd_ait_combat_active';
const LEGACY_STORAGE_KEY = 'dnd_ait_active_session';

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Persists active combat state directly to disk (%APPDATA%/ttrpg-helper/combat_active.json)
 * with robust error handling and localStorage fallback.
 */
export async function saveActiveCombatToDisk(data: {
  combatants: Combatant[];
  currentTurnIndex: number;
  roundCounter: number;
  activeCombatantId: string | null;
  inspectedCombatantId?: string | null;
  combatLog?: CombatLogEntry[];
  systemId?: string;
  systemVersion?: string;
  system_id?: string;
  system_version?: string;
}): Promise<void> {
  const sysId = data.systemId || data.system_id || 'dnd5e_2024';
  const sysVer = data.systemVersion || data.system_version || '2.0.0';
  const payload: ActiveCombatSaveData = {
    system_id: sysId,
    system_version: sysVer,
    systemId: sysId,
    systemVersion: sysVer,
    combatants: data.combatants,
    currentTurnIndex: data.currentTurnIndex,
    roundCounter: data.roundCounter,
    activeCombatantId: data.activeCombatantId,
    inspectedCombatantId: data.inspectedCombatantId,
    combatLog: data.combatLog || [],
    timestamp: Date.now(),
    version: '2.0',
  };

  const jsonStr = JSON.stringify(payload, null, 2);

  // 1. Try Tauri FS
  try {
    const { writeTextFile, BaseDirectory, mkdir } = await import('@tauri-apps/plugin-fs');
    try {
      await mkdir('', { baseDir: BaseDirectory.AppData, recursive: true });
    } catch {
      // Ignore directory already exists error
    }
    await writeTextFile(STORAGE_FILE_NAME, jsonStr, { baseDir: BaseDirectory.AppData });
    return;
  } catch (tauriError) {
    // 2. Web / Browser fallback to localStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, jsonStr);
    } catch (localError) {
      console.warn('[CombatDiskStorage] Error persisting active combat:', tauriError, localError);
    }
  }
}

/**
 * Loads active combat state from disk or fallback storage on application launch.
 */
export async function loadActiveCombatFromDisk(): Promise<ActiveCombatSaveData | null> {
  // 1. Try Tauri FS combat_active.json
  try {
    const { readTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
    try {
      const content = await readTextFile(STORAGE_FILE_NAME, { baseDir: BaseDirectory.AppData });
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.combatants)) {
          return parsed;
        }
      }
    } catch {
      // Try legacy file if combat_active doesn't exist yet
      try {
        const legacyContent = await readTextFile(LEGACY_FILE_NAME, { baseDir: BaseDirectory.AppData });
        if (legacyContent) {
          const parsed = JSON.parse(legacyContent);
          if (parsed && Array.isArray(parsed.combatants)) {
            return parsed;
          }
        }
      } catch {
        // No file on disk
      }
    }
  } catch {
    // Not in Tauri runtime
  }

  // 2. Try localStorage fallback
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.combatants)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[CombatDiskStorage] Error reading fallback storage:', e);
  }

  return null;
}

/**
 * Clears active combat session on disk and storage.
 */
export async function clearActiveCombatDisk(): Promise<void> {
  try {
    const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
    await writeTextFile(
      STORAGE_FILE_NAME,
      JSON.stringify({ combatants: [], currentTurnIndex: 0, roundCounter: 1, activeCombatantId: null, timestamp: Date.now(), version: '2.0' }, null, 2),
      { baseDir: BaseDirectory.AppData }
    );
  } catch {
    // Ignore
  }

  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Debounced auto-save function (default 300ms) to prevent excessive disk I/O during rapid changes.
 */
export function debouncedSaveActiveCombat(
  data: {
    combatants: Combatant[];
    currentTurnIndex: number;
    roundCounter: number;
    activeCombatantId: string | null;
    inspectedCombatantId?: string | null;
    combatLog?: CombatLogEntry[];
    systemId?: string;
    systemVersion?: string;
    system_id?: string;
    system_version?: string;
  },
  delayMs = 300
): void {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
  }
  autosaveTimer = setTimeout(() => {
    saveActiveCombatToDisk(data).catch((err) => {
      console.warn('[CombatDiskStorage] Debounced save failed:', err);
    });
  }, delayMs);
}
